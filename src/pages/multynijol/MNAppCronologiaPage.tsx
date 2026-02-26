import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MNBottomNav } from "@/components/layout/MNBottomNav";
import { MobileShell } from "@/components/layout/MobileShell";
import { useMNFIRForms } from "@/hooks/useMNFIRForms";
import { useMNFIRStore } from "@/stores/mnFirStore";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { FileText, Clock, CheckCircle, Edit, Download, Trash2 } from "lucide-react";
import logoDragon from "@/assets/logo-dragon.png";
import { toast } from "sonner";
import { generateFIRSummaryPdf } from "@/lib/firSummaryPdf";

type FilterStatus = "all" | "draft" | "submitted" | "completed";

export default function MNAppCronologiaPage() {
  const location = useLocation();
  const context = location.pathname.includes("/niyol") ? "niyol" : "multyproget";
  const basePath = `/mn/app/${context}`;
  const navigate = useNavigate();
  const loadFromDatabase = useMNFIRStore((s) => s.loadFromDatabase);
  const { myForms: firForms, isLoadingMyForms: isLoading, deleteFIR } = useMNFIRForms();
  const [filter, setFilter] = useState<FilterStatus>("all");

  const allForms = firForms || [];
  const counts = {
    all: allForms.length,
    draft: allForms.filter((f: any) => f.status === "bozza").length,
    submitted: allForms.filter((f: any) => f.status === "inviato").length,
    completed: allForms.filter((f: any) => f.status === "completato").length,
  };

  const statusMap: Record<string, FilterStatus> = { bozza: "draft", inviato: "submitted", completato: "completed" };
  const filtered = allForms.filter((fir: any) => filter === "all" || statusMap[fir.status] === filter);

  const handleEdit = (fir: any) => { loadFromDatabase(fir); navigate(basePath); };
  const handleDelete = (fir: any) => { if (window.confirm(`Eliminare FIR ${fir.numero_fir || "senza numero"}?`)) deleteFIR.mutate(fir.id); };
  const handleDownloadPdf = async (fir: any) => {
    try {
      const storeData = {
        selectedFirNumber: fir.numero_fir || "",
        codiceEER: fir.codice_eer || "",
        descrizioneRifiuto: fir.descrizione_rifiuto || "",
        quantita: fir.quantita?.toString() || "",
        unitaMisura: fir.unita_misura || "kg",
        statoFisico: fir.stato_fisico || "",
        produttoreDenominazione: fir.produttore_denominazione || "",
        produttoreCF: fir.produttore_codice_fiscale || "",
        produttoreUnitaLocale: fir.produttore_indirizzo || "",
        destinatarioDenominazione: fir.destinatario_denominazione || "",
        destinatarioCF: fir.destinatario_codice_fiscale || "",
        destinatarioUnitaLocale: fir.destinatario_indirizzo || "",
        trasportatoreDenominazione: fir.trasportatore_denominazione || "",
        trasportatoreCF: fir.trasportatore_codice_fiscale || "",
        trasportatoreNumeroAlbo: fir.trasportatore_iscrizione_albo || "",
        targaAutomezzo: fir.trasportatore_targa_automezzo || "",
        targaRimorchio: fir.trasportatore_targa_rimorchio || "",
        conducente: fir.trasportatore_conducente || "",
        intermediarioDenominazione: fir.intermediario_denominazione || "",
        intermediarioCF: fir.intermediario_codice_fiscale || "",
        intermediarioNumeroAlbo: fir.intermediario_iscrizione_albo || "",
        annotazioni: fir.note || "",
        caratteristicheHP: fir.caratteristiche_hp || [],
        ...(fir.form_data || {}),
      };
      const blob = await generateFIRSummaryPdf(storeData as any);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FIR_${fir.numero_fir || fir.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error("Errore generazione PDF: " + err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "bozza": return <span className="flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30"><Clock className="h-3 w-3" /> Bozza</span>;
      case "inviato": return <span className="flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30"><CheckCircle className="h-3 w-3" /> Inviato</span>;
      case "completato": return <span className="flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full bg-neon-green/20 text-neon-green border border-neon-green/30"><CheckCircle className="h-3 w-3" /> Chiuso</span>;
      default: return null;
    }
  };

  return (
    <MobileShell>
      <div className="px-4 pt-4 pb-2 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(192, 173, 103, 0.15)' }}>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground tracking-wider">Cronologia FIR</h1>
          <p className="text-muted-foreground text-xs font-mono mt-1 uppercase tracking-wider">I tuoi formulari salvati e inviati</p>
        </div>
        <img src={logoDragon} alt="Dragon" className="h-8 w-8 opacity-60" />
      </div>

      <div className="px-4 py-3">
        <div className="flex rounded-xl border border-border/30 overflow-hidden">
          {([{ key: "all" as FilterStatus, label: "Tutti" }, { key: "draft" as FilterStatus, label: "Bozze" }, { key: "submitted" as FilterStatus, label: "Inviati" }, { key: "completed" as FilterStatus, label: "Chiusi" }]).map((tab) => (
            <button key={tab.key} onClick={() => setFilter(tab.key)} className={`flex-1 px-2 py-2.5 text-xs font-mono whitespace-nowrap transition-all ${filter === tab.key ? "bg-primary/15 text-primary font-semibold" : "bg-card/40 text-muted-foreground hover:text-foreground"}`}>
              {tab.label} ({counts[tab.key]})
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-20 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><div className="text-primary animate-pulse font-display">Caricamento...</div></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center"><FileText className="h-12 w-12 text-muted-foreground/30 mb-3" /><p className="text-muted-foreground text-sm">Nessun formulario trovato</p></div>
        ) : (
          filtered.map((fir: any) => (
            <div key={fir.id} className="p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /><span className="text-sm font-display font-semibold text-foreground">{fir.numero_fir || "—"}</span></div>
                {getStatusBadge(fir.status)}
              </div>
              <p className="text-xs text-muted-foreground font-mono mb-2">{fir.created_at ? format(new Date(fir.created_at), "dd MMMM yyyy, HH:mm", { locale: it }) : "—"}</p>
              {fir.status !== "bozza" && (
                <div className="space-y-0.5 mb-3">
                  {fir.codice_eer && <p className="text-xs text-muted-foreground"><span className="text-primary font-semibold">EER:</span> {fir.codice_eer}</p>}
                  {fir.destinatario_denominazione && <p className="text-xs text-muted-foreground"><span className="text-primary font-semibold">Dest.:</span> {fir.destinatario_denominazione}</p>}
                  {fir.quantita && <p className="text-xs text-muted-foreground"><span className="text-primary font-semibold">Qtà:</span> {fir.quantita} {fir.unita_misura || "kg"}</p>}
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                {(fir.status === "bozza" || fir.status === "inviato") && (
                  <button onClick={() => handleEdit(fir)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors">
                    <Edit className="h-3.5 w-3.5" /> {fir.status === "bozza" ? "Modifica" : "Visualizza"}
                  </button>
                )}
                <button onClick={() => handleDownloadPdf(fir)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border/30 text-muted-foreground text-xs hover:text-foreground transition-colors"><Download className="h-3.5 w-3.5" /> PDF</button>
                <button onClick={() => handleDelete(fir)} className="p-2 rounded-xl bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))
        )}
      </div>
      <MNBottomNav basePath={basePath} />
    </MobileShell>
  );
}
