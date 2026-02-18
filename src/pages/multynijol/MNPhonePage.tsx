import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { MNAdminHeader } from "@/components/multynijol/MNAdminHeader";
import { PhoneInterface } from "@/components/calls/PhoneInterface";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";

export default function MNPhonePage() {
  const { context } = useParams();
  const { user } = useAuth();

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
  }, [receiveCalls, user]);

  const label = context === "niyol" ? "Niyol" : "Multyproget";
  const mnContext = context === "niyol" ? "niyol" : "multyproget";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MNAdminHeader title={`Telefono — ${label}`} subtitle="Gestione chiamate" />
      <div className="px-6 py-6">
        <PhoneInterface
          receiveCalls={receiveCalls}
          onToggleReceiveCalls={() => setReceiveCalls((p) => !p)}
          isGlobalReco={false}
          mnContext={mnContext}
        />
      </div>
    </div>
  );
}
