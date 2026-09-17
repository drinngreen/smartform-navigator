import { useRef, useState } from "react";
import { Loader2, Smartphone, ShieldCheck, XCircle, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import {
  startDepartureXfirFlow,
  type XfirProgress,
  type XfirResult,
  type RentriXfirNoop,
} from "@/lib/rentriXfirPartenza";
import type { RentriCliente } from "@/lib/rentriVpsApi";

interface Props {
  cliente: RentriCliente;
  numeroFir: string;
  /** Dati di trasporto inviati solo se il FIR è ancora in InserimentoTrasportoIniziale */
  datiTrasporto?: Record<string, unknown>;
  codiceFiscale?: string;
  numIscrSito?: string;
  onPartito?: (r: XfirResult) => void;
}

/**
 * Partenza xFIR — firma remota ca-rentri con conferma sul dispositivo mobile.
 * Nessuna firma locale del digest: il certificato di interoperabilità serve
 * solo ad autenticare le API.
 */
export function PartenzaXfirPanel({ cliente, numeroFir, datiTrasporto, codiceFiscale, numIscrSito, onPartito }: Props) {
  const [progress, setProgress] = useState<XfirProgress | null>(null);
  const [result, setResult] = useState<XfirResult | null>(null);
  const [running, setRunning] = useState(false);
  const abort = useRef(false);

  const avvia = async () => {
    setRunning(true);
    setResult(null);
    abort.current = false;
    try {
      const r = await startDepartureXfirFlow({
        cliente,
        numeroFir,
        datiTrasporto,
        codiceFiscale,
        numIscrSito,
        onProgress: setProgress,
        isAborted: () => abort.current,
      });
      setResult(r);
      if (r.ok) {
        toast.success(`FIR ${numeroFir} firmato e partito (${r.statoFinale}).`);
        onPartito?.(r);
      } else {
        toast.error(r.errore || "Firma non completata");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  };

  const attesa = progress?.fase === "attesa-conferma";

  return (
    <div className="space-y-3 rounded-xl border border-border/50 bg-card/60 p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className="text-primary" />
        <h3 className="text-sm font-semibold">Partenza xFIR — firma remota RENTRI</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Trasporto → hash → autorizzazione con conferma sul cellulare → firma remota → acquisizione firma.
        Il FIR risulta partito solo quando il RENTRI riporta <strong>InserimentoAccettazione</strong>.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={avvia}
          disabled={running}
          className="flex items-center gap-2 rounded-lg border border-primary bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/80 disabled:opacity-40"
        >
          {running ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Avvia partenza firmata
        </button>

        {attesa && (
          <>
            <button
              onClick={avvia}
              className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/50 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <RefreshCw size={14} /> Riprova invio notifica
            </button>
            <button
              onClick={() => { abort.current = true; }}
              className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <XCircle size={14} /> Annulla attesa
            </button>
          </>
        )}
      </div>

      {progress && (
        <div
          className={`rounded-lg border p-3 text-xs ${
            attesa
              ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
              : progress.fase === "errore"
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-border/40 bg-secondary/40 text-muted-foreground"
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            {attesa ? <Smartphone size={14} /> : running ? <Loader2 size={14} className="animate-spin" /> : null}
            {progress.messaggio}
          </div>
          {attesa && (
            <div className="mt-1 space-y-0.5 font-mono text-[11px]">
              <div>Dispositivo: {progress.device || "—"}</div>
              <div>Scadenza fra {progress.scadenzaSecondi ?? 0}s</div>
            </div>
          )}
        </div>
      )}

      {result && (
        <div
          className={`rounded-lg border p-3 text-xs font-mono ${
            result.ok
              ? "border-green-500/30 bg-green-500/10 text-green-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          <div className="mb-1 font-semibold">Stato RENTRI: {result.statoFinale || "—"}</div>
          {result.errore && <div>{result.errore}</div>}
          {result.codiceErrore && <div className="opacity-70">Codice: {result.codiceErrore}</div>}
          <div className="mt-1 opacity-70">Passaggi registrati: {result.sessione.log.length}</div>
        </div>
      )}
    </div>
  );
}

export type { RentriXfirNoop };
