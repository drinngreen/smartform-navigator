import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Loader2, PenTool } from "lucide-react";
import { firmaFirProduttore, firmaFirDestinatario } from "@/lib/rentriSuperApi";
import { toast } from "sonner";
export function DigitalSignatureSection({ tenant }) {
    const [firNumber, setFirNumber] = useState("");
    const [loading, setLoading] = useState(null);
    const handleFirma = async (tipo) => {
        if (!firNumber.trim()) {
            toast.error("Inserisci il numero FIR");
            return;
        }
        setLoading(tipo);
        const fn = tipo === "produttore" ? firmaFirProduttore : firmaFirDestinatario;
        const result = await fn(tenant, { firNumber: firNumber.trim() });
        if (result.ok) {
            toast.success(`Firma ${tipo} completata!`);
        }
        else {
            toast.error(`Errore firma ${tipo}: ${JSON.stringify(result.data)}`);
        }
        setLoading(null);
    };
    return (_jsxs("div", { className: "bg-card rounded-xl p-6 border border-border", children: [_jsxs("h3", { className: "text-lg font-display text-foreground flex items-center gap-2 mb-4", children: [_jsx(PenTool, { size: 20 }), " Firme Digitali \u2014 ", tenant.toUpperCase()] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "text-sm text-muted-foreground mb-1 block", children: "Numero FIR" }), _jsx("input", { type: "text", value: firNumber, onChange: (e) => setFirNumber(e.target.value), placeholder: "FMGWB...", className: "w-full max-w-md px-4 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500" })] }), _jsxs("div", { className: "flex gap-3 flex-wrap", children: [_jsxs("button", { onClick: () => handleFirma("produttore"), disabled: !!loading, className: "px-5 py-3 rounded-lg font-semibold bg-yellow-600 text-black hover:bg-yellow-500 disabled:opacity-50 flex items-center gap-2", children: [loading === "produttore" ? _jsx(Loader2, { className: "animate-spin", size: 16 }) : null, "Firma Produttore (Giallo \u2192 Verde)"] }), _jsxs("button", { onClick: () => handleFirma("destinatario"), disabled: !!loading, className: "px-5 py-3 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 flex items-center gap-2", children: [loading === "destinatario" ? _jsx(Loader2, { className: "animate-spin", size: 16 }) : null, "Firma Destinatario (Verde \u2192 Rosso)"] })] })] }));
}
