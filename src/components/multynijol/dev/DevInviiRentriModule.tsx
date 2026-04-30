import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Send, Filter } from "lucide-react";
import inviiData from "@/data/inviiRentriMulty.json";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";

interface InvioRentri {
  registro_id: string | null;
  registro_nome: string | null;
  rentri_id: string | null;
  progressivo: string | null;
  data: string | null;
  causale: string | null;
  cer: string | null;
  stato: string | null;
  quantita: number | null;
  produttore: string | null;
  destinatario: string | null;
  note: string | null;
}

const dataset = inviiData as InvioRentri[];

const formatDate = (s: string | null) => {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return s;
  }
};

export function DevInviiRentriModule() {
  const [search, setSearch] = useState("");
  const [registroFilter, setRegistroFilter] = useState<string>("all");
  const [causaleFilter, setCausaleFilter] = useState<string>("all");

  const registri = useMemo(() => {
    const s = new Set<string>();
    dataset.forEach((r) => r.registro_nome && s.add(r.registro_nome));
    return Array.from(s).sort();
  }, []);

  const causali = useMemo(() => {
    const s = new Set<string>();
    dataset.forEach((r) => r.causale && s.add(r.causale));
    return Array.from(s).sort();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dataset.filter((r) => {
      if (registroFilter !== "all" && r.registro_nome !== registroFilter) return false;
      if (causaleFilter !== "all" && r.causale !== causaleFilter) return false;
      if (!q) return true;
      const hay = [
        r.rentri_id, r.progressivo, r.causale, r.cer, r.produttore, r.destinatario, r.note, r.registro_nome,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [search, registroFilter, causaleFilter]);

  const exportCols = [
    { header: "Registro", key: "registro_nome", width: 28 },
    { header: "ID RENTRI", key: "rentri_id", width: 24 },
    { header: "Anno/Progr.", key: "progressivo", width: 14 },
    { header: "Data", key: "data", width: 12, format: (v: any) => formatDate(v) },
    { header: "Causale", key: "causale", width: 14 },
    { header: "CER", key: "cer", width: 10 },
    { header: "Stato", key: "stato", width: 8 },
    { header: "Quantità", key: "quantita", width: 12 },
    { header: "Produttore", key: "produttore", width: 28 },
    { header: "Destinatario", key: "destinatario", width: 28 },
    { header: "Annotazioni", key: "note", width: 30 },
  ];

  const totals = useMemo(() => {
    const tot = filtered.length;
    const conFir = filtered.filter((r) => r.note && /FIR/i.test(r.note)).length;
    const carichi = filtered.filter((r) => r.causale && /carico/i.test(r.causale) && !/scarico/i.test(r.causale)).length;
    const scarichi = filtered.filter((r) => r.causale && /scarico/i.test(r.causale)).length;
    return { tot, conFir, carichi, scarichi };
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-violet-300 flex items-center gap-2">
            <Send className="h-4 w-4" />
            Invii al RENTRI — Multyproget
          </h3>
          <p className="text-xs text-muted-foreground">
            Report dettagliato delle registrazioni inviate al portale RENTRI · Febbraio – Marzo 2026
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!filtered.length}
            onClick={() => exportToExcel(filtered, exportCols, "invii-rentri-multy", "Invii RENTRI")}
            className="gap-1 border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
          >
            <Download className="h-3 w-3" /> Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!filtered.length}
            onClick={() => exportToPdf(filtered, exportCols, "invii-rentri-multy", "Invii RENTRI Multyproget — Feb/Mar 2026")}
            className="gap-1 border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
          >
            <FileText className="h-3 w-3" /> PDF
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Totale Invii", value: totals.tot, color: "text-violet-300" },
          { label: "Con FIR", value: totals.conFir, color: "text-cyan-300" },
          { label: "Carichi", value: totals.carichi, color: "text-emerald-300" },
          { label: "Scarichi", value: totals.scarichi, color: "text-rose-300" },
        ].map((s) => (
          <div key={s.label} className="bg-card/60 border border-border/30 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString("it-IT")}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca per ID RENTRI, FIR, CER, soggetto…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72 h-9"
        />
        <Select value={registroFilter} onValueChange={setRegistroFilter}>
          <SelectTrigger className="w-56 h-9"><SelectValue placeholder="Registro" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i registri</SelectItem>
            {registri.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={causaleFilter} onValueChange={setCausaleFilter}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Causale" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le causali</SelectItem>
            {causali.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        {(search || registroFilter !== "all" || causaleFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setRegistroFilter("all"); setCausaleFilter("all"); }}>
            Reset
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card/60 border border-border/30 rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[65vh]">
          <table className="w-full min-w-max text-sm">
            <thead className="sticky top-0 z-10 bg-card border-b border-border/30">
              <tr className="text-xs text-muted-foreground">
                <th className="text-left px-3 py-2 font-medium">Registro</th>
                <th className="text-left px-3 py-2 font-mono font-medium">ID RENTRI</th>
                <th className="text-left px-3 py-2 font-medium">Anno/Progr.</th>
                <th className="text-left px-3 py-2 font-medium">Data</th>
                <th className="text-left px-3 py-2 font-medium">Causale</th>
                <th className="text-left px-3 py-2 font-medium">CER</th>
                <th className="text-center px-3 py-2 font-medium">Stato</th>
                <th className="text-right px-3 py-2 font-medium">Quantità</th>
                <th className="text-left px-3 py-2 font-medium">Produttore</th>
                <th className="text-left px-3 py-2 font-medium">Destinatario</th>
                <th className="text-left px-3 py-2 font-medium">Annotazioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-muted-foreground">
                    Nessun invio trovato con i filtri attuali
                  </td>
                </tr>
              ) : (
                filtered.map((r, i) => (
                  <tr key={`${r.rentri_id}-${i}`} className="border-b border-border/10 hover:bg-violet-500/5">
                    <td className="px-3 py-2 text-xs">{r.registro_nome || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-violet-300">{r.rentri_id || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.progressivo || "—"}</td>
                    <td className="px-3 py-2 text-xs">{formatDate(r.data)}</td>
                    <td className="px-3 py-2 text-xs">
                      {r.causale ? (
                        <Badge variant="outline" className={
                          /scarico/i.test(r.causale)
                            ? "border-rose-500/30 text-rose-300"
                            : /carico/i.test(r.causale)
                              ? "border-emerald-500/30 text-emerald-300"
                              : ""
                        }>{r.causale}</Badge>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{r.cer || "—"}</td>
                    <td className="px-3 py-2 text-center text-xs">{r.stato || "—"}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {r.quantita != null ? Number(r.quantita).toLocaleString("it-IT") : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs max-w-[200px] truncate" title={r.produttore || ""}>{r.produttore || "—"}</td>
                    <td className="px-3 py-2 text-xs max-w-[200px] truncate" title={r.destinatario || ""}>{r.destinatario || "—"}</td>
                    <td className="px-3 py-2 text-xs max-w-[260px] truncate" title={r.note || ""}>{r.note || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 border-t border-border/20 text-xs text-muted-foreground bg-card/40">
          {filtered.length.toLocaleString("it-IT")} di {dataset.length.toLocaleString("it-IT")} invii
        </div>
      </div>
    </div>
  );
}
