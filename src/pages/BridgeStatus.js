import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Server, XCircle } from "lucide-react";
export default function BridgeStatus() {
    return (_jsxs("div", { className: "container py-8 max-w-2xl mx-auto", children: [_jsxs("h1", { className: "text-3xl font-bold mb-6 flex items-center gap-2", children: [_jsx(Server, { className: "text-purple-500" }), " Stato Bridge"] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Connessione" }), _jsx(CardDescription, { children: "Stato del servizio locale di firma Windows" })] }), _jsx(CardContent, { children: _jsxs("div", { className: "flex items-center gap-2 text-slate-400 bg-slate-800/50 p-4 rounded-lg border border-slate-700", children: [_jsx(XCircle, { className: "h-5 w-5" }), " Bridge non configurato in questa versione."] }) })] })] }));
}
