import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from "react";
import { Phone, PhoneOff, PhoneCall, Search, User } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useCall } from "@/contexts/CallContext";
import { format } from "date-fns";
export function PhoneInterface({ receiveCalls, onToggleReceiveCalls, isGlobalReco = false, mnContext = null }) {
    const { user, profile } = useAuth();
    const { startRetellCall, endCall, isCallActive, callStatus } = useCall();
    const [recentCalls, setRecentCalls] = useState([]);
    const [loadingCalls, setLoadingCalls] = useState(true);
    const [appUsers, setAppUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const fetchRecentCalls = useCallback(async () => {
        if (!user)
            return;
        try {
            const { data, error } = await supabase
                .from("office_calls")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(20);
            if (!error && data)
                setRecentCalls(data);
        }
        catch (e) {
            console.error("Error fetching calls:", e);
        }
        finally {
            setLoadingCalls(false);
        }
    }, [user]);
    const fetchAppUsers = useCallback(async () => {
        if (!user)
            return;
        try {
            let query = supabase
                .from("profiles")
                .select("id, user_id, nome, cognome, targa_automezzo, avatar_url")
                .neq("user_id", user.id);
            if (isGlobalReco) {
                // Global Reco: fetch users with Global Reco tenant_id or no tenant
                const GLOBAL_RECO_TENANT_ID = "167d07ad-9184-484e-85a6-da5ceafa42a3";
                query = query.eq("tenant_id", GLOBAL_RECO_TENANT_ID);
            }
            else if (mnContext) {
                // MN tenants: filter by mn_context
                query = query.eq("mn_context", mnContext);
            }
            const { data, error } = await query.order("cognome", { ascending: true });
            if (!error && data)
                setAppUsers(data);
        }
        catch (e) {
            console.error("Error fetching app users:", e);
        }
        finally {
            setLoadingUsers(false);
        }
    }, [user, isGlobalReco, mnContext]);
    useEffect(() => {
        fetchRecentCalls();
        fetchAppUsers();
    }, [fetchRecentCalls, fetchAppUsers]);
    const filteredUsers = appUsers.filter((u) => {
        if (!searchQuery)
            return true;
        const q = searchQuery.toLowerCase();
        const fullName = `${u.nome || ""} ${u.cognome || ""}`.toLowerCase();
        return fullName.includes(q) || (u.targa_automezzo || "").toLowerCase().includes(q);
    });
    const handleCall = async () => {
        if (isGlobalReco) {
            await startRetellCall();
        }
    };
    return (_jsxs("div", { className: "flex flex-col lg:flex-row gap-6 w-full max-w-5xl mx-auto", children: [_jsxs("div", { className: "flex-1 flex flex-col gap-4", children: [_jsxs("div", { className: `w-full rounded-xl border p-4 flex items-center justify-between transition-all ${receiveCalls
                            ? "bg-green-500/10 border-green-500/30"
                            : "bg-red-500/10 border-red-500/30"}`, children: [_jsxs("div", { className: "flex items-center gap-3", children: [receiveCalls
                                        ? _jsx(Phone, { className: "h-5 w-5 text-green-400" })
                                        : _jsx(PhoneOff, { className: "h-5 w-5 text-red-400" }), _jsxs("div", { children: [_jsx("p", { className: `text-sm font-semibold ${receiveCalls ? "text-green-400" : "text-red-400"}`, children: receiveCalls ? "Ricezione Attiva" : isGlobalReco ? "Segreteria Retell AI Attiva" : "Ricezione Disattivata" }), _jsx("p", { className: "text-xs text-white/50", children: receiveCalls ? "Le chiamate in arrivo verranno ricevute" : isGlobalReco ? "Le chiamate vengono gestite dall'AI" : "Le chiamate in arrivo sono disabilitate" })] })] }), _jsx("button", { onClick: onToggleReceiveCalls, className: `relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${receiveCalls ? "bg-green-500/40" : "bg-red-500/40"}`, children: _jsx("span", { className: `inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${receiveCalls ? "translate-x-6" : "translate-x-1"}` }) })] }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" }), _jsx("input", { type: "text", placeholder: "Cerca utente per nome o targa...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), className: "w-full pl-10 pr-4 py-3 bg-secondary/30 border border-border rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors" })] }), _jsx("div", { className: "flex-1 bg-secondary/20 border border-border rounded-xl overflow-hidden", children: loadingUsers ? (_jsx("div", { className: "p-6 text-center text-white/40 text-sm", children: "Caricamento utenti..." })) : filteredUsers.length === 0 ? (_jsx("div", { className: "p-6 text-center text-white/40 text-sm", children: "Nessun utente trovato" })) : (_jsx("div", { className: "divide-y divide-border max-h-[350px] overflow-y-auto", children: filteredUsers.map((u) => (_jsxs("button", { onClick: () => setSelectedUser(selectedUser?.id === u.id ? null : u), className: `w-full px-4 py-3 flex items-center gap-3 transition-colors text-left ${selectedUser?.id === u.id
                                    ? "bg-primary/20 border-l-2 border-l-primary"
                                    : "hover:bg-white/5"}`, children: [_jsx("div", { className: "h-9 w-9 rounded-full bg-secondary/60 border border-border flex items-center justify-center flex-shrink-0", children: u.avatar_url ? (_jsx("img", { src: u.avatar_url, alt: "", className: "h-9 w-9 rounded-full object-cover" })) : (_jsx(User, { className: "h-4 w-4 text-white/50" })) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("p", { className: "text-sm text-white/90 font-medium truncate", children: [u.nome || "", " ", u.cognome || ""] }), u.targa_automezzo && (_jsx("p", { className: "text-xs text-white/40 truncate", children: u.targa_automezzo }))] }), selectedUser?.id === u.id && (_jsx(Phone, { className: "h-4 w-4 text-green-400 flex-shrink-0" }))] }, u.id))) })) }), selectedUser && (_jsxs("button", { onClick: isCallActive ? endCall : handleCall, disabled: callStatus === "connecting", className: `w-full py-3 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all ${isCallActive
                            ? "bg-red-600/80 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                            : callStatus === "connecting"
                                ? "bg-yellow-600/50 text-yellow-200 cursor-wait"
                                : "bg-green-600/80 hover:bg-green-600 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]"}`, children: [_jsx(PhoneCall, { className: "h-5 w-5" }), isCallActive
                                ? "Termina"
                                : callStatus === "connecting"
                                    ? "Connessione..."
                                    : `Chiama ${selectedUser.nome || ""} ${selectedUser.cognome || ""}`] }))] }), _jsxs("div", { className: "flex-1 flex flex-col", children: [_jsx("h3", { className: "text-sm font-semibold text-white/70 uppercase tracking-wider mb-3", children: "Cronologia Chiamate" }), _jsx("div", { className: "flex-1 bg-secondary/20 border border-border rounded-xl overflow-hidden", children: loadingCalls ? (_jsx("div", { className: "p-6 text-center text-white/40 text-sm", children: "Caricamento..." })) : recentCalls.length === 0 ? (_jsx("div", { className: "p-6 text-center text-white/40 text-sm", children: "Nessuna chiamata recente" })) : (_jsx("div", { className: "divide-y divide-border max-h-[400px] overflow-y-auto", children: recentCalls.map((call) => (_jsxs("div", { className: "px-4 py-3 hover:bg-white/5 transition-colors", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Phone, { className: `h-4 w-4 ${call.direction === "inbound" ? "text-blue-400" : "text-green-400"}` }), _jsx("span", { className: "text-sm text-white/80", children: call.from_number || call.to_number || "Sconosciuto" })] }), _jsx("span", { className: "text-xs text-white/40", children: call.created_at ? format(new Date(call.created_at), "dd/MM HH:mm") : "" })] }), call.call_summary && (_jsx("p", { className: "text-xs text-white/50 mt-1 truncate", children: call.call_summary })), _jsxs("div", { className: "flex items-center gap-2 mt-1", children: [_jsx("span", { className: `text-xs px-1.5 py-0.5 rounded ${call.call_successful ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`, children: call.status || "N/A" }), call.duration_ms && (_jsxs("span", { className: "text-xs text-white/40", children: [Math.round(call.duration_ms / 1000), "s"] }))] })] }, call.id))) })) })] })] }));
}
