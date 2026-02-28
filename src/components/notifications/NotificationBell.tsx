import { useState } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationPanel } from "./NotificationPanel";

interface NotificationBellProps {
  className?: string;
  iconClassName?: string;
}

export function NotificationBell({ className, iconClassName }: NotificationBellProps) {
  const { unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className={className || "relative p-2 rounded-lg bg-secondary/50 border border-border hover:bg-secondary transition-colors"}
        title="Notifiche"
      >
        <Bell className={iconClassName || "h-5 w-5 text-white/80"} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full ring-2 ring-card">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      <NotificationPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
