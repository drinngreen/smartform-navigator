import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import { MNAdminHeader } from "@/components/multynijol/MNAdminHeader";
import { PhoneInterface } from "@/components/calls/PhoneInterface";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
export default function MNPhonePage() {
    const { context } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [receiveCalls, setReceiveCalls] = useState(() => {
        const saved = localStorage.getItem("admin_receive_calls");
        return saved !== "false";
    });
    useEffect(() => {
        if (!user)
            return;
        localStorage.setItem("admin_receive_calls", String(receiveCalls));
        supabase.from("online_status").upsert({
            user_id: user.id,
            receive_calls: receiveCalls,
            status: "online",
            updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
    }, [receiveCalls, user]);
    const label = context === "niyol" ? "Niyol" : "Multyproget";
    const mnContext = context === "niyol" ? "niyol" : "multyproget";
    return (_jsxs("div", { className: "min-h-screen bg-background text-foreground", children: [_jsx(MNAdminHeader, { title: `Telefono — ${label}`, subtitle: "Gestione chiamate" }), _jsxs("div", { className: "px-6 py-6", children: [_jsxs("button", { onClick: () => navigate(context ? `/mn/admin/${context}` : "/mn/admin"), className: "mb-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border hover:bg-secondary hover:border-white/30 transition-all text-sm text-white/80", children: [_jsx(Home, { className: "h-4 w-4" }), "Dashboard"] }), _jsx(PhoneInterface, { receiveCalls: receiveCalls, onToggleReceiveCalls: () => setReceiveCalls((p) => !p), isGlobalReco: false, mnContext: mnContext })] })] }));
}
