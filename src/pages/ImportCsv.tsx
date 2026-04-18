import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Upload, Loader2 } from "lucide-react";

interface Row { [k: string]: string }

const REQUIRED = ["odd", "stake"];
const FIELDS = ["placed_at", "sport", "league", "market", "selection", "match_description", "bookmaker", "odd", "stake", "estimated_probability", "status"];

export default function ImportCsv() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);

  const onFile = async (f: File) => {
    const text = await f.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return;
    const sep = lines[0].includes(";") ? ";" : ",";
    const hdr = lines[0].split(sep).map((h) => h.trim());
    setHeaders(hdr);
    const data = lines.slice(1).map((line) => {
      const cells = line.split(sep);
      const r: Row = {};
      hdr.forEach((h, i) => { r[h] = (cells[i] ?? "").trim(); });
      return r;
    });
    setRows(data);
    // Auto-map by name
    const auto: Record<string, string> = {};
    FIELDS.forEach((f) => {
      const found = hdr.find((h) => h.toLowerCase().includes(f.split("_")[0]));
      if (found) auto[f] = found;
    });
    setMapping(auto);
  };

  const importAll = async () => {
    if (!user) return;
    if (!REQUIRED.every((f) => mapping[f])) { toast.error("Mapeie ao menos odd e stake"); return; }
    setImporting(true);
    let ok = 0, fail = 0;
    for (const r of rows) {
      const odd = Number(r[mapping.odd]?.replace(",", "."));
      const stake = Number(r[mapping.stake]?.replace(",", "."));
      if (!odd || !stake) { fail++; continue; }
      const prob = mapping.estimated_probability ? Number(r[mapping.estimated_probability]?.replace(",", ".")) / 100 : null;
      const ev = prob && odd ? prob * odd - 1 : null;
      const status = (mapping.status && r[mapping.status]?.toLowerCase()) || "pending";
      const validStatus = ["pending", "won", "lost", "void", "cashout"].includes(status) ? status : "pending";
      const { error } = await supabase.from("bets").insert({
        user_id: user.id,
        bet_type: "single",
        sport: mapping.sport ? r[mapping.sport] : null,
        league: mapping.league ? r[mapping.league] : null,
        market: mapping.market ? r[mapping.market] : null,
        selection: mapping.selection ? r[mapping.selection] : null,
        match_description: mapping.match_description ? r[mapping.match_description] : null,
        bookmaker: mapping.bookmaker ? r[mapping.bookmaker] : null,
        odd, stake,
        estimated_probability: prob,
        ev,
        status: validStatus as any,
        placed_at: mapping.placed_at && r[mapping.placed_at] ? new Date(r[mapping.placed_at]).toISOString() : new Date().toISOString(),
      });
      if (error) fail++; else ok++;
    }
    toast.success(`${ok} apostas importadas${fail ? `, ${fail} falharam` : ""}`);
    setImporting(false);
    if (ok > 0) navigate("/bets");
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importar CSV</h1>
        <p className="text-sm text-muted-foreground">Faça upload de um arquivo .csv com suas apostas e mapeie as colunas</p>
      </div>

      <Card className="p-5 surface-card">
        <Label className="mb-2 block">Arquivo CSV</Label>
        <Input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        <p className="text-xs text-muted-foreground mt-2">Separador detectado automaticamente (vírgula ou ponto-e-vírgula). Decimais com vírgula são suportados.</p>
      </Card>

      {headers.length > 0 && (
        <>
          <Card className="p-5 surface-card">
            <h3 className="text-sm font-semibold mb-3">Mapeamento de colunas</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {FIELDS.map((f) => (
                <div key={f} className="space-y-1">
                  <Label className="text-xs">{f}{REQUIRED.includes(f) && <span className="text-destructive"> *</span>}</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={mapping[f] ?? ""}
                    onChange={(e) => setMapping((m) => ({ ...m, [f]: e.target.value }))}
                  >
                    <option value="">— ignorar —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 surface-card">
            <h3 className="text-sm font-semibold mb-3">Preview ({rows.length} linhas)</h3>
            <div className="rounded border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>{headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 5).map((r, i) => (
                    <TableRow key={i}>{headers.map((h) => <TableCell key={h} className="text-xs">{r[h]}</TableCell>)}</TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button onClick={importAll} disabled={importing} className="mt-4 gap-2">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Importar {rows.length} apostas
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}
