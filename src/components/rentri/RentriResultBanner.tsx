import type { RentriVpsResponse } from "@/lib/rentriVpsApi";
import { CheckCircle2, XCircle, ShieldCheck } from "lucide-react";

/** Banner esito: messaggio leggibile + dettagli tecnici collassati (mai segreti). */
export function RentriResultBanner({ result }: { result: RentriVpsResponse | null }) {
  if (!result) return null;
  const ok = result.success;

  return (
    <div
      data-testid="rentri-result"
      className={`mt-4 rounded-xl p-4 text-sm border ${
        ok ? "bg-primary/10 border-primary/30" : "bg-destructive/10 border-destructive/30"
      }`}
    >
      <div className="flex items-center gap-2 font-semibold">
        {result.mode === "dry_run"
          ? <ShieldCheck size={16} className="text-primary" />
          : ok
            ? <CheckCircle2 size={16} className="text-primary" />
            : <XCircle size={16} className="text-destructive" />}
        <span>
          {result.mode === "dry_run" && (ok ? "Configurazione valida — nessun invio effettuato" : "Configurazione incompleta — nessun invio effettuato")}
          {result.mode !== "dry_run" && (ok ? "Operazione completata" : "Operazione non riuscita")}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          HTTP {result.status || "—"} · {result.errorCode ?? "OK"}
        </span>
      </div>

      <p className="mt-2 text-muted-foreground">{result.userMessage}</p>

      {result.preview && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <dt>Cliente</dt><dd className="text-foreground">{result.preview.cliente}</dd>
          <dt>Chiave configurazione</dt><dd className="text-foreground">{result.preview.config_key}</dd>
          <dt>Metodo / Path</dt>
          <dd className="text-foreground break-all">{result.preview.rentri_method} {result.preview.rentri_path}</dd>
          <dt>Iscrizione sito</dt><dd className="text-foreground">{result.preview.has_num_iscr_sito ? "configurata" : "mancante"}</dd>
          <dt>Registro</dt><dd className="text-foreground">{result.preview.has_registry_id ? "configurato" : "mancante"}</dd>
          <dt>Blocchi</dt><dd className="text-foreground">{result.preview.blocchi_configurati}</dd>
          <dt>Chiave bridge</dt><dd className="text-foreground">{result.preview.bridge_key_configurata ? "presente sul server" : "mancante"}</dd>
        </dl>
      )}

      {(result.error || result.errori?.length) && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-muted-foreground">Dettagli tecnici</summary>
          <pre className="mt-2 text-xs font-mono whitespace-pre-wrap break-all max-h-48 overflow-auto text-muted-foreground">
            {[result.error, ...(result.errori ?? [])].filter(Boolean).join("\n")}
          </pre>
        </details>
      )}
    </div>
  );
}

export default RentriResultBanner;
