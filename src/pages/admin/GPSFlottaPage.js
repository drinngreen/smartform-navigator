import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabaseClient";
import { MapPin, Navigation, Clock, Truck, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
export default function GPSFlottaPage() {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const fetchLocations = async () => {
        // Get latest location per user (last 30 minutes)
        const windowAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { data, error } = await supabase
            .from("driver_locations")
            .select("*")
            .gte("created_at", windowAgo)
            .order("created_at", { ascending: false });
        if (error) {
            console.error("GPS fetch error:", error);
            setLoading(false);
            return;
        }
        // Deduplicate: keep latest per user
        const latestByUser = new Map();
        for (const loc of data || []) {
            if (!latestByUser.has(loc.user_id)) {
                latestByUser.set(loc.user_id, loc);
            }
        }
        // Fetch profiles for these users
        const userIds = [...latestByUser.keys()];
        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from("profiles")
                .select("user_id, nome, cognome, targa_automezzo")
                .in("user_id", userIds);
            const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
            for (const [uid, loc] of latestByUser) {
                loc.profile = profileMap.get(uid);
            }
        }
        setLocations([...latestByUser.values()]);
        setLastRefresh(new Date());
        setLoading(false);
    };
    useEffect(() => {
        fetchLocations();
        // Subscribe to realtime updates
        const channel = supabase
            .channel("gps-fleet")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "driver_locations" }, () => {
            fetchLocations();
        })
            .subscribe();
        // Refresh every 15s
        const interval = setInterval(fetchLocations, 15000);
        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, []);
    return (_jsxs(AdminLayout, { title: "GPS Flotta", subtitle: "Tracciamento in tempo reale dei trasportatori", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "p-4 rounded-2xl bg-card/60 border border-border/20 backdrop-blur-xl", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx(Truck, { className: "h-4 w-4 text-green-400" }), _jsx("span", { className: "text-xs font-mono uppercase text-white/60", children: "In Viaggio" })] }), _jsx("p", { className: "text-2xl font-display text-green-400", children: locations.length })] }), _jsxs("div", { className: "text-xs text-white/50 font-mono", children: ["Ultimo aggiornamento: ", format(lastRefresh, "HH:mm:ss", { locale: it })] })] }), _jsxs("button", { onClick: () => { setLoading(true); fetchLocations(); }, disabled: loading, className: "flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium border border-cyan-400 hover:bg-cyan-500 transition-colors disabled:opacity-50", children: [_jsx(RefreshCw, { className: `h-4 w-4 ${loading ? "animate-spin" : ""}` }), "Aggiorna"] })] }), _jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/20 backdrop-blur-xl overflow-hidden", children: [_jsx("div", { className: "p-4 border-b border-border/20", children: _jsxs("h3", { className: "text-sm font-display uppercase tracking-wider text-primary flex items-center gap-2", children: [_jsx(Navigation, { className: "h-4 w-4" }), "Posizioni Attive"] }) }), loading ? (_jsx("div", { className: "p-8 text-center text-primary animate-pulse font-display", children: "Caricamento..." })) : locations.length === 0 ? (_jsxs("div", { className: "p-8 text-center text-muted-foreground text-sm", children: [_jsx(MapPin, { className: "h-8 w-8 mx-auto mb-2 opacity-30" }), "Nessun trasportatore attivo al momento"] })) : (_jsx("div", { className: "divide-y divide-border/10", children: locations.map((loc) => (_jsxs("div", { className: "p-4 flex items-center gap-4 hover:bg-white/5 transition-colors", children: [_jsx("div", { className: "w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center", children: _jsx(MapPin, { className: "h-5 w-5 text-neon-green" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("p", { className: "text-sm font-semibold text-white truncate", children: [loc.profile?.nome, " ", loc.profile?.cognome || "Utente sconosciuto"] }), _jsxs("p", { className: "text-xs text-muted-foreground font-mono", children: [loc.profile?.targa_automezzo && _jsxs("span", { className: "text-primary mr-2", children: ["\uD83D\uDE9B ", loc.profile.targa_automezzo] }), "\uD83D\uDCCD ", loc.lat.toFixed(5), ", ", loc.lng.toFixed(5)] })] }), _jsxs("div", { className: "text-right", children: [loc.speed != null && (_jsxs("p", { className: "text-xs text-neon-cyan font-mono", children: [(loc.speed * 3.6).toFixed(0), " km/h"] })), _jsxs("p", { className: "text-[10px] text-muted-foreground font-mono flex items-center gap-1 justify-end", children: [_jsx(Clock, { className: "h-3 w-3" }), format(new Date(loc.created_at), "HH:mm:ss", { locale: it })] })] })] }, loc.id))) }))] })] }));
}
