import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { supabase } from "@/lib/supabaseClient";
import { useMNContextStore, MN_CONTEXTS } from "@/stores/mnContextStore";
import { MapPin, Navigation, Clock, Truck, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
const validContexts = ["multyproget", "niyol"];
export default function MNGPSFlottaPage() {
    const { context } = useParams();
    const setActiveContext = useMNContextStore((s) => s.setActiveContext);
    const isValid = !!context && validContexts.includes(context);
    const mnCtx = MN_CONTEXTS.find((c) => c.id === context) || MN_CONTEXTS[0];
    useEffect(() => { if (isValid)
        setActiveContext(mnCtx); }, [context, isValid]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const fetchLocations = async () => {
        const windowAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        let q = supabase.from("driver_locations").select("*").gte("created_at", windowAgo).order("created_at", { ascending: false });
        if (mnCtx?.tenantId)
            q = q.eq("tenant_id", mnCtx.tenantId);
        const { data, error } = await q;
        if (error) {
            console.error("GPS fetch error:", error);
            setLoading(false);
            return;
        }
        const latestByUser = new Map();
        for (const loc of data || []) {
            if (!latestByUser.has(loc.user_id))
                latestByUser.set(loc.user_id, loc);
        }
        const userIds = [...latestByUser.keys()];
        if (userIds.length > 0) {
            const { data: profiles } = await supabase.from("profiles").select("user_id, nome, cognome, targa_automezzo").in("user_id", userIds);
            const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
            for (const [uid, loc] of latestByUser)
                loc.profile = profileMap.get(uid);
        }
        setLocations([...latestByUser.values()]);
        setLastRefresh(new Date());
        setLoading(false);
    };
    useEffect(() => {
        fetchLocations();
        const channel = supabase.channel(`gps-mn-${context}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "driver_locations" }, () => fetchLocations()).subscribe();
        const interval = setInterval(fetchLocations, 15000);
        return () => { supabase.removeChannel(channel); clearInterval(interval); };
    }, [context]);
    if (!isValid)
        return _jsx(Navigate, { to: "/mn/admin", replace: true });
    const contextLabel = context === "multyproget" ? "Multyproget" : "Niyol";
    return (_jsxs(MNAdminLayout, { title: `GPS Flotta — ${contextLabel}`, subtitle: "Tracciamento in tempo reale dei trasportatori", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "p-4 rounded-2xl bg-card/60 border border-border/20 backdrop-blur-xl", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx(Truck, { className: "h-4 w-4 text-green-400" }), _jsx("span", { className: "text-xs font-mono uppercase text-white/60", children: "In Viaggio" })] }), _jsx("p", { className: "text-2xl font-display text-green-400", children: locations.length })] }), _jsxs("div", { className: "text-xs text-white/50 font-mono", children: ["Ultimo: ", format(lastRefresh, "HH:mm:ss", { locale: it })] })] }), _jsxs("button", { onClick: () => { setLoading(true); fetchLocations(); }, disabled: loading, className: "flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium border border-cyan-400 hover:bg-cyan-500 disabled:opacity-50", children: [_jsx(RefreshCw, { className: `h-4 w-4 ${loading ? "animate-spin" : ""}` }), " Aggiorna"] })] }), _jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/20 backdrop-blur-xl overflow-hidden", children: [_jsx("div", { className: "p-4 border-b border-border/20", children: _jsxs("h3", { className: "text-sm font-display uppercase tracking-wider text-primary flex items-center gap-2", children: [_jsx(Navigation, { className: "h-4 w-4" }), " Posizioni Attive"] }) }), loading ? (_jsx("div", { className: "p-8 text-center text-primary animate-pulse font-display", children: "Caricamento..." })) : locations.length === 0 ? (_jsxs("div", { className: "p-8 text-center text-muted-foreground text-sm", children: [_jsx(MapPin, { className: "h-8 w-8 mx-auto mb-2 opacity-30" }), "Nessun trasportatore attivo"] })) : (_jsx("div", { className: "divide-y divide-border/10", children: locations.map(loc => (_jsxs("div", { className: "p-4 flex items-center gap-4 hover:bg-white/5 transition-colors", children: [_jsx("div", { className: "w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center", children: _jsx(MapPin, { className: "h-5 w-5 text-neon-green" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("p", { className: "text-sm font-semibold text-white truncate", children: [loc.profile?.nome, " ", loc.profile?.cognome || "Utente sconosciuto"] }), _jsxs("p", { className: "text-xs text-muted-foreground font-mono", children: [loc.profile?.targa_automezzo && _jsxs("span", { className: "text-primary mr-2", children: ["\uD83D\uDE9B ", loc.profile.targa_automezzo] }), "\uD83D\uDCCD ", loc.lat.toFixed(5), ", ", loc.lng.toFixed(5)] })] }), _jsxs("div", { className: "text-right", children: [loc.speed != null && _jsxs("p", { className: "text-xs text-neon-cyan font-mono", children: [(loc.speed * 3.6).toFixed(0), " km/h"] }), _jsxs("p", { className: "text-[10px] text-muted-foreground font-mono flex items-center gap-1 justify-end", children: [_jsx(Clock, { className: "h-3 w-3" }), format(new Date(loc.created_at), "HH:mm:ss", { locale: it })] })] })] }, loc.id))) }))] })] }));
}
