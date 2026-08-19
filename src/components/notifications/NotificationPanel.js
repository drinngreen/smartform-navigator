import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { X, Bell, BellOff, Check, CheckCheck, Trash2, FileText, MessageCircle, PhoneMissed, Users } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
const typeIcon = {
    fir_draft: _jsx(FileText, { className: "h-4 w-4 text-amber-400" }),
    fir_incomplete: _jsx(FileText, { className: "h-4 w-4 text-orange-400" }),
    social_message: _jsx(MessageCircle, { className: "h-4 w-4 text-blue-400" }),
    social_group_message: _jsx(Users, { className: "h-4 w-4 text-violet-400" }),
    missed_call: _jsx(PhoneMissed, { className: "h-4 w-4 text-red-400" }),
    message_incoming: _jsx(MessageCircle, { className: "h-4 w-4 text-cyan-400" }),
};
const typeColor = {
    fir_draft: "border-l-amber-500",
    fir_incomplete: "border-l-orange-500",
    social_message: "border-l-blue-500",
    social_group_message: "border-l-violet-500",
    missed_call: "border-l-red-500",
    message_incoming: "border-l-cyan-500",
};
function NotificationItem({ notification, onRead, onDelete, }) {
    const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: it });
    return (_jsxs("div", { className: `relative flex items-start gap-3 p-3 rounded-lg border-l-4 transition-all ${typeColor[notification.type] || "border-l-muted"} ${notification.is_read ? "bg-secondary/20 opacity-60" : "bg-secondary/50"}`, children: [_jsx("div", { className: "mt-0.5 shrink-0", children: typeIcon[notification.type] || _jsx(Bell, { className: "h-4 w-4 text-muted-foreground" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: `text-sm font-medium ${notification.is_read ? "text-muted-foreground" : "text-foreground"}`, children: notification.title }), notification.body && (_jsx("p", { className: "text-xs text-muted-foreground mt-0.5 line-clamp-2", children: notification.body })), _jsx("p", { className: "text-[10px] text-muted-foreground/60 mt-1", children: timeAgo })] }), _jsxs("div", { className: "flex items-center gap-1 shrink-0", children: [!notification.is_read && (_jsx("button", { onClick: () => onRead(notification.id), className: "p-1 rounded hover:bg-secondary transition-colors", title: "Segna come letto", children: _jsx(Check, { className: "h-3.5 w-3.5 text-green-400" }) })), _jsx("button", { onClick: () => onDelete(notification.id), className: "p-1 rounded hover:bg-destructive/20 transition-colors", title: "Elimina", children: _jsx(Trash2, { className: "h-3.5 w-3.5 text-muted-foreground hover:text-destructive" }) })] })] }));
}
export function NotificationPanel({ open, onClose, appContext, tenantId }) {
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications({ appContext, tenantId });
    if (!open)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-[100000]", onClick: onClose, children: _jsxs("div", { className: "absolute right-2 top-14 w-[360px] max-h-[70vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-top-2 duration-200", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-b border-border/50 bg-gradient-to-r from-card to-secondary/30", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Bell, { className: "h-4 w-4 text-primary" }), _jsx("span", { className: "text-sm font-bold text-foreground", children: "Notifiche" }), unreadCount > 0 && (_jsx("span", { className: "px-1.5 py-0.5 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full", children: unreadCount }))] }), _jsxs("div", { className: "flex items-center gap-1", children: [unreadCount > 0 && (_jsx("button", { onClick: markAllAsRead, className: "p-1.5 rounded-lg hover:bg-secondary transition-colors", title: "Segna tutto come letto", children: _jsx(CheckCheck, { className: "h-4 w-4 text-muted-foreground" }) })), _jsx("button", { onClick: onClose, className: "p-1.5 rounded-lg hover:bg-secondary transition-colors", children: _jsx(X, { className: "h-4 w-4 text-muted-foreground" }) })] })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-2 space-y-1.5", children: loading ? (_jsx("div", { className: "flex items-center justify-center py-8", children: _jsx("div", { className: "w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" }) })) : notifications.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-10 text-muted-foreground", children: [_jsx(BellOff, { className: "h-10 w-10 mb-2 opacity-30" }), _jsx("p", { className: "text-sm", children: "Nessuna notifica" })] })) : (notifications.map((n) => (_jsx(NotificationItem, { notification: n, onRead: markAsRead, onDelete: deleteNotification }, n.id)))) })] }) }));
}
