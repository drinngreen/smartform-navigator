import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from "react";
import { Check, Pencil, X } from "lucide-react";
import { useFormBridgeContext } from "@/contexts/FormBridgeContext";
import { toast } from "sonner";
import { useZoliDarkLemonWidgetStore } from "@/stores/zoliDarkLemonWidgetStore";
/** Parse <!--FILL_FORM:{...}--> from message content */
export function parseFillFormTag(content) {
    const match = content.match(/<!--FILL_FORM:(.*?)-->/s);
    if (!match)
        return null;
    try {
        const data = JSON.parse(match[1]);
        if (data?.fields && Array.isArray(data.fields))
            return data;
    }
    catch { /* ignore */ }
    return null;
}
/** Strip the FILL_FORM tag from displayed content */
export function stripFillFormTag(content) {
    return content.replace(/<!--FILL_FORM:.*?-->/gs, "").trim();
}
export function FillFormAction({ data }) {
    const { fillFields } = useFormBridgeContext();
    const { setWorking } = useZoliDarkLemonWidgetStore();
    const [applied, setApplied] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const applyFields = useCallback(async () => {
        setWorking(true);
        // Animate: fill one field at a time with delay
        let filled = 0;
        for (const field of data.fields) {
            const count = fillFields([{ id: field.id, value: field.value }]);
            filled += count;
            // Small delay to make writing visible
            await new Promise(r => setTimeout(r, 300));
        }
        setWorking(false);
        setApplied(true);
        if (filled > 0) {
            toast.success(`✅ ${filled} camp${filled === 1 ? "o compilato" : "i compilati"} con successo`);
        }
        else {
            toast.error("⚠️ Nessun campo trovato nel form attuale. Assicurati di essere sulla pagina giusta.");
        }
    }, [data.fields, fillFields, setWorking]);
    if (dismissed)
        return null;
    if (applied) {
        return (_jsxs("div", { className: "mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 text-[10px]", children: [_jsx(Check, { className: "h-3 w-3" }), _jsx("span", { children: "Campi compilati con successo" })] }));
    }
    const needsConfirm = data.confirm !== false;
    if (!needsConfirm) {
        // Auto-apply on mount
        if (!applied) {
            applyFields();
        }
        return null;
    }
    return (_jsxs("div", { className: "mt-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5", children: [_jsxs("div", { className: "text-[10px] text-amber-300 font-semibold mb-1.5 flex items-center gap-1.5", children: [_jsx(Pencil, { className: "h-3 w-3" }), "Compilazione Form \u2014 ", data.fields.length, " camp", data.fields.length === 1 ? "o" : "i"] }), _jsx("div", { className: "space-y-0.5 mb-2", children: data.fields.map((f, i) => (_jsxs("div", { className: "text-[9px] text-white/70 flex justify-between", children: [_jsxs("span", { className: "text-white/50", children: [f.label || f.id, ":"] }), _jsx("span", { className: "text-white/90 font-mono", children: f.value })] }, i))) }), _jsxs("div", { className: "flex gap-1.5", children: [_jsxs("button", { onClick: applyFields, className: "flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors", children: [_jsx(Pencil, { className: "h-2.5 w-2.5" }), "Compila ora"] }), _jsx("button", { onClick: () => setDismissed(true), className: "px-2 py-1 rounded text-[10px] text-white/40 border border-white/10 hover:bg-white/5 transition-colors", children: _jsx(X, { className: "h-2.5 w-2.5" }) })] })] }));
}
