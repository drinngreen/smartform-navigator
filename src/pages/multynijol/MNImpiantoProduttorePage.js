import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Package, ArrowDownToLine, ArrowUpFromLine, Factory, Scale, AlertTriangle, } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
export default function MNImpiantoProduttorePage() {
    const { context } = useParams();
    const { user } = useAuth();
    const [impianti, setImpianti] = useState([]);
    const [selectedImpianto, setSelectedImpianto] = useState("");
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState("carico");
    const { movimenti, isLoading, createMovimento, stats } = useMovimentiImpianto(selectedImpianto || undefined, "PRODUTTORE");
    // Form state
    const [form, setForm] = useState({
        cer: "", descrizione_rifiuto: "", quantita_kg: "",
        origine: "", note: "",
        // scarico fields
        numero_fir: "", trasportatore_denominazione: "", destinatario_denominazione: "",
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
        if (!form.cer.trim() || !form.quantita_kg) {
            toast.error("CER e Quantità sono obbligatori");
            return;
        }
        const payload = {
            impianto_id: selectedImpianto,
            cer: form.cer.trim(),
            descrizione_rifiuto: form.descrizione_rifiuto || null,
            quantita_kg: parseFloat(form.quantita_kg),
            tipo_movimento: dialogMode === "carico" ? "CARICO" : "SCARICO",
            ruolo_impianto: "PRODUTTORE",
            origine: form.origine || null,
            note: form.note || null,
            data_movimento: new Date().toISOString().split("T")[0],
        };
        if (dialogMode === "scarico") {
            if (!form.numero_fir.trim()) {
                toast.error("Il Numero FIR è obbligatorio per lo scarico");
                return;
            }
            payload.numero_fir = form.numero_fir.trim();
            payload.trasportatore_denominazione = form.trasportatore_denominazione || null;
            payload.destinatario_denominazione = form.destinatario_denominazione || null;
        }
        await createMovimento.mutateAsync(payload);
        setDialogOpen(false);
        setForm({ cer: "", descrizione_rifiuto: "", quantita_kg: "", origine: "", note: "", numero_fir: "", trasportatore_denominazione: "", destinatario_denominazione: "" });
    };
    const filtered = movimenti?.filter((m) => {
        if (!search)
            return true;
        const s = search.toLowerCase();
        return m.cer.toLowerCase().includes(s) ||
            m.descrizione_rifiuto?.toLowerCase().includes(s) ||
            m.numero_fir?.toLowerCase().includes(s);
    }) ?? [];
    return (_jsxs(MNAdminLayout, { title: "Impianto \u2014 Produttore", subtitle: "Registrazione rifiuti prodotti dall'impianto", children: [_jsx("div", { className: "mb-4", children: _jsxs(Select, { value: selectedImpianto, onValueChange: setSelectedImpianto, children: [_jsx(SelectTrigger, { className: "w-64 bg-card/60 border-border/30", children: _jsx(SelectValue, { placeholder: "Seleziona impianto" }) }), _jsx(SelectContent, { children: impianti.map((imp) => (_jsx(SelectItem, { value: imp.id, children: imp.nome }, imp.id))) })] }) }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-6", children: [_jsx(StatCard, { icon: Package, label: "Totale Movimenti", value: stats.totale, color: "249, 115, 22" }), _jsx(StatCard, { icon: ArrowDownToLine, label: "Carichi", value: stats.carichi, color: "34, 197, 94" }), _jsx(StatCard, { icon: ArrowUpFromLine, label: "Scarichi", value: stats.scarichi, color: "239, 68, 68" }), _jsx(StatCard, { icon: Scale, label: "Kg Totali", value: `${stats.kgTotali.toLocaleString("it-IT")} kg`, color: "6, 182, 212" })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-3 mb-4", children: [_jsxs("div", { className: "relative flex-1 min-w-[200px]", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Cerca CER, descrizione, FIR...", value: search, onChange: (e) => setSearch(e.target.value), className: "pl-9 bg-card/60 border-border/30" })] }), _jsxs(Dialog, { open: dialogOpen, onOpenChange: setDialogOpen, children: [_jsxs("div", { className: "flex gap-2", children: [_jsxs(Button, { onClick: () => { setDialogMode("carico"); setDialogOpen(true); }, className: "bg-emerald-600 hover:bg-emerald-500 text-white", children: [_jsx(ArrowDownToLine, { className: "h-4 w-4 mr-1" }), " Nuovo CARICO"] }), _jsxs(Button, { onClick: () => { setDialogMode("scarico"); setDialogOpen(true); }, className: "bg-red-600 hover:bg-red-500 text-white", children: [_jsx(ArrowUpFromLine, { className: "h-4 w-4 mr-1" }), " Nuovo SCARICO"] })] }), _jsxs(DialogContent, { className: "max-w-lg bg-card border-border/50", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { className: "flex items-center gap-2", children: dialogMode === "carico" ? (_jsxs(_Fragment, { children: [_jsx(ArrowDownToLine, { className: "h-5 w-5 text-emerald-400" }), " Registra CARICO \u2014 Rifiuto Prodotto"] })) : (_jsxs(_Fragment, { children: [_jsx(ArrowUpFromLine, { className: "h-5 w-5 text-red-400" }), " Registra SCARICO \u2014 Spedizione a Terzi"] })) }) }), dialogMode === "scarico" && (_jsxs("div", { className: "p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-sm", children: [_jsx(AlertTriangle, { className: "h-4 w-4 text-amber-400 mt-0.5 shrink-0" }), _jsxs("span", { className: "text-amber-200", children: ["La spedizione richiede un FIR compilato. L'impianto figura come ", _jsx("strong", { children: "Produttore (Campo 1)" }), " nel formulario."] })] })), _jsxs("div", { className: "space-y-3 mt-2", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Codice CER *" }), _jsx(Input, { value: form.cer, onChange: (e) => setForm({ ...form, cer: e.target.value }), placeholder: "17.04.05" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Quantit\u00E0 (kg) *" }), _jsx(Input, { type: "number", value: form.quantita_kg, onChange: (e) => setForm({ ...form, quantita_kg: e.target.value }), placeholder: "1500" })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Descrizione rifiuto" }), _jsx(Input, { value: form.descrizione_rifiuto, onChange: (e) => setForm({ ...form, descrizione_rifiuto: e.target.value }), placeholder: "Fanghi di trattamento, vaglio, scarti..." })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Origine" }), _jsx(Input, { value: form.origine, onChange: (e) => setForm({ ...form, origine: e.target.value }), placeholder: 'es. "trattamento CER 20 03 01", "manutenzione impianto"' })] }), dialogMode === "scarico" && (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Numero FIR *" }), _jsx(Input, { value: form.numero_fir, onChange: (e) => setForm({ ...form, numero_fir: e.target.value }), placeholder: "Numero formulario" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Trasportatore" }), _jsx(Input, { value: form.trasportatore_denominazione, onChange: (e) => setForm({ ...form, trasportatore_denominazione: e.target.value }), placeholder: "Denominazione vettore" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Destinatario" }), _jsx(Input, { value: form.destinatario_denominazione, onChange: (e) => setForm({ ...form, destinatario_denominazione: e.target.value }), placeholder: "Impianto recupero/smaltimento" })] })] })] })), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Note" }), _jsx(Textarea, { value: form.note, onChange: (e) => setForm({ ...form, note: e.target.value }), rows: 2, className: "bg-secondary/50 border-border" })] }), _jsx(Button, { onClick: handleSave, disabled: createMovimento.isPending, className: "w-full", children: createMovimento.isPending ? "Salvataggio..." : "Registra Movimento" })] })] })] })] }), _jsx("div", { className: "rounded-2xl bg-card/60 border border-border/30 overflow-hidden", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30 text-muted-foreground text-xs uppercase", children: [_jsx("th", { className: "p-3 text-left", children: "Data" }), _jsx("th", { className: "p-3 text-left", children: "Tipo" }), _jsx("th", { className: "p-3 text-left", children: "CER" }), _jsx("th", { className: "p-3 text-left", children: "Descrizione" }), _jsx("th", { className: "p-3 text-right", children: "Kg" }), _jsx("th", { className: "p-3 text-left", children: "Origine" }), _jsx("th", { className: "p-3 text-left", children: "FIR" }), _jsx("th", { className: "p-3 text-left", children: "Destinatario" }), _jsx("th", { className: "p-3 text-left", children: "Note" })] }) }), _jsx("tbody", { children: isLoading ? (_jsx("tr", { children: _jsx("td", { colSpan: 9, className: "p-8 text-center text-muted-foreground", children: "Caricamento..." }) })) : filtered.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 9, className: "p-8 text-center text-muted-foreground", children: "Nessun movimento registrato" }) })) : (filtered.map((m) => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-accent/5", children: [_jsx("td", { className: "p-3 font-mono text-xs", children: m.data_movimento ? format(new Date(m.data_movimento), "dd/MM/yyyy", { locale: it }) : "—" }), _jsx("td", { className: "p-3", children: _jsx(Badge, { variant: m.tipo_movimento === "CARICO" ? "default" : "destructive", className: "text-[10px]", children: m.tipo_movimento }) }), _jsx("td", { className: "p-3 font-mono", children: m.cer }), _jsx("td", { className: "p-3 max-w-[200px] truncate", children: m.descrizione_rifiuto || "—" }), _jsx("td", { className: "p-3 text-right font-bold", children: Number(m.quantita_kg).toLocaleString("it-IT") }), _jsx("td", { className: "p-3 text-xs", children: m.origine || "—" }), _jsx("td", { className: "p-3 font-mono text-xs", children: m.numero_fir || "—" }), _jsx("td", { className: "p-3 text-xs", children: m.destinatario_denominazione || "—" }), _jsx("td", { className: "p-3 text-xs max-w-[150px] truncate", children: m.note || "—" })] }, m.id)))) })] }) }) }), _jsxs("div", { className: "mt-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-sm space-y-2", children: [_jsxs("h4", { className: "font-semibold text-orange-300 flex items-center gap-2", children: [_jsx(Factory, { className: "h-4 w-4" }), " Schema FIR \u2014 Impianto come Produttore"] }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground", children: [_jsxs("div", { children: [_jsx("span", { className: "text-orange-400", children: "Campo 1 \u2014 Produttore:" }), " Dati impianto"] }), _jsxs("div", { children: [_jsx("span", { className: "text-orange-400", children: "Campo 2 \u2014 Trasportatore:" }), " Anagrafica vettore"] }), _jsxs("div", { children: [_jsx("span", { className: "text-orange-400", children: "Campo 3 \u2014 Destinatario:" }), " Impianto terzo"] }), _jsxs("div", { children: [_jsx("span", { className: "text-orange-400", children: "Note registro:" }), " id_carico collegato"] })] })] })] }));
}
function StatCard({ icon: Icon, label, value, color }) {
    return (_jsxs("div", { className: "flex items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsx("div", { className: "p-2 rounded-xl", style: { background: `rgba(${color}, 0.15)` }, children: _jsx(Icon, { className: "h-5 w-5", style: { color: `rgb(${color})` } }) }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground font-mono uppercase", children: label }), _jsx("p", { className: "text-lg font-bold text-foreground", children: value })] })] }));
}
