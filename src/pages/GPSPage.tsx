import { useState, useEffect, useRef } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileShell } from "@/components/layout/MobileShell";
import { useAuth } from "@/hooks/useAuth";
import { MapPin, Navigation, Signal, Truck, WifiOff } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import logoDragon from "@/assets/logo-dragon.png";

interface GeoPos {
  lat: number;
  lng: number;
  speed: number | null;
  accuracy: number | null;
}

const GPS_OPT_OUT_KEY = "gps_tracking_opted_out";

export default function GPSPage() {
  const { profile, user } = useAuth();
  const [position, setPosition] = useState<GeoPos | null>(null);
  const [optedOut, setOptedOut] = useState(() => localStorage.getItem(GPS_OPT_OUT_KEY) === "true");
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tracking = !optedOut;

  // Always-on GPS tracking (unless opted out)
  useEffect(() => {
    if (optedOut || !navigator.geolocation || !user?.id) return;

    // Watch position for UI display
    const wid = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed: pos.coords.speed,
          accuracy: pos.coords.accuracy,
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
    watchIdRef.current = wid;

    // Send to DB every 30s
    const sendPosition = (pos: GeolocationPosition) => {
      supabase.from("driver_locations").insert({
        user_id: user.id,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        speed: pos.coords.speed,
        accuracy: pos.coords.accuracy,
        tenant_id: profile?.tenant_id || null,
      }).then(({ error }) => {
        if (error) console.warn("[GPS] Insert error:", error.message);
      });
    };

    navigator.geolocation.getCurrentPosition(sendPosition, () => {});
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(sendPosition, () => {});
    }, 30000);

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      watchIdRef.current = null;
      intervalRef.current = null;
    };
  }, [optedOut, user?.id, profile?.tenant_id]);

  const toggleOptOut = () => {
    setOptedOut((prev) => {
      const next = !prev;
      localStorage.setItem(GPS_OPT_OUT_KEY, String(next));
      if (next) setPosition(null);
      return next;
    });
  };

  const speedKmh = position?.speed ? (position.speed * 3.6).toFixed(0) : "--";

  return (
    <MobileShell>
      <div className="px-4 pt-4 pb-2 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(192, 173, 103, 0.15)' }}>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground tracking-wider">GPS FLOTTA</h1>
          <p className="text-muted-foreground text-xs font-mono mt-1 uppercase tracking-wider">Tracciamento posizione</p>
        </div>
        <img src={logoDragon} alt="Dragon" className="h-8 w-8 opacity-60" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-20 space-y-4">
        {/* Tracking status */}
        <div className="p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tracking ? 'bg-neon-green/20' : 'bg-destructive/20'}`}>
              {tracking
                ? <Signal className="h-5 w-5 text-neon-green" />
                : <WifiOff className="h-5 w-5 text-destructive" />
              }
            </div>
            <div>
              <p className={`font-display font-bold text-sm ${tracking ? 'text-neon-green' : 'text-destructive'}`}>
                {tracking ? "COLLEGATO" : "SCOLLEGATO"}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {tracking ? "GPS attivo — dati in tempo reale" : "GPS disattivato per privacy"}
              </p>
            </div>
          </div>
          <button
            onClick={toggleOptOut}
            className={`w-full py-3 rounded-xl font-display font-bold text-sm tracking-wider transition-all ${
              tracking
                ? "bg-destructive/20 text-destructive hover:bg-destructive/30 border border-destructive/30"
                : "bg-neon-green/20 text-neon-green hover:bg-neon-green/30 border border-neon-green/30"
            }`}
          >
            {tracking ? "SCOLLEGATI (Privacy)" : "RICOLLEGATI"}
          </button>
        </div>

        {/* Coordinate cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-card/60 border border-border/30">
            <div className="flex items-center gap-1.5 mb-2">
              <MapPin className="h-3.5 w-3.5 text-neon-cyan" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Latitudine</span>
            </div>
            <p className="text-sm font-mono text-foreground">{position ? position.lat.toFixed(6) : "--"}</p>
          </div>
          <div className="p-4 rounded-2xl bg-card/60 border border-border/30">
            <div className="flex items-center gap-1.5 mb-2">
              <MapPin className="h-3.5 w-3.5 text-neon-cyan" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Longitudine</span>
            </div>
            <p className="text-sm font-mono text-foreground">{position ? position.lng.toFixed(6) : "--"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-card/60 border border-neon-cyan/20">
            <div className="flex items-center gap-1.5 mb-2">
              <Truck className="h-3.5 w-3.5 text-neon-cyan" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Velocità</span>
            </div>
            <p className="text-sm font-mono text-foreground">{speedKmh} km/h</p>
          </div>
          <div className="p-4 rounded-2xl bg-card/60 border border-primary/20">
            <div className="flex items-center gap-1.5 mb-2">
              <Navigation className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Precisione</span>
            </div>
            <p className="text-sm font-mono text-foreground">{position?.accuracy ? `${position.accuracy.toFixed(0)}m` : "--"}</p>
          </div>
        </div>

        {/* Vehicle info */}
        <div className="p-4 rounded-2xl bg-card/60 border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="h-4 w-4 text-primary" />
            <span className="font-display font-bold text-sm text-foreground tracking-wider">INFO VEICOLO</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Targa</span>
              <span className="text-sm font-mono font-semibold text-foreground">{profile?.targa_automezzo || "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Stato</span>
              <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
                tracking && position?.speed && position.speed > 1
                  ? "bg-neon-green/20 text-neon-green border-neon-green/30"
                  : "bg-secondary/50 text-muted-foreground border-border/30"
              }`}>
                {tracking && position?.speed && position.speed > 1 ? "IN MOTO" : "FERMO"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </MobileShell>
  );
}
