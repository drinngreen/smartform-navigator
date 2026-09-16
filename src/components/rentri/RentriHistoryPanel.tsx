import { useState } from "react";
import { useRentriHistory } from "@/hooks/useRentriHistory";
import { rentriUserMessage } from "@/lib/rentriErrorMessages";
import { Loader2, History, RefreshCw, CheckCircle2, XCircle, ShieldCheck, Search } from "lucide-react";

const CLIENTI = ["all", "multyproget", "multy", "niyol", "global"];

function statoLeggibile(row: { success: boolean; http_status: number | null; mode: string }): string {
  if (row.success) return row.mode === "dry_run" ? "Verifica riuscita" : "Operazione completata";
  return rentriUserMessage(Number(row.http_status ?? 0));
}

const CAMPI_RENTRI: Record<string, string> = {
  "dati_partenza.rifiuto.codice_eer": "Codice EER",
  "dati_partenza.rifiuto.stato_fisico": "Stato fisico del rifiuto",
  "dati_partenza.produttore.autorizzazione.tipo": "Tipo autorizzazione del produttore",
  "dati_partenza.produttore.autorizzazione.numero": "Numero autorizzazione del produttore",
  "dati_partenza.destinatario.autorizzazione.tipo": "Tipo autorizzazione del destinatario",
  "dati_partenza.destinatario.autorizzazione.numero": "Numero autorizzazione del destinatario",
  "dati_partenza.destinatario.attivita": "Attività del destinatario (R/D)",
};

const CODICI_RENTRI: Record<string, string> = {
  "sys.required": "campo obbligatorio mancante",
  "sys.invalid": "valore non valido",
};

function motivoRifiuto(row: { error_message: string | null; risposta?: unknown }): string {
  const risposta = row.risposta && typeof row.risposta === "object"
    ? row.risposta as Record<string, unknown>
    : null;
  const modelState = risposta?.model_state && typeof risposta.model_state === "object"
    ? risposta.model_state as Record<string, unknown>
    : null;

  if (modelState) {
    const dettagli = Object.entries(modelState).flatMap(([campo, valore]) => {
      const messaggi = Array.isArray(valore) ? valore : [valore];
      return messaggi.map((messaggio) => {
        const codice = String(messaggio ?? "");
        return `${CAMPI_RENTRI[campo] ?? campo}: ${CODICI_RENTRI[codice] ?? codice}`;
      });
    });
    if (dettagli.length > 0) return dettagli.join("; ");
  }

  const rispostaTesto = risposta && typeof risposta.error === "string" ? risposta.error : "";
  return row.error_message || rispostaTesto || "Il RENTRI non ha comunicato un motivo dettagliato.";
}

