import { useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { MNBottomNav } from "@/components/layout/MNBottomNav";
import { MobileShell } from "@/components/layout/MobileShell";
import { MNFIRFormComplete } from "@/components/fir/MNFIRFormComplete";
import { FIRTrafficLight } from "@/components/fir/FIRTrafficLight";
import { useAuth } from "@/hooks/useAuth";
import { useMNFIRStore } from "@/stores/mnFirStore";
import { supabase } from "@/lib/supabaseClient";
import logoDragon from "@/assets/logo-dragon.png";

const BASE_PATH = "/mn/app/niyol";

export default function MNNiyolAppPage() {
  const { profile, user, isLoading } = useAuth();
  const firstName = profile?.nome?.split(" ")[0] || "Utente";
  const editingFirId = useMNFIRStore((s) => s.editingFirId);
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const optedOut = localStorage.getItem("gps_tracking_opted_out") === "true";
    if (optedOut || !user?.id || !navigator.geolocation) return;
    const sendPosition = (pos: GeolocationPosition) => {
      supabase.from("driver_locations").insert({ user_id: user.id, lat: pos.coords.latitude, lng: pos.coords.longitude, speed: pos.coords.speed, accuracy: pos.coords.accuracy, fir_id: editingFirId, tenant_id: profile?.tenant_id || null }).then(({ error }) => { if (error) console.warn("[GPS]", error.message); });
    };
    navigator.geolocation.getCurrentPosition(sendPosition, () => {});
    gpsIntervalRef.current = setInterval(() => { navigator.geolocation.getCurrentPosition(sendPosition, () => {}); }, 30000);
    return () => { if (gpsIntervalRef.current) { clearInterval(gpsIntervalRef.current); gpsIntervalRef.current = null; } };
  }, [user?.id, editingFirId, profile?.tenant_id]);

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="text-primary animate-pulse text-lg tracking-wider font-display">CARICAMENTO...</div></div>;
  if (!user) return <Navigate to="/ni" replace />;

  const handleRefresh = () => window.location.reload();

  return (
    <MobileShell>
      <div className="px-4 pt-4 lg:pt-8 pb-2" style={{ borderBottom: '1px solid rgba(192, 173, 103, 0.2)', boxShadow: '0 4px 20px rgba(192, 173, 103, 0.05)' }}>
        <div className="flex items-center gap-3">
          <button onClick={handleRefresh} className="shrink-0 active:scale-95 transition-transform" title="Clicca per aggiornare">
            <img src={logoDragon} alt="Zoli Dragon" className="h-12 w-12 animate-float" style={{ filter: 'drop-shadow(0 0 12px rgba(192, 173, 103, 0.6))' }} />
          </button>
          <div>
            <h1 className="text-2xl font-mono font-normal text-white tracking-wider text-glow">Ciao {firstName}!</h1>
            <p className="text-white text-sm mt-1 font-mono uppercase tracking-wider text-glow-cyan" style={{ textShadow: '0 0 8px rgba(6, 182, 212, 0.4)' }}>Benvenuto in Zoli Dragon</p>
          </div>
        </div>
        <p className="text-[10px] text-white font-mono mt-2 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
          Clicca sul drago ogni volta che apri la app per vedere gli aggiornamenti!
        </p>
        <FIRTrafficLight />
      </div>
      <div className="flex-1 overflow-y-auto pb-20">
        <MNFIRFormComplete />
      </div>
      <MNBottomNav basePath={BASE_PATH} />
    </MobileShell>
  );
}
