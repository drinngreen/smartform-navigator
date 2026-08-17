import { useState } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationPanel } from "./NotificationPanel";

interface NotificationBellProps {
  className?: string;
  iconClassName?: string;
  /** Filter notifications by app context */
  appContext?: string;
  /** Filter notifications by tenant_id */
  tenantId?: string;
  /** Numero di formulari da firmare (badge arancione) */
  signCount?: number;
  /** Click sul badge arancione */
  onSignBadgeClick?: () => void;
}

export function NotificationBell({ className, iconClassName, appContext, tenantId, signCount = 0, onSignBadgeClick }: NotificationBellProps) {
  const { unreadCount } = useNotifications({ appContext, tenantId });
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className={className || "relative p-2 rounded-lg bg-secondary/50 border border-border hover:bg-secondary transition-colors"}
        title={signCount > 0 ? `${signCount} formulari da firmare` : "Notifiche"}
      >
        <Bell className={iconClassName || "h-5 w-5 text-white/80"} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full ring-2 ring-card">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
        {signCount > 0 && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onSignBadgeClick?.(); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onSignBadgeClick?.(); } }}
            title={`${signCount} formulari da firmare`}
            className="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold bg-orange-500 text-white rounded-full ring-2 ring-card animate-pulse cursor-pointer"
          >
            {signCount > 99 ? "99+" : signCount}
          </span>
        )}
      </button>
      <NotificationPanel open={open} onClose={() => setOpen(false)} appContext={appContext} tenantId={tenantId} />
    </>
  );
}

