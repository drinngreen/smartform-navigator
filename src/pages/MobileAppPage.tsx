import { BottomNav } from "@/components/layout/BottomNav";
import { MobileShell } from "@/components/layout/MobileShell";
import { FIRFormComplete } from "@/components/fir/FIRFormComplete";
import { FIRTrafficLight } from "@/components/fir/FIRTrafficLight";
import { useAuth } from "@/hooks/useAuth";
import logoDragon from "@/assets/logo-dragon.png";

export default function MobileAppPage() {
  const { profile } = useAuth();
  const firstName = profile?.nome?.split(" ")[0] || "Utente";

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <MobileShell>
      {/* ── Header ── */}
      <div className="px-4 pt-4 lg:pt-8 pb-2" style={{ borderBottom: '1px solid rgba(192, 173, 103, 0.2)', boxShadow: '0 4px 20px rgba(192, 173, 103, 0.05)' }}>
        <div className="flex items-center gap-3">
          <button onClick={handleRefresh} className="shrink-0 active:scale-95 transition-transform" title="Clicca per aggiornare">
            <img src={logoDragon} alt="Zoli Dragon" className="h-12 w-12 animate-float" style={{ filter: 'drop-shadow(0 0 12px rgba(192, 173, 103, 0.6))' }} />
          </button>
          <div>
            <h1 className="text-2xl font-mono font-normal text-foreground tracking-wider text-glow">
              Ciao {firstName}!
            </h1>
            <p className="text-muted-foreground text-sm mt-1 font-mono uppercase tracking-wider text-glow-cyan" style={{ textShadow: '0 0 8px rgba(6, 182, 212, 0.4)' }}>
              Benvenuto in Zoli Dragon
            </p>
          </div>
        </div>
        <p className="text-[10px] text-primary/60 font-mono mt-2 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
          Clicca sul drago ogni volta che apri la app per vedere gli aggiornamenti!
        </p>
        <FIRTrafficLight />
      </div>

      {/* ── Form Content ── */}
      <div className="flex-1 overflow-y-auto pb-20">
        <FIRFormComplete />
      </div>

      <BottomNav />
    </MobileShell>
  );
}
