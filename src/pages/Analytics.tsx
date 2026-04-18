import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, formatPct } from "@/lib/ev";
import { Badge } from "@/components/ui/badge";

interface Bet {
  id: string; sport: string | null; league: string | null; market: string | null;
  odd: number; stake: number; profit: number; status: string; placed_at: string;
}

export default function Analytics() {
  const { user } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("bets").select("id,sport,league,market,odd,stake,profit,status,placed_at")
      .neq("status", "pending")
      .then(({ data }) => setBets((data as Bet[]) ?? []));
  }, [user]);

  const byField = (field: keyof Bet) => {
    const map: Record<string, { count: number; stake: number; profit: number; won: number }> = {};
    bets.forEach((b) => {
      const k = (b[field] as string) ?? "—";
      if (!map[k]) map[k] = { count: 0, stake: 0, profit: 0, won: 0 };
      map[k].count++;
      map[k].stake += Number(b.stake);
      map[k].profit += Number(b.profit);
      if (b.status === "won") map[k].won++;
    });
    return Object.entries(map).map(([key, v]) => ({
      key, ...v, roi: v.stake > 0 ? v.profit / v.stake : 0, hit: v.count > 0 ? v.won / v.count : 0,
    })).sort((a, b) => b.profit - a.profit);
  };

  const oddBuckets = useMemo(() => {
    const buckets = [
      { label: "1.00 – 1.50", min: 1, max: 1.5 },
      { label: "1.50 – 2.00", min: 1.5, max: 2 },
      { label: "2.00 – 3.00", min: 2, max: 3 },
      { label: "3.00 – 5.00", min: 3, max: 5 },
      { label: "5.00+", min: 5, max: Infinity },
    ];
    return buckets.map((bk) => {
      const list = bets.filter((b) => Number(b.odd) >= bk.min && Number(b.odd) < bk.max);
      const stake = list.reduce((s, b) => s + Number(b.stake), 0);
      const profit = list.reduce((s, b) => s + Number(b.profit), 0);
      const won = list.filter((b) => b.status === "won").length;
      return {
        key: bk.label, count: list.length, stake, profit, won,
        roi: stake > 0 ? profit / stake : 0, hit: list.length > 0 ? won / list.length : 0,
      };
    });
  }, [bets]);

  const dayOfWeek = useMemo(() => {
    const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const map: Record<string, { count: number; stake: number; profit: number; won: number }> = {};
    days.forEach((d) => { map[d] = { count: 0, stake: 0, profit: 0, won: 0 }; });
    bets.forEach((b) => {
      const d = days[new Date(b.placed_at).getDay()];
      map[d].count++;
      map[d].stake += Number(b.stake);
      map[d].profit += Number(b.profit);
      if (b.status === "won") map[d].won++;
    });
    return Object.entries(map).map(([key, v]) => ({
      key, ...v, roi: v.stake > 0 ? v.profit / v.stake : 0, hit: v.count > 0 ? v.won / v.count : 0,
    }));
  }, [bets]);

  const insights = useMemo(() => {
    const out: string[] = [];
    const buckets = oddBuckets.filter((b) => b.count >= 5);
    const worst = buckets.sort((a, b) => a.roi - b.roi)[0];
    const best = [...buckets].sort((a, b) => b.roi - a.roi)[0];
    if (worst && worst.roi < -0.1) out.push(`⚠️ ROI de ${formatPct(worst.roi)} em odds ${worst.key} (${worst.count} apostas) — considere evitar essa faixa.`);
    if (best && best.roi > 0.05) out.push(`✅ Sua melhor faixa é ${best.key} com ROI de ${formatPct(best.roi)} em ${best.count} apostas.`);

    const leagues = byField("league").filter((l) => l.count >= 5);
    const worstLeague = leagues.sort((a, b) => a.roi - b.roi)[0];
    if (worstLeague && worstLeague.roi < -0.1) out.push(`⚠️ Performance fraca em ${worstLeague.key}: ROI ${formatPct(worstLeague.roi)} em ${worstLeague.count} apostas.`);

    // Streak
    const sorted = [...bets].sort((a, b) => +new Date(a.placed_at) - +new Date(b.placed_at));
    let curr = 0, longestLoss = 0, longestWin = 0;
    sorted.forEach((b) => {
      if (b.status === "won") { curr = curr > 0 ? curr + 1 : 1; longestWin = Math.max(longestWin, curr); }
      else if (b.status === "lost") { curr = curr < 0 ? curr - 1 : -1; longestLoss = Math.max(longestLoss, -curr); }
    });
    if (longestLoss >= 3) out.push(`📉 Maior sequência de derrotas: ${longestLoss} apostas seguidas.`);
    if (longestWin >= 3) out.push(`🔥 Maior sequência de vitórias: ${longestWin} apostas seguidas.`);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bets, oddBuckets]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Análise de performance</h1>
        <p className="text-sm text-muted-foreground">Identifique padrões e onde está seu valor</p>
      </div>

      {insights.length > 0 && (
        <Card className="p-5 surface-card border-primary/30">
          <h3 className="text-sm font-semibold mb-3 text-primary">Insights</h3>
          <ul className="space-y-2">
            {insights.map((i, idx) => <li key={idx} className="text-sm">{i}</li>)}
          </ul>
        </Card>
      )}

      <Tabs defaultValue="league">
        <TabsList>
          <TabsTrigger value="league">Por liga</TabsTrigger>
          <TabsTrigger value="market">Por mercado</TabsTrigger>
          <TabsTrigger value="sport">Por esporte</TabsTrigger>
          <TabsTrigger value="odd">Por faixa de odd</TabsTrigger>
          <TabsTrigger value="dow">Por dia da semana</TabsTrigger>
        </TabsList>
        {[
          { v: "league", data: byField("league") },
          { v: "market", data: byField("market") },
          { v: "sport", data: byField("sport") },
          { v: "odd", data: oddBuckets },
          { v: "dow", data: dayOfWeek },
        ].map((t) => (
          <TabsContent key={t.v} value={t.v}>
            <Card className="surface-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Apostas</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead className="text-right">Lucro</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                    <TableHead className="text-right">Acerto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {t.data.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sem dados</TableCell></TableRow>}
                  {t.data.map((r) => (
                    <TableRow key={r.key}>
                      <TableCell>{r.key}</TableCell>
                      <TableCell className="text-right font-mono">{r.count}</TableCell>
                      <TableCell className="text-right font-mono">{formatMoney(r.stake)}</TableCell>
                      <TableCell className={`text-right font-mono ${r.profit > 0 ? "text-primary" : r.profit < 0 ? "text-destructive" : ""}`}>{formatMoney(r.profit)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={r.roi > 0 ? "text-primary border-primary/30" : r.roi < 0 ? "text-destructive border-destructive/30" : ""}>
                          {formatPct(r.roi)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatPct(r.hit)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
