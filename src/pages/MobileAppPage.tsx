import { BottomNav } from "@/components/layout/BottomNav";
import { MobileShell } from "@/components/layout/MobileShell";
import { FIRFormComplete } from "@/components/fir/FIRFormComplete";
import { FIRTrafficLight } from "@/components/fir/FIRTrafficLight";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Bot, MessageCircle, Phone, FileText } from "lucide-react";
import logoDragon from "@/assets/logo-dragon.png";

export default function MobileAppPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const firstName = profile?.nome?.split(" ")[0] || "Utente";

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <MobileShell>
      {/* ── Header ── */}
      <div className="px-4 pt-4 lg:pt-8 pb-2" style={{ borderBottom: '1px solid rgba(192, 173, 103, 0.15)' }}>
        <div className="flex items-center gap-3">
          <button onClick={handleRefresh} className="shrink-0 active:scale-95 transition-transform" title="Clicca per aggiornare">
            <img src={logoDragon} alt="Zoli Dragon" className="h-12 w-12" style={{ filter: 'drop-shadow(0 0 8px rgba(192, 173, 103, 0.5))' }} />
          </button>
          <div>
            <h1 className="text-2xl font-mono font-normal text-foreground tracking-wider text-glow">
              Ciao {firstName}!
            </h1>
            <p className="text-muted-foreground text-sm mt-1 font-mono uppercase tracking-wider" style={{ textShadow: '0 0 8px rgba(192, 173, 103, 0.3)' }}>
              Benvenuto in Zoli Dragon
            </p>
          </div>
        </div>
        <p className="text-[10px] text-primary/60 font-mono mt-2">
          ⚡ Clicca sul drago ogni volta che apri la app per vedere gli aggiornamenti!
        </p>
        <FIRTrafficLight />
      </div>

      {/* ── COMPILA FIR Header ── */}
      <div className="px-4 pt-4">
        <h2 className="text-lg font-display font-bold text-foreground tracking-wider">COMPILA FIR</h2>
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Formulario RENTRI</p>
      </div>

      {/* ── Quick Action Buttons ── */}
      <div className="px-4 pt-3">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => navigate("/app/ai")}
            className="p-3 rounded-xl bg-card/60 border border-primary/30 flex flex-col items-center gap-2 hover:border-primary/60 transition-colors"
          >
            <Bot className="h-5 w-5 text-primary" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-primary text-center leading-tight">Compila<br/>con AI</span>
          </button>
          <button
            onClick={() => navigate("/app/comunicazioni")}
            className="p-3 rounded-xl bg-card/60 border border-border/30 flex flex-col items-center gap-2 hover:border-primary/30 transition-colors"
          >
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground text-center">Zoli MSG</span>
          </button>
          <button className="p-3 rounded-xl bg-card/60 border border-border/30 flex flex-col items-center gap-2 hover:border-primary/30 transition-colors">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground text-center">Ufficio</span>
          </button>
        </div>
      </div>

      {/* ── Form Content ── */}
      <div className="flex-1 overflow-y-auto pb-20">
        <FIRFormComplete />
      </div>

      <BottomNav />
    </MobileShell>
  );
}
