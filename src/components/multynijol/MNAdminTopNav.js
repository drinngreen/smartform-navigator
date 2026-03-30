import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import logoDragon from "@/assets/logo-dragon.png";
import zoliLemonIcon from "@/assets/zoli-dark-lemon-icon.png";
import intermediazionIcon from "@/assets/intermediazione-icon.png";
import systemPromptIcon from "@/assets/system-prompt-icon.png";
import iconDashboard from "@/assets/menu-icons/dashboard.png";
import iconPersonale from "@/assets/menu-icons/personale.png";
import iconRegistroFir from "@/assets/menu-icons/registro_fir.png";
import iconRentri from "@/assets/menu-icons/rentri.png";
import iconFatturazione from "@/assets/menu-icons/fatturazione.png";
import iconGestioneFormulari from "@/assets/menu-icons/gestione_formulari.png";
import iconReportChiamate from "@/assets/menu-icons/report_chiamate.png";
import iconZoliMessages from "@/assets/menu-icons/zoli_messages.png";
import iconPrivati from "@/assets/menu-icons/privati.png";
import iconProduttore from "@/assets/menu-icons/produttore.png";
import iconDestinatario from "@/assets/menu-icons/destinatario.png";
const navItems = [
    { label: "Dashboard", iconImage: iconDashboard, path: "", color: "251, 191, 36" },
    { label: "Registro", iconImage: iconRegistroFir, path: "/registro", color: "249, 115, 22" },
    { label: "RENTRI", iconImage: iconRentri, path: "/rentri", color: "236, 72, 153" },
    { label: "Trasportatori", iconImage: iconPersonale, path: "/trasportatori", color: "6, 182, 212" },
    { label: "Personale", iconImage: iconPersonale, path: "/personale", color: "16, 185, 129" },
    { label: "Messaggi", iconImage: iconZoliMessages, path: "/messaggi", color: "244, 114, 182" },
    { label: "Impianto", iconImage: iconPrivati, path: "/impianto/privati", color: "20, 184, 166", subItems: [
            { label: "Privati", iconImage: iconPrivati, path: "/impianto/privati", color: "20, 184, 166" },
            { label: "Produttore", iconImage: iconProduttore, path: "/impianto/produttore", color: "249, 115, 22" },
            { label: "Destinatario", iconImage: iconDestinatario, path: "/impianto/destinatario", color: "59, 130, 246" },
        ] },
    { label: "Conferimenti", iconImage: iconRegistroFir, path: "/conferimenti", color: "249, 115, 22" },
    { label: "Pagamenti", iconImage: iconFatturazione, path: "/pagamenti", color: "239, 68, 68" },
    { label: "Formulari", iconImage: iconGestioneFormulari, path: "/formulari", color: "34, 197, 94" },
    { label: "Chiamate", iconImage: iconReportChiamate, path: "/chiamate", color: "34, 197, 94" },
    { label: "Intermediazione", iconImage: intermediazionIcon, path: "/intermediazione", color: "168, 85, 247" },
    { label: "Dark Lemon", iconImage: zoliLemonIcon, path: "/zoli-dark-lemon", color: "59, 130, 246" },
    { label: "System Prompt", iconImage: systemPromptIcon, path: "/system-prompt", color: "251, 191, 36" },
];
const allContexts = [
    { id: "multyproget", label: "Multyproget", color: "249, 115, 22" },
    { id: "dev-multyproget", label: "🧪 Dev Multy", color: "34, 197, 94" },
    { id: "niyol", label: "Niyol", color: "6, 182, 212" },
];
// Which contexts are switchable from each context
const contextSwitchMap = {
    "multyproget": ["dev-multyproget"],
    "dev-multyproget": ["multyproget", "niyol"],
    "niyol": ["dev-multyproget"],
};
export function MNAdminTopNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const { profile, signOut } = useAuth();
    const [switcherOpen, setSwitcherOpen] = useState(false);
    const switcherRef = useRef(null);
    const switcherDropdownRef = useRef(null);
    const [subMenuOpen, setSubMenuOpen] = useState(null);
    const [subMenuPos, setSubMenuPos] = useState({ x: 0, y: 0 });
    const subMenuRef = useRef(null);
    // Detect current context from URL
    const currentContext = location.pathname.includes("/mn/admin/dev-multyproget") ? "dev-multyproget"
        : location.pathname.includes("/mn/admin/niyol") ? "niyol"
            : location.pathname.includes("/mn/admin/multyproget") ? "multyproget"
                : null;
    const activeCtx = allContexts.find(c => c.id === currentContext);
    const availableSwitchTargets = currentContext ? (contextSwitchMap[currentContext] || []) : [];
    const switchableContexts = allContexts.filter(c => availableSwitchTargets.includes(c.id));
    const isContextPage = !!currentContext;
    const prefix = currentContext ? `/mn/admin/${currentContext}` : "/mn/admin";
    const isRouteActive = (href) => {
        if (href === prefix)
            return location.pathname === prefix;
        return location.pathname.startsWith(href);
    };
    const isSubRouteActive = (item) => {
        if (!item.subItems)
            return false;
        return item.subItems.some(sub => location.pathname.startsWith(`${prefix}${sub.path}`));
    };
    useEffect(() => {
        const handleClick = (e) => {
            const target = e.target;
            if (switcherRef.current && !switcherRef.current.contains(target) &&
                switcherDropdownRef.current && !switcherDropdownRef.current.contains(target)) {
                setSwitcherOpen(false);
            }
            if (subMenuRef.current && !subMenuRef.current.contains(target)) {
                setSubMenuOpen(null);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);
    return (_jsx("div", { className: "relative px-4 pt-3", children: _jsxs("div", { className: "relative rounded-2xl overflow-hidden", children: [_jsx("div", { className: "absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-r from-primary/40 via-neon-cyan/30 to-primary/40 animate-gradient-shift" }), _jsx("div", { className: "relative bg-card/80 backdrop-blur-xl rounded-2xl border border-border/30", children: _jsxs("div", { className: "flex items-center gap-2 px-4 py-3", children: [_jsxs("button", { onClick: () => navigate(currentContext ? `/mn/admin/${currentContext}` : "/mn/admin"), className: "flex items-center gap-2 mr-3 group", children: [_jsx("img", { src: logoDragon, alt: "Multy Niyol", className: "h-8 w-8 group-hover:scale-110 transition-transform" }), _jsx("span", { className: "text-xs font-display text-white hidden lg:block", children: "MULTY NIYOL" })] }), isContextPage && (_jsxs("div", { className: "relative mr-2", ref: switcherRef, children: [_jsxs("button", { onClick: () => setSwitcherOpen(!switcherOpen), className: "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all bg-primary/20 text-primary hover:bg-primary/30", children: [_jsx("div", { className: "w-2 h-2 rounded-full", style: { background: `rgba(${activeCtx?.color}, 0.8)` } }), activeCtx?.label, _jsx(ChevronDown, { className: "h-3 w-3" })] }), switcherOpen && createPortal(_jsx("div", { ref: switcherDropdownRef, className: "fixed z-[9999] bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl overflow-hidden min-w-[160px]", style: {
                                            left: switcherRef.current?.getBoundingClientRect().left ?? 0,
                                            top: (switcherRef.current?.getBoundingClientRect().bottom ?? 0) + 4,
                                        }, children: switchableContexts.map((ctx) => (_jsxs("button", { onClick: () => {
                                                setSwitcherOpen(false);
                                                navigate(`/mn/admin/${ctx.id}`);
                                            }, className: cn("w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors", ctx.id === currentContext ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"), children: [_jsx("div", { className: "w-2 h-2 rounded-full", style: { background: `rgba(${ctx.color}, 0.8)` } }), ctx.label] }, ctx.id))) }), document.body)] })), _jsx("div", { className: "flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide", children: isContextPage && navItems.map((item) => {
                                    const href = item.path ? `${prefix}${item.path}` : prefix;
                                    const active = item.subItems ? isSubRouteActive(item) : isRouteActive(href);
                                    if (item.subItems) {
                                        return (_jsxs("div", { className: "relative", children: [_jsxs("button", { onClick: (e) => {
                                                        e.preventDefault();
                                                        if (subMenuOpen === item.label) {
                                                            setSubMenuOpen(null);
                                                        }
                                                        else {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setSubMenuPos({ x: rect.left, y: rect.bottom + 4 });
                                                            setSubMenuOpen(item.label);
                                                        }
                                                    }, className: cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300", active
                                                        ? "bg-primary/20 text-white shadow-[0_0_20px_rgba(251,191,36,0.3)]"
                                                        : "text-white/70 hover:text-white hover:bg-secondary/50"), children: [_jsx("img", { src: item.iconImage, alt: item.label, className: "h-12 w-12 transition-transform duration-300 hover:scale-125" }), _jsx("span", { className: "text-straw font-light text-xs tracking-wide", children: item.label }), _jsx(ChevronDown, { className: "h-3 w-3 text-straw/60" })] }), subMenuOpen === item.label && createPortal(_jsx("div", { ref: subMenuRef, className: "fixed z-[9999] bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl overflow-hidden min-w-[220px]", style: { left: subMenuPos.x, top: subMenuPos.y }, children: item.subItems.map((sub) => (_jsxs("button", { onClick: () => {
                                                            navigate(`${prefix}${sub.path}`);
                                                            setSubMenuOpen(null);
                                                        }, className: cn("w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors", location.pathname.startsWith(`${prefix}${sub.path}`)
                                                            ? "bg-primary/20 text-white"
                                                            : "text-white/70 hover:text-white hover:bg-secondary/50"), children: [_jsx("img", { src: sub.iconImage, alt: sub.label, className: "h-8 w-8" }), _jsx("span", { children: sub.label })] }, sub.path))) }), document.body)] }, item.label));
                                    }
                                    return (_jsxs(NavLink, { to: href, end: !item.path, className: cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300", active
                                            ? "bg-primary/20 text-white shadow-[0_0_20px_rgba(251,191,36,0.3)]"
                                            : "text-white/70 hover:text-white hover:bg-secondary/50"), children: [_jsx("img", { src: item.iconImage, alt: item.label, className: "h-12 w-12 transition-transform duration-300 hover:scale-125" }), _jsx("span", { className: "text-straw font-light text-xs tracking-wide", children: item.label })] }, href));
                                }) }), _jsxs("div", { className: "flex items-center gap-2 ml-2", children: [_jsxs("span", { className: "text-xs text-white/80 font-mono hidden md:block", children: [profile?.nome, " ", profile?.cognome] }), _jsx("button", { onClick: signOut, className: "p-1.5 rounded-lg text-white/80 hover:text-destructive hover:bg-destructive/10 transition-colors", title: "Logout", children: _jsx(LogOut, { className: "h-4 w-4" }) })] })] }) })] }) }));
}
