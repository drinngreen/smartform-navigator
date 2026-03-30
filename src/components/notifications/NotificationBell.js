import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationPanel } from "./NotificationPanel";
export function NotificationBell({ className, iconClassName, appContext, tenantId }) {
    const { unreadCount } = useNotifications({ appContext, tenantId });
    const [open, setOpen] = useState(false);
    return (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: () => setOpen(!open), className: className || "relative p-2 rounded-lg bg-secondary/50 border border-border hover:bg-secondary transition-colors", title: "Notifiche", children: [_jsx(Bell, { className: iconClassName || "h-5 w-5 text-white/80" }), unreadCount > 0 && (_jsx("span", { className: "absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full ring-2 ring-card", children: unreadCount > 99 ? "99+" : unreadCount }))] }), _jsx(NotificationPanel, { open: open, onClose: () => setOpen(false), appContext: appContext, tenantId: tenantId })] }));
}
