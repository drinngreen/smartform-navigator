import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { FIRAlternativeForm } from "@/components/fir/FIRAlternativeForm";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
export default function ModuloAlternativoPage() {
    const navigate = useNavigate();
    return (_jsxs("div", { className: "min-h-screen bg-background text-foreground", children: [_jsxs("header", { className: "border-b border-border bg-card px-6 py-3 flex items-center gap-4", children: [_jsx("button", { onClick: () => navigate(-1), className: "p-2 rounded-lg hover:bg-secondary/50 transition-all", children: _jsx(ArrowLeft, { className: "h-5 w-5" }) }), _jsx("h1", { className: "font-display text-lg tracking-wider", children: "MODULO ALTERNATIVO FIR" })] }), _jsx("main", { className: "max-w-3xl mx-auto p-6", children: _jsx(FIRAlternativeForm, {}) })] }));
}
