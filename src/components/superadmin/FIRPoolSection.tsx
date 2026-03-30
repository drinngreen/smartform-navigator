import { useState } from "react";
import { Download, Loader2, Package } from "lucide-react";
import { richiestaVidimazione, type RentriCliente } from "@/lib/rentriVpsApi";
import { downloadCSV } from "@/lib/rentriSuperApi";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { getBlocksForTenant } from "@/lib/rentriBlockCodes";

const QUANTITIES = [5, 10, 50, 100, 500];

const FIR_NUMBER_REGEX = /^[A-Z]{5} [0-9]{6} [A-Z]{2}$/;

const normalizeFirNumber = (value: string) =>
  value.trim().replace(/\s+/g, " ").toUpperCase();

export function FIRPoolSection({ tenant }: { tenant: string }) {
  const blocks = getBlocksForTenant(tenant);
  const [selectedBlock, setSelectedBlock] = useState(blocks[0]?.code ?? "");
  const [qty, setQty] = useState(5);
  const [loading, setLoading] = useState(false);
  const [lastNumbers, setLastNumbers] = useState<string[]>([]);

  const handleRequest = async () => {
    setLoading(true);
    const cliente = (tenant.toLowerCase()) as RentriCliente;
    const result = await richiestaVidimazione(cliente, qty);

    if (result.ok && result.data?.numeri) {
      const rawNumbers: string[] = Array.isArray(result.data.numeri) ? result.data.numeri : [];
      const normalized = rawNumbers.map((n) => normalizeFirNumber(String(n)));
      const validNumbers = normalized.filter((n) => FIR_NUMBER_REGEX.test(n));
      const invalidCount = normalized.length - validNumbers.length;

      setLastNumbers(validNumbers);

      if (validNumbers.length === 0) {
        toast.error("Nessun numero FIR valido ricevuto dalla vidimazione");
        if (invalidCount > 0) {
          toast.warning(`${invalidCount} numeri scartati per formato non valido`);
        }
        setLoading(false);
        return;
      }

      const rows = validNumbers.map((n: string) => ({
        fir_number: n,
        user_id: "00000000-0000-0000-0000-000000000000", // pool placeholder
        societa_id: tenant,
        status: "available",
      }));

      const { error } = await supabase.from("fir_number_pool").insert(rows);
      if (error) {
        toast.error("Numeri ricevuti ma errore nel salvataggio: " + error.message);
      } else {
        toast.success(`${validNumbers.length} numeri FIR validi caricati nel pool ${tenant}`);
        if (invalidCount > 0) {
          toast.warning(`${invalidCount} numeri scartati per formato non valido`);
        }
      }
    } else {
      toast.error("Errore vidimazione: " + JSON.stringify(result.data));
    }

    setLoading(false);
  };

  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <h3 className="text-lg font-display text-foreground flex items-center gap-2 mb-4">
        <Package size={20} /> Rifornimento FIR — {tenant.toUpperCase()}
      </h3>
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <label className="text-sm text-muted-foreground">Quantità:</label>
        <div className="flex gap-2">
          {QUANTITIES.map((q) => (
            <button key={q} onClick={() => setQty(q)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${qty === q ? "bg-red-600 text-white" : "bg-secondary/50 text-muted-foreground hover:text-foreground"}`}
            >{q}</button>
          ))}
        </div>
        {blocks.length > 0 && (
          <select
            value={selectedBlock}
            onChange={e => setSelectedBlock(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm bg-secondary/50 border border-border text-foreground"
          >
            {blocks.map(b => (
              <option key={b.code} value={b.code}>
                {b.code} — {b.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex gap-3">
        <button onClick={handleRequest} disabled={loading}
          className="px-6 py-3 rounded-lg font-display font-semibold bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : null}
          RICHIEDI NUOVI NUMERI
        </button>
        {lastNumbers.length > 0 && (
          <button onClick={() => downloadCSV(lastNumbers, `fir_${tenant}_${Date.now()}.csv`)}
            className="px-4 py-3 rounded-lg bg-secondary/50 text-foreground hover:bg-secondary flex items-center gap-2"
          >
            <Download size={18} /> CSV ({lastNumbers.length})
          </button>
        )}
      </div>
    </div>
  );
}
