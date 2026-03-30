import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Shield, LogOut, ChevronDown, AlertTriangle, ExternalLink, FileEdit } from "lucide-react";
import { FIRPoolSection } from "@/components/superadmin/FIRPoolSection";
import { FIRPoolTank } from "@/components/superadmin/FIRPoolTank";
import { DigitalSignatureSection } from "@/components/superadmin/DigitalSignatureSection";
import { RegistroCarScarSection } from "@/components/superadmin/RegistroCarScarSection";
import { RENTRILogConsole } from "@/components/superadmin/RENTRILogConsole";
import { SystemPromptReviewSection } from "@/components/superadmin/SystemPromptReviewSection";
import { RENTRIActionsPanel } from "@/components/superadmin/RENTRIActionsPanel";
import { RENTRIDemoTestHub } from "@/components/superadmin/RENTRIDemoTestHub";
import { SocialModerationSection } from "@/components/superadmin/SocialModerationSection";
import { DemoAppSection } from "@/components/superadmin/DemoAppSection";
import { ngrokHealthCheck } from "@/lib/rentriNgrokApi";
import logoDragon from "@/assets/logo-dragon.png";
const TENANTS = [
    { id: "global", label: "Global Reco", color: "bg-emerald-600" },
    { id: "multy", label: "Multy Proget", color: "bg-orange-600" },
    { id: "niyol", label: "Niyol", color: "bg-cyan-600" },
];
const ADMIN_LINKS = [
    { label: "Admin Global Reco", path: "/admin" },
    { label: "Admin Multy Niyol", path: "/mn/admin" },
];
const ALLOWED_EMAIL = "superadmin@zoli.live";
export default function SuperAdminDashboard() {
    const { user, isAdmin, isLoading, signOut } = useAuth();
    const navigate = useNavigate();
    const [activeTenant, setActiveTenant] = useState(TENANTS[0]);
    const [showTenantMenu, setShowTenantMenu] = useState(false);
    const [ngrokUp, setNgrokUp] = useState(null);
    useEffect(() => {
        if (!isLoading) {
            const e = user?.email?.toLowerCase() ?? "";
            if (!user || !isAdmin || e !== ALLOWED_EMAIL) {
                navigate("/superadmin", { replace: true });
            }
        }
    }, [user, isAdmin, isLoading, navigate]);
    useEffect(() => {
        ngrokHealthCheck().then((r) => setNgrokUp(r.ok));
    }, []);
    const handleLogout = async () => {
        await signOut();
        navigate("/superadmin", { replace: true });
    };
    if (isLoading) {
        return (_jsx("div", { className: "min-h-screen bg-background flex items-center justify-center", children: _jsx("img", { src: logoDragon, alt: "", className: "h-16 w-16 animate-pulse" }) }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-background text-foreground", children: [_jsxs("div", { className: "bg-red-700 text-white text-center py-2 px-4 font-display text-sm tracking-wider flex items-center justify-center gap-2", children: [_jsx(AlertTriangle, { size: 16 }), "STAI OPERANDO SUL PORTALE REALE RENTRI \u2014 MODALIT\u00C0 PRODUZIONE", _jsx(AlertTriangle, { size: 16 })] }), _jsxs("header", { className: "border-b border-border bg-card px-6 py-3 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Shield, { className: "text-red-500", size: 22 }), _jsx("span", { className: "font-display text-lg tracking-wider", children: "SUPER ADMIN" })] }), _jsxs("div", { className: "relative", children: [_jsxs("button", { onClick: () => setShowTenantMenu(!showTenantMenu), className: "flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border hover:bg-secondary transition-all", children: [_jsx("span", { className: `w-3 h-3 rounded-full ${activeTenant.color}` }), _jsx("span", { className: "text-sm font-semibold", children: activeTenant.label }), _jsx(ChevronDown, { size: 14 })] }), showTenantMenu && (_jsxs("div", { className: "absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 min-w-[200px]", children: [TENANTS.map((t) => (_jsxs("button", { onClick: () => { setActiveTenant(t); setShowTenantMenu(false); }, className: "w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-secondary/50 transition-all first:rounded-t-lg last:rounded-b-lg", children: [_jsx("span", { className: `w-3 h-3 rounded-full ${t.color}` }), t.label] }, t.id))), _jsx("div", { className: "border-t border-border" }), ADMIN_LINKS.map((l) => (_jsxs("button", { onClick: () => navigate(l.path), className: "w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-secondary/50 transition-all text-muted-foreground", children: [_jsx(ExternalLink, { size: 14 }), " ", l.label] }, l.path)))] }))] }), _jsx("div", { className: "flex items-center gap-4 text-xs text-muted-foreground", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: `w-2 h-2 rounded-full ${ngrokUp === true ? "bg-green-500" : ngrokUp === false ? "bg-red-500" : "bg-yellow-500 animate-pulse"}` }), "Backend ", ngrokUp === true ? "Online" : ngrokUp === false ? "Offline" : "..."] }) })] }), _jsxs("button", { onClick: handleLogout, className: "flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all", children: [_jsx(LogOut, { size: 16 }), " Logout"] })] }), _jsxs("main", { className: "max-w-6xl mx-auto p-6 space-y-6", children: [_jsxs("button", { onClick: () => navigate("/super/form-editor"), className: "w-full flex items-center gap-3 px-5 py-4 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-all text-left", children: [_jsx(FileEdit, { size: 20, className: "text-primary" }), _jsxs("div", { children: [_jsx("div", { className: "font-semibold text-sm", children: "Editor Formulario FIR" }), _jsx("div", { className: "text-xs text-muted-foreground", children: "Posiziona i campi sul formulario ufficiale" })] })] }), _jsxs("button", { onClick: () => navigate("/super/modulo-alternativo"), className: "w-full flex items-center gap-3 px-5 py-4 rounded-xl border border-amber-500/30 bg-card hover:bg-amber-500/10 transition-all text-left", children: [_jsx(FileEdit, { size: 20, className: "text-amber-400" }), _jsxs("div", { children: [_jsx("div", { className: "font-semibold text-sm text-amber-300", children: "Modulo Alternativo FIR" }), _jsx("div", { className: "text-xs text-muted-foreground", children: "Vista sperimentale del formulario con campi trasparenti" })] })] }), _jsx(DemoAppSection, {}), _jsx(SocialModerationSection, {}), _jsx(FIRPoolTank, { tenant: activeTenant.id }), _jsx(RENTRIDemoTestHub, { tenant: activeTenant.id }), _jsx(RENTRIActionsPanel, { tenant: activeTenant.id }), _jsx(FIRPoolSection, { tenant: activeTenant.id }), _jsx(DigitalSignatureSection, { tenant: activeTenant.id }), _jsx(SystemPromptReviewSection, {}), _jsx(RegistroCarScarSection, { tenant: activeTenant.id }), _jsx(RENTRILogConsole, {})] })] }));
}
