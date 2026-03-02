import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth() as any;
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary animate-pulse text-lg tracking-wider font-display">ZOLI DRAGON</div>
      </div>
    );
  }

  if (!user) {
    // Context-aware redirect: MN admin routes go to MN admin auth
    const path = location.pathname;
    if (path.startsWith("/mn/admin")) {
      return <Navigate to="/adminmn" state={{ from: location }} replace />;
    }
    if (path.startsWith("/mn/app/multyproget") || path === "/mn") {
      return <Navigate to="/mn" state={{ from: location }} replace />;
    }
    if (path.startsWith("/mn/app/niyol") || path === "/ni") {
      return <Navigate to="/ni" state={{ from: location }} replace />;
    }
    if (path.startsWith("/super")) {
      return <Navigate to="/superadmin" state={{ from: location }} replace />;
    }
    if (path.startsWith("/social")) {
      return <Navigate to="/social/guest" state={{ from: location }} replace />;
    }
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
