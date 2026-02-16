import { useState } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileShell } from "@/components/layout/MobileShell";
import { useFIRForms } from "@/hooks/useFIRForms";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { FileText, Clock, CheckCircle, Send } from "lucide-react";

type FilterStatus = "all" | "draft" | "submitted" | "completed";

export default function CronologiaFIRPage() {
  const { myForms: firForms, isLoadingMyForms: isLoading } = useFIRForms();
  const [filter, setFilter] = useState<FilterStatus>("all");

  const filtered = (firForms || []).filter((fir: any) => {
    if (filter === "all") return true;
    return fir.status === filter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "draft": return <Clock className="h-4 w-4 text-primary" />;
      case "submitted": return <Send className="h-4 w-4 text-neon-cyan" />;
      case "completed": return <CheckCircle className="h-4 w-4 text-neon-green" />;
      default: return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft": return "Bozza";
      case "submitted": return "Inviato";
      case "completed": return "Completato";
      default: return status;
    }
  };

  return (
    <MobileShell>
      <div className="px-4 pt-4 pb-2" style={{ borderBottom: '1px solid rgba(192, 173, 103, 0.15)' }}>
        <h1 className="text-xl font-display font-bold text-foreground tracking-wider">Cronologia FIR</h1>
        <p className="text-muted-foreground text-xs font-mono mt-1">Storico formulari compilati</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
        {([
          { key: "all", label: "Tutti" },
          { key: "draft", label: "Bozze" },
          { key: "submitted", label: "Inviati" },
          { key: "completed", label: "Completati" },
        ] as { key: FilterStatus; label: string }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              filter === tab.key
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-card/60 text-muted-foreground border border-border/30 hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-primary animate-pulse font-display">Caricamento...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">Nessun formulario trovato</p>
          </div>
        ) : (
          filtered.map((fir: any) => (
            <div
              key={fir.id}
              className="p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(fir.status)}
                  <span className="text-xs font-mono text-primary">{fir.numero_fir || "—"}</span>
                </div>
                <span className="text-xs text-muted-foreground font-mono px-2 py-0.5 rounded bg-secondary/50">
                  {getStatusLabel(fir.status)}
                </span>
              </div>
              <p className="text-sm text-foreground font-medium">
                {fir.produttore_denominazione || "Produttore non specificato"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                EER: {fir.codice_eer || "—"} • {fir.quantita ? `${fir.quantita} ${fir.unita_misura || "kg"}` : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {fir.created_at ? format(new Date(fir.created_at), "dd MMM yyyy, HH:mm", { locale: it }) : "—"}
              </p>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </MobileShell>
  );
}
