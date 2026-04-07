import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
const CallContext = createContext({
    isCallActive: false,
    callStatus: "idle",
    startRetellCall: async () => { },
    endCall: () => { },
});
export function CallProvider({ children }) {
    const [callStatus, setCallStatus] = useState("idle");
    const [retellClient, setRetellClient] = useState(null);
    const startRetellCall = useCallback(async (agentId) => {
        try {
            setCallStatus("connecting");
            // Get access token from edge function
            const { data, error } = await supabase.functions.invoke("retell-call", {
                body: { agent_id: agentId || "agent_cca6faed328e36e63f9ee3c9c3" },
            });
            if (error)
                throw error;
            if (data?.error)
                throw new Error(data.error);
            const accessToken = data.access_token;
            if (!accessToken)
                throw new Error("No access token received");
            // Dynamic import of RetellWebClient
            const { RetellWebClient } = await import("retell-client-js-sdk");
            const client = new RetellWebClient();
            client.on("call_started", () => {
                setCallStatus("connected");
                toast.success("Chiamata connessa");
            });
            client.on("call_ended", () => {
                setCallStatus("idle");
                setRetellClient(null);
                toast.info("Chiamata terminata");
            });
            client.on("error", (error) => {
                console.error("Retell error:", error);
                setCallStatus("idle");
                setRetellClient(null);
                toast.error("Errore chiamata");
            });
            await client.startCall({ accessToken });
            setRetellClient(client);
        }
        catch (err) {
            console.error("Start call error:", err);
            setCallStatus("idle");
            toast.error("Impossibile avviare la chiamata: " + err.message);
        }
    }, []);
    const endCall = useCallback(() => {
        if (retellClient) {
            try {
                retellClient.stopCall();
            }
            catch { }
            setRetellClient(null);
        }
        setCallStatus("idle");
    }, [retellClient]);
    return (_jsx(CallContext.Provider, { value: {
            isCallActive: callStatus === "connecting" || callStatus === "connected",
            callStatus,
            startRetellCall,
            endCall,
        }, children: children }));
}
export function useCall() {
    return useContext(CallContext);
}
