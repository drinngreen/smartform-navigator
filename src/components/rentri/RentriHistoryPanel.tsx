import { useState } from "react";
import { useRentriHistory } from "@/hooks/useRentriHistory";
import { rentriUserMessage } from "@/lib/rentriErrorMessages";
import { Loader2, History, RefreshCw, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";

const CLIENTI = ["all", "multyproget", "multy", "niyol", "global"];

function statoLeggibile(row: { success: boolean; http_status: number | null; mode: string }): string {
  if (row.success) return row.mode === "dry_run" ? "Verifica riuscita" : "Operazione completata";
  return rentriUserMessage(Number(row.http_status ?? 0));
}

export function RentriHistoryPanel({ defaultCliente = "all" }: { defaultCliente?: string }) {
  const [cliente, setCliente] = useState(defaultCliente);
  const [esito, setEsito] = useState<"all" | "success" | "error">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { rows, loading, error, reload } = useRentriHistory({
    cliente,
    esito,
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
  });

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

      {!loading && !error && rows.length === 0 && (
        <p data-testid="history-empty" className="text-sm text-muted-foreground">
          Nessuna operazione registrata.
        </p>
      )}

      {!loading && !error && rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((row) => (
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
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-muted-foreground">Dettagli tecnici</summary>
                <div className="mt-1 text-xs font-mono text-muted-foreground break-all">
                  HTTP {row.http_status ?? "—"} · {row.error_code ?? "OK"} · {row.rentri_method ?? "—"} {row.rentri_path ?? "—"}
                  {row.error_message ? ` · ${row.error_message}` : ""}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default RentriHistoryPanel;
