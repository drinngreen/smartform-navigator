import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CheckCircle, AlertTriangle, PenTool, Download, Clock } from "lucide-react";
const EVENT_ICONS = {
    importato: Download,
    firma_ricezione: PenTool,
    firma_destinatario: CheckCircle,
    errore: AlertTriangle,
};
export function ImpiantoFirTimeline({ events, color }) {
    if (!events.length)
        return (_jsx("div", { className: "text-muted-foreground text-sm text-center py-4", children: "Nessun evento registrato" }));
    return (_jsx("div", { className: "space-y-3", children: events.map((ev, i) => {
            const Icon = EVENT_ICONS[ev.tipo] || Clock;
            return (_jsxs("div", { className: "flex gap-3 items-start", children: [_jsxs("div", { className: "flex flex-col items-center", children: [_jsx("div", { className: "w-8 h-8 rounded-full flex items-center justify-center", style: { background: `rgba(${color}, 0.15)` }, children: _jsx(Icon, { className: "h-4 w-4", style: { color: `rgb(${color})` } }) }), i < events.length - 1 && _jsx("div", { className: "w-px flex-1 min-h-[20px] bg-border/30 mt-1" })] }), _jsxs("div", { className: "flex-1 pb-3", children: [_jsx("p", { className: "text-sm font-medium text-foreground", children: ev.descrizione }), _jsxs("p", { className: "text-xs text-muted-foreground font-mono mt-0.5", children: [new Date(ev.timestamp).toLocaleString("it-IT"), ev.actor && _jsxs("span", { className: "ml-2", children: ["\u00B7 ", ev.actor] })] })] })] }, ev.id || i));
        }) }));
}
