import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useDragonRegister } from "@/hooks/dragon/useDragonRegister";
import { useDragonRegisters } from "@/hooks/dragon/useDragonRegisters";
import { useDragonCauses } from "@/hooks/dragon/useDragonCauses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Download, CheckCircle, FileText, ArrowLeftRight, Layers, LogIn, Scissors, TrendingDown } from "lucide-react";
import { DragonMovementForm } from "@/components/dragon/DragonMovementForm";
import { exportToExcel } from "@/lib/exportUtils";
import { DragonBackButton } from "@/components/dragon/DragonBackButton";
const statusColors = {
    BOZZA: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    CONSOLIDATO: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    STAMPATO: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    INVIATO_RENTRI: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    DA_NON_STAMPARE: "bg-muted text-muted-foreground border-border",
    DA_NON_INVIARE_RENTRI: "bg-muted text-muted-foreground border-border",
};
const typeColors = {
    CARICO: "bg-emerald-500/20 text-emerald-300",
    SCARICO: "bg-rose-500/20 text-rose-300",
};
const registerLabels = {
    PRODUTTORE: "Conto Proprio",
    DESTINATARIO: "Impianto",
    TRASPORTATORE: "Trasportatore",
    INTERMEDIARIO: "Intermediazione",
};
export default function DragonRegistroPage() {
    const { context } = useParams();
    const navigate = useNavigate();
    const [showForm, setShowForm] = useState(false);
    const [detail, setDetail] = useState(null);
    const [activeRegisterId, setActiveRegisterId] = useState("");
    const [filters, setFilters] = useState({});
    const { registers, isLoading: loadingRegisters } = useDragonRegisters();
    const { movements, isLoading, createMovement, consolidate } = useDragonRegister({
        ...filters,
        registerId: activeRegisterId || undefined,
    });
    const { causes } = useDragonCauses();
    const prefix = `/mn/admin/${context}/dragon`;
    // Auto-select first register
    const currentRegisterId = activeRegisterId || (registers.length > 0 ? registers[0].id : "");
    const currentRegister = registers.find(r => r.id === currentRegisterId);
    const handleExport = () => {
        exportToExcel(movements, [
            { header: "N°", key: "movement_number", width: 8 },
            { header: "Data", key: "movement_date", width: 12 },
            { header: "Tipo", key: "movement_type", width: 10 },
            { header: "CER", key: "cer_code", width: 12 },
            { header: "Descrizione", key: "description_snapshot", width: 30 },
            { header: "Quantità", key: "quantity", width: 12 },
            { header: "U.M.", key: "unit_of_measure", width: 6 },
            { header: "Causale", key: "cause", width: 25, format: (v) => v?.name || "" },
            { header: "Stato", key: "status", width: 14 },
        ], `registro_${currentRegister?.subject_type || "all"}_${new Date().toISOString().split("T")[0]}`);
    };
    return (_jsxs(MNAdminLayout, { title: "Registro Cronologico", subtitle: "Dragon Rifiuti 2 \u2014 Movimenti di registro", children: [_jsxs("div", { className: "space-y-4", children: [_jsx(DragonBackButton, {}), registers.length > 0 && (_jsx(Tabs, { value: currentRegisterId, onValueChange: (v) => setActiveRegisterId(v), className: "w-full", children: _jsx(TabsList, { className: "w-full justify-start flex-wrap h-auto gap-1 p-1", children: registers.map((r) => (_jsx(TabsTrigger, { value: r.id, className: "text-xs", children: registerLabels[r.subject_type] || r.register_code }, r.id))) }) })), _jsxs("div", { className: "flex flex-wrap gap-3 items-center justify-between", children: [_jsxs("div", { className: "flex gap-2 items-center flex-wrap", children: [_jsx(Input, { placeholder: "Cerca CER...", className: "w-40 h-9", value: filters.cerCode || "", onChange: (e) => setFilters(f => ({ ...f, cerCode: e.target.value || undefined })) }), _jsxs(Select, { value: filters.movementType || "all", onValueChange: (v) => setFilters(f => ({ ...f, movementType: v === "all" ? undefined : v })), children: [_jsx(SelectTrigger, { className: "w-32 h-9", children: _jsx(SelectValue, { placeholder: "Tipo" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "Tutti" }), _jsx(SelectItem, { value: "CARICO", children: "Carico" }), _jsx(SelectItem, { value: "SCARICO", children: "Scarico" })] })] }), _jsxs(Select, { value: filters.status || "all", onValueChange: (v) => setFilters(f => ({ ...f, status: v === "all" ? undefined : v })), children: [_jsx(SelectTrigger, { className: "w-36 h-9", children: _jsx(SelectValue, { placeholder: "Stato" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "Tutti" }), _jsx(SelectItem, { value: "BOZZA", children: "Bozza" }), _jsx(SelectItem, { value: "CONSOLIDATO", children: "Consolidato" }), _jsx(SelectItem, { value: "STAMPATO", children: "Stampato" }), _jsx(SelectItem, { value: "INVIATO_RENTRI", children: "Inviato RENTRI" })] })] })] }), _jsxs("div", { className: "flex gap-2 flex-wrap", children: [_jsxs(Button, { variant: "outline", size: "sm", onClick: handleExport, children: [_jsx(Download, { className: "h-4 w-4 mr-1" }), " Export"] }), currentRegister?.subject_type === "DESTINATARIO" && (_jsxs(Button, { variant: "outline", size: "sm", onClick: () => navigate(`${prefix}/registro/ingresso`), children: [_jsx(LogIn, { className: "h-4 w-4 mr-1" }), " Ingresso FIR"] })), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => navigate(`${prefix}/registro/scarico-uscita`), children: [_jsx(TrendingDown, { className: "h-4 w-4 mr-1" }), " Scarico Uscita"] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => navigate(`${prefix}/registro/scarico-cumulativo`), children: [_jsx(Layers, { className: "h-4 w-4 mr-1" }), " Scarico Cumulativo"] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => navigate(`${prefix}/registro/carico-scarico`), children: [_jsx(ArrowLeftRight, { className: "h-4 w-4 mr-1" }), " Carico/Scarico"] }), _jsxs(Button, { size: "sm", onClick: () => setShowForm(true), children: [_jsx(Plus, { className: "h-4 w-4 mr-1" }), " Nuovo Movimento"] })] })] }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: [
                            { label: "Totale", value: movements.length, color: "text-foreground" },
                            { label: "Bozze", value: movements.filter(m => m.status === "BOZZA").length, color: "text-amber-400" },
                            { label: "Carichi", value: movements.filter(m => m.movement_type === "CARICO").length, color: "text-emerald-400" },
                            { label: "Scarichi", value: movements.filter(m => m.movement_type === "SCARICO").length, color: "text-rose-400" },
                        ].map((s, i) => (_jsxs("div", { className: "bg-card/60 border border-border/30 rounded-xl p-3", children: [_jsx("p", { className: "text-xs text-muted-foreground", children: s.label }), _jsx("p", { className: `text-2xl font-bold ${s.color}`, children: s.value })] }, i))) }), _jsx("div", { className: "bg-card/60 border border-border/30 rounded-xl overflow-hidden", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { className: "border-border/20", children: [_jsx(TableHead, { className: "w-16", children: "N\u00B0" }), _jsx(TableHead, { className: "w-28", children: "Data" }), _jsx(TableHead, { className: "w-20", children: "Tipo" }), _jsx(TableHead, { children: "CER" }), _jsx(TableHead, { children: "Descrizione" }), _jsx(TableHead, { className: "w-24 text-right", children: "Quantit\u00E0" }), _jsx(TableHead, { className: "w-32", children: "Causale" }), _jsx(TableHead, { className: "w-28", children: "Stato" }), _jsx(TableHead, { className: "w-28", children: "Azioni" })] }) }), _jsx(TableBody, { children: isLoading || loadingRegisters ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 9, className: "text-center py-12 text-muted-foreground", children: "Caricamento..." }) })) : movements.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 9, className: "text-center py-12 text-muted-foreground", children: "Nessun movimento trovato" }) })) : (movements.map((m) => {
                                        const isAwaitingWeight = m.weight_status === "DA_VERIFICARE_A_DESTINO";
                                        return (_jsxs(TableRow, { className: `border-border/10 cursor-pointer hover:bg-muted/30 ${isAwaitingWeight ? "bg-amber-500/5" : ""}`, onClick: () => setDetail(m), children: [_jsx(TableCell, { className: "font-mono text-xs", children: m.movement_number }), _jsx(TableCell, { className: "text-sm", children: new Date(m.movement_date).toLocaleDateString("it-IT") }), _jsx(TableCell, { children: _jsx(Badge, { variant: "outline", className: typeColors[m.movement_type], children: m.movement_type }) }), _jsx(TableCell, { className: "font-mono text-sm", children: m.cer_code }), _jsx(TableCell, { className: "text-sm truncate max-w-[200px]", children: m.description_snapshot || "—" }), _jsxs(TableCell, { className: "text-right font-mono", children: [Number(m.quantity).toLocaleString("it-IT"), " ", m.unit_of_measure, isAwaitingWeight && _jsx("span", { className: "ml-1 text-amber-400", title: "In attesa peso a destino", children: "\u2696\uFE0F" })] }), _jsx(TableCell, { className: "text-xs", children: m.cause?.name || "—" }), _jsx(TableCell, { children: _jsx(Badge, { variant: "outline", className: statusColors[m.status] || "", children: m.status }) }), _jsx(TableCell, { children: _jsxs("div", { className: "flex gap-1", children: [m.status === "BOZZA" && (_jsx(Button, { variant: "ghost", size: "sm", onClick: (e) => { e.stopPropagation(); consolidate.mutate(m.id); }, title: "Consolida", children: _jsx(CheckCircle, { className: "h-4 w-4 text-emerald-400" }) })), m.movement_type === "CARICO" && m.status === "CONSOLIDATO" && (_jsx(Button, { variant: "ghost", size: "sm", onClick: (e) => {
                                                                    e.stopPropagation();
                                                                    const item = m.item;
                                                                    if (item) {
                                                                        const params = new URLSearchParams({ item_id: m.item_id, qty: String(m.quantity) });
                                                                        navigate(`${prefix}/cernite/batch?${params.toString()}`);
                                                                    }
                                                                }, title: "Avvia Lavorazione", children: _jsx(Scissors, { className: "h-4 w-4 text-blue-400" }) }))] }) })] }, m.id));
                                    })) })] }) })] }), _jsx(Sheet, { open: showForm, onOpenChange: setShowForm, children: _jsxs(SheetContent, { className: "w-full sm:max-w-lg overflow-y-auto", children: [_jsx(SheetHeader, { children: _jsx(SheetTitle, { children: "Nuovo Movimento di Registro" }) }), _jsx(DragonMovementForm, { causes: causes, onSubmit: async (data) => {
                                await createMovement.mutateAsync({
                                    ...data,
                                    register_id: currentRegisterId || null,
                                });
                                setShowForm(false);
                            }, isLoading: createMovement.isPending })] }) }), _jsx(Sheet, { open: !!detail, onOpenChange: () => setDetail(null), children: _jsxs(SheetContent, { className: "w-full sm:max-w-lg overflow-y-auto", children: [_jsx(SheetHeader, { children: _jsxs(SheetTitle, { children: ["Dettaglio Movimento #", detail?.movement_number] }) }), detail && (_jsxs("div", { className: "space-y-4 mt-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Tipo" }), _jsx(Badge, { variant: "outline", className: typeColors[detail.movement_type], children: detail.movement_type })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Stato" }), _jsx(Badge, { variant: "outline", className: statusColors[detail.status], children: detail.status })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Data" }), _jsx("p", { className: "text-sm", children: new Date(detail.movement_date).toLocaleDateString("it-IT") })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "CER" }), _jsx("p", { className: "text-sm font-mono", children: detail.cer_code })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Quantit\u00E0" }), _jsxs("p", { className: "text-sm font-mono", children: [Number(detail.quantity).toLocaleString("it-IT"), " ", detail.unit_of_measure] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Segno" }), _jsxs("p", { className: "text-sm", children: [detail.sign === "PLUS" ? "➕" : "➖", " ", detail.sign] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Contesto" }), _jsx("p", { className: "text-sm", children: detail.source_context })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Peso" }), _jsx("p", { className: "text-sm", children: detail.weight_status })] }), detail.register && (_jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Registro" }), _jsx("p", { className: "text-sm", children: registerLabels[detail.register.subject_type] || detail.register.register_code })] }))] }), detail.description_snapshot && _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Descrizione" }), _jsx("p", { className: "text-sm", children: detail.description_snapshot })] }), detail.note && _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Note" }), _jsx("p", { className: "text-sm", children: detail.note })] }), detail.cause?.name && _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Causale" }), _jsx("p", { className: "text-sm", children: detail.cause.name })] }), detail.source_site?.name && _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Cantiere" }), _jsx("p", { className: "text-sm", children: detail.source_site.name })] }), detail.linked_document?.number && _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Documento" }), _jsxs("p", { className: "text-sm", children: [_jsx(FileText, { className: "h-3 w-3 inline mr-1" }), detail.linked_document.document_type, " ", detail.linked_document.number] })] })] }))] }) })] }));
}
