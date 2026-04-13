import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Package, FileText, Scissors, History, ExternalLink } from "lucide-react";
const PREFIX = "/mn/admin/dev-multyproget/dragon";
export function DevMagazzinoDevModule() {
    const navigate = useNavigate();
    const [tab, setTab] = useState("registro");
    const sections = [
        { id: "registro", label: "Registro", icon: BookOpen, path: `${PREFIX}/registro` },
        { id: "magazzino", label: "Magazzino", icon: Package, path: `${PREFIX}/magazzino` },
        { id: "articoli", label: "Articoli CER", icon: FileText, path: `${PREFIX}/articoli` },
        { id: "cernite", label: "Cernite", icon: Scissors, path: `${PREFIX}/cernite/modelli` },
        { id: "audit", label: "Audit Trail", icon: History, path: `${PREFIX}/audit` },
    ];
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "flex items-center justify-between", children: _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-emerald-300", children: "\uD83D\uDC09 Dragon \u2014 Magazzino Dev" }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Sistema integrato Registro & Magazzino Rifiuti (tabelle dragon_*)" })] }) }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3", children: sections.map((s) => (_jsxs(Button, { variant: "outline", className: "flex flex-col items-center gap-2 h-auto py-4 border-border/40 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all", onClick: () => navigate(s.path), children: [_jsx(s.icon, { className: "h-6 w-6 text-emerald-400" }), _jsx("span", { className: "text-xs font-medium", children: s.label }), _jsx(ExternalLink, { className: "h-3 w-3 text-muted-foreground" })] }, s.id))) }), _jsx("p", { className: "text-xs text-muted-foreground/60 italic", children: "Clicca su una sezione per aprirla a pagina intera con tutte le funzionalit\u00E0 Dragon." })] }));
}
