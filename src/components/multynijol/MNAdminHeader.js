import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState, useEffect } from "react";
import { Phone, MessageSquare } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import zoliLemonIcon from "@/assets/zoli-dark-lemon-icon.png";
import { useZoliDarkLemonWidgetStore } from "@/stores/zoliDarkLemonWidgetStore";
export function MNAdminHeader({ title, subtitle }) {
    const { profile, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isWidgetOpen = useZoliDarkLemonWidgetStore((s) => s.isOpen);
    const toggleWidget = useZoliDarkLemonWidgetStore((s) => s.toggle);
    const [receiveCalls, setReceiveCalls] = useState(() => {
        const saved = localStorage.getItem("admin_receive_calls");
        return saved !== "false";
    });
    // Detect current context for message routing
    const currentContext = (location.pathname.includes("/mn/admin/niyol")) ? "niyol"
        : (location.pathname.includes("/mn/admin/multyproget") || location.pathname.includes("/mn/admin/dev-multyproget")) ? "multyproget"
            : null;
    const messagesPath = currentContext ? `/mn/admin/${currentContext}/messaggi` : "/mn/admin";
    // Sync receive_calls to online_status table
    useEffect(() => {
        if (!user)
            return;
        localStorage.setItem("admin_receive_calls", String(receiveCalls));
        supabase.from("online_status").upsert({
            user_id: user.id,
            receive_calls: receiveCalls,
            status: "online",
            updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" }).then(({ error }) => {
            if (error)
                console.error("Error updating receive_calls:", error);
        });
    }, [receiveCalls, user]);
    const toggleReceiveCalls = () => setReceiveCalls((prev) => !prev);
    const widgetButtonClassName = useMemo(() => {
        return `p-2 rounded-lg border transition-all duration-300 ${isWidgetOpen
            ? "bg-blue-500/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            : "bg-secondary/50 border-border hover:bg-secondary hover:border-blue-500/30"}`;
    }, [isWidgetOpen]);
    return (_jsxs("div", { className: "px-6 py-4 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-display text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)] tracking-wide", children: title }), subtitle && (_jsx("p", { className: "text-sm text-white/90 font-mono mt-1 drop-shadow-[0_0_6px_rgba(255,255,255,0.3)]", children: subtitle }))] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => navigate(currentContext ? `/mn/admin/${currentContext}/telefono` : "/mn/admin"), className: "p-2 rounded-lg bg-secondary/50 border border-border hover:bg-secondary hover:border-white/30 transition-all duration-300", title: "Apri interfaccia telefono", children: _jsx(Phone, { className: "h-5 w-5 text-white/80" }) }), _jsx("button", { onClick: toggleReceiveCalls, className: `relative inline-flex h-6 w-10 items-center rounded-full border transition-all duration-300 ${receiveCalls
                            ? "bg-green-500/30 border-green-500/50"
                            : "bg-red-500/30 border-red-500/50"}`, title: receiveCalls ? "Ricezione ON — clicca per OFF" : "Ricezione OFF — clicca per ON", children: _jsx("span", { className: `inline-block h-4 w-4 transform rounded-full shadow-lg transition-transform ${receiveCalls ? "translate-x-5 bg-green-400" : "translate-x-0.5 bg-red-400"}` }) }), _jsx("button", { onClick: toggleWidget, className: widgetButtonClassName, title: "Zoli Dark Lemon AI", children: _jsx("img", { src: zoliLemonIcon, alt: "AI", className: "h-5 w-5" }) }), _jsx("button", { onClick: () => navigate(messagesPath), className: "p-2 rounded-lg bg-secondary/50 border border-border hover:bg-secondary transition-colors", title: "Messaggi", children: _jsx(MessageSquare, { className: "h-5 w-5 text-white/80" }) }), _jsx(NotificationBell, { appContext: currentContext === "niyol" ? "mn_niyol" : currentContext === "multyproget" ? "mn_multyproget" : "mn_admin" })] })] }));
}
