import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Send, Plus } from "lucide-react";
import { PROMPT_CATEGORIES, useSystemPromptRequests } from "@/hooks/useSystemPromptRequests";
import systemPromptIcon from "@/assets/system-prompt-icon.png";
export function SystemPromptRequestForm({ tenantLabel, tenantId, tenantName }) {
    const { requests, loading, createRequest, deleteRequest } = useSystemPromptRequests(tenantLabel);
    const [showForm, setShowForm] = useState(false);
    const [category, setCategory] = useState("");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const handleSubmit = async () => {
        if (!category || !title.trim() || !content.trim())
            return;
        setSubmitting(true);
        const ok = await createRequest({ tenant_id: tenantId, tenant_label: tenantLabel, category, title, content });
        if (ok) {
            setShowForm(false);
            setCategory("");
            setTitle("");
            setContent("");
        }
        setSubmitting(false);
    };
    const getStatusColor = (s) => {
        switch (s) {
            case "pending": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
            case "reviewed": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
            case "implemented": return "bg-green-500/20 text-green-400 border-green-500/30";
            case "rejected": return "bg-red-500/20 text-red-400 border-red-500/30";
            default: return "bg-white/10 text-white/60 border-white/20";
        }
    };
    const getStatusLabel = (s) => {
        switch (s) {
            case "pending": return "In Attesa";
            case "reviewed": return "Visionato";
            case "implemented": return "Implementato";
            case "rejected": return "Rifiutato";
            default: return s;
        }
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-4 mb-6", children: [_jsx("img", { src: systemPromptIcon, alt: "System Prompt", className: "h-14 w-14 rounded-xl" }), _jsxs("div", { children: [_jsx("h2", { className: "text-white font-display text-xl tracking-wider", children: "SYSTEM PROMPT" }), _jsxs("p", { className: "text-white/40 text-sm", children: ["Richieste configurazione AI \u2014 ", tenantName] })] }), _jsxs("button", { onClick: () => setShowForm(!showForm), className: "ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm hover:bg-amber-500/20 transition-colors", children: [_jsx(Plus, { className: "h-4 w-4" }), "Nuova Richiesta"] })] }), showForm && (_jsxs("div", { className: "rounded-2xl border border-amber-500/20 bg-[hsl(222,47%,8%)] p-6 space-y-4", children: [_jsx("h3", { className: "text-white/80 text-sm font-semibold mb-3", children: "\uD83D\uDCDD Nuova richiesta per l'agente AI" }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2", children: PROMPT_CATEGORIES.map((cat) => (_jsxs("button", { onClick: () => setCategory(cat.value), className: `p-3 rounded-xl border text-left transition-all text-xs ${category === cat.value
                                ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                                : "border-white/10 bg-white/5 text-white/50 hover:border-white/20"}`, children: [_jsx("span", { className: "text-sm", children: cat.label.split(" ")[0] }), _jsx("p", { className: "mt-1 text-[10px] opacity-70", children: cat.desc })] }, cat.value))) }), _jsx("input", { type: "text", value: title, onChange: (e) => setTitle(e.target.value), placeholder: "Titolo della richiesta...", className: "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-amber-500/40" }), _jsx("textarea", { value: content, onChange: (e) => setContent(e.target.value), placeholder: "Descrivi in dettaglio cosa vuoi che l'agente AI faccia, come deve comportarsi, quali dati deve gestire, quali API integrare...", rows: 6, className: "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-amber-500/40 resize-none" }), _jsxs("div", { className: "flex gap-3 justify-end", children: [_jsx("button", { onClick: () => setShowForm(false), className: "px-4 py-2 rounded-xl text-white/40 text-sm hover:text-white/60 transition-colors", children: "Annulla" }), _jsxs("button", { onClick: handleSubmit, disabled: !category || !title.trim() || !content.trim() || submitting, className: "flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm hover:bg-amber-500/30 disabled:opacity-30 transition-colors", children: [_jsx(Send, { className: "h-4 w-4" }), submitting ? "Invio..." : "Invia Richiesta"] })] })] })), loading ? (_jsx("p", { className: "text-white/30 text-sm text-center py-8", children: "Caricamento..." })) : requests.length === 0 ? (_jsxs("div", { className: "text-center py-12", children: [_jsx("img", { src: systemPromptIcon, alt: "", className: "h-16 w-16 mx-auto mb-4 opacity-20" }), _jsx("p", { className: "text-white/30 text-sm", children: "Nessuna richiesta inviata ancora." }), _jsx("p", { className: "text-white/20 text-xs mt-1", children: "Clicca \"Nuova Richiesta\" per iniziare" })] })) : (_jsx("div", { className: "space-y-3", children: requests.map((req) => {
                    const cat = PROMPT_CATEGORIES.find((c) => c.value === req.category);
                    return (_jsx("div", { className: "rounded-xl border border-white/10 bg-[hsl(222,47%,8%)] p-4 hover:border-white/20 transition-colors", children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("span", { className: "text-sm", children: cat?.label.split(" ")[0] }), _jsx("span", { className: "text-white text-sm font-medium truncate", children: req.title }), _jsx("span", { className: `px-2 py-0.5 rounded-full text-[10px] border ${getStatusColor(req.status)}`, children: getStatusLabel(req.status) })] }), _jsx("p", { className: "text-white/40 text-xs line-clamp-2", children: req.content }), req.admin_notes && (_jsxs("p", { className: "mt-2 text-cyan-400/70 text-xs border-l-2 border-cyan-500/30 pl-2", children: ["\uD83D\uDCAC ", req.admin_notes] })), _jsx("p", { className: "text-white/20 text-[10px] mt-2", children: new Date(req.created_at).toLocaleDateString("it-IT") })] }), req.status === "pending" && (_jsx("button", { onClick: () => deleteRequest(req.id), className: "text-red-400/50 hover:text-red-400 text-xs transition-colors", children: "\u2715" }))] }) }, req.id));
                }) }))] }));
}
