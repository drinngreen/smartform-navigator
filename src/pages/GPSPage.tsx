import { useState, useEffect } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileShell } from "@/components/layout/MobileShell";
import { MapPin, Navigation, Clock } from "lucide-react";

interface GeoPos { lat: number; lng: number }

export default function GPSPage() {
  const [position, setPosition] = useState<GeoPos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("GPS non supportato dal browser");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLastUpdate(new Date());
        setError(null);
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return (
    <MobileShell>
      <div className="px-4 pt-4 pb-2" style={{ borderBottom: '1px solid rgba(192, 173, 103, 0.15)' }}>
        <h1 className="text-xl font-display font-bold text-foreground tracking-wider">GPS</h1>
        <p className="text-muted-foreground text-xs font-mono mt-1">Posizione in tempo reale</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-20 space-y-4">
        <div className="p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <MapPin className="h-8 w-8 text-primary" />
          </div>

          {error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : position ? (
            <>
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Navigation className="h-4 w-4 text-neon-cyan" />
                  <span className="font-mono text-foreground">
                    {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
                  </span>
                </div>
                {lastUpdate && (
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Ultimo aggiornamento: {lastUpdate.toLocaleTimeString("it-IT")}</span>
                  </div>
                )}
              </div>
              <a
                href={`https://www.google.com/maps?q=${position.lat},${position.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 rounded-lg bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors"
              >
                Apri in Google Maps
              </a>
            </>
          ) : (
            <p className="text-muted-foreground text-sm animate-pulse">Acquisizione posizione...</p>
          )}
        </div>
      </div>

      <BottomNav />
    </MobileShell>
  );
}
