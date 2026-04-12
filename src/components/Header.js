import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useLocation } from "wouter";
import { Zap, LayoutDashboard, UploadCloud, FileText, Lock, Play } from "lucide-react";
export function Header() {
    const [location] = useLocation();
    const getLinkClass = (path) => {
        const base = "flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-sm font-medium";
        return location === path
            ? `${base} bg-purple-600 text-white shadow-lg shadow-purple-900/20`
            : `${base} text-slate-400 hover:text-white hover:bg-slate-800`;
    };
    return (_jsx("header", { className: "border-b border-slate-800 bg-slate-950/50 backdrop-blur sticky top-0 z-50", children: _jsxs("div", { className: "container mx-auto px-4 h-16 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center", children: _jsx(Zap, { className: "h-5 w-5 text-white fill-current" }) }), _jsx("span", { className: "font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400", children: "RENTRI Sender" })] }), _jsxs("nav", { className: "flex items-center gap-2", children: [_jsxs(Link, { href: "/", className: getLinkClass("/"), children: [" ", _jsx(LayoutDashboard, { className: "h-4 w-4" }), " Dashboard "] }), _jsxs(Link, { href: "/carica-fir", className: getLinkClass("/carica-fir"), children: [" ", _jsx(FileText, { className: "h-4 w-4" }), " Carica FIR "] }), _jsxs(Link, { href: "/massive", className: getLinkClass("/massive"), children: [" ", _jsx(UploadCloud, { className: "h-4 w-4" }), " Import Massivo "] }), _jsxs(Link, { href: "/bridge", className: getLinkClass("/bridge"), children: [" ", _jsx(Lock, { className: "h-4 w-4" }), " Bridge Service "] }), _jsxs(Link, { href: "/auto", className: getLinkClass("/auto"), children: [" ", _jsx(Play, { className: "h-4 w-4" }), " Invii automatici "] })] })] }) }));
}
