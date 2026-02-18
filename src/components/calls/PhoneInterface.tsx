import { useState, useEffect, useCallback } from "react";
import { Phone, PhoneOff, PhoneCall, Delete } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useCall } from "@/contexts/CallContext";
import { format } from "date-fns";

interface PhoneInterfaceProps {
  receiveCalls: boolean;
  onToggleReceiveCalls: () => void;
  isGlobalReco?: boolean;
}

const DIAL_KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["*", "0", "#"],
];

export function PhoneInterface({ receiveCalls, onToggleReceiveCalls, isGlobalReco = false }: PhoneInterfaceProps) {
  const { user } = useAuth();
  const { startRetellCall, endCall, isCallActive, callStatus } = useCall();
  const [dialNumber, setDialNumber] = useState("");
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(true);

  const fetchRecentCalls = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("office_calls")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!error && data) setRecentCalls(data);
    } catch (e) {
      console.error("Error fetching calls:", e);
    } finally {
      setLoadingCalls(false);
    }
  }, [user]);

  useEffect(() => { fetchRecentCalls(); }, [fetchRecentCalls]);

  const handleDial = (key: string) => setDialNumber((prev) => prev + key);
  const handleDelete = () => setDialNumber((prev) => prev.slice(0, -1));

  const handleCall = async () => {
    if (isGlobalReco) {
      await startRetellCall();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-5xl mx-auto">
      {/* Left: Phone Dialer */}
      <div className="flex-1 flex flex-col items-center gap-4">
        {/* Status Banner */}
        <div className={`w-full rounded-xl border p-4 flex items-center justify-between transition-all ${
          receiveCalls
            ? "bg-green-500/10 border-green-500/30"
            : "bg-red-500/10 border-red-500/30"
        }`}>
          <div className="flex items-center gap-3">
            {receiveCalls
              ? <Phone className="h-5 w-5 text-green-400" />
              : <PhoneOff className="h-5 w-5 text-red-400" />
            }
            <div>
              <p className={`text-sm font-semibold ${receiveCalls ? "text-green-400" : "text-red-400"}`}>
                {receiveCalls ? "Ricezione Attiva" : isGlobalReco ? "Segreteria Retell AI Attiva" : "Ricezione Disattivata"}
              </p>
              <p className="text-xs text-white/50">
                {receiveCalls ? "Le chiamate in arrivo verranno ricevute" : isGlobalReco ? "Le chiamate vengono gestite dall'AI" : "Le chiamate in arrivo sono disabilitate"}
              </p>
            </div>
          </div>
          <button
            onClick={onToggleReceiveCalls}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              receiveCalls ? "bg-green-500/40" : "bg-red-500/40"
            }`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
              receiveCalls ? "translate-x-6" : "translate-x-1"
            }`} />
          </button>
        </div>

        {/* Display */}
        <div className="w-full bg-secondary/30 border border-border rounded-xl p-4 text-center min-h-[56px] flex items-center justify-center">
          <span className="text-2xl font-mono text-white tracking-widest">
            {dialNumber || <span className="text-white/30">Componi numero</span>}
          </span>
          {dialNumber && (
            <button onClick={handleDelete} className="ml-3 text-white/50 hover:text-white/80 transition-colors">
              <Delete className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
          {DIAL_KEYS.flat().map((key) => (
            <button
              key={key}
              onClick={() => handleDial(key)}
              className="h-14 w-full rounded-xl bg-secondary/50 border border-border text-white text-xl font-semibold hover:bg-secondary hover:border-white/20 transition-all active:scale-95 shadow-[0_0_8px_rgba(255,255,255,0.05)]"
            >
              {key}
            </button>
          ))}
        </div>

        {/* Call Button */}
        {isGlobalReco && (
          <button
            onClick={isCallActive ? endCall : handleCall}
            disabled={callStatus === "connecting"}
            className={`w-full max-w-[280px] py-3 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all ${
              isCallActive
                ? "bg-red-600/80 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                : callStatus === "connecting"
                  ? "bg-yellow-600/50 text-yellow-200 cursor-wait"
                  : "bg-green-600/80 hover:bg-green-600 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]"
            }`}
          >
            <PhoneCall className="h-5 w-5" />
            {isCallActive ? "Termina" : callStatus === "connecting" ? "Connessione..." : "Chiama"}
          </button>
        )}
      </div>

      {/* Right: Call History */}
      <div className="flex-1 flex flex-col">
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Cronologia Chiamate</h3>
        <div className="flex-1 bg-secondary/20 border border-border rounded-xl overflow-hidden">
          {loadingCalls ? (
            <div className="p-6 text-center text-white/40 text-sm">Caricamento...</div>
          ) : recentCalls.length === 0 ? (
            <div className="p-6 text-center text-white/40 text-sm">Nessuna chiamata recente</div>
          ) : (
            <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
              {recentCalls.map((call) => (
                <div key={call.id} className="px-4 py-3 hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className={`h-4 w-4 ${call.direction === "inbound" ? "text-blue-400" : "text-green-400"}`} />
                      <span className="text-sm text-white/80">{call.from_number || call.to_number || "Sconosciuto"}</span>
                    </div>
                    <span className="text-xs text-white/40">
                      {call.created_at ? format(new Date(call.created_at), "dd/MM HH:mm") : ""}
                    </span>
                  </div>
                  {call.call_summary && (
                    <p className="text-xs text-white/50 mt-1 truncate">{call.call_summary}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${call.call_successful ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                      {call.status || "N/A"}
                    </span>
                    {call.duration_ms && (
                      <span className="text-xs text-white/40">{Math.round(call.duration_ms / 1000)}s</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
