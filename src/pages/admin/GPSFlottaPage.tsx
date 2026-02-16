import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabaseClient";
import { MapPin, Navigation, Clock, Truck } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface DriverLocation {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  speed: number | null;
  accuracy: number | null;
  fir_id: string | null;
  created_at: string;
  profile?: { nome: string; cognome: string; targa_automezzo: string | null };
}

export default function GPSFlottaPage() {
  const [locations, setLocations] = useState<DriverLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLocations = async () => {
    // Get latest location per user (last 5 minutes)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("driver_locations")
      .select("*")
      .gte("created_at", fiveMinAgo)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("GPS fetch error:", error);
      setLoading(false);
      return;
    }

    // Deduplicate: keep latest per user
    const latestByUser = new Map<string, any>();
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

    // Refresh every 30s
    const interval = setInterval(fetchLocations, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  return (
    <AdminLayout title="GPS Flotta" subtitle="Tracciamento in tempo reale dei trasportatori">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-card/60 border border-border/20 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-4 w-4 text-neon-green" />
            <span className="text-xs font-mono uppercase text-white/60">In Viaggio</span>
          </div>
          <p className="text-2xl font-display text-neon-green">{locations.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-card/60 border border-border/20 backdrop-blur-xl overflow-hidden">
        <div className="p-4 border-b border-border/20">
          <h3 className="text-sm font-display uppercase tracking-wider text-primary flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            Posizioni Attive
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-primary animate-pulse font-display">Caricamento...</div>
        ) : locations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
            Nessun trasportatore attivo al momento
          </div>
        ) : (
          <div className="divide-y divide-border/10">
            {locations.map((loc) => (
              <div key={loc.id} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
                <div className="w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-neon-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {loc.profile?.nome} {loc.profile?.cognome || "Utente sconosciuto"}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {loc.profile?.targa_automezzo && <span className="text-primary mr-2">🚛 {loc.profile.targa_automezzo}</span>}
                    📍 {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                  </p>
                </div>
                <div className="text-right">
                  {loc.speed != null && (
                    <p className="text-xs text-neon-cyan font-mono">{(loc.speed * 3.6).toFixed(0)} km/h</p>
                  )}
                  <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 justify-end">
                    <Clock className="h-3 w-3" />
                    {format(new Date(loc.created_at), "HH:mm:ss", { locale: it })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
