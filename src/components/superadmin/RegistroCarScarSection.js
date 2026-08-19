import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Loader2, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { registroCarico, registroScarico } from "@/lib/rentriSuperApi";
import { toast } from "sonner";
export function RegistroCarScarSection({ tenant }) {
    const [cer, setCer] = useState("");
    const [kg, setKg] = useState("");
    const [descrizione, setDescrizione] = useState("");
    const [loading, setLoading] = useState(null);
    const handleRegistro = async (tipo) => {
        if (!cer.trim() || !kg.trim()) {
            toast.error("CER e KG sono obbligatori");
            return;
        }
        setLoading(tipo);
        const payload = { cer: cer.trim(), quantita_kg: parseFloat(kg), descrizione_rifiuto: descrizione.trim() };
        const fn = tipo === "carico" ? registroCarico : registroScarico;
        const result = await fn(tenant, payload);
        if (result.ok) {
            toast.success(`Registro ${tipo} inviato!`);
        }
        else {
            toast.error(`Errore registro ${tipo}: ${JSON.stringify(result.data)}`);
        }
        setLoading(null);
    };
    return (_jsxs("div", { className: "bg-card rounded-xl p-6 border border-border", children: [_jsxs("h3", { className: "text-lg font-display text-foreground flex items-center gap-2 mb-4", children: [_jsx(ArrowDownToLine, { size: 20 }), " Registri Carico/Scarico \u2014 ", tenant.toUpperCase()] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 mb-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-sm text-muted-foreground mb-1 block", children: "Codice CER" }), _jsx("input", { type: "text", value: cer, onChange: (e) => setCer(e.target.value), placeholder: "17.04.05", className: "w-full px-4 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm text-muted-foreground mb-1 block", children: "Quantit\u00E0 (KG)" }), _jsx("input", { type: "number", value: kg, onChange: (e) => setKg(e.target.value), placeholder: "1500", className: "w-full px-4 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm text-muted-foreground mb-1 block", children: "Descrizione" }), _jsx("input", { type: "text", value: descrizione, onChange: (e) => setDescrizione(e.target.value), placeholder: "Ferro e acciaio", className: "w-full px-4 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500" })] })] }), _jsxs("div", { className: "flex gap-3 flex-wrap", children: [_jsxs("button", { onClick: () => handleRegistro("carico"), disabled: !!loading, className: "px-5 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 flex items-center gap-2", children: [loading === "carico" ? _jsx(Loader2, { className: "animate-spin", size: 16 }) : _jsx(ArrowDownToLine, { size: 16 }), "Registra CARICO"] }), _jsxs("button", { onClick: () => handleRegistro("scarico"), disabled: !!loading, className: "px-5 py-3 rounded-lg font-semibold bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 flex items-center gap-2", children: [loading === "scarico" ? _jsx(Loader2, { className: "animate-spin", size: 16 }) : _jsx(ArrowUpFromLine, { size: 16 }), "Registra SCARICO"] })] })] }));
}
