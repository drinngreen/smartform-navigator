import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Search, Copy, Mail, Inbox, FileSearch, CheckCircle2, DownloadCloud } from "lucide-react";
import { toast } from "sonner";
import { elencaDocumentiSibillFull, scansionaDocumentiSibill, type SibillDocumento } from "@/lib/sibill";
import { FattureEmesseEsitoPanel } from "./FattureEmesseEsitoPanel";

interface Props { mock?: boolean; tenantId?: string }

const eur = (v: number | null) =>
  v == null ? "—" : new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v);

const dataIt = (d: string | null) => {
  if (!d) return "—";
  const iso = d.slice(0, 10);
  const [y, m, g] = iso.split("-");
  return y && m && g ? `${g}/${m}/${y}` : iso;
};

/** Elenco documenti letti da Sibill (emesse "/P" e ricevute), con la stessa vista del gestionale Sibill. */
export function SibillDocumentiPanel({ mock, tenantId }: Props) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [scanning, setScanning] = useState(false);
  const [scanInfo, setScanInfo] = useState<string | null>(null);
  const [modo, setModo] = useState<"P" | "IN">("P");
  const queryKey = ["sibill-documenti-v3", !!mock, modo] as const;
  const { data: res, isFetching, error } = useQuery({
    queryKey,
    queryFn: () => elencaDocumentiSibillFull({ mock, filter: modo }),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const docs = res?.documents ?? [];

  /** Sincronizza l'intero archivio Sibill a blocchi (l'API non consente filtri lato server). */
  const sincronizza = async (restart = false) => {
    setScanning(true);
    try {
      let done = false;
      let first = true;
      for (let i = 0; i < 40 && !done; i++) {
        const r = await scansionaDocumentiSibill({ mock, pages: 12, restart: restart && first });
        first = false;
        done = !!r.done;
        setScanInfo(`Scansione Sibill: ${r.scanned} documenti letti, ${r.cached} in archivio${done ? " — completata" : "…"}`);
        await queryClient.invalidateQueries({ queryKey: ["sibill-documenti-v3"] });
        if (r.rate_limited) {
          toast.warning("Sibill ha limitato le chiamate: riprendo tra poco, l'elenco è parziale.");
          break;
        }
      }
      if (done) toast.success("Archivio Sibill aggiornato");
    } catch (e: any) {
      toast.error(e.message || "Errore sincronizzazione Sibill");
    } finally {
      setScanning(false);
    }
  };


  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return docs;
    return docs.filter((d: SibillDocumento) =>
      (d.number || "").toLowerCase().includes(s) || (d.counterpart || "").toLowerCase().includes(s));
  }, [docs, search]);

  const totale = useMemo(() => filtered.reduce((a, d) => a + (d.gross || 0), 0), [filtered]);
  const allChecked = filtered.length > 0 && filtered.every(d => selected[d.id || ""]);

  const copia = (d: SibillDocumento) => {
    navigator.clipboard.writeText(
      [d.number, d.counterpart, dataIt(d.date), eur(d.gross)].filter(Boolean).join(" — ")
    );
    toast.success("Riga copiata");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-background/60 border border-border/30">
          {([["P", "Emesse (/P)"], ["IN", "Ricevute (entrata)"]] as const).map(([v, label]) => (
            <button key={v} onClick={() => setModo(v)}
              className={`px-3 py-1.5 rounded-lg text-sm ${modo === v ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cerca numero documento o cliente…"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm" />
        </div>
        <span className="text-xs text-muted-foreground">
          {isFetching ? "Lettura archivio…" : `${filtered.length} ${modo === "IN" ? "fatture ricevute" : "fatture /P"} — totale ${eur(totale)}`}
        </span>
        <button onClick={() => queryClient.invalidateQueries({ queryKey })} disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/40 bg-background/40 text-sm hover:bg-background/70 disabled:opacity-40">
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Aggiorna elenco
        </button>
        <button onClick={() => sincronizza(true)} disabled={scanning}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-primary/40 bg-primary/15 text-primary text-sm hover:bg-primary/25 disabled:opacity-40">
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
          Sincronizza da Sibill
        </button>
      </div>

      {(scanInfo || (res && !res.done)) && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 px-4 py-2 text-xs">
          {scanInfo || "Archivio Sibill incompleto: premi «Sincronizza da Sibill» per scaricare tutti i documenti (emesse e ricevute)."}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {(error as any).message}
          {/\bTroppe|429|Limite/i.test((error as any).message || "") && (
            <div className="mt-1 text-xs opacity-80">Sibill limita il numero di chiamate: attendi un paio di minuti e riprova.</div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-border/30 bg-card/60 backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-background/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="p-3 w-10">
                  <input type="checkbox" checked={allChecked}
                    onChange={e => {
                      const next: Record<string, boolean> = {};
                      if (e.target.checked) filtered.forEach(d => { next[d.id || ""] = true; });
                      setSelected(next);
                    }} />
                </th>
                <th className="p-3 w-10" />
                <th className="p-3 text-left">Numero documento</th>
                <th className="p-3 text-left">Descrizione</th>
                <th className="p-3 text-left">Data documento</th>
                <th className="p-3 text-right">Imponibile</th>
                <th className="p-3 text-right">IVA</th>
                <th className="p-3 text-right">Totale</th>
                <th className="p-3 text-left">Categoria</th>
                <th className="p-3 text-center">Stato</th>
                <th className="p-3 text-center">Copia</th>
              </tr>
            </thead>
            <tbody>
              {isFetching && filtered.length === 0 && (
                <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Lettura documenti da Sibill…
                </td></tr>
              )}
              {!isFetching && filtered.length === 0 && (
                <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">{modo === "IN" ? "Nessuna fattura in entrata trovata su Sibill." : "Nessuna fattura /P trovata su Sibill."}</td></tr>
              )}
              {filtered.map((d) => {
                const [base, ...rest] = (d.number || "—").split("/");
                const suffix = rest.length ? `/${rest.join("/")}` : "";
                const consegnata = !!d.delivery_date || d.status === "DELIVERED";
                return (
                  <tr key={d.id || d.number} className="border-t border-border/20 hover:bg-background/40">
                    <td className="p-3">
                      <input type="checkbox" checked={!!selected[d.id || ""]}
                        onChange={e => setSelected(s => ({ ...s, [d.id || ""]: e.target.checked }))} />
                    </td>
                    <td className="p-3 text-muted-foreground"><FileSearch className="h-4 w-4" /></td>
                    <td className="p-3">
                      <div className="font-medium">
                        {base}
                        {suffix && <span className="bg-amber-300/30 text-amber-200 rounded px-0.5">{suffix}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {d.type === "CREDIT_NOTE" ? "Nota di credito" : "Fattura"}
                      </div>
                    </td>
                    <td className="p-3">
                      <div>{d.counterpart || d.notes || "—"}</div>
                      {d.file_name && <div className="text-[11px] text-muted-foreground truncate max-w-[220px]">{d.file_name}</div>}
                    </td>
                    <td className="p-3">{dataIt(d.date)}</td>
                    <td className="p-3 text-right">{eur(d.net)}</td>
                    <td className="p-3 text-right text-muted-foreground">{eur(d.vat)}</td>
                    <td className="p-3 text-right font-semibold">{eur(d.gross)}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        d.direction === "RECEIVED"
                          ? "bg-blue-600/20 text-blue-200 border border-blue-500/40"
                          : "bg-emerald-600/20 text-emerald-200 border border-emerald-500/40"}`}>
                        {d.direction === "RECEIVED" ? "fornitore" : "cliente"}
                      </span>
                    </td>
                    <td className="p-3 text-center" title={`${d.status || ""} ${d.delivery_date ? "— consegnata " + dataIt(d.delivery_date) : ""}`}>
                      <span className="relative inline-flex">
                        <Inbox className="h-4 w-4 text-muted-foreground" />
                        {consegnata
                          ? <CheckCircle2 className="h-3 w-3 text-emerald-400 absolute -bottom-1 -right-1" />
                          : <span className="h-2 w-2 rounded-full bg-amber-400 absolute -bottom-0.5 -right-0.5" />}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => copia(d)} className="text-muted-foreground hover:text-foreground" title="Copia riga">
                        <Copy className="h-4 w-4 inline" />
                      </button>
                      <Mail className="h-4 w-4 inline ml-2 text-muted-foreground/50" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <FattureEmesseEsitoPanel tenantId={tenantId} />
    </div>
  );
}
