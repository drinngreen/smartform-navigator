import { useMemo, useRef, useState } from "react";
import { Search, Loader2, FileSpreadsheet, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { elencoFirIntermediario, type FirIntermediarioRow } from "@/lib/rentriFirIntermediario";
import { dettaglioFormularioRentri, RENTRI_CF_SOGGETTO, rentriConfigKey, type RentriCliente } from "@/lib/rentriVpsApi";
import { ruoliFormulario, statoFormulario } from "@/lib/rentriFirView";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";

export function RentriFormulariPanel({ cliente }: { cliente: RentriCliente }) {
  const cf = RENTRI_CF_SOGGETTO[rentriConfigKey(cliente)];
  const [rows, setRows] = useState<FirIntermediarioRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("Tutti");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [readAt, setReadAt] = useState("");
  const [detail, setDetail] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  const visible = useMemo(() => (rows ?? []).filter((r) => {
    const text = [r.numeroFir, r.produttore, r.destinatario, r.trasportatore, r.intermediario, r.eer].join(" ").toLowerCase();
    return text.replace(/\s/g, "").includes(query.toLowerCase().replace(/\s/g, "")) && (role === "Tutti" || ruoliFormulario(r, cf).includes(role as ReturnType<typeof ruoliFormulario>[number])) && (!from || !r.data || r.data.slice(0, 10) >= from) && (!to || !r.data || r.data.slice(0, 10) <= to);
  }), [rows, query, role, from, to, cf]);
  const load = async () => {
    const id = ++request.current;
    setLoading(true); setError(null); setDetail(null); setRows(null);
    try {
      const result = await elencoFirIntermediario(cliente, { dataDa: from || undefined, dataA: to || undefined });
      if (id !== request.current) return;
      if (!result.response.success) throw new Error(result.response.userMessage || result.response.error || "Lettura RENTRI non riuscita");
      setRows(result.righe); setReadAt(new Date().toLocaleString("it-IT"));
    } catch (e) { if (id === request.current) setError(e instanceof Error ? e.message : String(e)); }
    finally { if (id === request.current) setLoading(false); }
  };
  const readDetail = async (r: FirIntermediarioRow) => {
    setBusy(true); setError(null); setDetail(null);
    try {
      const res = await dettaglioFormularioRentri(cliente, r.numeroFir);
      if (!res.success) throw new Error(res.userMessage || res.error || "Dettaglio non disponibile");
      setDetail(res.data);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  const exportRows = visible.map((r) => ({ ...r, ruoli: ruoliFormulario(r, cf).join(", "), stato: r.stato || "—" }));
  const cols = [{ header: "FIR", key: "numeroFir", width: 20 }, { header: "Emissione", key: "data", width: 14 }, { header: "Ruoli società", key: "ruoli", width: 24 }, { header: "Produttore", key: "produttore", width: 28 }, { header: "Destinatario", key: "destinatario", width: 28 }, { header: "Trasportatore", key: "trasportatore", width: 28 }, { header: "Intermediario", key: "intermediario", width: 28 }, { header: "EER", key: "eer", width: 10 }, { header: "Quantità elenco", key: "quantitaKg", width: 15 }, { header: "Stato RENTRI", key: "stato", width: 28 }];
  return <section className="space-y-4" aria-label="Tutti i formulari RENTRI">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-lg">Formulari RENTRI — {cliente === "niyol" ? "Niyol" : "Multyproget"}</h2><Button onClick={() => void load()} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Leggi formulari dal RENTRI</Button></div>
    <div className="flex flex-wrap gap-3 items-end">
      <label className="text-xs text-muted-foreground">Cerca FIR o soggetto<Input className="mt-1 w-56" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <label className="text-xs text-muted-foreground">Ruolo della società<select className="mt-1 block rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" value={role} onChange={(e) => setRole(e.target.value)}>{["Tutti", "Produttore", "Destinatario", "Trasportatore", "Intermediario"].map((v) => <option key={v}>{v}</option>)}</select></label>
      <label className="text-xs text-muted-foreground">Emissione dal<Input className="mt-1" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
      <label className="text-xs text-muted-foreground">Al<Input className="mt-1" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {false && <p role="status" className="text-sm text-muted-foreground">L’elenco restituito raggiunge 100 formulari: la completezza oltre questa soglia non è verificata. Le quantità dell’elenco non attestano il peso accettato.</p>}
    {rows !== null && <><div className="flex flex-wrap items-center gap-3 text-sm"><span>{visible.length} formulari su {rows.length} restituiti dal RENTRI</span><span className="text-xs text-muted-foreground">Letti il {readAt}</span><div className="ml-auto flex gap-2"><Button size="sm" variant="outline" disabled={!visible.length} onClick={() => exportToExcel(exportRows, cols, "formulari-rentri", "Formulari")}><FileSpreadsheet className="h-4 w-4" />Excel</Button><Button size="sm" variant="outline" disabled={!visible.length} onClick={() => exportToPdf(exportRows, cols, "formulari-rentri", `Formulari RENTRI — ${cliente} — ${readAt}`)}><Printer className="h-4 w-4" />PDF</Button></div></div>
      <div className="overflow-auto max-h-[600px] border border-border rounded-md"><table className="w-full text-xs"><thead className="bg-secondary sticky top-0"><tr>{["Formulario", "Emissione", "Ruoli società", "Produttore → Destinatario", "Trasportatore", "Intermediario", "EER", "Quantità elenco", "Stato RENTRI", ""].map((h) => <th key={h} className="text-left px-3 py-3 whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{visible.map((r, i) => <tr key={`${r.numeroFir}-${i}`} className="border-t border-border"><td className="px-3 py-2 font-mono whitespace-nowrap">{r.numeroFir}</td><td className="px-3 py-2 whitespace-nowrap">{r.data?.slice(0, 10) || "—"}</td><td className="px-3 py-2">{ruoliFormulario(r, cf).join(", ") || "Non indicato"}</td><td className="px-3 py-2 min-w-48">{r.produttore || "—"} → {r.destinatario || "—"}</td><td className="px-3 py-2">{r.trasportatore || "—"}</td><td className="px-3 py-2">{r.intermediario || "—"}</td><td className="px-3 py-2">{r.eer || "—"}</td><td className="px-3 py-2 text-right">{r.quantitaKg?.toLocaleString("it-IT") ?? "—"}</td><td className="px-3 py-2"><span>{statoFormulario(r.stato)}</span><span className="block text-muted-foreground">{r.stato}</span></td><td className="px-3 py-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => void readDetail(r)}>Dettaglio RENTRI</Button></td></tr>)}{!visible.length && <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">Nessun formulario in questa selezione.</td></tr>}</tbody></table></div></>}
    {detail !== null && <div className="border-t border-border pt-4"><div className="flex justify-between items-center"><h3 className="font-semibold">Dettaglio riletto dal RENTRI</h3><Button size="sm" variant="ghost" onClick={() => setDetail(null)}>Chiudi</Button></div><pre className="overflow-auto max-h-96 text-xs mt-3">{JSON.stringify(detail, null, 2)}</pre></div>}
  </section>;
}