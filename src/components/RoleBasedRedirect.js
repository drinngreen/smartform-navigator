import { jsx as _jsx } from "react/jsx-runtime";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
export function RoleBasedRedirect() {
    const { user, isAdmin, isLoading, profile } = useAuth();
    if (isLoading) {
        return (_jsx("div", { className: "min-h-screen bg-background flex items-center justify-center", children: _jsx("div", { className: "text-primary animate-pulse text-lg tracking-wider font-display", children: "ZOLI DRAGON" }) }));
    }
    if (!user)
        return _jsx(Navigate, { to: "/auth", replace: true });
    // Admin bypass — admin users skip profile setup
    if (isAdmin) {
        const email = user.email?.toLowerCase() ?? "";
        if (email === "superadmin@zoli.live") {
            return _jsx(Navigate, { to: "/super", replace: true });
        }
        if (email === "multyniyol@zoli.live") {
            return _jsx(Navigate, { to: "/mn/admin", replace: true });
        }
        return _jsx(Navigate, { to: "/admin", replace: true });
    }
    // Social-only guests go directly to social
    if (profile?.is_social_only) {
        return _jsx(Navigate, { to: "/social", replace: true });
    }
    // Regular users must complete profile
    if (!profile?.nome || !profile?.cognome) {
        return _jsx(Navigate, { to: "/profile/setup", replace: true });
    }
    // MultyNiyol transporter users go to their specific app
    if (profile?.mn_context === "multyproget") {
        return _jsx(Navigate, { to: "/mn/app/multyproget", replace: true });
    }
    if (profile?.mn_context === "niyol") {
        return _jsx(Navigate, { to: "/mn/app/niyol", replace: true });
    }
    return _jsx(Navigate, { to: "/app", replace: true });
}
