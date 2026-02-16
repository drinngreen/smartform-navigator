import { ReactNode, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { MNAdminTopNav } from "./MNAdminTopNav";

interface MNAdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const routeColors: Record<string, string> = {
  "/mn/admin": "251, 191, 36",
  "/mn/admin/registro": "249, 115, 22",
  "/mn/admin/rentri": "236, 72, 153",
  "/mn/admin/trasportatori": "6, 182, 212",
  "/mn/admin/personale": "16, 185, 129",
  "/mn/admin/messaggi": "244, 114, 182",
  "/mn/admin/chiamate": "34, 197, 94",
  "/mn/admin/magazzino": "20, 184, 166",
  "/mn/admin/conferimenti": "249, 115, 22",
  "/mn/admin/impianti": "59, 130, 246",
  "/mn/admin/pagamenti": "239, 68, 68",
  "/mn/admin/registro-kg": "16, 185, 129",
  "/mn/admin/fir-digitali": "236, 72, 153",
  "/mn/admin/formulari": "34, 197, 94",
};

export function MNAdminLayout({ children, title, subtitle }: MNAdminLayoutProps) {
  const location = useLocation();
  const isDashboard = location.pathname === "/mn/admin";

  const accentColor = useMemo(() => {
    if (routeColors[location.pathname]) return routeColors[location.pathname];
    const match = Object.keys(routeColors)
      .filter(r => r !== "/mn/admin")
      .find(r => location.pathname.startsWith(r));
    return match ? routeColors[match] : routeColors["/mn/admin"];
  }, [location.pathname]);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden relative">
      {!isDashboard && (
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-700"
          style={{
            background: `radial-gradient(ellipse at 50% 30%, rgba(${accentColor}, 0.18) 0%, rgba(${accentColor}, 0.08) 30%, transparent 70%)`,
          }}
        />
      )}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{
        backgroundImage: `linear-gradient(rgba(192,173,103,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(192,173,103,0.08) 1px, transparent 1px)`,
        backgroundSize: '25px 25px',
      }} />
      <div className="relative z-20"><MNAdminTopNav /></div>
      <div className="relative z-10 px-6 py-4">
        <h1 className="text-2xl font-display text-foreground tracking-wide">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground font-mono mt-1">{subtitle}</p>}
      </div>
      <main className="flex-1 overflow-y-auto p-6 relative z-10">{children}</main>
    </div>
  );
}
