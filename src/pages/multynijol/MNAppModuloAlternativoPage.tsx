import { useLocation, Navigate } from "react-router-dom";
import { MNBottomNav } from "@/components/layout/MNBottomNav";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileShell } from "@/components/layout/MobileShell";
import { FIRAlternativeForm } from "@/components/fir/FIRAlternativeForm";
import { useAuth } from "@/hooks/useAuth";

export default function MNAppModuloAlternativoPage() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  const isGlobalReco = location.pathname.startsWith("/app/");
  const basePath = isGlobalReco
    ? "/app"
    : location.pathname.includes("/mn/app/niyol")
      ? "/mn/app/niyol"
      : "/mn/app/multyproget";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary animate-pulse text-lg tracking-wider font-display">CARICAMENTO...</div>
      </div>
    );
  }

  if (!user) {
    if (isGlobalReco) return <Navigate to="/login" replace />;
    return <Navigate to={basePath.includes("niyol") ? "/ni" : "/mn"} replace />;
  }

  return (
    <MobileShell>
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <FIRAlternativeForm forceCartaceo />
      </div>
      {isGlobalReco ? <BottomNav /> : <MNBottomNav basePath={basePath} />}
    </MobileShell>
  );
}
