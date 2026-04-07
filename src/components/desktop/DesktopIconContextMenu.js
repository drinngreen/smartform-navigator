import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useIconStats } from "@/hooks/useIconStats";
import { Loader2, X, Construction } from "lucide-react";
function ChartBlock({ chart }) {
    if (chart.title === "__IN_SVILUPPO__") {
        return (_jsxs("div", { className: "flex flex-col items-center gap-2 py-6", children: [_jsx(Construction, { className: "h-8 w-8 text-amber-400/70" }), _jsx("p", { className: "text-xs text-white/50 font-medium", children: "App in sviluppo" }), _jsx("p", { className: "text-[10px] text-white/30", children: "Dati non ancora disponibili" })] }));
    }
    if (!chart.data.length || chart.data.every((d) => d.value === 0)) {
        return (_jsx("div", { className: "text-center py-4", children: _jsx("p", { className: "text-xs text-white/50", children: "Nessun dato" }) }));
    }
    if (chart.type === "pie") {
        return (_jsxs("div", { className: "flex flex-col items-center gap-2", children: [_jsx("h4", { className: "text-xs font-semibold text-white/80 uppercase tracking-wider", children: chart.title }), _jsx(ResponsiveContainer, { width: 180, height: 150, children: _jsxs(PieChart, { children: [_jsx(Pie, { data: chart.data, dataKey: "value", nameKey: "name", cx: "50%", cy: "50%", outerRadius: 55, innerRadius: 25, strokeWidth: 0, children: chart.data.map((entry, i) => (_jsx(Cell, { fill: entry.color }, i))) }), _jsx(Tooltip, { contentStyle: { background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }, itemStyle: { color: "#fff" } })] }) }), _jsx("div", { className: "flex flex-wrap gap-2 justify-center", children: chart.data.map((d, i) => (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("div", { className: "w-2 h-2 rounded-full", style: { background: d.color } }), _jsxs("span", { className: "text-[10px] text-white/60", children: [d.name, ": ", d.value] })] }, i))) })] }));
    }
    return (_jsxs("div", { className: "flex flex-col items-center gap-2", children: [_jsx("h4", { className: "text-xs font-semibold text-white/80 uppercase tracking-wider", children: chart.title }), _jsx(ResponsiveContainer, { width: 200, height: 120, children: _jsxs(BarChart, { data: chart.data, children: [_jsx(XAxis, { dataKey: "name", tick: { fontSize: 9, fill: "rgba(255,255,255,0.5)" }, axisLine: false, tickLine: false }), _jsx(YAxis, { hide: true }), _jsx(Tooltip, { contentStyle: { background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }, itemStyle: { color: "#fff" } }), _jsx(Bar, { dataKey: "value", radius: [4, 4, 0, 0], children: chart.data.map((entry, i) => (_jsx(Cell, { fill: entry.color }, i))) })] }) })] }));
}
export function DesktopIconContextMenu({ iconId, iconLabel, position, subItems, onClose }) {
    const ref = useRef(null);
    const navigate = useNavigate();
    const hasSubItems = subItems && subItems.length > 0;
    const { data: charts, isLoading } = useIconStats(hasSubItems ? null : iconId);
    useEffect(() => {
        if (!position)
            return;
        const escHandler = (e) => {
            if (e.key === "Escape")
                onClose();
        };
        document.addEventListener("keydown", escHandler);
        return () => {
            document.removeEventListener("keydown", escHandler);
        };
    }, [position, onClose]);
    if (!position || !iconId)
        return null;
    const popupW = 320;
    const popupH = 350;
    const x = Math.min(position.x, window.innerWidth - popupW - 16);
    const y = Math.min(position.y, window.innerHeight - popupH - 16);
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 z-[9998] bg-black/40", onClick: onClose }), _jsxs("div", { ref: ref, className: "fixed z-[9999] w-[300px] max-h-[80vh] overflow-y-auto rounded-2xl border border-white/15 bg-black/95 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-200", style: { left: x, top: y }, onContextMenu: (e) => e.preventDefault(), children: [_jsxs("div", { className: "sticky top-0 z-10 flex items-center justify-between p-4 pb-3 border-b border-white/10 bg-black/95 backdrop-blur-xl rounded-t-2xl", children: [_jsxs("div", { children: [_jsx("span", { className: "text-sm font-bold text-white", children: iconLabel }), !hasSubItems && _jsx("span", { className: "text-[10px] text-white/40 ml-2", children: "Statistiche" })] }), _jsx("button", { onClick: onClose, className: "w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors", children: _jsx(X, { className: "h-4 w-4 text-white/70" }) })] }), _jsx("div", { className: "p-4", children: hasSubItems ? (_jsx("div", { className: "flex flex-col gap-2", children: subItems.map((sub) => (_jsxs("button", { onClick: () => {
                                    navigate(sub.href);
                                    onClose();
                                }, className: "flex items-center gap-4 px-4 py-3 rounded-xl transition-all hover:bg-white/10 group", children: [_jsx("div", { className: "w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden", style: {
                                            background: `linear-gradient(135deg, rgba(${sub.color}, 0.25), rgba(${sub.color}, 0.1))`,
                                            border: `2px solid rgba(${sub.color}, 0.6)`,
                                            boxShadow: `0 0 20px rgba(${sub.color}, 0.4)`,
                                        }, children: _jsx("img", { src: sub.iconImage, alt: sub.label, className: "h-9 w-9 transition-transform group-hover:scale-110" }) }), _jsx("span", { className: "text-sm font-semibold text-white/90 group-hover:text-white", children: sub.label })] }, sub.href))) })) : isLoading ? (_jsx("div", { className: "flex items-center justify-center py-8", children: _jsx(Loader2, { className: "h-5 w-5 animate-spin text-white/50" }) })) : (_jsxs("div", { className: "flex flex-col gap-4", children: [charts?.map((chart, i) => (_jsx(ChartBlock, { chart: chart }, i))), (!charts || charts.length === 0) && (_jsxs("div", { className: "flex flex-col items-center gap-2 py-6", children: [_jsx(Construction, { className: "h-8 w-8 text-amber-400/70" }), _jsx("p", { className: "text-xs text-white/50", children: "App in sviluppo" })] }))] })) })] })] }));
}
