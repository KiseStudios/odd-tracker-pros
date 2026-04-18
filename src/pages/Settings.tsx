import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatMoney } from "@/lib/ev";

interface Bankroll { id: string; name: string; currency: string; initial_balance: number; current_balance: number; is_default: boolean; }
interface Profile { display_name: string; currency: string; timezone: string; }

export default function Settings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bankrolls, setBankrolls] = useState<Bankroll[]>([]);
  const [bankrollName, setBankrollName] = useState("");
  const [bankrollAmount, setBankrollAmount] = useState("1000");
  const [bankrollOpen, setBankrollOpen] = useState(false);
  const [txnOpen, setTxnOpen] = useState(false);
  const [txnBankroll, setTxnBankroll] = useState<string>("");
  const [txnType, setTxnType] = useState("deposit");
  const [txnAmount, setTxnAmount] = useState("");

  const load = async () => {
    if (!user) return;
    const [{ data: p }, { data: b }] = await Promise.all([
      supabase.from("profiles").select("display_name,currency,timezone").eq("id", user.id).maybeSingle(),
      supabase.from("bankrolls").select("*").order("created_at"),
    ]);
    setProfile(p as Profile);
    setBankrolls((b as Bankroll[]) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const saveProfile = async () => {
    if (!profile || !user) return;
    const { error } = await supabase.from("profiles").update(profile).eq("id", user.id);
    if (error) toast.error(error.message); else toast.success("Perfil salvo");
  };

  const createBankroll = async () => {
    if (!user || !bankrollName) return;
    const amount = Number(bankrollAmount);
    const { error } = await supabase.from("bankrolls").insert({
      user_id: user.id, name: bankrollName, initial_balance: amount, current_balance: amount,
      is_default: bankrolls.length === 0, currency: profile?.currency ?? "BRL",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Banca criada");
    setBankrollOpen(false); setBankrollName(""); load();
  };

  const submitTxn = async () => {
    if (!user || !txnBankroll) return;
    const amount = Number(txnAmount);
    const signed = txnType === "withdraw" ? -Math.abs(amount) : Math.abs(amount);
    const { error } = await supabase.from("bankroll_transactions").insert({
      user_id: user.id, bankroll_id: txnBankroll, type: txnType as any, amount: signed,
    });
    if (error) { toast.error(error.message); return; }
    const { data: br } = await supabase.from("bankrolls").select("current_balance").eq("id", txnBankroll).single();
    if (br) await supabase.from("bankrolls").update({ current_balance: Number(br.current_balance) + signed }).eq("id", txnBankroll);
    toast.success("Transação registrada");
    setTxnOpen(false); setTxnAmount(""); load();
  };

  const setDefault = async (id: string) => {
    if (!user) return;
    await supabase.from("bankrolls").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("bankrolls").update({ is_default: true }).eq("id", id);
    load();
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Perfil, bancas e integrações</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="bankrolls">Bancas</TabsTrigger>
          <TabsTrigger value="api">APIs</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="p-5 surface-card space-y-3">
            {profile && (
              <>
                <div className="space-y-1"><Label>Nome</Label>
                  <Input value={profile.display_name ?? ""} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} />
                </div>
                <div className="space-y-1"><Label>Moeda padrão</Label>
                  <Select value={profile.currency} onValueChange={(v) => setProfile({ ...profile, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">Real (BRL)</SelectItem>
                      <SelectItem value="USD">Dólar (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Fuso horário</Label>
                  <Input value={profile.timezone} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })} />
                </div>
                <Button onClick={saveProfile}>Salvar</Button>
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="bankrolls">
          <Card className="p-5 surface-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Suas bancas</h3>
              <div className="flex gap-2">
                <Dialog open={txnOpen} onOpenChange={setTxnOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={bankrolls.length === 0}>Depósito / Saque</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Movimentar banca</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <Select value={txnBankroll} onValueChange={setTxnBankroll}>
                        <SelectTrigger><SelectValue placeholder="Banca" /></SelectTrigger>
                        <SelectContent>{bankrolls.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={txnType} onValueChange={setTxnType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deposit">Depósito</SelectItem>
                          <SelectItem value="withdraw">Saque</SelectItem>
                          <SelectItem value="adjustment">Ajuste</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input type="number" step="0.01" value={txnAmount} onChange={(e) => setTxnAmount(e.target.value)} placeholder="Valor" />
                    </div>
                    <DialogFooter><Button onClick={submitTxn}>Confirmar</Button></DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={bankrollOpen} onOpenChange={setBankrollOpen}>
                  <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-3 w-3" />Nova banca</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Criar banca</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div className="space-y-1"><Label>Nome</Label>
                        <Input value={bankrollName} onChange={(e) => setBankrollName(e.target.value)} placeholder="Banca principal" />
                      </div>
                      <div className="space-y-1"><Label>Saldo inicial</Label>
                        <Input type="number" step="0.01" value={bankrollAmount} onChange={(e) => setBankrollAmount(e.target.value)} />
                      </div>
                    </div>
                    <DialogFooter><Button onClick={createBankroll}>Criar</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Inicial</TableHead>
                  <TableHead className="text-right">Atual</TableHead>
                  <TableHead className="text-right">Variação</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankrolls.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhuma banca</TableCell></TableRow>}
                {bankrolls.map((b) => {
                  const diff = Number(b.current_balance) - Number(b.initial_balance);
                  return (
                    <TableRow key={b.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {b.name}
                          {b.is_default && <span className="text-[10px] uppercase text-primary">padrão</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatMoney(b.initial_balance, b.currency)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatMoney(b.current_balance, b.currency)}</TableCell>
                      <TableCell className={`text-right font-mono ${diff > 0 ? "text-primary" : diff < 0 ? "text-destructive" : ""}`}>
                        {formatMoney(diff, b.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {!b.is_default && <Button variant="ghost" size="sm" onClick={() => setDefault(b.id)}>Definir padrão</Button>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card className="p-5 surface-card space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">Integrações com APIs externas</h3>
              <p className="text-sm text-muted-foreground">
                Para ativar as funcionalidades de Mercado ao Vivo, é preciso configurar chaves de API. Elas ficam guardadas como secrets do servidor.
              </p>
            </div>
            <div className="rounded-lg border border-border p-4 space-y-2">
              <div className="font-semibold">The Odds API</div>
              <p className="text-xs text-muted-foreground">
                Cobertura de odds em centenas de casas. Plano gratuito disponível em <a href="https://the-odds-api.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">the-odds-api.com</a>.
              </p>
              <p className="text-xs">Quando tiver a chave, peça à IA para configurar o secret <code className="bg-muted px-1 rounded">ODDS_API_KEY</code>.</p>
            </div>
            <div className="rounded-lg border border-border p-4 space-y-2">
              <div className="font-semibold">API-Football</div>
              <p className="text-xs text-muted-foreground">
                Estatísticas, escalações, H2H. Plano gratuito disponível em <a href="https://www.api-football.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">api-football.com</a>.
              </p>
              <p className="text-xs">Configure o secret <code className="bg-muted px-1 rounded">API_FOOTBALL_KEY</code>.</p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
