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

  // Admin bypass — admin users skip profile setup
  if (isAdmin) {
    const email = user.email?.toLowerCase() ?? "";
    if (email === "superadmin@zoli.live") {
      return <Navigate to="/super" replace />;
    }
    if (email === "multyniyol@zoli.live") {
      return <Navigate to="/mn/admin" replace />;
    }
    return <Navigate to="/admin" replace />;
  }

  // Regular users must complete profile
  if (!profile?.nome || !profile?.cognome) {
    return <Navigate to="/profile/setup" replace />;
  }

  // MultyNiyol transporter users go to their specific app
  if (profile?.mn_context === "multyproget") {
    return <Navigate to="/mn/app/multyproget" replace />;
  }
  if (profile?.mn_context === "niyol") {
    return <Navigate to="/mn/app/niyol" replace />;
  }

  return <Navigate to="/app" replace />;
}
