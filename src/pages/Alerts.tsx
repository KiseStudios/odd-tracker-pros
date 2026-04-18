import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Alert {
  id: string; name: string; rule_type: string; config: any; is_active: boolean; created_at: string;
}

export default function Alerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("ev_threshold");
  const [evMin, setEvMin] = useState("5");
  const [league, setLeague] = useState("");
  const [movement, setMovement] = useState("10");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("alerts").select("*").order("created_at", { ascending: false });
    setAlerts((data as Alert[]) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const create = async () => {
    if (!user || !name) return;
    const config = type === "ev_threshold"
      ? { ev_min: Number(evMin) / 100, league: league || null }
      : { movement_pct: Number(movement) / 100 };
    const { error } = await supabase.from("alerts").insert({ user_id: user.id, name, rule_type: type, config, is_active: true });
    if (error) { toast.error(error.message); return; }
    toast.success("Alerta criado");
    setOpen(false); setName(""); load();
  };

  const toggle = async (a: Alert) => {
    await supabase.from("alerts").update({ is_active: !a.is_active }).eq("id", a.id);
    load();
  };

  const remove = async (a: Alert) => {
    await supabase.from("alerts").delete().eq("id", a.id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alertas</h1>
          <p className="text-sm text-muted-foreground">Receba notificações automáticas quando aparecer valor</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Novo alerta</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar alerta</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="EV+ na Premier League" />
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ev_threshold">EV acima de threshold</SelectItem>
                    <SelectItem value="odds_movement">Movimento de odds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {type === "ev_threshold" ? (
                <>
                  <div className="space-y-1">
                    <Label>EV mínimo (%)</Label>
                    <Input type="number" step="0.1" value={evMin} onChange={(e) => setEvMin(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Liga (opcional)</Label>
                    <Input value={league} onChange={(e) => setLeague(e.target.value)} placeholder="Brasileirão" />
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <Label>Variação mínima da odd (%)</Label>
                  <Input type="number" step="0.1" value={movement} onChange={(e) => setMovement(e.target.value)} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={create}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {alerts.length === 0 ? (
        <Card className="p-12 surface-card text-center">
          <Bell className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">Nenhum alerta criado</h3>
          <p className="text-sm text-muted-foreground">Crie alertas para ser notificado quando aparecer valor positivo</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <Card key={a.id} className="p-4 surface-card flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{a.name}</span>
                  <Badge variant="outline">{a.rule_type === "ev_threshold" ? "EV" : "Movimento"}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {a.rule_type === "ev_threshold"
                    ? `EV ≥ ${(a.config.ev_min * 100).toFixed(1)}%${a.config.league ? ` · ${a.config.league}` : ""}`
                    : `Variação ≥ ${(a.config.movement_pct * 100).toFixed(1)}%`}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={a.is_active} onCheckedChange={() => toggle(a)} />
                <Button variant="ghost" size="icon" onClick={() => remove(a)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
