import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import logoDragon from "@/assets/logo-dragon.png";
export function DragonBackButton() {
    const navigate = useNavigate();
    const { context } = useParams();
    const target = context === "dev-multyproget"
        ? "/mn/admin/dev-multyproget?tab=magazzino-dev"
        : `/mn/admin/${context || "dev-multyproget"}?tab=magazzino-dev`;
    return (_jsxs("button", { onClick: () => navigate(target), className: "mb-4 flex items-center gap-3 px-5 py-3 rounded-xl border-2 border-red-500/40 bg-red-500/10 hover:bg-red-500/20 transition-all group", children: [_jsx(ArrowLeft, { className: "h-5 w-5 text-red-400 group-hover:-translate-x-1 transition-transform" }), _jsx("img", { src: logoDragon, alt: "Dragon", className: "h-6 w-6" }), _jsx("span", { className: "text-sm font-semibold text-red-300", children: "Torna al Centro di Comando" })] }));
}
