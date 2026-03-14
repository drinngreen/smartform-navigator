import { useState, useEffect } from "react";
import { Loader2, FlaskConical, Truck, Factory, FileSignature, Package, CheckCircle, XCircle, RefreshCw, Copy, Check, Fuel } from "lucide-react";
import { inviaOperazioneRentri, type RentriCliente } from "@/lib/rentriVpsApi";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

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

interface DemoPoolNumber {
  id: string;
  fir_number: string;
}

interface OpResult {
  id: string;
  operation: string;
  success: boolean;
  status: number;
  data: unknown;
  timestamp: Date;
}

type FirmaType = "produttore" | "trasportatore" | "impianto";

const FIR_NUMBER_REGEX = /^[A-Z]{5} [0-9]{6} [A-Z]{2}$/;
const normalizeFirNumber = (v: string) => v.trim().replace(/\s+/g, " ").toUpperCase();

export function RENTRIDemoTestHub({ tenant }: { tenant: string }) {
  const cfg = TENANT_MAP[tenant] ?? TENANT_MAP.global;
  const [qty, setQty] = useState(5);
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<OpResult[]>([]);
  const [demoNumbers, setDemoNumbers] = useState<DemoPoolNumber[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [signingType, setSigningType] = useState<FirmaType | null>(null);

  const fetchDemoPool = async () => {
    const { data, error } = await supabase
      .from("fir_number_pool")
      .select("id, fir_number")
      .eq("societa_id", cfg.id)
      .eq("is_demo", true)
      .eq("status", "available")
      .eq("suspended", false)
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Errore caricamento pool demo: " + error.message);
    } else {
      setDemoNumbers(data ?? []);
    }
  };

  useEffect(() => { fetchDemoPool(); }, [cfg.id]);

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
          fetchDemoPool();
        }
      } else {
        toast.warning("Nessun numero FIR valido ricevuto");
      }
    } else {
      toast.error("Vidimazione fallita: " + (res.error ?? "errore sconosciuto"));
    }
    setLoading(null);
  };

  // --- COPY ---
  const handleCopy = async (firNumber: string, id: string) => {
    await navigator.clipboard.writeText(firNumber);
    setCopiedId(id);
    toast.success("Numero FIR demo copiato!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // --- FIRMA DA SERBATOIO ---
  const handleFirmaFromPool = async (pool: DemoPoolNumber, tipo: FirmaType) => {
    setSigningId(pool.id);
    setSigningType(tipo);

    try {
      const tipoOperazione = tipo === "impianto" ? "REGISTRO" : "FIR_EMISSIONE";
      const res = await inviaOperazioneRentri({
        cliente: cfg.cliente,
        tipo_operazione: tipoOperazione,
        payload: { firNumber: pool.fir_number, ruolo: tipo },
      });

      const label = tipo === "impianto" ? "REGISTRO IMPIANTO" : `FIRMA ${tipo.toUpperCase()}`;
      addResult(label, res);

      if (res.success) {
        toast.success(`${label} completata per ${pool.fir_number}!`);
        // Mark as consumed
        await supabase
          .from("fir_number_pool")
          .update({ status: "consumed", consumed_at: new Date().toISOString() })
          .eq("id", pool.id);
        // Remove from local list
        setDemoNumbers(prev => prev.filter(n => n.id !== pool.id));
      } else {
        toast.error(`Errore ${label}: ${JSON.stringify(res.data)}`);
      }
    } catch (err: any) {
      toast.error(`Errore firma ${tipo}: ${err.message}`);
    }

    setSigningId(null);
    setSigningType(null);
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
          <span className="text-amber-300 font-semibold">{demoNumbers.length}</span>
          <span className="text-muted-foreground">FIR demo disponibili</span>
          <button onClick={fetchDemoPool} className="ml-1 p-1 rounded hover:bg-secondary/50"><RefreshCw size={14} /></button>
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

        {/* SERBATOIO DEMO */}
        <section>
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Fuel size={16} className="text-amber-400" /> Serbatoio Demo — {cfg.label.toUpperCase()}
          </h4>
          {demoNumbers.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
              Nessun FIR demo disponibile. Usa "Rifornimento" sopra per richiederne.
            </div>
          ) : (
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {demoNumbers.map(pool => {
                const isActive = signingId === pool.id;
                const btnBase = "px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 flex items-center gap-1 transition-all";
                return (
                  <div key={pool.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => handleCopy(pool.fir_number, pool.id)}
                        className="shrink-0 p-2 rounded-md bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                        title="Copia numero FIR"
                      >
                        {copiedId === pool.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                      </button>
                      <code className="text-sm font-mono text-foreground truncate select-all">
                        {pool.fir_number}
                      </code>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {cfg.canProduttore && (
                        <button onClick={() => handleFirmaFromPool(pool, "produttore")} disabled={isActive}
                          className={`${btnBase} bg-yellow-600/80 text-yellow-100 hover:bg-yellow-500`}
                        >
                          {isActive && signingType === "produttore" ? <Loader2 className="animate-spin" size={12} /> : <FileSignature size={12} />}
                          Produttore
                        </button>
                      )}
                      {cfg.canTrasportatore && (
                        <button onClick={() => handleFirmaFromPool(pool, "trasportatore")} disabled={isActive}
                          className={`${btnBase} bg-blue-600/80 text-blue-100 hover:bg-blue-500`}
                        >
                          {isActive && signingType === "trasportatore" ? <Loader2 className="animate-spin" size={12} /> : <Truck size={12} />}
                          Trasportatore
                        </button>
                      )}
                      {cfg.canImpianto && (
                        <button onClick={() => handleFirmaFromPool(pool, "impianto")} disabled={isActive}
                          className={`${btnBase} bg-green-600/80 text-green-100 hover:bg-green-500`}
                        >
                          {isActive && signingType === "impianto" ? <Loader2 className="animate-spin" size={12} /> : <Factory size={12} />}
                          Impianto
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
