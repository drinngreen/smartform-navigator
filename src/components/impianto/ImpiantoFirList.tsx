import { useState } from "react";
import { Search, Filter, PenTool, CheckCircle, Clock, AlertTriangle, Eye } from "lucide-react";
import type { FirSummary, FirStatusInterno } from "@/types/impiantoFir";

const STATUS_MAP: Record<FirStatusInterno, { label: string; cls: string }> = {
  bozza: { label: "Bozza", cls: "bg-muted/30 text-muted-foreground border-border/30" },
  importato: { label: "Importato", cls: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
  attesa_firma_ricezione: { label: "Attesa Ricezione", cls: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  firmato_ricezione: { label: "Firmato Ricezione", cls: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  firmato_destinatario: { label: "Chiuso", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  errore: { label: "Errore", cls: "bg-red-500/20 text-red-300 border-red-500/30" },
};

interface Props {
  items: FirSummary[];
  loading: boolean;
  color: string;
  onSelect: (item: FirSummary) => void;
}

export function ImpiantoFirList({ items, loading, color, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [filterStato, setFilterStato] = useState<FirStatusInterno | "all">("all");

  const filtered = items.filter((item) => {
    if (filterStato !== "all" && item.stato_interno !== filterStato) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return item.numero_fir?.toLowerCase().includes(s) ||
      item.cer?.toLowerCase().includes(s) ||
      item.produttore?.toLowerCase().includes(s) ||
      item.trasportatore?.toLowerCase().includes(s);
  });

  return (
    <div className="rounded-2xl bg-card/60 border border-border/30 overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-border/20 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca FIR, CER, produttore..."
            className="w-full pl-9 pr-4 py-2 bg-background/80 border border-border/30 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(["all", "importato", "attesa_firma_ricezione", "firmato_ricezione", "firmato_destinatario"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStato(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors ${
                filterStato === s ? "bg-primary/20 text-primary border border-primary/30" : "bg-background/50 text-muted-foreground border border-border/20 hover:bg-primary/10"
              }`}
            >
              {s === "all" ? "Tutti" : STATUS_MAP[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30 text-muted-foreground text-xs uppercase font-mono">
              <th className="p-3 text-left">N° FIR</th>
              <th className="p-3 text-left">Produttore</th>
              <th className="p-3 text-left">Trasportatore</th>
              <th className="p-3 text-left">CER</th>
              <th className="p-3 text-right">Quantità</th>
              <th className="p-3 text-center">Stato</th>
              <th className="p-3 text-center">Firme</th>
              <th className="p-3 text-center">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Caricamento...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nessun FIR trovato</td></tr>
            ) : (
              filtered.map((item) => {
                const st = STATUS_MAP[item.stato_interno] || STATUS_MAP.bozza;
                return (
                  <tr key={item.id} className="border-b border-border/10 hover:bg-accent/5">
                    <td className="p-3 font-mono text-xs font-bold" style={{ color: `rgb(${color})` }}>{item.numero_fir || "—"}</td>
                    <td className="p-3 text-xs max-w-[140px] truncate">{item.produttore || "—"}</td>
                    <td className="p-3 text-xs max-w-[140px] truncate">{item.trasportatore || "—"}</td>
                    <td className="p-3 font-mono">{item.cer || "—"}</td>
                    <td className="p-3 text-right font-bold">{item.quantita?.toLocaleString("it-IT")} {item.unita_misura}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`w-2.5 h-2.5 rounded-full ${item.firma_ricezione_at ? "bg-emerald-400" : "bg-muted-foreground/30"}`} title="Ricezione" />
                        <span className={`w-2.5 h-2.5 rounded-full ${item.firma_destinatario_at ? "bg-emerald-400" : "bg-muted-foreground/30"}`} title="Destinatario" />
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => onSelect(item)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors" style={{ borderColor: `rgba(${color}, 0.3)`, color: `rgb(${color})` }}>
                        <Eye className="h-3 w-3" /> Dettagli
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
