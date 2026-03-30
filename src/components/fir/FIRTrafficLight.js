import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useFIRStore } from "@/stores/firStore";
const lights = [
    { key: 'bozza', label: 'BOZZA', color: 'hsl(45, 93%, 47%)', shadow: 'rgba(234, 179, 8, 0.6)' },
    { key: 'inviato', label: 'IN VIAGGIO', color: 'hsl(142, 71%, 45%)', shadow: 'rgba(34, 197, 94, 0.6)' },
    { key: 'chiuso', label: 'ARRIVO', color: 'hsl(0, 84%, 60%)', shadow: 'rgba(239, 68, 68, 0.6)' },
];
export function FIRTrafficLight() {
    const status = useFIRStore((s) => s.workflowStatus);
    const hasActiveFir = useFIRStore((s) => !!s.data.selectedFirNumber || !!s.editingFirId);
    // If there's an active FIR but no explicit status, default to 'bozza'
    const effectiveStatus = status || (hasActiveFir ? 'bozza' : null);
    return (_jsx("div", { className: "flex items-center gap-4 mt-3 mb-1 py-2 px-3 rounded-xl glass-card border border-primary/15", children: lights.map((light) => {
            const active = effectiveStatus === light.key;
            return (_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("div", { className: `w-4 h-4 rounded-full transition-all duration-500 ${active ? "animate-pulse scale-110" : ""}`, style: {
                            backgroundColor: active ? light.color : 'hsl(var(--muted))',
                            boxShadow: active ? `0 0 16px ${light.shadow}, 0 0 32px ${light.shadow}` : 'none',
                            opacity: active ? 1 : 0.2,
                        } }), _jsx("span", { className: `text-[10px] font-mono font-bold tracking-wider transition-all ${active ? "text-glow" : ""}`, style: {
                            color: active ? light.color : 'rgba(255,255,255,0.7)',
                            textShadow: active ? `0 0 8px ${light.shadow}` : 'none',
                        }, children: light.label })] }, light.key));
        }) }));
}
