import { useState } from "react";
import { Send, Loader2, CheckCircle2, XCircle, QrCode, FileSearch, Truck, RefreshCw } from "lucide-react";
import { emissioneFir, dettaglioFir, ricercaFir, statoTransazioneFir, firmaRicezione, type RentriCliente, type RentriVpsResponse } from "@/lib/rentriVpsApi";
import { mapFormToRentriPayload } from "@/lib/rentriFormMapper";
import { toast } from "sonner";
import { PartenzaXfirPanel } from "@/components/rentri/PartenzaXfirPanel";
import {
  leggiStatoFirRentri,
  sincronizzaStatoFirDaRentri,
  statoViaggioDaRentri,
  type StatoViaggioFir,
} from "@/lib/rentriSyncStatoFir";
import { resolveFirQrDataUrl } from "@/lib/firPrintDecorations";

interface FIRRentriActionsProps {
  /** Il cliente RENTRI (multy, niyol, global) */
  cliente: RentriCliente;
  /** Dati compilati dal form, usati per emissione FIR */
  formData: Record<string, string | boolean>;
  /** Numero FIR se disponibile */
  numeroFir?: string;
  /** Id del formulario locale: se presente, lo stato viene allineato al RENTRI */
  formId?: string;
  /** true = firma come produttore + trasportatore, false = solo trasportatore */
  firmaComeProduttore?: boolean;
  /** Callback quando l'emissione ha successo */
  onEmissioneSuccess?: (response: RentriVpsResponse) => void;
  /** Template fields for UUID→name resolution */
  templateFields?: Array<{ id: string; name: string }>;
}

const ETICHETTA_VIAGGIO: Record<StatoViaggioFir, string> = {
  bozza: "📝 Bozza — non ancora firmato",
  "da-firmare": "✍️ In attesa di firma di partenza",
  "in-viaggio": "🚚 In viaggio — firmato alla partenza",
  chiuso: "✅ Chiuso dal destinatario",
};

