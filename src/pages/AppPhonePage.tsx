import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { CallOfficeButton } from "@/components/CallOfficeButton";
import { useAuth } from "@/hooks/useAuth";
import { useAdminId } from "@/hooks/useMessages";
import { useCall } from "@/contexts/CallContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export default function AppPhonePage() {
  const { user } = useAuth();
  const adminId = useAdminId();
  const { isCallActive, callStatus, startRetellCall, endCall } = useCall();

  const handleCallOffice = async () => {
    if (!user) return;
    if (!adminId) {
      toast.error("Sede non disponibile al momento");
      return;
    }

    try {
      const roomId = `office-global-${user.id}-${Date.now()}`;
      const { error: callInsertError } = await supabase.from("calls").insert({
        caller_id: user.id,
        callee_ids: [adminId],
        room_id: roomId,
        call_type: "audio",
        status: "ringing",
      });

      if (callInsertError) {
        console.warn("[APP PHONE] Insert calls warning:", callInsertError.message);
      }

      toast.info("Chiamata alla sede Global Reco...");
      await startRetellCall();
    } catch (err: any) {
      console.error("[APP PHONE] Call error:", err);
      toast.error("Errore nella chiamata alla sede");
    }
  };

  return (
    <MobileShell>
      <div className="flex flex-col min-h-screen">
        <div className="px-4 pt-4 pb-3 border-b border-border/40">
          <h1 className="text-xl font-display font-bold text-foreground tracking-wider">TELEFONO SEDE</h1>
          <p className="text-muted-foreground text-xs font-mono mt-1">Chiamata interna con Global Reco</p>
        </div>

        <div className="flex-1 px-4 py-6 pb-24">
          <div className="rounded-2xl border border-border bg-card/40 p-5 flex flex-col gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Sede</p>
              <p className="text-lg font-semibold text-foreground">Global Reco</p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-mono text-muted-foreground">
                {isCallActive
                  ? "Chiamata attiva"
                  : callStatus === "connecting"
                    ? "Connessione in corso..."
                    : "Pronto per chiamare"}
              </p>

              <CallOfficeButton
                onClick={isCallActive ? endCall : handleCallOffice}
                disabled={callStatus === "connecting" || !adminId}
                isActive={isCallActive}
                title={isCallActive ? "Termina chiamata" : "Chiama sede"}
              />
            </div>
          </div>
        </div>

        <BottomNav />
      </div>
    </MobileShell>
  );
}
