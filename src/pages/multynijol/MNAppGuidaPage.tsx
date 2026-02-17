import { useState } from "react";
import { useLocation } from "react-router-dom";
import { MNBottomNav } from "@/components/layout/MNBottomNav";
import { MobileShell } from "@/components/layout/MobileShell";
import { ChevronRight } from "lucide-react";
import logoDragon from "@/assets/logo-dragon.png";

const guideSteps = [
  { icon: "📋", title: "Ricevi il FIR", subtitle: "L'ufficio prepara tutto", label: "UFFICIO", sublabel: "Vidima", color: "text-neon-cyan", desc: "L'ufficio crea e vidima il FIR. Tu ricevi una notifica quando è pronto.", tip: "Controlla le notifiche prima di partire" },
  { icon: "🚛", title: "Parti col carico", subtitle: "Firma e vai", label: "AUTISTA", sublabel: "Parte", color: "text-primary", desc: "Premi INVIA E FIRMA PARTENZA. Il sistema registra ora e GPS automaticamente.", tip: "Controlla che la targa sia corretta" },
  { icon: "📍", title: "Trasporto", subtitle: "GPS attivo", label: "TRASPORTO", sublabel: "Tappe", color: "text-neon-green", desc: "Durante il viaggio il GPS traccia la posizione. In caso di controllo usa il QR Code.", tip: "Tieni il GPS attivo durante tutto il viaggio" },
  { icon: "🏭", title: "Arrivo a destino", subtitle: "Pesatura", label: "IMPIANTO", sublabel: "Accetta", color: "text-neon-magenta", desc: "All'arrivo premi ARRIVATO e inserisci il peso verificato dall'impianto.", tip: "Chiedi sempre la ricevuta di pesatura" },
  { icon: "✅", title: "Chiusura FIR", subtitle: "Completato", label: "CHIUSO", sublabel: "Completato", color: "text-neon-green", desc: "Il FIR viene chiuso automaticamente. Puoi scaricarlo in PDF dalla cronologia.", tip: "Verifica i dati prima della chiusura" },
];

export default function MNAppGuidaPage() {
  const location = useLocation();
  const context = location.pathname.includes("/niyol") ? "niyol" : "multyproget";
  const basePath = `/mn/app/${context}`;
  const [currentStep, setCurrentStep] = useState(0);
  const step = guideSteps[currentStep];

  return (
    <MobileShell>
      <div className="px-4 pt-4 pb-2 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(192, 173, 103, 0.15)' }}>
        <div><h1 className="text-xl font-display font-bold text-foreground tracking-wider">GUIDA AUTISTA</h1><p className="text-muted-foreground text-xs font-mono mt-1 uppercase tracking-wider">Come funziona il FIR</p></div>
        <img src={logoDragon} alt="Dragon" className="h-8 w-8 opacity-60" />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-20 space-y-4">
        <div className="flex items-center justify-between px-2">
          {guideSteps.map((s, i) => (
            <button key={i} onClick={() => setCurrentStep(i)} className="flex flex-col items-center">
              <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mb-1 transition-all ${i === currentStep ? 'border-primary bg-primary/20 scale-110' : i < currentStep ? 'border-neon-green bg-neon-green/10' : 'border-border/30'}`}><span className="text-lg">{s.icon}</span></div>
              <span className={`text-[8px] font-mono uppercase tracking-wider font-bold ${i === currentStep ? s.color : 'text-muted-foreground'}`}>{s.label}</span>
              <span className="text-[7px] text-muted-foreground">{s.sublabel}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-center gap-1.5">{guideSteps.map((_, i) => (<div key={i} className={`h-1.5 rounded-full transition-all ${i === currentStep ? 'w-5 bg-primary' : 'w-1.5 bg-border'}`} />))}</div>
        <div className="p-5 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{step.icon}</span>
            <div>
              <span className="text-[10px] font-mono bg-primary/20 text-primary px-2 py-0.5 rounded">Passo {currentStep + 1}/{guideSteps.length}</span>
              <p className="font-display font-bold text-lg text-foreground mt-0.5">{step.title}</p>
              <p className="text-xs text-muted-foreground">{step.subtitle}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
          <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/10"><p className="text-xs text-primary flex items-center gap-1.5">💡 {step.tip}</p></div>
        </div>
        <div className="flex items-center justify-between pt-2">
          <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} className={`text-sm text-muted-foreground hover:text-foreground transition-colors ${currentStep === 0 ? 'opacity-30' : ''}`} disabled={currentStep === 0}>‹ Indietro</button>
          {currentStep < guideSteps.length - 1 ? (
            <button onClick={() => setCurrentStep(currentStep + 1)} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-display font-bold hover:brightness-110 transition-all flex items-center gap-1">Avanti <ChevronRight className="h-4 w-4" /></button>
          ) : (
            <button onClick={() => setCurrentStep(0)} className="px-5 py-2.5 rounded-xl bg-neon-green/20 text-neon-green text-sm font-display font-bold hover:bg-neon-green/30 transition-all">Ricomincia</button>
          )}
        </div>
      </div>
      <MNBottomNav basePath={basePath} />
    </MobileShell>
  );
}