export function FIRRentriActions({ cliente, formData, numeroFir, formId, firmaComeProduttore = true, onEmissioneSuccess, templateFields }: FIRRentriActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<RentriVpsResponse | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [firUuid, setFirUuid] = useState<string | null>(null);
  const [statoViaggio, setStatoViaggio] = useState<{ viaggio: StatoViaggioFir; rentri: string } | null>(null);

  /** Rilegge il RENTRI: unica fonte dello stato reale del viaggio. */
  const handleSyncStato = async () => {
    if (!numeroFir) {
      toast.error("Numero formulario non disponibile");
      return;
    }
    setLoading("sync");
    try {
      const res = formId
        ? await sincronizzaStatoFirDaRentri(cliente, numeroFir, formId)
        : await (async () => {
            const r = await leggiStatoFirRentri(cliente, numeroFir);
            const stato = String((r.data as any)?.stato_formulario ?? "");
            return { ok: r.success, statoRentri: stato, statoViaggio: statoViaggioDaRentri(stato), aggiornato: false, errore: r.error };
          })();

      if (!res.ok) {
        toast.error(res.errore || "Lettura RENTRI non riuscita");
        return;
      }
      const viaggio = res.statoViaggio ?? "bozza";
      setStatoViaggio({ viaggio, rentri: res.statoRentri ?? "" });
      toast.success(`RENTRI: ${ETICHETTA_VIAGGIO[viaggio]}`);

      if (viaggio === "in-viaggio" || viaggio === "chiuso") {
        const qr = await resolveFirQrDataUrl(numeroFir, cliente as never);
        if (qr) setQrCodeUrl(qr);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  };

  const handleEmissione = async () => {
    setLoading("emissione");
    setResult(null);
    setQrCodeUrl(null);

    try {
      // Map form fields to RENTRI-structured payload
      const payload = await mapFormToRentriPayload(cliente, formData, {
        firmaComeProduttore,
        templateFields,
      });

      const res = await emissioneFir(cliente, payload);
      setResult(res);

      if (res.success && res.data) {
        const data = res.data as Record<string, unknown>;
        // Extract UUID and QR code from response
        const uuid = data.uuid ?? data.id ?? data.uuid_fir ?? data.firId;
        if (uuid) setFirUuid(String(uuid));

        const qr = data.qrCode ?? data.qr_code ?? data.qrcode ?? data.qr;
        if (qr && typeof qr === "string") {
          setQrCodeUrl(qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`);
        }

        toast.success("FIR emesso con successo su RENTRI!");
        onEmissioneSuccess?.(res);
      } else {
        toast.error("Errore emissione FIR: " + (res.error || "Risposta non valida"));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Errore: " + msg);
    } finally {
      setLoading(null);
    }
  };

  const handleDettaglio = async () => {
    if (!firUuid && !numeroFir) {
      toast.error("Nessun UUID o numero FIR disponibile");
      return;
    }
    setLoading("dettaglio");
    setResult(null);

    try {
      let res: RentriVpsResponse;
      if (firUuid) {
        res = await dettaglioFir(cliente, firUuid);
      } else {
        res = await ricercaFir(cliente, numeroFir!);
      }
      setResult(res);

      if (res.success && res.data) {
        const data = res.data as Record<string, unknown>;
        const qr = data.qrCode ?? data.qr_code ?? data.qrcode ?? data.qr;
        if (qr && typeof qr === "string") {
          setQrCodeUrl(qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Errore: " + msg);
    } finally {
      setLoading(null);
    }
  };

  const handleTransazione = async () => {
    if (!firUuid) {
      toast.error("UUID FIR non disponibile per verifica transazione");
      return;
    }
    setLoading("transazione");
    setResult(null);

    try {
      const res = await statoTransazioneFir(cliente, firUuid);
      setResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Errore: " + msg);
    } finally {
      setLoading(null);
    }
  };

  const handleFirmaRicezione = async () => {
    if (!firUuid) {
      toast.error("UUID FIR necessario per firma ricezione");
      return;
    }
    setLoading("firma");
    setResult(null);

    try {
      const res = await firmaRicezione(cliente, { uuid_fir: firUuid, ...formData });
      setResult(res);
      if (res.success) toast.success("Firma ricezione registrata!");
      else toast.error("Errore firma: " + (res.error || ""));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Errore: " + msg);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3 mt-4">
      {/* Firma mode badge */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono font-semibold ${
        firmaComeProduttore
          ? "bg-primary/10 border-primary/30 text-primary"
          : "bg-amber-500/10 border-amber-500/30 text-amber-300"
      }`}>
        {firmaComeProduttore ? "✍️ FIRMA: PRODUTTORE + TRASPORTATORE" : "🚛 FIRMA: SOLO TRASPORTATORE"}
      </div>
      <div className="flex flex-wrap gap-2">
        <ActionButton
          icon={<Send size={14} />}
          label="Emetti FIR"
          onClick={handleEmissione}
          loading={loading === "emissione"}
          variant="primary"
        />
        <ActionButton
          icon={<FileSearch size={14} />}
          label="Dettaglio"
          onClick={handleDettaglio}
          loading={loading === "dettaglio"}
          disabled={!firUuid && !numeroFir}
        />
        <ActionButton
          icon={<QrCode size={14} />}
          label="Stato Transazione"
          onClick={handleTransazione}
          loading={loading === "transazione"}
          disabled={!firUuid}
        />
        <ActionButton
          icon={<Truck size={14} />}
          label="Firma Ricezione"
          onClick={handleFirmaRicezione}
          loading={loading === "firma"}
          disabled={!firUuid}
        />
        <ActionButton
          icon={<RefreshCw size={14} />}
          label="Aggiorna stato da RENTRI"
          onClick={handleSyncStato}
          loading={loading === "sync"}
          disabled={!numeroFir}
        />
      </div>

      {statoViaggio && (
        <div className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
          statoViaggio.viaggio === "in-viaggio"
            ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
            : statoViaggio.viaggio === "chiuso"
              ? "bg-green-500/10 border-green-500/30 text-green-300"
              : "bg-amber-500/10 border-amber-500/30 text-amber-300"
        }`}>
          {ETICHETTA_VIAGGIO[statoViaggio.viaggio]}
          <span className="ml-2 font-mono opacity-70">({statoViaggio.rentri})</span>
        </div>
      )}


      {/* Partenza xFIR: firma remota ca-rentri con conferma mobile */}
      {numeroFir && (
        <PartenzaXfirPanel cliente={cliente} numeroFir={numeroFir} />
      )}

      {/* QR Code display */}
      {qrCodeUrl && (
        <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white border border-border/30">
          <img src={qrCodeUrl} alt="QR Code FIR" className="w-40 h-40 object-contain" />
          <span className="text-[10px] font-mono text-gray-500">QR Code FIR RENTRI</span>
          {firUuid && (
            <span className="text-[9px] font-mono text-gray-400 break-all max-w-[200px] text-center">
              UUID: {firUuid}
            </span>
          )}
        </div>
      )}

      {/* Result banner */}
      {result && (
        <div
          className={`rounded-xl p-3 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-auto border ${
            result.success
              ? "bg-green-500/10 border-green-500/30 text-green-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2 mb-1 font-semibold text-sm font-sans">
            {result.success ? (
              <CheckCircle2 size={14} className="text-green-400" />
            ) : (
              <XCircle size={14} className="text-red-400" />
            )}
            {result.success ? "Operazione riuscita" : "Errore"}
            {result.status > 0 && (
              <span className="text-muted-foreground ml-auto text-[10px]">HTTP {result.status}</span>
            )}
          </div>
          {result.error && <p className="text-red-400 mb-1">{result.error}</p>}
          {result.data && (
            <pre className="text-[10px] leading-tight">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  loading,
  disabled,
  variant = "default",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
  variant?: "primary" | "default";
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all border disabled:opacity-40 ${
        variant === "primary"
          ? "bg-primary text-primary-foreground border-primary hover:bg-primary/80"
          : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary hover:text-foreground"
      }`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}
