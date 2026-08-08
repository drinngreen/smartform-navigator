import { useState } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useMNContextStore } from "@/stores/mnContextStore";
import {
  inviaOperazioneRentri,
  verificaConfigurazioneRentri,
  type RentriCliente,
  type RentriTipoOperazione,
  type RentriVpsResponse,
} from "@/lib/rentriVpsApi";
import { logRentriOperation } from "@/lib/rentriHistory";
import { RentriResultBanner } from "@/components/rentri/RentriResultBanner";
import { RentriHistoryPanel } from "@/components/rentri/RentriHistoryPanel";

import {
  Loader2,
  Send,
  FileText,
  Truck,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";

const CONTEXT_TO_CLIENTE: Record<string, RentriCliente> = {
  multyproget: "multy",
  "multyproget-intermediario": "multy",
  "multyproget-impianto": "multy",
  niyol: "niyol",
};

const TIPO_OPTIONS: { value: RentriTipoOperazione; label: string; icon: React.ReactNode }[] = [
  { value: "REGISTRO", label: "Registro", icon: <ClipboardList size={14} /> },
  { value: "FIR_EMISSIONE", label: "Emissione FIR", icon: <Truck size={14} /> },
  { value: "VIDIMAZIONE", label: "Vidimazione", icon: <FileText size={14} /> },
  { value: "LOTTO", label: "Lotto FIR", icon: <FileText size={14} /> },
  { value: "LISTA_BLOCCHI", label: "Lista Blocchi", icon: <ClipboardList size={14} /> },
  { value: "DETTAGLIO_FIR", label: "Dettaglio FIR", icon: <FileText size={14} /> },
  { value: "FIRMA_RICEZIONE", label: "Firma Ricezione", icon: <Truck size={14} /> },
];

export default function MNRENTRIPage() {
  const { activeContext } = useMNContextStore();
  const cliente = CONTEXT_TO_CLIENTE[activeContext.id] ?? "global";

  const [tipoOperazione, setTipoOperazione] = useState<RentriTipoOperazione>("REGISTRO");
  const [payloadText, setPayloadText] = useState("{}");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [result, setResult] = useState<RentriVpsResponse | null>(null);

  const parsePayload = (): Record<string, unknown> | null => {
    try {
      return JSON.parse(payloadText);
    } catch {
      setResult({
        success: false,
        status: 400,
        data: null,
        error: "JSON payload non valido",
        userMessage: "Dati della richiesta non validi o incompleti.",
        errorCode: "BAD_REQUEST",
        mode: "real",
      });
      return null;
    }
  };

  const registra = async (res: RentriVpsResponse, mode: "dry_run" | "real") => {
    await logRentriOperation({
      cliente,
      tipo_operazione: tipoOperazione,
      rentri_method: res.preview?.rentri_method ?? null,
      rentri_path: res.preview?.rentri_path ?? null,
      mode,
      http_status: res.status,
      success: res.success,
      error_code: res.errorCode ?? null,
      error_message: res.error ?? null,
    });
    setHistoryKey((k) => k + 1);
  };

  const handleVerifica = async () => {
    const payload = parsePayload();
    if (!payload) return;
    setVerifying(true);
    setResult(null);
    const res = await verificaConfigurazioneRentri(cliente, tipoOperazione, payload);
    setResult(res);
    setVerifying(false);
    await registra(res, "dry_run");
  };

  const handleInvia = async () => {
    const payload = parsePayload();
    if (!payload) return;
    setLoading(true);
    setResult(null);
    const res = await inviaOperazioneRentri({
      cliente,
      tipo_operazione: tipoOperazione,
      payload,
    });
    setResult(res);
    setLoading(false);
    await registra(res, "real");
  };


  return (
    <MNAdminLayout title="RENTRI" subtitle="Invio operazioni al server RENTRI">
      <div className="space-y-6">
        {/* Status bar */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-card/60 border border-border/30">
          <div className="h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm text-muted-foreground">
            Server VPS: <strong className="text-foreground">178.104.22.197:3000</strong>
          </span>
          <span className="ml-auto text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-semibold uppercase tracking-wider">
            {cliente}
          </span>
        </div>

        {/* Form */}
        <div className="rounded-2xl bg-card/60 border border-border/30 p-6 space-y-5">
          <h3 className="text-base font-display tracking-wider flex items-center gap-2">
            <Send size={16} className="text-primary" />
            Invia Operazione
          </h3>

          {/* Tipo operazione */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium">Tipo Operazione</label>
            <div className="flex gap-2 flex-wrap">
              {TIPO_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTipoOperazione(opt.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
                    tipoOperazione === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary"
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payload */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium">Payload (JSON)</label>
            <textarea
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              rows={6}
              placeholder='{"codice_eer": "170904", "quantita": 1.5, ...}'
              className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Azioni */}
          <div className="flex flex-wrap gap-3">
            <button
              disabled={verifying || loading}
              onClick={handleVerifica}
              data-testid="btn-verifica-config"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-secondary text-foreground border border-border font-semibold hover:bg-secondary/70 transition-all disabled:opacity-40"
            >
              {verifying ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              Verifica configurazione (nessun invio)
            </button>
            <button
              disabled={loading || verifying}
              onClick={handleInvia}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/80 transition-all disabled:opacity-40"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Invia a RENTRI
            </button>
          </div>

          <RentriResultBanner result={result} />
        </div>

        <RentriHistoryPanel key={historyKey} defaultCliente={cliente} />
      </div>

    </MNAdminLayout>
  );
}
