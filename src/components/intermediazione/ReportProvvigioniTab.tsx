import { useState, useMemo } from "react";
import { BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIntermediazioni } from "@/hooks/useIntermediazioni";
import { useIntermediari } from "@/hooks/useIntermediari";

export function ReportProvvigioniTab() {
  const { data: items = [] } = useIntermediazioni();
  const { data: intermediari = [] } = useIntermediari();
  const [filtroIntermediario, setFiltroIntermediario] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (filtroIntermediario && i.intermediario_id !== filtroIntermediario) return false;
      if (dateFrom && i.created_at < dateFrom) return false;
      if (dateTo && i.created_at > dateTo + "T23:59:59") return false;
      return true;
    });
  }, [items, filtroIntermediario, dateFrom, dateTo]);

  // Aggregations
  const totaleProvvigioni = filtered.reduce((s, i) => s + (i.importo_provvigione || 0), 0);
  const totaleFatturate = filtered.filter(i => i.fatturata).reduce((s, i) => s + (i.importo_provvigione || 0), 0);
  const totaleDaFatturare = filtered.filter(i => !i.fatturata && i.stato === "completata").reduce((s, i) => s + (i.importo_provvigione || 0), 0);
  const totaleKg = filtered.reduce((s, i) => s + (i.quantita_effettiva_kg || i.quantita_stimata_kg || 0), 0);

  // Group by intermediario
  const byIntermediario = useMemo(() => {
    const map = new Map<string, { name: string; count: number; provvigioni: number; kg: number }>();
    filtered.forEach(i => {
      const name = i.intermediario?.ragione_sociale || "N/D";
      const existing = map.get(i.intermediario_id) || { name, count: 0, provvigioni: 0, kg: 0 };
      existing.count++;
      existing.provvigioni += i.importo_provvigione || 0;
      existing.kg += i.quantita_effettiva_kg || i.quantita_stimata_kg || 0;
      map.set(i.intermediario_id, existing);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].provvigioni - a[1].provvigioni);
  }, [filtered]);

  // Group by CER
  const byCER = useMemo(() => {
    const map = new Map<string, { count: number; provvigioni: number; kg: number }>();
    filtered.forEach(i => {
      const cer = i.cer || "N/D";
      const existing = map.get(cer) || { count: 0, provvigioni: 0, kg: 0 };
      existing.count++;
      existing.provvigioni += i.importo_provvigione || 0;
      existing.kg += i.quantita_effettiva_kg || i.quantita_stimata_kg || 0;
      map.set(cer, existing);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].provvigioni - a[1].provvigioni);
  }, [filtered]);

  const exportCSV = () => {
    const headers = ["Intermediario", "Produttore", "Destinatario", "CER", "Qty kg", "Tipo Fee", "Valore", "Provvigione €", "Stato", "Fatturata"];
    const rows = filtered.map(i => [
      i.intermediario?.ragione_sociale || "", i.produttore?.name || "", i.destinatario?.name || "",
      i.cer || "", i.quantita_effettiva_kg ?? i.quantita_stimata_kg ?? "",
      i.tipo_provvigione, i.valore_provvigione, i.importo_provvigione?.toFixed(2) ?? "",
      i.stato, i.fatturata ? "Sì" : "No",
    ]);
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "report_provvigioni.csv"; a.click();
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <Label className="text-xs">Intermediario</Label>
          <Select value={filtroIntermediario} onValueChange={setFiltroIntermediario}>
            <SelectTrigger className="w-52 bg-card/60 border-border/30"><SelectValue placeholder="Tutti" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tutti</SelectItem>
              {intermediari.map(i => <SelectItem key={i.id} value={i.id}>{i.ragione_sociale}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Da</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40 bg-card/60 border-border/30" /></div>
        <div><Label className="text-xs">A</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40 bg-card/60 border-border/30" /></div>
        <Button variant="outline" onClick={exportCSV} className="gap-2"><Download className="h-4 w-4" /> Esporta</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Totale Provvigioni", value: `€${totaleProvvigioni.toFixed(2)}`, color: "text-primary" },
          { label: "Fatturate", value: `€${totaleFatturate.toFixed(2)}`, color: "text-emerald-400" },
          { label: "Da Fatturare", value: `€${totaleDaFatturare.toFixed(2)}`, color: "text-yellow-400" },
          { label: "Totale Kg", value: totaleKg.toLocaleString("it-IT"), color: "text-blue-400" },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl bg-card/60 border border-border/30 text-center">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* By intermediario */}
      <div className="p-4 rounded-xl bg-card/60 border border-border/30">
        <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> Per Intermediario
        </h3>
        {byIntermediario.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun dato</p>
        ) : (
          <div className="space-y-2">
            {byIntermediario.map(([id, d]) => (
              <div key={id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{d.name}</span>
                <div className="flex gap-6 text-xs text-muted-foreground">
                  <span>{d.count} op.</span>
                  <span>{d.kg.toLocaleString("it-IT")} kg</span>
                  <span className="text-primary font-medium">€{d.provvigioni.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* By CER */}
      <div className="p-4 rounded-xl bg-card/60 border border-border/30">
        <h3 className="text-sm font-medium text-foreground mb-3">Per CER</h3>
        {byCER.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun dato</p>
        ) : (
          <div className="space-y-2">
            {byCER.map(([cer, d]) => (
              <div key={cer} className="flex items-center justify-between text-sm">
                <span className="font-mono text-foreground">{cer}</span>
                <div className="flex gap-6 text-xs text-muted-foreground">
                  <span>{d.count} op.</span>
                  <span>{d.kg.toLocaleString("it-IT")} kg</span>
                  <span className="text-primary font-medium">€{d.provvigioni.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
