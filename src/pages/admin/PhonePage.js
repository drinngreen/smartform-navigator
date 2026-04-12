import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { PhoneInterface } from "@/components/calls/PhoneInterface";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
const GLOBAL_RECO_TENANT_ID = "167d07ad-9184-484e-85a6-da5ceafa42a3";
export default function PhonePage() {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const isGlobalReco = profile?.tenant_id === GLOBAL_RECO_TENANT_ID || !profile?.tenant_id;
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
        // Retell segreteria only for Global Reco when OFF
        if (!receiveCalls && isGlobalReco) {
            supabase.functions.invoke("retell-call", {
                body: { agent_id: "agent_cca6faed328e36e63f9ee3c9c3", metadata: { mode: "segreteria" } },
            }).catch((err) => console.error("Retell segreteria error:", err));
        }
    }, [receiveCalls, user, isGlobalReco]);
    return (_jsxs("div", { className: "min-h-screen bg-background text-foreground", children: [_jsx(AdminHeader, { title: "Telefono", subtitle: "Gestione chiamate e segreteria" }), _jsxs("div", { className: "px-6 py-6", children: [_jsxs("button", { onClick: () => navigate("/admin"), className: "mb-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border hover:bg-secondary hover:border-white/30 transition-all text-sm text-white/80", children: [_jsx(Home, { className: "h-4 w-4" }), "Dashboard"] }), _jsx(PhoneInterface, { receiveCalls: receiveCalls, onToggleReceiveCalls: () => setReceiveCalls((p) => !p), isGlobalReco: isGlobalReco })] })] }));
}
