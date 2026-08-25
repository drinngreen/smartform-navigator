import { useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationPanel } from "./NotificationPanel";

interface NotificationBellProps {
  className?: string;
  iconClassName?: string;
  /** Filter notifications by app context */
  appContext?: string;
  /** Filter notifications by tenant_id */
  tenantId?: string;
  /** Numero di formulari da firmare (luce arancione) */
  signCount?: number;
  /** Click sulla luce arancione */
  onSignBadgeClick?: () => void;
}

export function NotificationBell({ className, appContext, tenantId, signCount = 0, onSignBadgeClick }: NotificationBellProps) {
  const { unreadCount } = useNotifications({ appContext, tenantId });
  const [open, setOpen] = useState(false);

  const hasRed = unreadCount > 0;
  const hasOrange = signCount > 0;
  const allClear = !hasRed && !hasOrange;

  const dot = (active: boolean, color: string, glow: string) => ({
    backgroundColor: active ? color : "hsl(var(--muted))",
    boxShadow: active ? `0 0 10px ${glow}, 0 0 20px ${glow}` : "none",
    opacity: active ? 1 : 0.25,
  });

  return (
    <>
      <div
        className={
          className ||
          "flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-secondary/50 border border-border"
        }
        title={
          allClear
            ? "Nessun alert"
            : `${unreadCount} notifiche · ${signCount} formulari da firmare`
        }
      >
        {/* Luce rossa: notifiche non lette */}
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1"
          title={`${unreadCount} notifiche non lette`}
        >
          <span
            className={`w-3 h-3 rounded-full transition-all duration-300 ${hasRed ? "animate-pulse" : ""}`}
            style={dot(hasRed, "hsl(0, 84%, 60%)", "rgba(239,68,68,0.6)")}
          />
          {hasRed && (
            <span className="text-[11px] font-bold font-mono text-red-400">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* Luce arancione: formulari da firmare */}
        <button
          onClick={() => (hasOrange ? onSignBadgeClick?.() : setOpen(!open))}
          className="flex items-center gap-1"
          title={`${signCount} formulari da firmare`}
        >
          <span
            className={`w-3 h-3 rounded-full transition-all duration-300 ${hasOrange ? "animate-pulse" : ""}`}
            style={dot(hasOrange, "hsl(25, 95%, 53%)", "rgba(249,115,22,0.6)")}
          />
          {hasOrange && (
            <span className="text-[11px] font-bold font-mono text-orange-400">
              {signCount > 99 ? "99+" : signCount}
            </span>
          )}
        </button>

        {/* Luce verde: tutto ok */}
        <button onClick={() => setOpen(!open)} title="Nessun alert">
          <span
            className="w-3 h-3 rounded-full transition-all duration-300 block"
            style={dot(allClear, "hsl(142, 71%, 45%)", "rgba(34,197,94,0.6)")}
          />
        </button>
      </div>
      <NotificationPanel open={open} onClose={() => setOpen(false)} appContext={appContext} tenantId={tenantId} />
    </>
  );
}
