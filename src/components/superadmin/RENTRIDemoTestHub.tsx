import { useState, useEffect } from "react";
import { Loader2, FlaskConical, Truck, Factory, FileSignature, Package, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { inviaOperazioneRentri, type RentriCliente } from "@/lib/rentriVpsApi";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

const FIR_NUMBER_REGEX = /^[A-Z]{5} [0-9]{6} [A-Z]{2}$/;
const normalizeFirNumber = (v: string) => v.trim().replace(/\s+/g, " ").toUpperCase();

const QUANTITIES = [5, 10, 50, 100];

interface TenantConfig {
  id: string;
  label: string;
  cliente: RentriCliente;
  canProduttore: boolean;
  canTrasportatore: boolean;
  canImpianto: boolean;
}

const TENANT_MAP: Record<string, TenantConfig> = {
  global: { id: "global", label: "Global Reco", cliente: "global", canProduttore: true, canTrasportatore: true, canImpianto: false },
  multy: { id: "multy", label: "Multy Proget", cliente: "multy", canProduttore: true, canTrasportatore: true, canImpianto: true },
  niyol: { id: "niyol", label: "Niyol", cliente: "niyol", canProduttore: false, canTrasportatore: true, canImpianto: false },
};

interface OpResult {
  id: string;
  operation: string;
  success: boolean;
  status: number;
  data: unknown;
  timestamp: Date;
}

export function RENTRIDemoTestHub({ tenant }: { tenant: string }) {
  const cfg = TENANT_MAP[tenant] ?? TENANT_MAP.global;
  const [qty, setQty] = useState(5);
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<OpResult[]>([]);
  const [demoCount, setDemoCount] = useState(0);
  const [firNumberInput, setFirNumberInput] = useState("");

  const fetchDemoCount = async () => {
    const { count } = await supabase
      .from("fir_number_pool")
      .select("*", { count: "exact", head: true })
      .eq("societa_id", cfg.id)
      .eq("is_demo", true)
      .eq("status", "available");
    setDemoCount(count ?? 0);
  };

  useEffect(() => { fetchDemoCount(); }, [cfg.id]);

  const addResult = (operation: string, res: { success: boolean; status: number; data: unknown }) => {
    setResults(prev => [{
      id: crypto.randomUUID(),
      operation,
      success: res.success,
      status: res.status,
      data: res.data,
      timestamp: new Date(),
    }, ...prev].slice(0, 20));
  };

  // --- VIDIMAZIONE DEMO ---
  const handleVidimazione = async () => {
    setLoading("vidimazione");
    const res = await inviaOperazioneRentri({
      cliente: cfg.cliente,
      tipo_operazione: "VIDIMAZIONE",
      payload: { quantita: qty },
    });

    addResult(`VIDIMAZIONE (${qty})`, res);

    if (res.success && res.data) {
      const raw = (res.data as any)?.numeri;
      const rawNumbers: string[] = Array.isArray(raw) ? raw : [];
      const normalized = rawNumbers.map(n => normalizeFirNumber(String(n)));
      const valid = normalized.filter(n => FIR_NUMBER_REGEX.test(n));

      if (valid.length > 0) {
        const rows = valid.map(n => ({
          fir_number: n,
          user_id: "00000000-0000-0000-0000-000000000000",
          societa_id: cfg.id,
          status: "available",
          is_demo: true,
        }));
        const { error } = await supabase.from("fir_number_pool").insert(rows);
        if (error) {
          toast.error("Errore salvataggio pool demo: " + error.message);
        } else {
          toast.success(`${valid.length} numeri FIR demo caricati per ${cfg.label}`);
          fetchDemoCount();
        }
      } else {
        toast.warning("Nessun numero FIR valido ricevuto");
      }
    } else {
      toast.error("Vidimazione fallita: " + (res.error ?? "errore sconosciuto"));
    }
    setLoading(null);
  };

  // --- FIRMA PRODUTTORE ---
  const handleFirmaProduttore = async () => {
    if (!firNumberInput.trim()) { toast.error("Inserisci numero FIR"); return; }
    setLoading("produttore");
    const res = await inviaOperazioneRentri({
      cliente: cfg.cliente,
      tipo_operazione: "FIR_EMISSIONE",
      payload: { firNumber: firNumberInput.trim(), ruolo: "produttore" },
    });
    addResult("FIRMA PRODUTTORE", res);
    if (res.success) toast.success("Firma produttore completata!");
    else toast.error("Errore firma produttore");
    setLoading(null);
  };

  // --- FIRMA TRASPORTATORE ---
  const handleFirmaTrasportatore = async () => {
    if (!firNumberInput.trim()) { toast.error("Inserisci numero FIR"); return; }
    setLoading("trasportatore");
    const res = await inviaOperazioneRentri({
      cliente: cfg.cliente,
      tipo_operazione: "FIR_EMISSIONE",
      payload: { firNumber: firNumberInput.trim(), ruolo: "trasportatore" },
    });
    addResult("FIRMA TRASPORTATORE", res);
    if (res.success) toast.success("Firma trasportatore completata!");
    else toast.error("Errore firma trasportatore");
    setLoading(null);
  };

  // --- FIRMA IMPIANTO ---
  const handleFirmaImpianto = async () => {
    if (!firNumberInput.trim()) { toast.error("Inserisci numero FIR"); return; }
    setLoading("impianto");
    const res = await inviaOperazioneRentri({
      cliente: cfg.cliente,
      tipo_operazione: "REGISTRO",
      payload: { firNumber: firNumberInput.trim(), ruolo: "impianto" },
    });
    addResult("REGISTRO IMPIANTO", res);
    if (res.success) toast.success("Registrazione impianto completata!");
    else toast.error("Errore registrazione impianto");
    setLoading(null);
  };

  const isLoading = !!loading;

  return (
    <div className="bg-card rounded-xl border border-amber-500/30 overflow-hidden">
      {/* Header */}
      <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical size={22} className="text-amber-400" />
          <div>
            <h3 className="text-lg font-display text-foreground">RENTRI Demo Test Hub — {cfg.label.toUpperCase()}</h3>
            <p className="text-xs text-muted-foreground">Certificati DEMO · Pool isolato · Nessun impatto su produzione</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Package size={16} className="text-amber-400" />
          <span className="text-amber-300 font-semibold">{demoCount}</span>
          <span className="text-muted-foreground">FIR demo disponibili</span>
          <button onClick={fetchDemoCount} className="ml-1 p-1 rounded hover:bg-secondary/50"><RefreshCw size={14} /></button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* VIDIMAZIONE */}
        <section>
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Package size={16} className="text-amber-400" /> Rifornimento Serbatoio Demo (Vidimazione)
          </h4>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {QUANTITIES.map(q => (
                <button key={q} onClick={() => setQty(q)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${qty === q ? "bg-amber-600 text-white" : "bg-secondary/50 text-muted-foreground hover:text-foreground"}`}
                >{q}</button>
              ))}
            </div>
            <button onClick={handleVidimazione} disabled={isLoading}
              className="px-5 py-2 rounded-lg font-semibold bg-amber-600 text-black hover:bg-amber-500 disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              {loading === "vidimazione" ? <Loader2 className="animate-spin" size={16} /> : null}
              RICHIEDI NUMERI DEMO
            </button>
          </div>
        </section>

        {/* FIRME */}
        <section>
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <FileSignature size={16} className="text-amber-400" /> Firme Digitali Demo
          </h4>
          <div className="mb-3">
            <label className="text-xs text-muted-foreground mb-1 block">Numero FIR per le firme</label>
            <input type="text" value={firNumberInput} onChange={e => setFirNumberInput(e.target.value)}
              placeholder="es. FMGWB 123456 AB"
              className="w-full max-w-md px-4 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            {cfg.canProduttore && (
              <button onClick={handleFirmaProduttore} disabled={isLoading}
                className="px-4 py-2.5 rounded-lg font-semibold bg-yellow-600 text-black hover:bg-yellow-500 disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {loading === "produttore" ? <Loader2 className="animate-spin" size={16} /> : <FileSignature size={16} />}
                Firma Produttore
              </button>
            )}
            {cfg.canTrasportatore && (
              <button onClick={handleFirmaTrasportatore} disabled={isLoading}
                className="px-4 py-2.5 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {loading === "trasportatore" ? <Loader2 className="animate-spin" size={16} /> : <Truck size={16} />}
                Firma Trasportatore
              </button>
            )}
            {cfg.canImpianto && (
              <button onClick={handleFirmaImpianto} disabled={isLoading}
                className="px-4 py-2.5 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {loading === "impianto" ? <Loader2 className="animate-spin" size={16} /> : <Factory size={16} />}
                Registro Impianto
              </button>
            )}
          </div>
          {!cfg.canProduttore && <p className="text-xs text-muted-foreground mt-2 italic">{cfg.label} non ha ruolo Produttore</p>}
          {!cfg.canImpianto && <p className="text-xs text-muted-foreground mt-1 italic">{cfg.label} non ha ruolo Impianto</p>}
        </section>

        {/* RISULTATI */}
        {results.length > 0 && (
          <section>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              Risultati ({results.length})
            </h4>
            <div className="max-h-64 overflow-y-auto space-y-2 font-mono text-xs">
              {results.map(r => (
                <div key={r.id} className={`p-3 rounded-lg border ${r.success ? "border-green-800/30 bg-green-950/20" : "border-red-800/30 bg-red-950/20"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {r.success ? <CheckCircle size={14} className="text-green-400" /> : <XCircle size={14} className="text-red-400" />}
                      <span className="text-foreground font-semibold">{r.operation}</span>
                      <span className={r.success ? "text-green-400" : "text-red-400"}>HTTP {r.status}</span>
                    </div>
                    <span className="text-muted-foreground">{r.timestamp.toLocaleTimeString()}</span>
                  </div>
                  <pre className="text-muted-foreground whitespace-pre-wrap break-all max-h-20 overflow-hidden">
                    {JSON.stringify(r.data, null, 1)}
                  </pre>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
