import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
// Emails authorized for each admin area
const GLOBAL_ADMIN_EMAILS = [
    "globalreco@zolisoftware.cloud",
    "globalreco@zolisoftware.space",
    "admin@zoli.live",
    "direzioneglobalreco@zoli.live",
    "formulariglobalreco@zoli.live",
    "amministrazioneglobalreco@zoli.live",
    "amministrazioneglobal@zoli.live",
    "segreteriaglobalreco@zoli.live",
    "superadmin@zoli.live",
    "superadminglobal@zoli.live",
];
const MN_ADMIN_EMAILS = [
    "multyniyol@zoli.live",
    "superadmin@zoli.live",
];
const SUPER_ADMIN_EMAILS = [
    "superadmin@zoli.live",
];
const SUPER_GLOBAL_EMAILS = [
    "superadminglobal@zoli.live",
    "superadmin@zoli.live",
];
export function ProtectedRoute({ children }) {
    const { user, isLoading, isRoleReady, isAdmin, profile } = useAuth();
    const location = useLocation();
    const path = location.pathname;
    // Mantieni montata la pagina durante i refresh silenziosi della sessione.
    // Mostra il loader soltanto durante il bootstrap, quando l'utente non è
    // ancora disponibile.
    if ((isLoading && !user) || (user && !isRoleReady)) {
        return (_jsx("div", { className: "min-h-screen bg-background flex items-center justify-center", children: _jsx("div", { className: "text-primary animate-pulse text-lg tracking-wider font-display", children: "ZOLI DRAGON" }) }));
    }
    if (!user) {
        // Context-aware redirect: MN admin routes go to MN admin auth
        if (path.startsWith("/mn/admin")) {
            return _jsx(Navigate, { to: "/adminmn", state: { from: location }, replace: true });
        }
        if (path.startsWith("/mn/app/multyproget") || path === "/mn") {
            return _jsx(Navigate, { to: "/mn", state: { from: location }, replace: true });
        }
        if (path.startsWith("/mn/app/niyol") || path === "/ni") {
            return _jsx(Navigate, { to: "/ni", state: { from: location }, replace: true });
        }
        if (path.startsWith("/super")) {
            return _jsx(Navigate, { to: "/superadmin", state: { from: location }, replace: true });
        }
        if (path.startsWith("/social")) {
            return _jsx(Navigate, { to: "/social/guest", state: { from: location }, replace: true });
        }
        return _jsx(Navigate, { to: "/auth", state: { from: location }, replace: true });
    }
    const email = user.email?.toLowerCase() ?? "";
    // Shared experimental module: accessible to any authenticated user
    // (all tenants and app users can test it)
    const isModuloAlternativoRoute = path.includes("/modulo-alternativo");
    if (isModuloAlternativoRoute) {
        return _jsx(_Fragment, { children: children });
    }
    // ── SUPER ADMIN GLOBAL: superadminglobal@zoli.live + superadmin ──
    if (path.startsWith("/superglobal")) {
        if (!isAdmin || !SUPER_GLOBAL_EMAILS.includes(email)) {
            toast.error("Accesso non autorizzato: area Super Admin Global");
            return _jsx(Navigate, { to: "/superadmin", state: { from: location }, replace: true });
        }
    }
    // ── SUPER ADMIN: only superadmin@zoli.live ──
    if (path.startsWith("/super") && !path.startsWith("/superglobal")) {
        if (!isAdmin || !SUPER_ADMIN_EMAILS.includes(email)) {
            toast.error("Accesso non autorizzato: area Super Admin");
            return _jsx(Navigate, { to: "/superadmin", state: { from: location }, replace: true });
        }
    }
    // ── MN ADMIN: only multyniyol@zoli.live and superadmin ──
    if (path.startsWith("/mn/admin")) {
        if (!isAdmin || !MN_ADMIN_EMAILS.includes(email)) {
            toast.error("Accesso non autorizzato: area Admin Multy Niyol");
            return _jsx(Navigate, { to: "/adminmn", state: { from: location }, replace: true });
        }
    }
    // ── GLOBAL ADMIN: only authorized admin emails ──
    if (path.startsWith("/admin") && !path.startsWith("/adminmn")) {
        if (!isAdmin || !GLOBAL_ADMIN_EMAILS.includes(email)) {
            toast.error("Accesso non autorizzato: area Admin");
            return _jsx(Navigate, { to: "/auth", state: { from: location }, replace: true });
        }
    }
    // Social-only users can ONLY access /social and /social/ai routes
    if (profile?.is_social_only) {
        if (!path.startsWith("/social")) {
            return _jsx(Navigate, { to: "/social", replace: true });
        }
    }
    return _jsx(_Fragment, { children: children });
}
