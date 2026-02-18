import { useState, useEffect } from "react";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { PhoneInterface } from "@/components/calls/PhoneInterface";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";

const GLOBAL_RECO_TENANT_ID = "167d07ad-9184-484e-85a6-da5ceafa42a3";

export default function PhonePage() {
  const { user, profile } = useAuth();
  const isGlobalReco = profile?.tenant_id === GLOBAL_RECO_TENANT_ID || !profile?.tenant_id;

  const [receiveCalls, setReceiveCalls] = useState(() => {
    const saved = localStorage.getItem("admin_receive_calls");
    return saved !== "false";
  });

  useEffect(() => {
    if (!user) return;
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminHeader title="Telefono" subtitle="Gestione chiamate e segreteria" />
      <div className="px-6 py-6">
        <PhoneInterface
          receiveCalls={receiveCalls}
          onToggleReceiveCalls={() => setReceiveCalls((p) => !p)}
          isGlobalReco={isGlobalReco}
        />
      </div>
    </div>
  );
}
