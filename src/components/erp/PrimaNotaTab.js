import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Search, Trash2, Eye, Download, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { PrimaNotaFormDialog } from "./PrimaNotaFormDialog";
import { MastrinoDialog } from "./MastrinoDialog";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";
const DOC_LABELS = {
    FATTURA_VENDITA: "Fatt. Vendita",
    FATTURA_ACQUISTO: "Fatt. Acquisto",
    INCASSO: "Incasso",
    PAGAMENTO: "Pagamento",
    GIROCONTO: "Giroconto",
    STIPENDI: "Stipendi",
    AMMORTAMENTO: "Ammortamento",
    MANUALE: "Manuale",
};
export function PrimaNotaTab({ tenantId }) {
    const [search, setSearch] = useState("");
    const [filterTipo, setFilterTipo] = useState("tutti");
    const [showForm, setShowForm] = useState(false);
    const [viewItem, setViewItem] = useState(null);
    const [mastrinoContoId, setMastrinoContoId] = useState(null);
    const queryClient = useQueryClient();
    const { data: scritture = [], isLoading } = useQuery({
        queryKey: ["erp-prima-nota", tenantId],
        queryFn: async () => {
            const q = supabase
                .from("erp_prima_nota")
                .select("*, causale:erp_causali_contabili!erp_prima_nota_causale_id_fkey(codice, descrizione)")
                .order("data_registrazione", { ascending: false })
                .order("numero_registro", { ascending: false });
            if (tenantId)
                q.eq("tenant_id", tenantId);
            const { data, error } = await q;
            if (error)
                throw error;
            return data;
        },
    });
    const { data: righeMap = {} } = useQuery({
        queryKey: ["erp-prima-nota-righe", scritture.map((s) => s.id).join(",")],
        enabled: scritture.length > 0,
        queryFn: async () => {
            const ids = scritture.map((s) => s.id);
            const { data, error } = await supabase
                .from("erp_prima_nota_righe")
                .select("*, conto:erp_piano_conti!erp_prima_nota_righe_conto_id_fkey(codice, descrizione)")
                .in("prima_nota_id", ids);
            if (error)
                throw error;
            const map = {};
            data.forEach((r) => {
                if (!map[r.prima_nota_id])
                    map[r.prima_nota_id] = [];
                map[r.prima_nota_id].push(r);
            });
            return map;
        },
    });
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase.from("erp_prima_nota").delete().eq("id", id);
            if (error)
                throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["erp-prima-nota"] });
            toast.success("Scrittura eliminata");
        },
        onError: () => toast.error("Errore eliminazione"),
    });
    const filtered = scritture.filter((s) => {
        const matchSearch = !search || s.descrizione?.toLowerCase().includes(search.toLowerCase()) || String(s.numero_registro).includes(search);
        const matchTipo = filterTipo === "tutti" || s.documento_tipo === filterTipo;
        return matchSearch && matchTipo;
    });
    const formatCurrency = (v) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v || 0);
    const totaleDare = Object.values(righeMap).flat().filter((r) => r.segno === "DARE").reduce((s, r) => s + Number(r.importo), 0);
    const totaleAvere = Object.values(righeMap).flat().filter((r) => r.segno === "AVERE").reduce((s, r) => s + Number(r.importo), 0);
    const exportColumns = [
        { header: "N. Reg.", key: "numero_registro", width: 8 },
        { header: "Data", key: "data_registrazione", width: 12 },
        { header: "Descrizione", key: "descrizione", width: 40 },
        { header: "Tipo", key: "documento_tipo", width: 15, format: (v) => DOC_LABELS[v] || v || "—" },
        { header: "Causale", key: "causale", width: 15, format: (_, row) => row.causale?.descrizione || "—" },
    ];
    const handleExportExcel = () => exportToExcel(filtered, exportColumns, "prima-nota", "Prima Nota");
    const handleExportPdf = () => exportToPdf(filtered, exportColumns, "prima-nota", "Prima Nota");
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsxs("div", { className: "relative flex-1 min-w-[200px]", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Cerca per descrizione o numero...", className: "w-full pl-10 pr-4 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" })] }), _jsxs("select", { value: filterTipo, onChange: (e) => setFilterTipo(e.target.value), className: "px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground", children: [_jsx("option", { value: "tutti", children: "Tutti i tipi" }), Object.entries(DOC_LABELS).map(([k, v]) => (_jsx("option", { value: k, children: v }, k)))] }), _jsx("button", { onClick: handleExportExcel, className: "p-2 rounded-xl bg-background/60 border border-border/30 text-muted-foreground hover:text-foreground transition-colors", title: "Esporta Excel", children: _jsx(Download, { className: "h-4 w-4" }) }), _jsxs("button", { onClick: () => { setViewItem(null); setShowForm(true); }, className: "flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors", children: [_jsx(Plus, { className: "h-4 w-4" }), " Nuova Scrittura"] })] }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: [
                    { label: "Scritture", value: scritture.length, color: "text-foreground" },
                    { label: "Manuali", value: scritture.filter((s) => s.documento_tipo === "MANUALE").length, color: "text-yellow-400" },
                    { label: "Totale Dare", value: formatCurrency(totaleDare), color: "text-blue-400" },
                    { label: "Totale Avere", value: formatCurrency(totaleAvere), color: "text-green-400" },
                ].map((c) => (_jsxs("div", { className: "p-3 rounded-xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsx("p", { className: "text-xs font-mono uppercase tracking-wider text-muted-foreground", children: c.label }), _jsx("p", { className: `text-lg font-semibold ${c.color}`, children: c.value })] }, c.label))) }), _jsx("div", { className: "rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl overflow-hidden", children: isLoading ? (_jsx("div", { className: "p-8 text-center text-muted-foreground", children: "Caricamento..." })) : filtered.length === 0 ? (_jsx("div", { className: "p-8 text-center text-muted-foreground", children: "Nessuna scrittura trovata" })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30 text-left", children: [_jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "N." }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Data" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Descrizione" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Tipo" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Causale" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Dare" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Avere" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Azioni" })] }) }), _jsx("tbody", { children: filtered.map((s) => {
                                    const righe = righeMap[s.id] || [];
                                    const dare = righe.filter((r) => r.segno === "DARE").reduce((sum, r) => sum + Number(r.importo), 0);
                                    const avere = righe.filter((r) => r.segno === "AVERE").reduce((sum, r) => sum + Number(r.importo), 0);
                                    return (_jsxs("tr", { className: "border-b border-border/10 hover:bg-muted/10 transition-colors", children: [_jsx("td", { className: "px-4 py-3 font-mono font-medium text-foreground", children: s.numero_registro }), _jsx("td", { className: "px-4 py-3 text-muted-foreground", children: s.data_registrazione }), _jsx("td", { className: "px-4 py-3 text-foreground max-w-[300px] truncate", children: s.descrizione }), _jsx("td", { className: "px-4 py-3 text-xs text-muted-foreground", children: DOC_LABELS[s.documento_tipo] || s.documento_tipo || "—" }), _jsx("td", { className: "px-4 py-3 text-xs text-muted-foreground", children: s.causale?.descrizione || "—" }), _jsx("td", { className: "px-4 py-3 font-mono text-blue-400", children: formatCurrency(dare) }), _jsx("td", { className: "px-4 py-3 font-mono text-green-400", children: formatCurrency(avere) }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => { setViewItem(s); setShowForm(true); }, className: "p-1.5 rounded-lg hover:bg-muted/20 text-muted-foreground hover:text-foreground transition-colors", title: "Dettaglio", children: _jsx(Eye, { className: "h-3.5 w-3.5" }) }), righe.length > 0 && (_jsx("button", { onClick: () => setMastrinoContoId(righe[0]?.conto_id), className: "p-1.5 rounded-lg hover:bg-muted/20 text-muted-foreground hover:text-foreground transition-colors", title: "Mastrino", children: _jsx(BookOpen, { className: "h-3.5 w-3.5" }) })), _jsx("button", { onClick: () => { if (confirm("Eliminare questa scrittura?"))
                                                                deleteMutation.mutate(s.id); }, className: "p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors", title: "Elimina", children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) })] }) })] }, s.id));
                                }) })] }) })) }), showForm && (_jsx(PrimaNotaFormDialog, { item: viewItem, tenantId: tenantId, onClose: () => { setShowForm(false); setViewItem(null); } })), mastrinoContoId && (_jsx(MastrinoDialog, { contoId: mastrinoContoId, tenantId: tenantId, onClose: () => setMastrinoContoId(null) }))] }));
}
