import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileShell } from "@/components/layout/MobileShell";
import { useFIRForms } from "@/hooks/useFIRForms";
import { useFIRStore } from "@/stores/firStore";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { FileText, Clock, CheckCircle, Edit, Download, Trash2 } from "lucide-react";
import logoDragon from "@/assets/logo-dragon.png";
import { toast } from "sonner";
import { generateFIRSummaryPdf } from "@/lib/firSummaryPdf";
export default function CronologiaFIRPage() {
    const navigate = useNavigate();
    const loadFromDatabase = useFIRStore((s) => s.loadFromDatabase);
    const { myForms: firForms, isLoadingMyForms: isLoading, deleteFIR } = useFIRForms();
    const [filter, setFilter] = useState("all");
    const allForms = firForms || [];
    const counts = {
        all: allForms.length,
        draft: allForms.filter((f) => f.status === "bozza").length,
        submitted: allForms.filter((f) => f.status === "inviato").length,
        completed: allForms.filter((f) => f.status === "completato").length,
    };
    const statusMap = { bozza: "draft", inviato: "submitted", completato: "completed" };
    const filtered = allForms.filter((fir) => {
        if (filter === "all")
            return true;
        return statusMap[fir.status] === filter;
    });
    const handleEdit = (fir) => {
        loadFromDatabase(fir);
        navigate("/app");
    };
    const handleDownloadPdf = async (fir) => {
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
            const blob = await generateFIRSummaryPdf(storeData);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `FIR_${fir.numero_fir || fir.id}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        }
        catch (err) {
            toast.error("Errore generazione PDF: " + err.message);
        }
    };
    const handleDelete = (fir) => {
        if (window.confirm(`Sei sicuro di voler eliminare il FIR ${fir.numero_fir || "senza numero"}?`)) {
            deleteFIR.mutate(fir.id);
        }
    };
    const getStatusBadge = (status) => {
        switch (status) {
            case "bozza":
                return (_jsxs("span", { className: "flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30", children: [_jsx(Clock, { className: "h-3 w-3" }), " Bozza"] }));
            case "inviato":
                return (_jsxs("span", { className: "flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30", children: [_jsx(CheckCircle, { className: "h-3 w-3" }), " Inviato"] }));
            case "completato":
                return (_jsxs("span", { className: "flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full bg-neon-green/20 text-neon-green border border-neon-green/30", children: [_jsx(CheckCircle, { className: "h-3 w-3" }), " Chiuso"] }));
            default:
                return null;
        }
    };
    return (_jsxs(MobileShell, { children: [_jsxs("div", { className: "px-4 pt-4 pb-2 flex items-center justify-between", style: { borderBottom: '1px solid rgba(192, 173, 103, 0.15)' }, children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-display font-bold text-foreground tracking-wider", children: "Cronologia FIR" }), _jsx("p", { className: "text-muted-foreground text-xs font-mono mt-1 uppercase tracking-wider", children: "I tuoi formulari salvati e inviati" })] }), _jsx("img", { src: logoDragon, alt: "Dragon", className: "h-8 w-8 opacity-60" })] }), _jsx("div", { className: "px-4 py-3", children: _jsx("div", { className: "flex rounded-xl border border-border/30 overflow-hidden", children: ([
                        { key: "all", label: "Tutti" },
                        { key: "draft", label: "Bozze" },
                        { key: "submitted", label: "Inviati" },
                        { key: "completed", label: "Chiusi" },
                    ]).map((tab) => (_jsxs("button", { onClick: () => setFilter(tab.key), className: `flex-1 px-2 py-2.5 text-xs font-mono whitespace-nowrap transition-all ${filter === tab.key
                            ? "bg-primary/15 text-primary font-semibold"
                            : "bg-card/40 text-muted-foreground hover:text-foreground"}`, children: [tab.label, " (", counts[tab.key], ")"] }, tab.key))) }) }), _jsx("div", { className: "flex-1 overflow-y-auto px-4 pb-20 space-y-3", children: isLoading ? (_jsx("div", { className: "flex items-center justify-center py-12", children: _jsx("div", { className: "text-primary animate-pulse font-display", children: "Caricamento..." }) })) : filtered.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-12 text-center", children: [_jsx(FileText, { className: "h-12 w-12 text-muted-foreground/30 mb-3" }), _jsx("p", { className: "text-muted-foreground text-sm", children: "Nessun formulario trovato" })] })) : (filtered.map((fir) => (_jsxs("div", { className: "p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(FileText, { className: "h-4 w-4 text-primary" }), _jsx("span", { className: "text-sm font-display font-semibold text-foreground", children: fir.numero_fir || "—" })] }), getStatusBadge(fir.status)] }), _jsx("p", { className: "text-xs text-muted-foreground font-mono mb-2", children: fir.created_at ? format(new Date(fir.created_at), "dd MMMM yyyy, HH:mm", { locale: it }) : "—" }), fir.status !== "bozza" && (_jsxs("div", { className: "space-y-0.5 mb-3", children: [fir.codice_eer && (_jsxs("p", { className: "text-xs text-muted-foreground", children: [_jsx("span", { className: "text-primary font-semibold", children: "EER:" }), " ", fir.codice_eer] })), fir.destinatario_denominazione && (_jsxs("p", { className: "text-xs text-muted-foreground", children: [_jsx("span", { className: "text-primary font-semibold", children: "Dest.:" }), " ", fir.destinatario_denominazione] })), fir.quantita && (_jsxs("p", { className: "text-xs text-muted-foreground", children: [_jsx("span", { className: "text-primary font-semibold", children: "Qt\u00E0:" }), " ", fir.quantita, " ", fir.unita_misura || "kg"] }))] })), _jsxs("div", { className: "flex items-center gap-2 mt-2", children: [(fir.status === "bozza" || fir.status === "inviato") && (_jsxs("button", { onClick: () => handleEdit(fir), className: "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors", children: [_jsx(Edit, { className: "h-3.5 w-3.5" }), " ", fir.status === "bozza" ? "Modifica" : "Visualizza"] })), _jsxs("button", { onClick: () => handleDownloadPdf(fir), className: "flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border/30 text-muted-foreground text-xs hover:text-foreground transition-colors", children: [_jsx(Download, { className: "h-3.5 w-3.5" }), " PDF"] }), _jsx("button", { onClick: () => handleDelete(fir), className: "p-2 rounded-xl bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors", children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) })] })] }, fir.id)))) }), _jsx(BottomNav, {})] }));
}
