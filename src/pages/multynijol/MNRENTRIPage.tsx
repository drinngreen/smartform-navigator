import { useState } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useMNContextStore } from "@/stores/mnContextStore";
import {
  inviaOperazioneRentri,
  type RentriCliente,
  type RentriTipoOperazione,
  type RentriVpsResponse,
} from "@/lib/rentriVpsApi";
import {
  Loader2,
  Send,
  CheckCircle2,
  XCircle,
  FileText,
  Truck,
  ClipboardList,
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
];

function ResultBanner({ result }: { result: RentriVpsResponse | null }) {
  if (!result) return null;
  return (
    <div
      className={`mt-4 rounded-xl p-4 text-xs font-mono whitespace-pre-wrap max-h-64 overflow-auto border ${
        result.success
          ? "bg-green-500/10 border-green-500/30 text-green-300"
          : "bg-red-500/10 border-red-500/30 text-red-300"
      }`}
    >
      <div className="flex items-center gap-2 mb-2 font-semibold text-sm font-sans">
        {result.success ? (
          <CheckCircle2 size={16} className="text-green-400" />
        ) : (
          <XCircle size={16} className="text-red-400" />
        )}
        {result.success ? "Invio riuscito" : "Errore"}
        {result.status > 0 && (
          <span className="text-muted-foreground ml-auto">HTTP {result.status}</span>
        )}
      </div>
      {result.error && <p className="text-red-400 mb-2">{result.error}</p>}
      {result.data && JSON.stringify(result.data, null, 2)}
    </div>
  );
}

export default function MNRENTRIPage() {
  const { activeContext } = useMNContextStore();
  const cliente = CONTEXT_TO_CLIENTE[activeContext.id] ?? "global";

  const [tipoOperazione, setTipoOperazione] = useState<RentriTipoOperazione>("REGISTRO");
  const [payloadText, setPayloadText] = useState("{}");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RentriVpsResponse | null>(null);

  const handleInvia = async () => {
    setLoading(true);
    setResult(null);
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(payloadText);
    } catch {
      setResult({ success: false, status: 0, data: null, error: "JSON payload non valido" });
      setLoading(false);
      return;
    }
    const res = await inviaOperazioneRentri({
      cliente,
      tipo_operazione: tipoOperazione,
      payload,
    });
    setResult(res);
    setLoading(false);
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

          {/* Submit */}
          <button
            disabled={loading}
            onClick={handleInvia}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/80 transition-all disabled:opacity-40"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Invia a RENTRI
          </button>

          <ResultBanner result={result} />
        </div>
      </div>
    </MNAdminLayout>
  );
}
