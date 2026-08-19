import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useZoliDarkLemonWidgetStore } from "@/stores/zoliDarkLemonWidgetStore";
export function DarkLemonWorkOverlay() {
    const isWorking = useZoliDarkLemonWidgetStore((s) => s.isWorking);
    const sidePanel = useZoliDarkLemonWidgetStore((s) => s.sidePanel);
    const setWorking = useZoliDarkLemonWidgetStore((s) => s.setWorking);
    if (!isWorking || !sidePanel)
        return null;
    return (_jsxs("div", { className: "fixed inset-0 z-[55] cursor-pointer flex items-center justify-center", style: { right: "max(20vw, 280px)" }, onClick: () => setWorking(false), children: [_jsx("div", { className: "absolute inset-0 bg-green-500/8 animate-[dlWorkPulse_3s_ease-in-out_infinite]" }), _jsx("div", { className: "absolute inset-0 overflow-hidden pointer-events-none", children: _jsx("div", { className: "absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-400/40 to-transparent animate-[dlScanWave_2.5s_ease-in-out_infinite]" }) }), _jsx("div", { className: "absolute inset-0 border-2 border-green-500/20 rounded-lg animate-[dlWorkPulse_3s_ease-in-out_infinite]" }), _jsxs("div", { className: "relative bg-[hsl(222,47%,6%)]/90 backdrop-blur-sm border border-green-500/30 rounded-xl px-6 py-3 shadow-lg shadow-green-500/10", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-2 h-2 bg-green-400 rounded-full animate-pulse" }), _jsx("span", { className: "text-green-400 text-sm font-medium", children: "Dark Lemon sta lavorando..." })] }), _jsx("p", { className: "text-white/30 text-[10px] mt-1 text-center", children: "Clicca per interrompere" })] }), _jsx("style", { children: `
        @keyframes dlWorkPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes dlScanWave {
          0% { top: -4px; }
          100% { top: 100%; }
        }
      ` })] }));
}
