// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL_MIN = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { sport = "soccer_brazil_campeonato" } = await req.json().catch(() => ({}));
    const apiKey = Deno.env.get("ODDS_API_KEY");

    if (!apiKey) {
      return new Response(JSON.stringify({
        matches: [],
        warning: "ODDS_API_KEY não configurado. Adicione o secret nas configurações do projeto.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const cacheKey = `odds:${sport}`;
    const { data: cached } = await supabase.from("api_cache").select("payload,expires_at").eq("cache_key", cacheKey).maybeSingle();
    if (cached && new Date(cached.expires_at) > new Date()) {
      return new Response(JSON.stringify(cached.payload), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?regions=eu,uk&markets=h2h&oddsFormat=decimal&apiKey=${apiKey}`;
    const r = await fetch(url);
    if (!r.ok) {
      return new Response(JSON.stringify({ error: `Odds API erro ${r.status}`, matches: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const raw = await r.json();

    const matches = raw.slice(0, 30).map((m: any) => ({
      match_id: m.id,
      sport: m.sport_key,
      league: m.sport_title,
      home_team: m.home_team,
      away_team: m.away_team,
      commence_time: m.commence_time,
      odds: (m.bookmakers ?? []).flatMap((bk: any) =>
        (bk.markets ?? []).flatMap((mk: any) =>
          (mk.outcomes ?? []).map((o: any) => ({
            bookmaker: bk.title,
            market: mk.key === "h2h" ? "1X2" : mk.key,
            selection: o.name,
            odd: o.price,
          })),
        ),
      ),
    }));

    const payload = { matches };
    const expiresAt = new Date(Date.now() + CACHE_TTL_MIN * 60_000).toISOString();
    await supabase.from("api_cache").upsert({ cache_key: cacheKey, payload, expires_at: expiresAt });

    return new Response(JSON.stringify(payload), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message, matches: [] }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
