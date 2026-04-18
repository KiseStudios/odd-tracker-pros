import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { TrendingUp, TrendingDown, Target, DollarSign, Activity, Percent, Hash, Coins } from "lucide-react";
import { formatMoney, formatPct, formatNumber } from "@/lib/ev";

interface Bet {
  id: string;
  status: string;
  stake: number;
  odd: number;
  profit: number;
  placed_at: string;
  ev: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "hsl(var(--muted-foreground))",
  won: "hsl(var(--primary))",
  lost: "hsl(var(--destructive))",
  void: "hsl(var(--warning))",
  cashout: "hsl(var(--primary-glow))",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [period, setPeriod] = useState("30");

  useEffect(() => {
    if (!user) return;
    const since = period === "all" ? "1970-01-01" : new Date(Date.now() - parseInt(period) * 86400000).toISOString();
    supabase
      .from("bets")
      .select("id,status,stake,odd,profit,placed_at,ev")
      .gte("placed_at", since)
      .order("placed_at", { ascending: true })
      .then(({ data }) => setBets((data as Bet[]) ?? []));
  }, [user, period]);

  const stats = useMemo(() => {
    const settled = bets.filter((b) => b.status !== "pending");
    const won = settled.filter((b) => b.status === "won");
    const totalStake = settled.reduce((s, b) => s + Number(b.stake), 0);
    const totalProfit = settled.reduce((s, b) => s + Number(b.profit), 0);
    const roi = totalStake > 0 ? totalProfit / totalStake : 0;
    const hitRate = settled.length > 0 ? won.length / settled.length : 0;
    const avgStake = settled.length > 0 ? totalStake / settled.length : 0;
    const avgOdd = settled.length > 0 ? settled.reduce((s, b) => s + Number(b.odd), 0) / settled.length : 0;
    return {
      total: bets.length, settled: settled.length, totalProfit, roi, hitRate, avgStake, avgOdd, totalStake,
    };
  }, [bets]);

  const evolution = useMemo(() => {
    let cum = 0;
    return bets.filter((b) => b.status !== "pending").map((b) => {
      cum += Number(b.profit);
      return { date: new Date(b.placed_at).toLocaleDateString("pt-BR"), profit: cum };
    });
  }, [bets]);

  const monthly = useMemo(() => {
    const m: Record<string, number> = {};
    bets.filter((b) => b.status !== "pending").forEach((b) => {
      const k = new Date(b.placed_at).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      m[k] = (m[k] ?? 0) + Number(b.profit);
    });
    return Object.entries(m).map(([month, profit]) => ({ month, profit }));
  }, [bets]);

  const distribution = useMemo(() => {
    const d: Record<string, number> = {};
    bets.forEach((b) => { d[b.status] = (d[b.status] ?? 0) + 1; });
    return Object.entries(d).map(([name, value]) => ({ name, value }));
  }, [bets]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral do seu desempenho</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="365">Último ano</SelectItem>
            <SelectItem value="all">Todo o período</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={DollarSign} label="Lucro / Prejuízo" value={formatMoney(stats.totalProfit)} positive={stats.totalProfit >= 0} />
        <Stat icon={Percent} label="ROI" value={formatPct(stats.roi)} positive={stats.roi >= 0} />
        <Stat icon={Target} label="Taxa de acerto" value={formatPct(stats.hitRate)} />
        <Stat icon={Activity} label="Yield" value={formatPct(stats.roi)} positive={stats.roi >= 0} />
        <Stat icon={Hash} label="Total de apostas" value={String(stats.total)} />
        <Stat icon={Coins} label="Volume apostado" value={formatMoney(stats.totalStake)} />
        <Stat icon={TrendingUp} label="Stake médio" value={formatMoney(stats.avgStake)} />
        <Stat icon={TrendingDown} label="Odd média" value={formatNumber(stats.avgOdd)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5 surface-card">
          <h3 className="text-sm font-semibold mb-4">Evolução do lucro acumulado</h3>
          {evolution.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={evolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="profit" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5 surface-card">
          <h3 className="text-sm font-semibold mb-4">Lucro por mês</h3>
          {monthly.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                  {monthly.map((m, i) => (
                    <Cell key={i} fill={m.profit >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5 surface-card lg:col-span-2">
          <h3 className="text-sm font-semibold mb-4">Distribuição por status</h3>
          {distribution.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {distribution.map((d, i) => (
                    <Cell key={i} fill={STATUS_COLORS[d.name] ?? "hsl(var(--muted))"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, positive }: { icon: any; label: string; value: string; positive?: boolean }) {
  return (
    <Card className="p-4 surface-card">
      <div className="flex items-center justify-between">
        <span className="stat-label">{label}</span>
        <Icon className={`h-4 w-4 ${positive === undefined ? "text-muted-foreground" : positive ? "text-primary" : "text-destructive"}`} />
      </div>
      <div className={`stat-value mt-2 ${positive === undefined ? "" : positive ? "text-primary" : "text-destructive"}`}>{value}</div>
    </Card>
  );
}

function Empty() {
  return <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">Sem dados ainda — registre suas primeiras apostas.</div>;
}