function normalizzaFir(value: unknown): string {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function numeroFirRiga(row: { identificativo_rentri?: string | null; payload_inviato?: unknown; risposta?: unknown }): string {
  if (row.identificativo_rentri) return row.identificativo_rentri;
  const sorgenti = [row.payload_inviato, row.risposta];
  for (const sorgente of sorgenti) {
    const testo = JSON.stringify(sorgente ?? {});
    const match = testo.match(/[A-Z]{5}\s*\d{6}\s*[A-Z]{2}/i);
    if (match) return match[0].replace(/^([A-Z]{5})\s*(\d{6})\s*([A-Z]{2})$/i, "$1 $2 $3").toUpperCase();
  }
  return "";
}

export function RentriHistoryPanel({ defaultCliente = "all" }: { defaultCliente?: string }) {
  const [cliente, setCliente] = useState(defaultCliente);
  const [esito, setEsito] = useState<"all" | "success" | "error">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [firSearch, setFirSearch] = useState("");

  const { rows, loading, error, reload } = useRentriHistory({
    cliente,
    esito,
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
  });
  const firCercato = normalizzaFir(firSearch);
  const righeVisibili = firCercato
    ? rows.filter((row) => normalizzaFir(numeroFirRiga(row)).includes(firCercato))
    : rows;

  return (
    <div className="rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4" data-testid="rentri-history">
      <div className="flex items-center gap-2">
        <History size={16} className="text-primary" />
        <h3 className="text-base font-display tracking-wider">Cronologia operazioni RENTRI</h3>
        <button
          onClick={() => void reload()}
          className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary/50 border border-border/50 hover:bg-secondary"
        >
          <RefreshCw size={13} /> Aggiorna
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <select
          aria-label="Filtra per cliente"
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          className="rounded-lg bg-secondary/50 border border-border/50 px-3 py-1.5"
        >
          {CLIENTI.map((c) => (
            <option key={c} value={c}>{c === "all" ? "Tutti i clienti" : c}</option>
          ))}
        </select>
        <select
          aria-label="Filtra per esito"
          value={esito}
          onChange={(e) => setEsito(e.target.value as "all" | "success" | "error")}
          className="rounded-lg bg-secondary/50 border border-border/50 px-3 py-1.5"
        >
          <option value="all">Tutti gli esiti</option>
          <option value="success">Solo riuscite</option>
          <option value="error">Solo fallite</option>
        </select>
        <input
          aria-label="Data inizio" type="date" value={from} onChange={(e) => setFrom(e.target.value)}
          className="rounded-lg bg-secondary/50 border border-border/50 px-3 py-1.5"
        />
        <label className="flex items-center gap-2 rounded-lg bg-secondary/50 border border-border/50 px-3 py-1.5">
          <Search size={13} className="text-muted-foreground" />
          <input
            aria-label="Cerca numero FIR"
            value={firSearch}
            onChange={(e) => setFirSearch(e.target.value)}
            placeholder="Cerca FIR"
            className="min-w-44 bg-transparent outline-none"
          />
        </label>
        <input
          aria-label="Data fine" type="date" value={to} onChange={(e) => setTo(e.target.value)}
          className="rounded-lg bg-secondary/50 border border-border/50 px-3 py-1.5"
        />
      </div>

      {loading && (
        <div data-testid="history-loading" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" /> Caricamento cronologia…
        </div>
      )}

      {!loading && error && (
        <div data-testid="history-error" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Impossibile caricare la cronologia. {error}
        </div>
      )}

      {!loading && !error && righeVisibili.length === 0 && (
        <p data-testid="history-empty" className="text-sm text-muted-foreground">
          {firCercato ? "Nessuna operazione trovata per questo FIR." : "Nessuna operazione registrata."}
        </p>
      )}

      {!loading && !error && righeVisibili.length > 0 && (
        <ul className="space-y-2">
          {righeVisibili.map((row) => {
            const numeroFir = numeroFirRiga(row);
            return (
            <li
              key={row.id}
              data-testid="history-row"
              className="rounded-xl border border-border/40 bg-secondary/30 px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                {row.success
                  ? <CheckCircle2 size={14} className="text-primary" />
                  : <XCircle size={14} className="text-destructive" />}
                <span className="font-semibold">{row.tipo_operazione}</span>
                {numeroFir && <span className="font-mono text-xs font-semibold">{numeroFir}</span>}
                <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary uppercase">{row.cliente}</span>
                {row.mode === "dry_run" && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-secondary text-muted-foreground">
                    <ShieldCheck size={11} /> verifica
                  </span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(row.created_at).toLocaleString("it-IT")}
                </span>
              </div>
               <p className="mt-1 text-muted-foreground">{statoLeggibile(row)}</p>
               {!row.success && (
                 <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                   <p className="text-xs font-semibold text-destructive">Motivo del rifiuto RENTRI</p>
                   <p className="mt-1 text-sm text-foreground">{motivoRifiuto(row)}</p>
                 </div>
               )}
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-muted-foreground">Dettagli tecnici</summary>
                <div className="mt-1 text-xs font-mono text-muted-foreground break-all">
                  HTTP {row.http_status ?? "—"} · {row.error_code ?? "OK"} · {row.rentri_method ?? "—"} {row.rentri_path ?? "—"}
                   {row.identificativo_rentri ? ` · FIR ${row.identificativo_rentri}` : ""}
                   {row.transazione_id ? ` · Transazione ${row.transazione_id}` : ""}
                </div>
              </details>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default RentriHistoryPanel;
