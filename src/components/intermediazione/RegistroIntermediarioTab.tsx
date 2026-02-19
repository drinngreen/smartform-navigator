import { useState } from "react";
import { Search, BookOpen, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIntermediari } from "@/hooks/useIntermediari";
import { useMovimentiIntermediario } from "@/hooks/useIntermediazioni";

export function RegistroIntermediarioTab() {
  const { data: intermediari = [] } = useIntermediari();
  const [selectedId, setSelectedId] = useState<string>("");
  const [search, setSearch] = useState("");
  const { data: movimenti = [], isLoading } = useMovimentiIntermediario(selectedId || undefined);

  const filtered = (movimenti as any[]).filter(m =>
    `${m.cer} ${m.produttore_denominazione} ${m.destinatario_denominazione} ${m.numero_fir}`.toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const headers = ["Data", "CER", "Produttore", "Destinatario", "Qty kg", "N° FIR", "Note"];
    const rows = filtered.map((m: any) => [
      m.data_movimento, m.cer, m.produttore_denominazione || "", m.destinatario_denominazione || "",
      m.quantita_kg, m.numero_fir || "", m.note || "",
    ]);
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `registro_intermediario_${selectedId}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-64 bg-card/60 border-border/30">
            <SelectValue placeholder="Seleziona intermediario" />
          </SelectTrigger>
          <SelectContent>
            {intermediari.map(i => (
              <SelectItem key={i.id} value={i.id}>{i.ragione_sociale}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cerca nel registro..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-card/60 border-border/30" />
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0} className="gap-2">
          <Download className="h-4 w-4" /> Esporta CSV
        </Button>
      </div>

      {!selectedId ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Seleziona un intermediario per visualizzare il registro</p>
        </div>
      ) : isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Caricamento...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nessun movimento trovato</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/30">
          <table className="w-full text-sm">
            <thead className="bg-card/80">
              <tr className="border-b border-border/30">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Data</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">CER</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Produttore</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Destinatario</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Qty (kg)</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">N° FIR</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m: any) => (
                <tr key={m.id} className="border-b border-border/10 hover:bg-card/40">
                  <td className="px-4 py-3 font-mono text-xs">{m.data_movimento}</td>
                  <td className="px-4 py-3 font-mono">{m.cer}</td>
                  <td className="px-4 py-3">{m.produttore_denominazione || "—"}</td>
                  <td className="px-4 py-3">{m.destinatario_denominazione || "—"}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(m.quantita_kg).toLocaleString("it-IT")}</td>
                  <td className="px-4 py-3 font-mono text-xs">{m.numero_fir || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{m.note || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
