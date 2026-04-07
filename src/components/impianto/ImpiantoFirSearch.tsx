import { useState } from "react";
import { Search, Download, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { searchXFir, parseRentriToSummary } from "@/services/impiantoFirService";
import type { RentriCliente } from "@/lib/rentriVpsApi";
import { toast } from "sonner";

interface Props {
  cliente: RentriCliente;
  color: string;
  onImport: (data: Record<string, unknown>) => Promise<void>;
}

export function ImpiantoFirSearch({ cliente, color, onImport }: Props) {
  const [numero, setNumero] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [found, setFound] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!numero.trim()) return;
    setLoading(true); setFound(null); setError(null);
    try {
      const res = await searchXFir(cliente, numero.trim());
      if (res.success && res.data) {
        setFound(res.data as Record<string, unknown>);
      } else {
        setError(res.error || "FIR non trovato");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!found) return;
    setImporting(true);
    try {
      await onImport(found);
      toast.success("FIR importato con successo");
      setFound(null); setNumero("");
    } catch (err: any) {
      toast.error("Errore importazione: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const summary = found ? parseRentriToSummary(found) : null;

  return (
    <div className="rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4">
      <div className="flex items-center gap-2" style={{ color: `rgb(${color})` }}>
        <Search className="h-5 w-5" />
        <h3 className="font-display text-lg tracking-wider uppercase">Cerca FIR su RENTRI</h3>
      </div>

      <div className="flex gap-3">
        <input
          value={numero}
          onChange={(e) => setNumero(e.target.value.toUpperCase())}
          placeholder="XNQLK 052508 QS"
          className="flex-1 px-4 py-3 bg-background/80 border border-border/30 rounded-xl text-foreground font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1"
          style={{ ["--tw-ring-color" as any]: `rgba(${color}, 0.5)` }}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button
          onClick={handleSearch}
          disabled={loading || !numero.trim()}
          className="px-6 py-3 rounded-xl font-display text-sm tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2"
          style={{ background: `rgba(${color}, 0.2)`, borderColor: `rgba(${color}, 0.3)`, color: `rgb(${color})`, border: "1px solid" }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          CERCA
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm p-3 rounded-xl bg-destructive/10 border border-destructive/30">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {summary && (
        <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: `rgba(${color}, 0.3)`, background: `rgba(${color}, 0.05)` }}>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" style={{ color: `rgb(${color})` }} />
            <span className="font-display text-sm tracking-wider" style={{ color: `rgb(${color})` }}>FIR TROVATO</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground text-xs">Numero:</span><br/><strong className="font-mono">{summary.numero_fir}</strong></div>
            <div><span className="text-muted-foreground text-xs">CER:</span><br/><strong className="font-mono">{summary.cer}</strong></div>
            <div><span className="text-muted-foreground text-xs">Produttore:</span><br/>{summary.produttore || "—"}</div>
            <div><span className="text-muted-foreground text-xs">Trasportatore:</span><br/>{summary.trasportatore || "—"}</div>
            <div><span className="text-muted-foreground text-xs">Quantità:</span><br/><strong>{summary.quantita?.toLocaleString("it-IT")} {summary.unita_misura}</strong></div>
            <div><span className="text-muted-foreground text-xs">Destinatario:</span><br/>{summary.destinatario || "—"}</div>
          </div>
          <button
            onClick={handleImport}
            disabled={importing}
            className="w-full py-3 rounded-xl font-display font-semibold tracking-wider text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: `rgb(${color})` }}
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            IMPORTA FIR
          </button>
        </div>
      )}
    </div>
  );
}
