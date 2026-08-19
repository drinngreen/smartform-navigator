import { useState } from "react";
import { X, Bell, BellOff, Check, CheckCheck, Trash2, FileText, MessageCircle, PhoneMissed, Users } from "lucide-react";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  appContext?: string;
  tenantId?: string;
}

const typeIcon: Record<string, React.ReactNode> = {
  fir_draft: <FileText className="h-4 w-4 text-amber-400" />,
  fir_incomplete: <FileText className="h-4 w-4 text-orange-400" />,
  social_message: <MessageCircle className="h-4 w-4 text-blue-400" />,
  social_group_message: <Users className="h-4 w-4 text-violet-400" />,
  missed_call: <PhoneMissed className="h-4 w-4 text-red-400" />,
  message_incoming: <MessageCircle className="h-4 w-4 text-cyan-400" />,
};

const typeColor: Record<string, string> = {
  fir_draft: "border-l-amber-500",
  fir_incomplete: "border-l-orange-500",
  social_message: "border-l-blue-500",
  social_group_message: "border-l-violet-500",
  missed_call: "border-l-red-500",
  message_incoming: "border-l-cyan-500",
};

function NotificationItem({
  notification,
  onRead,
  onDelete,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: it });

  return (
    <div
      className={`relative flex items-start gap-3 p-3 rounded-lg border-l-4 transition-all ${
        typeColor[notification.type] || "border-l-muted"
      } ${notification.is_read ? "bg-secondary/20 opacity-60" : "bg-secondary/50"}`}
    >
      <div className="mt-0.5 shrink-0">
        {typeIcon[notification.type] || <Bell className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${notification.is_read ? "text-muted-foreground" : "text-foreground"}`}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.body}</p>
        )}
        <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {!notification.is_read && (
          <button
            onClick={() => onRead(notification.id)}
            className="p-1 rounded hover:bg-secondary transition-colors"
            title="Segna come letto"
          >
            <Check className="h-3.5 w-3.5 text-green-400" />
          </button>
        )}
        <button
          onClick={() => onDelete(notification.id)}
          className="p-1 rounded hover:bg-destructive/20 transition-colors"
          title="Elimina"
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
    </div>
  );
}

export function NotificationPanel({ open, onClose, appContext, tenantId }: NotificationPanelProps) {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications({ appContext, tenantId });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100000]" onClick={onClose}>
      <div
        className="absolute right-2 top-14 w-[360px] max-h-[70vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-top-2 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-gradient-to-r from-card to-secondary/30">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Notifiche</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                title="Segna tutto come letto"
              >
                <CheckCheck className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <BellOff className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">Nessuna notifica</p>
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
