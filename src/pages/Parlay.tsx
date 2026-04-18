import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { combinedOdd, combinedProbability, computeEV, formatNumber, formatPct } from "@/lib/ev";
import { EvBadge } from "@/components/EvBadge";
import { Badge } from "@/components/ui/badge";

interface Leg { id: string; label: string; odd: string; prob: string }

const newLeg = (i: number): Leg => ({ id: crypto.randomUUID(), label: `Perna ${i}`, odd: "", prob: "" });

export default function Parlay() {
  const [legs, setLegs] = useState<Leg[]>([newLeg(1), newLeg(2)]);
  const [stake, setStake] = useState("100");

  const oddsArr = legs.map((l) => Number(l.odd) || 0).filter((n) => n > 1);
  const probsArr = legs.map((l) => (Number(l.prob) || 0) / 100).filter((n) => n > 0 && n <= 1);
  const totalOdd = combinedOdd(oddsArr);
  const totalProb = probsArr.length === legs.length ? combinedProbability(probsArr) : null;
  const ev = computeEV(totalProb, totalOdd > 1 ? totalOdd : null);
  const stakeN = Number(stake) || 0;
  const potential = stakeN * totalOdd;
  const expectedReturn = ev != null ? stakeN * (1 + ev) : null;

  // Suggest removing legs to maximize EV
  const suggestion = useMemo(() => {
    if (legs.length < 3 || probsArr.length !== legs.length) return null;
    let bestEV = ev ?? -Infinity;
    let bestRemove: Leg | null = null;
    for (const l of legs) {
      const remaining = legs.filter((x) => x.id !== l.id);
      const od = combinedOdd(remaining.map((r) => Number(r.odd)));
      const pr = combinedProbability(remaining.map((r) => Number(r.prob) / 100));
      const e = computeEV(pr, od);
      if (e != null && e > bestEV) { bestEV = e; bestRemove = l; }
    }
    return bestRemove ? { leg: bestRemove, ev: bestEV } : null;
  }, [legs, probsArr.length, ev]);

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calculadora de múltiplas</h1>
        <p className="text-sm text-muted-foreground">Avalie odd combinada, probabilidade e EV antes de apostar</p>
      </div>

      <Card className="p-5 surface-card space-y-3">
        {legs.map((leg, i) => (
          <div key={leg.id} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-5 space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Input value={leg.label} onChange={(e) => setLegs((ls) => ls.map((x) => x.id === leg.id ? { ...x, label: e.target.value } : x))} />
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">Odd</Label>
              <Input type="number" step="0.01" value={leg.odd} onChange={(e) => setLegs((ls) => ls.map((x) => x.id === leg.id ? { ...x, odd: e.target.value } : x))} />
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">Prob. estimada %</Label>
              <Input type="number" step="0.1" value={leg.prob} onChange={(e) => setLegs((ls) => ls.map((x) => x.id === leg.id ? { ...x, prob: e.target.value } : x))} />
            </div>
            <Button variant="ghost" size="icon" disabled={legs.length <= 2}
              onClick={() => setLegs((ls) => ls.filter((x) => x.id !== leg.id))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" onClick={() => setLegs((ls) => [...ls, newLeg(ls.length + 1)])} className="gap-2">
          <Plus className="h-4 w-4" /> Adicionar perna
        </Button>
      </Card>

      <Card className="p-5 surface-card">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Odd combinada" value={formatNumber(totalOdd)} />
          <Stat label="Prob. combinada" value={totalProb ? formatPct(totalProb) : "—"} />
          <Stat label="EV" value={ev != null ? formatPct(ev) : "—"} positive={ev != null && ev > 0} negative={ev != null && ev < 0} />
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Stake</Label>
            <Input type="number" value={stake} onChange={(e) => setStake(e.target.value)} className="font-mono" />
          </div>
          <Stat label="Retorno potencial" value={formatNumber(potential)} positive />
        </div>
        {expectedReturn != null && (
          <div className="mt-3 text-sm text-muted-foreground">
            Retorno esperado (long-run): <span className="font-mono font-semibold text-foreground">{formatNumber(expectedReturn)}</span>
          </div>
        )}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Avaliação:</span>
          <EvBadge ev={ev} />
          {totalProb && totalProb < 0.1 && (
            <Badge variant="outline" className="gap-1 text-warning border-warning/30 bg-warning/10">
              <AlertTriangle className="h-3 w-3" /> Risco alto · prob &lt; 10%
            </Badge>
          )}
        </div>
      </Card>

      {suggestion && (
        <Card className="p-5 surface-card border-primary/30">
          <h3 className="text-sm font-semibold text-primary mb-1">💡 Sugestão</h3>
          <p className="text-sm">
            Removendo <span className="font-semibold">"{suggestion.leg.label}"</span>, o EV sobe para{" "}
            <span className="font-mono font-semibold text-primary">{formatPct(suggestion.ev)}</span>.
          </p>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  return (
    <div className="space-y-1">
      <span className="stat-label">{label}</span>
      <div className={`font-mono text-2xl font-semibold ${positive ? "text-primary" : negative ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}
