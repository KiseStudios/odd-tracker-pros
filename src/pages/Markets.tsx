import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCw, Radio } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EvBadge } from "@/components/EvBadge";
import { computeEV, formatNumber, impliedProbability, formatPct } from "@/lib/ev";
import { Badge } from "@/components/ui/badge";

interface OddItem {
  bookmaker: string;
  market: string;
  selection: string;
  odd: number;
}

interface MatchOdds {
  match_id: string;
  sport: string;
  league: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  odds: OddItem[];
}

const SPORTS = [
  { key: "soccer_brazil_campeonato", label: "Brasileirão Série A" },
  { key: "soccer_epl", label: "Premier League" },
  { key: "soccer_spain_la_liga", label: "La Liga" },
  { key: "soccer_uefa_champs_league", label: "Champions League" },
  { key: "basketball_nba", label: "NBA" },
  { key: "americanfootball_nfl", label: "NFL" },
];

export default function Markets() {
  const [sport, setSport] = useState("soccer_brazil_campeonato");
  const [matches, setMatches] = useState<MatchOdds[]>([]);
  const [loading, setLoading] = useState(false);
  const [estimatedProb, setEstimatedProb] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-odds", { body: { sport } });
      if (error) throw error;
      setMatches((data as any)?.matches ?? []);
      if (((data as any)?.matches ?? []).length === 0) toast.info("Nenhum jogo encontrado ou chave da API não configurada");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao buscar odds");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mercado ao vivo</h1>
          <p className="text-sm text-muted-foreground">Compare odds entre casas e identifique +EV</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sport} onValueChange={setSport}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SPORTS.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={load} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Buscar
          </Button>
        </div>
      </div>

      {matches.length === 0 && !loading && (
        <Card className="p-12 surface-card text-center">
          <Radio className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">Sem jogos carregados</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Clique em "Buscar" para carregar jogos. Requer chave The Odds API configurada nas Configurações.
          </p>
        </Card>
      )}

      {matches.map((m) => {
        // Group by market+selection, find best odd per selection
        const grouped: Record<string, OddItem[]> = {};
        m.odds.forEach((o) => {
          const k = `${o.market}|${o.selection}`;
          if (!grouped[k]) grouped[k] = [];
          grouped[k].push(o);
        });
        return (
          <Card key={m.match_id} className="p-5 surface-card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold">{m.home_team} <span className="text-muted-foreground text-sm">x</span> {m.away_team}</div>
                <div className="text-xs text-muted-foreground">{m.league} · {new Date(m.commence_time).toLocaleString("pt-BR")}</div>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mercado / Seleção</TableHead>
                  <TableHead>Casas</TableHead>
                  <TableHead className="text-right">Melhor odd</TableHead>
                  <TableHead>Prob. estimada %</TableHead>
                  <TableHead>EV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(grouped).map(([k, list]) => {
                  const best = list.reduce((a, b) => (b.odd > a.odd ? b : a));
                  const probKey = `${m.match_id}|${k}`;
                  const prob = Number(estimatedProb[probKey] ?? "") / 100;
                  const ev = prob > 0 ? computeEV(prob, best.odd) : null;
                  const [market, selection] = k.split("|");
                  return (
                    <TableRow key={k}>
                      <TableCell>
                        <div className="text-sm font-medium">{selection}</div>
                        <div className="text-xs text-muted-foreground">{market}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex gap-1 flex-wrap">
                          {list.map((o, i) => (
                            <Badge key={i} variant="outline" className="font-mono">
                              {o.bookmaker} {formatNumber(o.odd)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        <div>{formatNumber(best.odd)}</div>
                        <div className="text-[10px] text-muted-foreground">{best.bookmaker} · imp. {formatPct(impliedProbability(best.odd), 1)}</div>
                      </TableCell>
                      <TableCell>
                        <Input type="number" step="0.1" placeholder="ex: 55"
                          className="h-8 w-20 font-mono"
                          value={estimatedProb[probKey] ?? ""}
                          onChange={(e) => setEstimatedProb((m) => ({ ...m, [probKey]: e.target.value }))}
                        />
                      </TableCell>
                      <TableCell><EvBadge ev={ev} compact /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        );
      })}
    </div>
  );
}
