import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, ComposedChart } from "recharts";
import { Loader2, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatMoney, formatPct } from "@/lib/ev";

interface SimResult {
  bands: Array<{ step: number; p10: number; p50: number; p90: number }>;
  finalMean: number;
  finalMedian: number;
  ruinProb: number;
  positiveProb: number;
}

export default function Simulator() {
  const [bankroll, setBankroll] = useState("1000");
  const [bets, setBets] = useState("500");
  const [roi, setRoi] = useState("3");
  const [avgOdd, setAvgOdd] = useState("1.95");
  const [stakeMode, setStakeMode] = useState<"fixed" | "percent" | "kelly">("fixed");
  const [stakeValue, setStakeValue] = useState("20");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);

  const run = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("simulate-bankroll", {
        body: {
          initialBankroll: Number(bankroll),
          numBets: Number(bets),
          expectedRoi: Number(roi) / 100,
          avgOdd: Number(avgOdd),
          stakeMode,
          stakeValue: Number(stakeValue),
          numSimulations: 1000,
        },
      });
      if (error) throw error;
      setResult(data as SimResult);
    } catch (err: any) {
      toast.error(err.message ?? "Erro na simulação");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Simulador de banca</h1>
        <p className="text-sm text-muted-foreground">Simulação Monte Carlo de evolução da banca</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 surface-card lg:col-span-1 space-y-4 h-fit">
          <h3 className="text-sm font-semibold">Parâmetros</h3>
          <div className="space-y-3">
            <Field label="Banca inicial" value={bankroll} onChange={setBankroll} suffix="R$" />
            <Field label="Nº de apostas" value={bets} onChange={setBets} />
            <Field label="ROI esperado" value={roi} onChange={setRoi} suffix="%" />
            <Field label="Odd média" value={avgOdd} onChange={setAvgOdd} />
          </div>

          <div className="space-y-2">
            <Label>Estratégia de stake</Label>
            <Tabs value={stakeMode} onValueChange={(v) => setStakeMode(v as any)}>
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="fixed">Fixa</TabsTrigger>
                <TabsTrigger value="percent">% banca</TabsTrigger>
                <TabsTrigger value="kelly">Kelly ¼</TabsTrigger>
              </TabsList>
              <TabsContent value="fixed" className="mt-3">
                <Field label="Valor por aposta (R$)" value={stakeValue} onChange={setStakeValue} suffix="R$" />
              </TabsContent>
              <TabsContent value="percent" className="mt-3">
                <Field label="% da banca por aposta" value={stakeValue} onChange={setStakeValue} suffix="%" />
              </TabsContent>
              <TabsContent value="kelly" className="mt-3">
                <p className="text-xs text-muted-foreground">Kelly fracionado a 25% — mais conservador.</p>
              </TabsContent>
            </Tabs>
          </div>

          <Button onClick={run} disabled={running} className="w-full gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Rodar 1.000 simulações
          </Button>
        </Card>

        <Card className="p-5 surface-card lg:col-span-2">
          <h3 className="text-sm font-semibold mb-4">Resultado</h3>
          {!result ? (
            <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
              Configure os parâmetros e rode a simulação
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <KPI label="Banca final (mediana)" value={formatMoney(result.finalMedian)} />
                <KPI label="Banca final (média)" value={formatMoney(result.finalMean)} />
                <KPI label="Risco de ruína" value={formatPct(result.ruinProb)} negative={result.ruinProb > 0.1} />
                <KPI label="Prob. de lucro" value={formatPct(result.positiveProb)} positive={result.positiveProb > 0.5} />
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={result.bands}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="step" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="p90" stroke="none" fill="hsl(var(--primary))" fillOpacity={0.1} />
                  <Area type="monotone" dataKey="p10" stroke="none" fill="hsl(var(--background))" fillOpacity={1} />
                  <Line type="monotone" dataKey="p50" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="p10" stroke="hsl(var(--destructive))" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                  <Line type="monotone" dataKey="p90" stroke="hsl(var(--primary-glow))" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-2 text-xs text-muted-foreground flex gap-4">
                <span><span className="inline-block w-3 h-0.5 bg-destructive mr-1" />P10 (pior)</span>
                <span><span className="inline-block w-3 h-0.5 bg-primary mr-1" />P50 (mediana)</span>
                <span><span className="inline-block w-3 h-0.5 bg-primary-glow mr-1" />P90 (melhor)</span>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Input type="number" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} className="font-mono" />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function KPI({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="stat-label">{label}</div>
      <div className={`font-mono text-xl font-semibold mt-1 ${positive ? "text-primary" : negative ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}
