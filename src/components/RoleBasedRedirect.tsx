import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

export function RoleBasedRedirect() {
  const { user, isAdmin, isLoading, profile } = useAuth() as any;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary animate-pulse text-lg tracking-wider font-display">ZOLI DRAGON</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  // Check if profile is complete
  if (!profile?.nome || !profile?.cognome) {
    return <Navigate to="/profile/setup" replace />;
  }

  if (isAdmin) return <Navigate to="/admin" replace />;

  return <Navigate to="/app" replace />;
}
