import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";

export function GlobalNotificationBell() {
  const { user } = useAuth();
  const location = useLocation();

  // Hide on admin pages (bell already in header) and auth pages
  const isAdminRoute = location.pathname.startsWith("/admin") || location.pathname.startsWith("/mn/admin") || location.pathname.startsWith("/super");
  const isAuthRoute = location.pathname.startsWith("/auth") || location.pathname === "/mn" || location.pathname === "/ni" || location.pathname.startsWith("/adminmn") || location.pathname.startsWith("/superadmin") || location.pathname.startsWith("/social/guest");
  const isSocialRoute = location.pathname === "/social";

  if (!user || isAdminRoute || isAuthRoute || isSocialRoute) return null;

  return (
    <div className="fixed top-4 right-4 z-[9990]">
      <NotificationBell
        className="relative p-2.5 rounded-full bg-card/90 backdrop-blur-sm border border-border shadow-lg hover:bg-card transition-colors"
        iconClassName="h-5 w-5 text-foreground"
      />
    </div>
  );
}
