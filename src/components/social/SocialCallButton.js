import { jsx as _jsx } from "react/jsx-runtime";
import { useState } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { useCall } from "@/contexts/CallContext";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
export function SocialCallButton({ targetUserId, targetUserName }) {
    const { user } = useAuth();
    const { isCallActive, callStatus, startRetellCall, endCall } = useCall();
    const [calling, setCalling] = useState(false);
    const handleCall = async () => {
        if (!user)
            return;
        setCalling(true);
        try {
            // Create a call record
            const roomId = `social-${user.id}-${targetUserId}-${Date.now()}`;
            await supabase.from("calls").insert({
                caller_id: user.id,
                callee_ids: [targetUserId],
                room_id: roomId,
                call_type: "audio",
                status: "ringing",
            });
            toast.info(`Chiamata a ${targetUserName}...`);
            // For now, start a Retell call as the infrastructure
            await startRetellCall();
        }
        catch (err) {
            console.error("Call error:", err);
            toast.error("Errore nella chiamata");
        }
        finally {
            setCalling(false);
        }
    };
    if (isCallActive) {
        return (_jsx("button", { onClick: endCall, className: "p-2.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive transition-all", title: "Termina chiamata", children: _jsx(PhoneOff, { size: 16 }) }));
    }
    return (_jsx("button", { onClick: handleCall, disabled: calling, className: "p-2.5 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-500 transition-all disabled:opacity-50", title: `Chiama ${targetUserName}`, children: _jsx(Phone, { size: 16 }) }));
}
