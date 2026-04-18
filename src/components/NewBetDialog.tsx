import { useState, useEffect } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { computeEV, combinedOdd, combinedProbability, formatPct } from "@/lib/ev";
import { EvBadge } from "./EvBadge";

interface Bankroll { id: string; name: string; }

interface Leg {
  sport: string; league: string; market: string; selection: string; match_description: string;
  odd: string; probability: string;
}

const newLeg = (): Leg => ({ sport: "", league: "", market: "", selection: "", match_description: "", odd: "", probability: "" });

const numSchema = z.coerce.number();

export function NewBetDialog({ onCreated, prefill }: { onCreated?: () => void; prefill?: Partial<Leg> & { bookmaker?: string } }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"single" | "parlay">("single");
  const [bankrolls, setBankrolls] = useState<Bankroll[]>([]);
  const [bankrollId, setBankrollId] = useState<string>("");
  const [stake, setStake] = useState("");
  const [bookmaker, setBookmaker] = useState(prefill?.bookmaker ?? "");
  const [notes, setNotes] = useState("");
  const [legs, setLegs] = useState<Leg[]>([{ ...newLeg(), ...(prefill ?? {}) } as Leg]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    supabase.from("bankrolls").select("id,name").order("is_default", { ascending: false }).then(({ data }) => {
      setBankrolls((data as Bankroll[]) ?? []);
      if (data && data.length > 0 && !bankrollId) setBankrollId(data[0].id);
    });
  }, [open, user, bankrollId]);

  const addLeg = () => setLegs((l) => [...l, newLeg()]);
  const removeLeg = (i: number) => setLegs((l) => l.filter((_, idx) => idx !== i));
  const updateLeg = (i: number, patch: Partial<Leg>) => setLegs((l) => l.map((leg, idx) => idx === i ? { ...leg, ...patch } : leg));

  const oddsArr = legs.map((l) => Number(l.odd) || 0).filter((n) => n > 1);
  const probsArr = legs.map((l) => (Number(l.probability) || 0) / 100).filter((n) => n > 0 && n <= 1);
  const totalOdd = tab === "single" ? (Number(legs[0]?.odd) || 0) : combinedOdd(oddsArr);
  const totalProb = tab === "single" ? (Number(legs[0]?.probability) || 0) / 100 : combinedProbability(probsArr);
  const ev = computeEV(totalProb || null, totalOdd || null);

  const submit = async () => {
    if (!user) return;
    try {
      const stakeN = numSchema.parse(stake);
      if (stakeN <= 0) throw new Error("Stake deve ser maior que zero");
      if (tab === "single" && (!legs[0].odd || Number(legs[0].odd) <= 1)) throw new Error("Odd inválida");
      if (tab === "parlay" && legs.length < 2) throw new Error("Múltipla precisa de pelo menos 2 pernas");
      if (!bankrollId) throw new Error("Selecione uma banca");

      setSaving(true);
      const first = legs[0];
      const { data: bet, error } = await supabase.from("bets").insert({
        user_id: user.id,
        bankroll_id: bankrollId,
        bet_type: tab,
        sport: first.sport || null,
        league: first.league || null,
        market: tab === "single" ? first.market || null : "Múltipla",
        selection: tab === "single" ? first.selection || null : `${legs.length} pernas`,
        match_description: tab === "single" ? first.match_description || null : null,
        bookmaker: bookmaker || null,
        odd: totalOdd,
        stake: stakeN,
        estimated_probability: totalProb || null,
        ev,
        status: "pending",
        notes: notes || null,
      }).select().single();
      if (error) throw error;

      if (tab === "parlay" && bet) {
        const legsRows = legs.map((l, i) => ({
          bet_id: bet.id,
          user_id: user.id,
          sport: l.sport || null,
          league: l.league || null,
          market: l.market || null,
          selection: l.selection || null,
          match_description: l.match_description || null,
          odd: Number(l.odd),
          estimated_probability: l.probability ? Number(l.probability) / 100 : null,
          status: "pending" as const,
          position: i,
        }));
        const { error: legErr } = await supabase.from("bet_legs").insert(legsRows);
        if (legErr) throw legErr;
      }

      // Debit bankroll
      await supabase.from("bankroll_transactions").insert({
        user_id: user.id, bankroll_id: bankrollId, type: "bet_stake", amount: -stakeN,
        bet_id: bet?.id, description: `Aposta #${bet?.id.slice(0, 8)}`,
      });
      await supabase.rpc("noop_placeholder").then(() => undefined).catch(() => undefined);
      // Update current_balance
      const { data: br } = await supabase.from("bankrolls").select("current_balance").eq("id", bankrollId).single();
      if (br) await supabase.from("bankrolls").update({ current_balance: Number(br.current_balance) - stakeN }).eq("id", bankrollId);

      toast.success("Aposta registrada");
      setOpen(false);
      setLegs([newLeg()]); setStake(""); setNotes("");
      onCreated?.();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" />Nova aposta</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Registrar aposta</DialogTitle></DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="single">Simples</TabsTrigger>
            <TabsTrigger value="parlay">Múltipla</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-3 mt-4">
            <LegFields leg={legs[0]} onChange={(p) => updateLeg(0, p)} />
          </TabsContent>

          <TabsContent value="parlay" className="space-y-3 mt-4">
            {legs.map((leg, i) => (
              <div key={i} className="border border-border rounded-lg p-3 relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">Perna {i + 1}</span>
                  {legs.length > 1 && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeLeg(i)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <LegFields leg={leg} onChange={(p) => updateLeg(i, p)} />
              </div>
            ))}
            <Button variant="outline" onClick={addLeg} className="w-full gap-2"><Plus className="h-3 w-3" /> Adicionar perna</Button>
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="space-y-1">
            <Label>Stake</Label>
            <Input type="number" step="0.01" value={stake} onChange={(e) => setStake(e.target.value)} placeholder="100,00" />
          </div>
          <div className="space-y-1">
            <Label>Banca</Label>
            <Select value={bankrollId} onValueChange={setBankrollId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {bankrolls.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 col-span-2">
            <Label>Casa de aposta (opcional)</Label>
            <Input value={bookmaker} onChange={(e) => setBookmaker(e.target.value)} placeholder="Bet365, Pinnacle..." />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-3 mt-4 grid grid-cols-3 gap-2 text-center">
          <Metric label="Odd total" value={totalOdd ? totalOdd.toFixed(2) : "—"} />
          <Metric label="Prob. estimada" value={totalProb ? formatPct(totalProb) : "—"} />
          <div className="flex flex-col items-center gap-1">
            <span className="stat-label">EV</span>
            <EvBadge ev={ev} />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LegFields({ leg, onChange }: { leg: Leg; onChange: (p: Partial<Leg>) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Input placeholder="Esporte (ex: Futebol)" value={leg.sport} onChange={(e) => onChange({ sport: e.target.value })} />
      <Input placeholder="Liga (ex: Brasileirão)" value={leg.league} onChange={(e) => onChange({ league: e.target.value })} />
      <Input placeholder="Jogo (ex: Flamengo x Palmeiras)" value={leg.match_description} onChange={(e) => onChange({ match_description: e.target.value })} className="col-span-2" />
      <Input placeholder="Mercado (ex: 1X2)" value={leg.market} onChange={(e) => onChange({ market: e.target.value })} />
      <Input placeholder="Seleção (ex: Flamengo)" value={leg.selection} onChange={(e) => onChange({ selection: e.target.value })} />
      <Input type="number" step="0.01" placeholder="Odd (ex: 1.85)" value={leg.odd} onChange={(e) => onChange({ odd: e.target.value })} />
      <Input type="number" step="0.01" placeholder="Prob. estimada % (ex: 60)" value={leg.probability} onChange={(e) => onChange({ probability: e.target.value })} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="stat-label">{label}</span>
      <span className="font-mono font-semibold mt-1">{value}</span>
    </div>
  );
}
