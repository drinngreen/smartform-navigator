import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useRubricaContatti } from "@/hooks/useRubricaContatti";
import { ContattoFormDialog } from "./ContattoFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Trash2, MessageSquare, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
export function RubricaTab({ basePath = "/admin", tenantId: tenantIdOverride }) {
    const { data: contatti, isLoading, tenantId, deleteContatto, refetch } = useRubricaContatti(tenantIdOverride);
    const [search, setSearch] = useState("");
    const [showNew, setShowNew] = useState(false);
    const navigate = useNavigate();
    const filtered = (contatti || []).filter((c) => {
        const s = search.toLowerCase();
        return !s || [c.nome, c.cognome, c.ragione_sociale, c.telefono, c.cellulare, c.email].some((v) => v?.toLowerCase().includes(s));
    });
    const handleDelete = async (id) => {
        if (!confirm("Eliminare questo contatto?"))
            return;
        try {
            await deleteContatto(id);
            toast.success("Contatto eliminato");
        }
        catch {
            toast.error("Errore eliminazione");
        }
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Cerca contatto...", value: search, onChange: (e) => setSearch(e.target.value), className: "pl-9 h-9" })] }), _jsxs(Button, { size: "sm", onClick: () => setShowNew(true), children: [_jsx(Plus, { className: "h-4 w-4 mr-1" }), " Nuovo"] })] }), isLoading ? (_jsx("p", { className: "text-muted-foreground text-sm", children: "Caricamento..." })) : filtered.length === 0 ? (_jsx("p", { className: "text-muted-foreground text-sm", children: "Nessun contatto trovato" })) : (_jsx("div", { className: "rounded-xl border border-border/30 overflow-hidden", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-card/80", children: _jsxs("tr", { className: "text-left text-muted-foreground text-xs uppercase", children: [_jsx("th", { className: "p-3", children: "Nome" }), _jsx("th", { className: "p-3", children: "Ragione Sociale" }), _jsx("th", { className: "p-3", children: "Telefono" }), _jsx("th", { className: "p-3", children: "Cellulare" }), _jsx("th", { className: "p-3", children: "Email" }), _jsx("th", { className: "p-3", children: "Origine" }), _jsx("th", { className: "p-3 text-right", children: "Azioni" })] }) }), _jsx("tbody", { className: "divide-y divide-border/20", children: filtered.map((c) => (_jsxs("tr", { className: "hover:bg-card/40", children: [_jsxs("td", { className: "p-3 font-medium text-foreground", children: [c.nome, " ", c.cognome] }), _jsx("td", { className: "p-3 text-muted-foreground", children: c.ragione_sociale || "—" }), _jsx("td", { className: "p-3 text-muted-foreground", children: c.telefono || "—" }), _jsx("td", { className: "p-3 text-muted-foreground", children: c.cellulare || "—" }), _jsx("td", { className: "p-3 text-muted-foreground", children: c.email || "—" }), _jsx("td", { className: "p-3", children: _jsx("span", { className: `px-2 py-0.5 rounded-full text-xs ${c.origine === "anagrafica" ? "bg-cyan-500/20 text-cyan-400" : "bg-emerald-500/20 text-emerald-400"}`, children: c.origine }) }), _jsx("td", { className: "p-3 text-right", children: _jsxs("div", { className: "flex items-center justify-end gap-1", children: [c.telefono && _jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7", onClick: () => navigate(`${basePath}/sms?to=${encodeURIComponent(c.telefono)}`), children: _jsx(Phone, { className: "h-3.5 w-3.5" }) }), c.cellulare && _jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7", onClick: () => navigate(`${basePath}/whatsapp?to=${encodeURIComponent(c.cellulare)}`), children: _jsx(MessageSquare, { className: "h-3.5 w-3.5" }) }), c.email && _jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7", onClick: () => navigate(`${basePath}/email?to=${encodeURIComponent(c.email)}`), children: _jsx(Mail, { className: "h-3.5 w-3.5" }) }), _jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7 text-destructive", onClick: () => handleDelete(c.id), children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) })] }) })] }, c.id))) })] }) })), tenantId && _jsx(ContattoFormDialog, { open: showNew, onOpenChange: setShowNew, tenantId: tenantId, onSaved: () => refetch() })] }));
}
