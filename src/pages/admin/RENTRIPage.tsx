import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  inviaOperazioneRentri,
  listaBlocchi,
  ricercaMovimenti,
  statoTransazioneRegistro,
  statoTransazioneFir,
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
  Search,
  Activity,
  List,
} from "lucide-react";

const TIPO_OPTIONS: { value: RentriTipoOperazione; label: string; icon: React.ReactNode }[] = [
  { value: "REGISTRO", label: "Registro", icon: <ClipboardList size={14} /> },
  { value: "FIR_EMISSIONE", label: "Emissione FIR", icon: <Truck size={14} /> },
  { value: "VIDIMAZIONE", label: "Vidimazione", icon: <FileText size={14} /> },
  { value: "LOTTO", label: "Lotto FIR", icon: <FileText size={14} /> },
  { value: "LISTA_BLOCCHI", label: "Lista Blocchi", icon: <List size={14} /> },
  { value: "DETTAGLIO_FIR", label: "Dettaglio FIR", icon: <Search size={14} /> },
  { value: "RICERCA_FIR", label: "Ricerca FIR", icon: <Search size={14} /> },
  { value: "FIRMA_RICEZIONE", label: "Firma Ricezione", icon: <Truck size={14} /> },
  { value: "RICERCA_MOVIMENTI", label: "Ricerca Movimenti", icon: <ClipboardList size={14} /> },
  { value: "TRANSAZIONE_REGISTRO", label: "Stato Transaz. Registro", icon: <Activity size={14} /> },
  { value: "TRANSAZIONE_FIR", label: "Stato Transaz. FIR", icon: <Activity size={14} /> },
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

export default function RENTRIPage() {
  const [tipoOperazione, setTipoOperazione] = useState<RentriTipoOperazione>("REGISTRO");
  const [payloadText, setPayloadText] = useState("{}");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RentriVpsResponse | null>(null);

  // Quick actions
  const [quickLoading, setQuickLoading] = useState<string | null>(null);

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
      cliente: "global",
      tipo_operazione: tipoOperazione,
      payload,
    });
    setResult(res);
    setLoading(false);
  };

  const handleQuickAction = async (action: string) => {
    setQuickLoading(action);
    setResult(null);
    let res: RentriVpsResponse;
    switch (action) {
      case "lista_blocchi":
        res = await listaBlocchi("global");
        break;
      case "movimenti_oggi": {
        const today = new Date().toISOString().split("T")[0];
        res = await ricercaMovimenti("global", today, today);
        break;
      }
      case "txn_registro": {
        const txnId = prompt("ID Transazione Registro:");
        if (!txnId) { setQuickLoading(null); return; }
        res = await statoTransazioneRegistro("global", txnId);
        break;
      }
      case "txn_fir": {
        const txnId = prompt("ID Transazione FIR:");
        if (!txnId) { setQuickLoading(null); return; }
        res = await statoTransazioneFir("global", txnId);
        break;
      }
      default:
        res = { success: false, status: 0, data: null, error: "Azione sconosciuta" };
    }
    setResult(res);
    setQuickLoading(null);
  };

  return (
    <AdminLayout title="RENTRI" subtitle="Gestione Registro Elettronico Nazionale — Global Reco">
      <div className="space-y-6">
        {/* Status bar */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-card/60 border border-border/30">
          <div className="h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm text-muted-foreground">
            Server VPS: <strong className="text-foreground">167.235.29.27:3000</strong>
          </span>
          <span className="ml-auto text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-semibold uppercase tracking-wider">
            GLOBAL RECO
          </span>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4">
          <h3 className="text-base font-display tracking-wider flex items-center gap-2">
            <Activity size={16} className="text-primary" />
            Azioni Rapide
          </h3>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "lista_blocchi", label: "Lista Blocchi", icon: <List size={14} /> },
              { key: "movimenti_oggi", label: "Movimenti Oggi", icon: <ClipboardList size={14} /> },
              { key: "txn_registro", label: "Stato Transaz. Registro", icon: <Activity size={14} /> },
              { key: "txn_fir", label: "Stato Transaz. FIR", icon: <Activity size={14} /> },
            ].map((a) => (
              <button
                key={a.key}
                onClick={() => handleQuickAction(a.key)}
                disabled={quickLoading === a.key}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-secondary/50 text-muted-foreground border border-border/50 hover:bg-secondary hover:text-foreground transition-all disabled:opacity-40"
              >
                {quickLoading === a.key ? <Loader2 size={14} className="animate-spin" /> : a.icon}
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Full Operation Form */}
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
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
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
    </AdminLayout>
  );
}
