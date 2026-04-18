import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Upload, Search } from "lucide-react";
import { NewBetDialog } from "@/components/NewBetDialog";
import { EvBadge } from "@/components/EvBadge";
import { formatMoney, formatNumber, formatPct } from "@/lib/ev";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Bet {
  id: string; bet_type: string; sport: string | null; league: string | null;
  market: string | null; selection: string | null; match_description: string | null;
  bookmaker: string | null; odd: number; stake: number; estimated_probability: number | null;
  ev: number | null; status: string; profit: number; placed_at: string; bankroll_id: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente", won: "Ganha", lost: "Perdida", void: "Anulada", cashout: "Cashout",
};

export default function Bets() {
  const { user } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase.from("bets").select("*").order("placed_at", { ascending: false });
    if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
    const { data } = await q;
    setBets((data as Bet[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user, statusFilter]);

  const filtered = bets.filter((b) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return [b.sport, b.league, b.market, b.selection, b.match_description, b.bookmaker]
      .filter(Boolean).some((v) => v!.toLowerCase().includes(s));
  });

  const settle = async (bet: Bet, status: "won" | "lost" | "void" | "cashout") => {
    let profit = 0;
    let payout = 0;
    if (status === "won") { profit = Number(bet.stake) * (Number(bet.odd) - 1); payout = Number(bet.stake) * Number(bet.odd); }
    if (status === "lost") { profit = -Number(bet.stake); payout = 0; }
    if (status === "void") { profit = 0; payout = Number(bet.stake); }
    if (status === "cashout") {
      const v = prompt("Valor recebido no cashout:");
      if (!v) return;
      payout = Number(v); profit = payout - Number(bet.stake);
    }

    const { error } = await supabase.from("bets").update({ status, profit, payout, settled_at: new Date().toISOString() }).eq("id", bet.id);
    if (error) { toast.error(error.message); return; }

    if (payout > 0 && bet.bankroll_id) {
      await supabase.from("bankroll_transactions").insert({
        user_id: user!.id, bankroll_id: bet.bankroll_id, type: "bet_payout", amount: payout, bet_id: bet.id,
        description: `Retorno aposta #${bet.id.slice(0, 8)}`,
      });
      const { data: br } = await supabase.from("bankrolls").select("current_balance").eq("id", bet.bankroll_id).single();
      if (br) await supabase.from("bankrolls").update({ current_balance: Number(br.current_balance) + payout }).eq("id", bet.bankroll_id);
    }
    toast.success("Aposta liquidada");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Apostas</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas apostas registradas</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/import"><Button variant="outline" className="gap-2"><Upload className="h-4 w-4" />Importar CSV</Button></Link>
          <NewBetDialog onCreated={load} />
        </div>
      </div>

      <Card className="p-4 surface-card">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="won">Ganha</SelectItem>
              <SelectItem value="lost">Perdida</SelectItem>
              <SelectItem value="void">Anulada</SelectItem>
              <SelectItem value="cashout">Cashout</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Jogo / Mercado</TableHead>
                <TableHead>Casa</TableHead>
                <TableHead className="text-right">Odd</TableHead>
                <TableHead className="text-right">Stake</TableHead>
                <TableHead>EV</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma aposta encontrada</TableCell></TableRow>
              ) : filtered.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(b.placed_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{b.match_description ?? `${b.sport ?? "—"} · ${b.league ?? ""}`}</div>
                    <div className="text-xs text-muted-foreground">{b.market} {b.selection && `· ${b.selection}`}</div>
                  </TableCell>
                  <TableCell className="text-xs">{b.bookmaker ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">{formatNumber(b.odd)}</TableCell>
                  <TableCell className="text-right font-mono">{formatMoney(b.stake)}</TableCell>
                  <TableCell><EvBadge ev={b.ev} compact /></TableCell>
                  <TableCell><Badge variant="outline">{STATUS_LABEL[b.status] ?? b.status}</Badge></TableCell>
                  <TableCell className={`text-right font-mono ${b.profit > 0 ? "text-primary" : b.profit < 0 ? "text-destructive" : ""}`}>
                    {b.status === "pending" ? "—" : formatMoney(b.profit)}
                  </TableCell>
                  <TableCell>
                    {b.status === "pending" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => settle(b, "won")}>✅ Ganha</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => settle(b, "lost")}>❌ Perdida</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => settle(b, "void")}>↩️ Anular</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => settle(b, "cashout")}>💰 Cashout</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
