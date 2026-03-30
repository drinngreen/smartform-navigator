import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { AdminTopNav } from "./AdminTopNav";
import { AdminHeader } from "./AdminHeader";
const routeColors = {
    "/admin": "251, 191, 36",
    "/admin/gps": "6, 182, 212",
    "/admin/personale": "16, 185, 129",
    "/admin/registro": "249, 115, 22",
    "/admin/registro-fir": "249, 115, 22",
    "/admin/rentri": "236, 72, 153",
    "/admin/fatturazione": "20, 184, 166",
    "/admin/chiamate": "34, 197, 94",
    "/admin/messaggi": "244, 114, 182",
    "/admin/zoli-dark-lemon": "59, 130, 246",
    "/admin/analytics": "249, 115, 22",
    "/admin/app-mobile": "251, 191, 36",
    "/admin/notifiche": "239, 68, 68",
    "/admin/formulari": "34, 197, 94",
    "/admin/gestione-fir": "59, 130, 246",
    "/admin/intermediazione": "168, 85, 247",
    "/admin/system-prompt": "251, 191, 36",
};
export function AdminLayout({ children, title, subtitle }) {
    const location = useLocation();
    const isDashboard = location.pathname === "/admin";
    const accentColor = useMemo(() => {
        if (routeColors[location.pathname]) {
            return routeColors[location.pathname];
        }
        const matchingRoute = Object.keys(routeColors)
            .filter(route => route !== "/admin")
            .find(route => location.pathname.startsWith(route));
        return matchingRoute ? routeColors[matchingRoute] : routeColors["/admin"];
    }, [location.pathname]);
    return (_jsxs("div", { "data-admin-layout": true, className: "flex flex-col h-screen bg-background overflow-hidden relative", children: [!isDashboard && (_jsx("div", { className: "absolute inset-0 pointer-events-none transition-all duration-700 ease-in-out", style: {
                    background: `
              radial-gradient(ellipse at 50% 30%, rgba(${accentColor}, 0.22) 0%, rgba(${accentColor}, 0.12) 25%, rgba(${accentColor}, 0.04) 55%, transparent 80%),
              radial-gradient(ellipse at 85% 15%, rgba(${accentColor}, 0.17) 0%, rgba(${accentColor}, 0.07) 25%, transparent 55%),
              radial-gradient(ellipse at 15% 75%, rgba(${accentColor}, 0.05) 0%, transparent 50%),
              radial-gradient(ellipse at 70% 70%, rgba(${accentColor}, 0.10) 0%, transparent 45%)
            `,
                } })), _jsx("div", { className: "absolute inset-0 pointer-events-none z-[1]", style: {
                    backgroundImage: `
            linear-gradient(rgba(192, 173, 103, 0.18) 1px, transparent 1px),
            linear-gradient(90deg, rgba(192, 173, 103, 0.18) 1px, transparent 1px)
          `,
                    backgroundSize: '30px 30px',
                } }), _jsx("div", { className: "relative z-20", children: _jsx(AdminTopNav, {}) }), _jsx("div", { className: "relative z-10", children: _jsx(AdminHeader, { title: title, subtitle: subtitle }) }), _jsx("main", { className: "flex-1 overflow-y-auto p-6 relative z-10", children: children })] }));
}
