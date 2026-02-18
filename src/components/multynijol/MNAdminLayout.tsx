import { ReactNode, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { MNAdminTopNav } from "./MNAdminTopNav";
import { MNAdminHeader } from "./MNAdminHeader";

interface MNAdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const routeColors: Record<string, string> = {
  "/mn/admin": "251, 191, 36",
  "/mn/admin/multyproget": "249, 115, 22",
  "/mn/admin/niyol": "6, 182, 212",
  "/mn/admin/multyproget/registro": "249, 115, 22",
  "/mn/admin/niyol/registro": "249, 115, 22",
  "/mn/admin/multyproget/rentri": "236, 72, 153",
  "/mn/admin/niyol/rentri": "236, 72, 153",
  "/mn/admin/multyproget/trasportatori": "6, 182, 212",
  "/mn/admin/niyol/trasportatori": "6, 182, 212",
  "/mn/admin/multyproget/personale": "16, 185, 129",
  "/mn/admin/niyol/personale": "16, 185, 129",
  "/mn/admin/multyproget/messaggi": "244, 114, 182",
  "/mn/admin/niyol/messaggi": "244, 114, 182",
  "/mn/admin/multyproget/chiamate": "34, 197, 94",
  "/mn/admin/niyol/chiamate": "34, 197, 94",
  "/mn/admin/multyproget/magazzino": "20, 184, 166",
  "/mn/admin/niyol/magazzino": "20, 184, 166",
  "/mn/admin/multyproget/impianto/privati": "20, 184, 166",
  "/mn/admin/niyol/impianto/privati": "20, 184, 166",
  "/mn/admin/multyproget/impianto/produttore": "249, 115, 22",
  "/mn/admin/niyol/impianto/produttore": "249, 115, 22",
  "/mn/admin/multyproget/impianto/destinatario": "59, 130, 246",
  "/mn/admin/niyol/impianto/destinatario": "59, 130, 246",
  "/mn/admin/multyproget/conferimenti": "249, 115, 22",
  "/mn/admin/niyol/conferimenti": "249, 115, 22",
  "/mn/admin/multyproget/impianti": "59, 130, 246",
  "/mn/admin/niyol/impianti": "59, 130, 246",
  "/mn/admin/multyproget/pagamenti": "239, 68, 68",
  "/mn/admin/niyol/pagamenti": "239, 68, 68",
  "/mn/admin/multyproget/formulari": "34, 197, 94",
  "/mn/admin/niyol/formulari": "34, 197, 94",
};

export function MNAdminLayout({ children, title, subtitle }: MNAdminLayoutProps) {
  const location = useLocation();
  const isDashboard = location.pathname === "/mn/admin";

  const accentColor = useMemo(() => {
    if (routeColors[location.pathname]) return routeColors[location.pathname];
    if (location.pathname.includes("/mn/admin/niyol")) return "6, 182, 212";
    if (location.pathname.includes("/mn/admin/multyproget")) return "249, 115, 22";
    return routeColors["/mn/admin"];
  }, [location.pathname]);

  return (
    <div data-admin-layout className="flex flex-col h-screen bg-background overflow-hidden relative">
      {/* Background dinamico - identical to Global */}
      {!isDashboard && (
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-700 ease-in-out"
          style={{
            background: `
              radial-gradient(ellipse at 50% 30%, rgba(${accentColor}, 0.22) 0%, rgba(${accentColor}, 0.12) 25%, rgba(${accentColor}, 0.04) 55%, transparent 80%),
              radial-gradient(ellipse at 85% 15%, rgba(${accentColor}, 0.17) 0%, rgba(${accentColor}, 0.07) 25%, transparent 55%),
              radial-gradient(ellipse at 15% 75%, rgba(${accentColor}, 0.05) 0%, transparent 50%),
              radial-gradient(ellipse at 70% 70%, rgba(${accentColor}, 0.10) 0%, transparent 45%)
            `,
          }}
        />
      )}

      {/* Grid overlay a quadretti - MOLTO VISIBILE - identical to Global */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(192, 173, 103, 0.18) 1px, transparent 1px),
            linear-gradient(90deg, rgba(192, 173, 103, 0.18) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
        }}
      />

      {/* Top Navigation */}
      <div className="relative z-20">
        <MNAdminTopNav />
      </div>

      {/* Header with Phone/AI/Messages - identical to Global */}
      <div className="relative z-10">
        <MNAdminHeader title={title} subtitle={subtitle} />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6 relative z-10">
        {children}
      </main>
    </div>
  );
}
