import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertTriangle, CheckCircle2, Gauge, ShieldCheck, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgentActivityStore } from "@/stores/agentActivityStore";
export function DarkLemonSupervisionBar({ className }) {
    const supervision = useAgentActivityStore((s) => s.supervision);
    const autopilot = useAgentActivityStore((s) => s.autopilot);
    const setAutopilot = useAgentActivityStore((s) => s.setAutopilot);
    const entries = useAgentActivityStore((s) => s.entries);
    const errors = entries.filter((e) => e.status === "error").length;
    const level = supervision?.level ?? (errors > 0 ? "warning" : "ok");
    const Icon = level === "error" ? XCircle : level === "warning" ? AlertTriangle : CheckCircle2;
    return (_jsxs("div", { className: cn("mx-3 mb-2 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px]", level === "error"
            ? "border-red-500/30 bg-red-500/10 text-red-300"
            : level === "warning"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                : "border-emerald-500/25 bg-emerald-500/10 text-emerald-300", className), onMouseDown: (e) => e.stopPropagation(), children: [_jsx(Icon, { className: "h-3.5 w-3.5 shrink-0" }), _jsx("span", { className: "flex-1 truncate", children: supervision?.message
                    || (entries.length === 0
                        ? "Supervisione attiva — nessuna azione registrata"
                        : `${entries.length} azioni monitorate${errors > 0 ? ` • ${errors} con errore` : ""}`) }), _jsxs("button", { type: "button", onClick: () => setAutopilot(!autopilot), className: cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-medium transition-colors shrink-0", autopilot
                    ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-200"
                    : "border-white/15 bg-white/5 text-white/60 hover:text-white"), title: "Autopilot: l'agente concatena gli strumenti e verifica i risultati da solo", children: [autopilot ? _jsx(Gauge, { className: "h-3 w-3" }) : _jsx(ShieldCheck, { className: "h-3 w-3" }), "Autopilot ", autopilot ? "ON" : "OFF"] })] }));
}
