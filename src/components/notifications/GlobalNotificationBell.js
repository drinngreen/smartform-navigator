import { jsx as _jsx } from "react/jsx-runtime";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";
export function GlobalNotificationBell() {
    const { user } = useAuth();
    const location = useLocation();
    // Hide on admin pages (bell already in header) and auth pages
    const isAdminRoute = location.pathname.startsWith("/admin") || location.pathname.startsWith("/mn/admin") || location.pathname.startsWith("/super");
    const isAuthRoute = location.pathname.startsWith("/auth") || location.pathname === "/mn" || location.pathname === "/ni" || location.pathname.startsWith("/adminmn") || location.pathname.startsWith("/superadmin") || location.pathname.startsWith("/social/guest") || location.pathname.startsWith("/appuntamento-personale");
    const isSocialRoute = location.pathname === "/social";
    const isImpiantoRoute = location.pathname.startsWith("/area-impianto");
    if (!user || isAdminRoute || isAuthRoute || isSocialRoute || isImpiantoRoute)
        return null;
    // Determine app context based on route
    const appContext = location.pathname.startsWith("/mn/app/niyol") ? "transporter_niyol"
        : location.pathname.startsWith("/mn/app/multyproget") ? "transporter_multyproget"
            : location.pathname.startsWith("/app") ? "transporter"
                : "general";
    return (_jsx("div", { className: "fixed top-4 right-4 z-[9990]", children: _jsx(NotificationBell, { className: "relative p-2.5 rounded-full bg-card/90 backdrop-blur-sm border border-border shadow-lg hover:bg-card transition-colors", iconClassName: "h-5 w-5 text-foreground", appContext: appContext }) }));
}
