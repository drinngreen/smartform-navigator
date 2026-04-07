import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { ChevronDown, ChevronRight, FlaskConical, AlertTriangle } from "lucide-react";
import { FIRFormComplete } from "@/components/fir/FIRFormComplete";
import { FIRTrafficLight } from "@/components/fir/FIRTrafficLight";
const DEMO_EMAIL = "development@zolisoftware.space";
export function DemoAppSection() {
    const [open, setOpen] = useState(false);
    return (_jsxs("div", { className: "rounded-xl border border-yellow-500/40 bg-card/60 backdrop-blur-sm overflow-hidden", children: [_jsxs("button", { onClick: () => setOpen(!open), className: "w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(FlaskConical, { size: 18, className: "text-yellow-400" }), _jsx("span", { className: "font-display text-lg tracking-wider", children: "APP DEMO \u2014 Test Filiera FIR" }), _jsx("span", { className: "text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/30", children: "DEMO" })] }), open ? _jsx(ChevronDown, { size: 16, className: "text-yellow-400" }) : _jsx(ChevronRight, { size: 16, className: "text-yellow-400" })] }), open && (_jsxs("div", { className: "border-t border-yellow-500/30", children: [_jsxs("div", { className: "bg-yellow-600/20 border-b border-yellow-500/30 px-4 py-2 flex items-center gap-2 text-yellow-300 text-xs font-mono", children: [_jsx(AlertTriangle, { size: 14 }), "MODALIT\u00C0 DEMO \u2014 Email inviate a: ", _jsx("strong", { children: DEMO_EMAIL }), " \u2014 Backend Demo Ngrok"] }), _jsx("div", { className: "px-4 pt-3", children: _jsx(FIRTrafficLight, {}) }), _jsx("div", { className: "max-w-2xl mx-auto", children: _jsx(FIRFormComplete, { demoMode: true, demoEmailOverride: DEMO_EMAIL }) })] }))] }));
}
