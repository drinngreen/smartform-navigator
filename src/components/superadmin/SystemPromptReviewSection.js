import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { ChevronDown, ChevronUp, Check, X, Eye } from "lucide-react";
import { useSystemPromptRequests, PROMPT_CATEGORIES } from "@/hooks/useSystemPromptRequests";
import systemPromptIcon from "@/assets/system-prompt-icon.png";
const TENANTS = [
    { label: "global", name: "Global Reco", color: "bg-emerald-500" },
    { label: "multyproget", name: "Multyproget", color: "bg-orange-500" },
    { label: "niyol", name: "Niyol", color: "bg-cyan-500" },
];
export function SystemPromptReviewSection() {
    const { requests, loading, updateStatus } = useSystemPromptRequests();
    const [expandedId, setExpandedId] = useState(null);
    const [noteInput, setNoteInput] = useState("");
    const [filter, setFilter] = useState("all");
    const filtered = filter === "all" ? requests : requests.filter((r) => r.tenant_label === filter);
    const pendingCount = requests.filter((r) => r.status === "pending").length;
    const handleAction = async (req, action) => {
        await updateStatus(req.id, action, noteInput || undefined);
        setNoteInput("");
        setExpandedId(null);
    };
    const getStatusBadge = (s) => {
        switch (s) {
            case "pending": return _jsx("span", { className: "px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] border border-amber-500/30", children: "In Attesa" });
            case "reviewed": return _jsx("span", { className: "px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] border border-blue-500/30", children: "Visionato" });
            case "implemented": return _jsx("span", { className: "px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] border border-green-500/30", children: "Implementato" });
            case "rejected": return _jsx("span", { className: "px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] border border-red-500/30", children: "Rifiutato" });
            default: return null;
        }
    };
    return (_jsxs("div", { className: "rounded-2xl border border-border bg-card p-6", children: [_jsxs("div", { className: "flex items-center gap-3 mb-6", children: [_jsx("img", { src: systemPromptIcon, alt: "", className: "h-10 w-10 rounded-xl" }), _jsxs("div", { children: [_jsx("h2", { className: "font-display text-lg tracking-wider", children: "SYSTEM PROMPT REQUESTS" }), _jsx("p", { className: "text-muted-foreground text-xs", children: pendingCount > 0 ? `${pendingCount} richieste in attesa` : "Tutte le richieste gestite" })] })] }), _jsxs("div", { className: "flex gap-2 mb-4", children: [_jsxs("button", { onClick: () => setFilter("all"), className: `px-3 py-1.5 rounded-lg text-xs transition-colors ${filter === "all" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-foreground"}`, children: ["Tutti (", requests.length, ")"] }), TENANTS.map((t) => {
                        const count = requests.filter((r) => r.tenant_label === t.label).length;
                        return (_jsxs("button", { onClick: () => setFilter(t.label), className: `px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors ${filter === t.label ? "bg-white/10 text-white" : "text-muted-foreground hover:text-foreground"}`, children: [_jsx("span", { className: `w-2 h-2 rounded-full ${t.color}` }), t.name, " (", count, ")"] }, t.label));
                    })] }), loading ? (_jsx("p", { className: "text-muted-foreground text-sm text-center py-8", children: "Caricamento..." })) : filtered.length === 0 ? (_jsx("p", { className: "text-muted-foreground text-sm text-center py-8", children: "Nessuna richiesta" })) : (_jsx("div", { className: "space-y-2 max-h-[600px] overflow-y-auto", children: filtered.map((req) => {
                    const cat = PROMPT_CATEGORIES.find((c) => c.value === req.category);
                    const tenant = TENANTS.find((t) => t.label === req.tenant_label);
                    const isExpanded = expandedId === req.id;
                    return (_jsxs("div", { className: "rounded-xl border border-border bg-secondary/30 overflow-hidden", children: [_jsxs("button", { onClick: () => setExpandedId(isExpanded ? null : req.id), className: "w-full flex items-center gap-3 p-3 text-left hover:bg-secondary/50 transition-colors", children: [_jsx("span", { className: `w-2 h-2 rounded-full shrink-0 ${tenant?.color || "bg-gray-500"}` }), _jsx("span", { className: "text-sm shrink-0", children: cat?.label.split(" ")[0] }), _jsx("span", { className: "text-sm font-medium flex-1 truncate", children: req.title }), getStatusBadge(req.status), _jsx("span", { className: "text-muted-foreground text-[10px] shrink-0", children: new Date(req.created_at).toLocaleDateString("it-IT") }), isExpanded ? _jsx(ChevronUp, { size: 14 }) : _jsx(ChevronDown, { size: 14 })] }), isExpanded && (_jsxs("div", { className: "px-4 pb-4 border-t border-border pt-3 space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2 text-xs text-muted-foreground", children: [_jsx("span", { className: `w-2 h-2 rounded-full ${tenant?.color}` }), tenant?.name, " \u2022 ", cat?.label] }), _jsx("p", { className: "text-sm text-foreground/80 whitespace-pre-wrap", children: req.content }), req.admin_notes && (_jsx("div", { className: "bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3", children: _jsxs("p", { className: "text-xs text-cyan-400", children: ["\uD83D\uDCAC Note: ", req.admin_notes] }) })), _jsxs("div", { className: "space-y-2", children: [_jsx("input", { type: "text", value: noteInput, onChange: (e) => setNoteInput(e.target.value), placeholder: "Aggiungi una nota (opzionale)...", className: "w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none" }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("button", { onClick: () => handleAction(req, "reviewed"), className: "flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs hover:bg-blue-500/20", children: [_jsx(Eye, { size: 12 }), " Visionato"] }), _jsxs("button", { onClick: () => handleAction(req, "implemented"), className: "flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs hover:bg-green-500/20", children: [_jsx(Check, { size: 12 }), " Implementato"] }), _jsxs("button", { onClick: () => handleAction(req, "rejected"), className: "flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs hover:bg-red-500/20", children: [_jsx(X, { size: 12 }), " Rifiuta"] })] })] })] }))] }, req.id));
                }) }))] }));
}
