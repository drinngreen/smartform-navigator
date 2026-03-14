import { useState, useEffect } from "react";
import { Copy, Check, Loader2, Fuel, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { emissioneFirNgrok, firmaRicezioneNgrok } from "@/lib/rentriNgrokApi";
import { toast } from "sonner";

interface PoolNumber {
  id: string;
  fir_number: string;
  status: string;
  societa_id: string;
  created_at: string;
}

const TENANT_MAP: Record<string, string> = {
  global: "global",
  multy: "multy",
  niyol: "niyol",
};

const COMPANY_MAP: Record<string, string> = {
  global: "GLOBAL",
  multy: "MULTY",
  niyol: "NIYOL",
};

type FirmaType = "produttore" | "trasportatore" | "destinatario";

export function FIRPoolTank({ tenant }: { tenant: string }) {
  const [numbers, setNumbers] = useState<PoolNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [signingType, setSigningType] = useState<FirmaType | null>(null);

  const societaId = TENANT_MAP[tenant] ?? tenant;
  const company = COMPANY_MAP[tenant] ?? tenant.toUpperCase();

  const fetchNumbers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("fir_number_pool")
      .select("id, fir_number, status, societa_id, created_at")
      .eq("societa_id", societaId)
      .eq("status", "available")
      .eq("is_demo", false)
      .eq("suspended", false)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Errore caricamento pool: " + error.message);
    } else {
      setNumbers(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNumbers();
  }, [tenant]);

  const handleCopy = async (firNumber: string, id: string) => {
    await navigator.clipboard.writeText(firNumber);
    setCopiedId(id);
    toast.success("Numero FIR copiato!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFirma = async (pool: PoolNumber, tipo: FirmaType) => {
    setSigningId(pool.id);
    setSigningType(tipo);

    try {
      let result;
      const payload = { firNumber: pool.fir_number };

      if (tipo === "produttore") {
        result = await emissioneFirNgrok(company, payload);
      } else if (tipo === "trasportatore") {
        // Trasportatore uses emissione with transport flag
        result = await emissioneFirNgrok(company, { ...payload, tipo: "trasportatore" });
      } else {
        result = await firmaRicezioneNgrok(company, payload);
      }

      if (result.ok) {
        toast.success(`Firma ${tipo} completata per ${pool.fir_number}!`);
        // Mark as consumed in the pool
        const { error } = await supabase
          .from("fir_number_pool")
          .update({ status: "consumed", consumed_at: new Date().toISOString() })
          .eq("id", pool.id);

        if (error) {
          toast.error("Firma OK ma errore aggiornamento pool: " + error.message);
        }
        // Remove from local list
        setNumbers((prev) => prev.filter((n) => n.id !== pool.id));
      } else {
        toast.error(`Errore firma ${tipo}: ${JSON.stringify(result.data)}`);
      }
    } catch (err: any) {
      toast.error(`Errore firma ${tipo}: ${err.message}`);
    }

    setSigningId(null);
    setSigningType(null);
  };

  const firmaButtons = (pool: PoolNumber) => {
    const isActive = signingId === pool.id;
    const btnBase = "px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 flex items-center gap-1 transition-all";

    return (
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => handleFirma(pool, "produttore")}
          disabled={isActive}
          className={`${btnBase} bg-yellow-600/80 text-yellow-100 hover:bg-yellow-500`}
        >
          {isActive && signingType === "produttore" ? <Loader2 className="animate-spin" size={12} /> : null}
          Produttore
        </button>
        {tenant === "multy" && (
          <button
            onClick={() => handleFirma(pool, "trasportatore")}
            disabled={isActive}
            className={`${btnBase} bg-blue-600/80 text-blue-100 hover:bg-blue-500`}
          >
            {isActive && signingType === "trasportatore" ? <Loader2 className="animate-spin" size={12} /> : null}
            Trasportatore
          </button>
        )}
        <button
          onClick={() => handleFirma(pool, "destinatario")}
          disabled={isActive}
          className={`${btnBase} bg-green-600/80 text-green-100 hover:bg-green-500`}
        >
          {isActive && signingType === "destinatario" ? <Loader2 className="animate-spin" size={12} /> : null}
          Destinatario
        </button>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-display text-foreground flex items-center gap-2">
          <Fuel size={20} className="text-red-400" />
          Serbatoio FIR — {tenant.toUpperCase()}
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {loading ? "..." : `${numbers.length} disponibili`}
          </span>
          <button
            onClick={fetchNumbers}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            Aggiorna
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      ) : numbers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nessun numero FIR disponibile per {tenant.toUpperCase()}. Usa "Rifornimento FIR" per aggiungerne.
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {numbers.map((pool) => (
            <div
              key={pool.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50 hover:bg-secondary/50 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => handleCopy(pool.fir_number, pool.id)}
                  className="shrink-0 p-2 rounded-md bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                  title="Copia numero FIR"
                >
                  {copiedId === pool.id ? (
                    <Check size={14} className="text-green-400" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
                <code className="text-sm font-mono text-foreground truncate select-all">
                  {pool.fir_number}
                </code>
              </div>
              {firmaButtons(pool)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
