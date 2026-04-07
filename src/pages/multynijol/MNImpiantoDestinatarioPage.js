import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useMovimentiImpianto } from "@/hooks/useMovimentiImpianto";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Package, ArrowDownToLine, Scale, Factory, CheckCircle, XCircle, AlertTriangle, FileText, } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
export default function MNImpiantoDestinatarioPage() {
    const { context } = useParams();
    const { user } = useAuth();
    const [impianti, setImpianti] = useState([]);
    const [selectedImpianto, setSelectedImpianto] = useState("");
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const { movimenti, isLoading, createMovimento, stats } = useMovimentiImpianto(selectedImpianto || undefined, "DESTINATARIO");
    const [form, setForm] = useState({
        numero_fir: "", cer: "", descrizione_rifiuto: "",
        produttore_denominazione: "", trasportatore_denominazione: "",
        quantita_presunta: "", quantita_kg: "",
        esito_accettazione: "accettato",
        note: "",
    });
    useEffect(() => {
        supabase.from("impianti").select("id, nome").then(({ data }) => {
            if (data) {
                setImpianti(data);
                if (data.length > 0 && !selectedImpianto)
                    setSelectedImpianto(data[0].id);
            }
        });
    }, []);
    const handleSave = async () => {
        if (!form.numero_fir.trim()) {
            toast.error("Il Numero FIR è obbligatorio");
            return;
        }
        if (!form.cer.trim() || !form.quantita_kg) {
            toast.error("CER e Quantità pesata sono obbligatori");
            return;
        }
        const kgPesati = parseFloat(form.quantita_kg);
        const kgPresunta = form.quantita_presunta ? parseFloat(form.quantita_presunta) : null;
        // Auto-detect esito based on weight comparison
        let esito = form.esito_accettazione;
        if (kgPresunta && kgPresunta > 0) {
            const diff = Math.abs(kgPesati - kgPresunta);
            const pctDiff = (diff / kgPresunta) * 100;
            if (pctDiff > 10) {
                toast.warning(`⚠️ Scostamento peso: ${pctDiff.toFixed(1)}% rispetto alla quantità presunta`);
            }
        }
        const payload = {
            impianto_id: selectedImpianto,
            cer: form.cer.trim(),
            descrizione_rifiuto: form.descrizione_rifiuto || null,
            quantita_kg: kgPesati,
            quantita_presunta: kgPresunta,
            tipo_movimento: "CARICO",
            ruolo_impianto: "DESTINATARIO",
            numero_fir: form.numero_fir.trim(),
            produttore_denominazione: form.produttore_denominazione || null,
            trasportatore_denominazione: form.trasportatore_denominazione || null,
            esito_accettazione: esito,
            note: form.note || null,
            data_movimento: new Date().toISOString().split("T")[0],
        };
        await createMovimento.mutateAsync(payload);
        setDialogOpen(false);
        setForm({
            numero_fir: "", cer: "", descrizione_rifiuto: "",
            produttore_denominazione: "", trasportatore_denominazione: "",
            quantita_presunta: "", quantita_kg: "",
            esito_accettazione: "accettato", note: "",
        });
    };
    const filtered = movimenti?.filter((m) => {
        if (!search)
            return true;
        const s = search.toLowerCase();
        return m.cer.toLowerCase().includes(s) ||
            m.produttore_denominazione?.toLowerCase().includes(s) ||
            m.numero_fir?.toLowerCase().includes(s) ||
            m.descrizione_rifiuto?.toLowerCase().includes(s);
    }) ?? [];
    const accettati = movimenti?.filter((m) => m.esito_accettazione === "accettato").length ?? 0;
    const respinti = movimenti?.filter((m) => m.esito_accettazione === "respinto").length ?? 0;
    const parziali = movimenti?.filter((m) => m.esito_accettazione === "parziale").length ?? 0;
    return (_jsxs(MNAdminLayout, { title: "Impianto \u2014 Destinatario", subtitle: "Ricezione rifiuti da produttori esterni", children: [_jsx("div", { className: "mb-4", children: _jsxs(Select, { value: selectedImpianto, onValueChange: setSelectedImpianto, children: [_jsx(SelectTrigger, { className: "w-64 bg-card/60 border-border/30", children: _jsx(SelectValue, { placeholder: "Seleziona impianto" }) }), _jsx(SelectContent, { children: impianti.map((imp) => (_jsx(SelectItem, { value: imp.id, children: imp.nome }, imp.id))) })] }) }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-5 gap-3 mb-6", children: [_jsx(StatCard, { icon: Package, label: "Totale", value: stats.totale, color: "59, 130, 246" }), _jsx(StatCard, { icon: Scale, label: "Kg Ricevuti", value: `${stats.kgTotali.toLocaleString("it-IT")}`, color: "6, 182, 212" }), _jsx(StatCard, { icon: CheckCircle, label: "Accettati", value: accettati, color: "34, 197, 94" }), _jsx(StatCard, { icon: AlertTriangle, label: "Parziali", value: parziali, color: "249, 115, 22" }), _jsx(StatCard, { icon: XCircle, label: "Respinti", value: respinti, color: "239, 68, 68" })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-3 mb-4", children: [_jsxs("div", { className: "relative flex-1 min-w-[200px]", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Cerca FIR, CER, produttore...", value: search, onChange: (e) => setSearch(e.target.value), className: "pl-9 bg-card/60 border-border/30" })] }), _jsxs(Button, { onClick: () => setDialogOpen(true), className: "bg-blue-600 hover:bg-blue-500 text-white", children: [_jsx(ArrowDownToLine, { className: "h-4 w-4 mr-1" }), " Registra Arrivo"] })] }), _jsx(Dialog, { open: dialogOpen, onOpenChange: setDialogOpen, children: _jsxs(DialogContent, { className: "max-w-lg bg-card border-border/50", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(ArrowDownToLine, { className: "h-5 w-5 text-blue-400" }), "Registra Arrivo \u2014 Pesata e Accettazione"] }) }), _jsxs("div", { className: "p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-start gap-2 text-sm", children: [_jsx(FileText, { className: "h-4 w-4 text-blue-400 mt-0.5 shrink-0" }), _jsxs("span", { className: "text-blue-200", children: ["L'impianto figura come ", _jsx("strong", { children: "Destinatario (Campo 3)" }), " nel FIR. Compilare quantit\u00E0 effettiva ed esito accettazione."] })] }), _jsxs("div", { className: "space-y-3 mt-2", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Numero FIR *" }), _jsx(Input, { value: form.numero_fir, onChange: (e) => setForm({ ...form, numero_fir: e.target.value }), placeholder: "Numero formulario in arrivo" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Produttore" }), _jsx(Input, { value: form.produttore_denominazione, onChange: (e) => setForm({ ...form, produttore_denominazione: e.target.value }), placeholder: "Denominazione produttore" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Trasportatore" }), _jsx(Input, { value: form.trasportatore_denominazione, onChange: (e) => setForm({ ...form, trasportatore_denominazione: e.target.value }), placeholder: "Denominazione vettore" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Codice CER *" }), _jsx(Input, { value: form.cer, onChange: (e) => setForm({ ...form, cer: e.target.value }), placeholder: "17.04.05" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Descrizione rifiuto" }), _jsx(Input, { value: form.descrizione_rifiuto, onChange: (e) => setForm({ ...form, descrizione_rifiuto: e.target.value }), placeholder: "Ferro e acciaio" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Quantit\u00E0 presunta (kg)" }), _jsx(Input, { type: "number", value: form.quantita_presunta, onChange: (e) => setForm({ ...form, quantita_presunta: e.target.value }), placeholder: "Da FIR" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Quantit\u00E0 pesata (kg) *" }), _jsx(Input, { type: "number", value: form.quantita_kg, onChange: (e) => setForm({ ...form, quantita_kg: e.target.value }), placeholder: "Peso effettivo" })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Esito Accettazione" }), _jsxs(Select, { value: form.esito_accettazione, onValueChange: (v) => setForm({ ...form, esito_accettazione: v }), children: [_jsx(SelectTrigger, { className: "bg-secondary/50 border-border", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "accettato", children: "\u2705 Accettato per intero" }), _jsx(SelectItem, { value: "parziale", children: "\u26A0\uFE0F Accettato parzialmente" }), _jsx(SelectItem, { value: "respinto", children: "\u274C Respinto" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Note" }), _jsx(Textarea, { value: form.note, onChange: (e) => setForm({ ...form, note: e.target.value }), rows: 2, className: "bg-secondary/50 border-border" })] }), _jsx(Button, { onClick: handleSave, disabled: createMovimento.isPending, className: "w-full", children: createMovimento.isPending ? "Salvataggio..." : "Registra Arrivo" })] })] }) }), _jsx("div", { className: "rounded-2xl bg-card/60 border border-border/30 overflow-hidden", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30 text-muted-foreground text-xs uppercase", children: [_jsx("th", { className: "p-3 text-left", children: "Data" }), _jsx("th", { className: "p-3 text-left", children: "FIR" }), _jsx("th", { className: "p-3 text-left", children: "CER" }), _jsx("th", { className: "p-3 text-left", children: "Produttore" }), _jsx("th", { className: "p-3 text-left", children: "Trasportatore" }), _jsx("th", { className: "p-3 text-right", children: "Presunta" }), _jsx("th", { className: "p-3 text-right", children: "Pesata" }), _jsx("th", { className: "p-3 text-center", children: "Esito" }), _jsx("th", { className: "p-3 text-left", children: "Note" })] }) }), _jsx("tbody", { children: isLoading ? (_jsx("tr", { children: _jsx("td", { colSpan: 9, className: "p-8 text-center text-muted-foreground", children: "Caricamento..." }) })) : filtered.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 9, className: "p-8 text-center text-muted-foreground", children: "Nessun arrivo registrato" }) })) : (filtered.map((m) => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-accent/5", children: [_jsx("td", { className: "p-3 font-mono text-xs", children: m.data_movimento ? format(new Date(m.data_movimento), "dd/MM/yyyy", { locale: it }) : "—" }), _jsx("td", { className: "p-3 font-mono text-xs", children: m.numero_fir || "—" }), _jsx("td", { className: "p-3 font-mono", children: m.cer }), _jsx("td", { className: "p-3 text-xs max-w-[150px] truncate", children: m.produttore_denominazione || "—" }), _jsx("td", { className: "p-3 text-xs max-w-[150px] truncate", children: m.trasportatore_denominazione || "—" }), _jsx("td", { className: "p-3 text-right text-xs", children: m.quantita_presunta ? Number(m.quantita_presunta).toLocaleString("it-IT") : "—" }), _jsx("td", { className: "p-3 text-right font-bold", children: Number(m.quantita_kg).toLocaleString("it-IT") }), _jsx("td", { className: "p-3 text-center", children: _jsx(EsitoBadge, { esito: m.esito_accettazione }) }), _jsx("td", { className: "p-3 text-xs max-w-[150px] truncate", children: m.note || "—" })] }, m.id)))) })] }) }) }), _jsxs("div", { className: "mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm space-y-2", children: [_jsxs("h4", { className: "font-semibold text-blue-300 flex items-center gap-2", children: [_jsx(Factory, { className: "h-4 w-4" }), " Schema FIR \u2014 Impianto come Destinatario"] }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground", children: [_jsxs("div", { children: [_jsx("span", { className: "text-blue-400", children: "Campo 1 \u2014 Produttore:" }), " Cliente / altro impianto"] }), _jsxs("div", { children: [_jsx("span", { className: "text-blue-400", children: "Campo 2 \u2014 Trasportatore:" }), " Vettore"] }), _jsxs("div", { children: [_jsx("span", { className: "text-blue-400", children: "Campo 3 \u2014 Destinatario:" }), " Impianto tuo"] }), _jsxs("div", { children: [_jsx("span", { className: "text-blue-400", children: "Esito:" }), " Accettato / Parziale / Respinto"] })] })] })] }));
}
function EsitoBadge({ esito }) {
    if (!esito)
        return _jsx("span", { className: "text-muted-foreground", children: "\u2014" });
    const map = {
        accettato: { label: "Accettato", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
        parziale: { label: "Parziale", cls: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
        respinto: { label: "Respinto", cls: "bg-red-500/20 text-red-300 border-red-500/30" },
    };
    const m = map[esito] || { label: esito, cls: "bg-muted text-muted-foreground" };
    return _jsx("span", { className: `px-2 py-0.5 rounded-full text-[10px] font-semibold border ${m.cls}`, children: m.label });
}
function StatCard({ icon: Icon, label, value, color }) {
    return (_jsxs("div", { className: "flex items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsx("div", { className: "p-2 rounded-xl", style: { background: `rgba(${color}, 0.15)` }, children: _jsx(Icon, { className: "h-5 w-5", style: { color: `rgb(${color})` } }) }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground font-mono uppercase", children: label }), _jsx("p", { className: "text-lg font-bold text-foreground", children: value })] })] }));
}
