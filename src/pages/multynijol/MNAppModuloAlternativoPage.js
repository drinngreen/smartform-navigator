import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLocation, Navigate } from "react-router-dom";
import { MNBottomNav } from "@/components/layout/MNBottomNav";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileShell } from "@/components/layout/MobileShell";
import { FIRAlternativeForm } from "@/components/fir/FIRAlternativeForm";
import { useAuth } from "@/hooks/useAuth";
export default function MNAppModuloAlternativoPage() {
    const { user, isLoading } = useAuth();
    const location = useLocation();
    const isGlobalReco = location.pathname.startsWith("/app/");
    const basePath = isGlobalReco
        ? "/app"
        : location.pathname.includes("/mn/app/niyol")
            ? "/mn/app/niyol"
            : "/mn/app/multyproget";
    if (isLoading) {
        return (_jsx("div", { className: "min-h-screen bg-background flex items-center justify-center", children: _jsx("div", { className: "text-primary animate-pulse text-lg tracking-wider font-display", children: "CARICAMENTO..." }) }));
    }
    if (!user) {
        if (isGlobalReco)
            return _jsx(Navigate, { to: "/login", replace: true });
        return _jsx(Navigate, { to: basePath.includes("niyol") ? "/ni" : "/mn", replace: true });
    }
    return (_jsxs(MobileShell, { children: [_jsx("div", { className: "flex-1 overflow-y-auto p-4 pb-24", children: _jsx(FIRAlternativeForm, {}) }), isGlobalReco ? _jsx(BottomNav, {}) : _jsx(MNBottomNav, { basePath: basePath })] }));
}
