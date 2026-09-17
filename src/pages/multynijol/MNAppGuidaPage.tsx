import { useState } from "react";
import { useLocation } from "react-router-dom";
import { MNBottomNav } from "@/components/layout/MNBottomNav";
import { MobileShell } from "@/components/layout/MobileShell";
import { ChevronRight, ExternalLink } from "lucide-react";
import logoDragon from "@/assets/logo-dragon.png";

const guideSteps = [
  { icon: "📋", title: "Ricevi il FIR", subtitle: "L'ufficio prepara tutto", label: "UFFICIO", sublabel: "Prepara", color: "text-neon-cyan", desc: "L'ufficio prepara il formulario e te lo assegna. Finché è in bozza può ancora correggerlo, anche mentre sei in viaggio.", tip: "Controlla le notifiche prima di partire" },
  { icon: "🚛", title: "Parti col carico", subtitle: "Primo invio al RENTRI", label: "PARTENZA", sublabel: "1° invio", color: "text-primary", desc: "Premi EMETTI FIR E FIRMA LA PARTENZA: il formulario viene trasmesso al RENTRI e ricevi numero ufficiale e QR valido.", tip: "Controlla targa e quantità prima di firmare" },
  { icon: "📍", title: "Trasporto", subtitle: "QR ufficiale", label: "VIAGGIO", sublabel: "In corso", color: "text-neon-green", desc: "In viaggio mostri il QR ufficiale RENTRI a polizia e vigili. Le giacenze non sono ancora cambiate.", tip: "Il QR vale solo dopo l'invio della partenza" },
  { icon: "🏭", title: "Arrivo a destino", subtitle: "Secondo invio al RENTRI", label: "ARRIVO", sublabel: "2° invio", color: "text-neon-magenta", desc: "Premi SONO ARRIVATO, inserisci peso reale, data, ora ed esito, poi firma: l'arrivo viene trasmesso al RENTRI.", tip: "Chiedi sempre la ricevuta di pesatura" },
  { icon: "✅", title: "Chiusura FIR", subtitle: "Completato", label: "CHIUSO", sublabel: "Completato", color: "text-neon-green", desc: "Solo dopo la risposta positiva del RENTRI il formulario si chiude e le giacenze si aggiornano. Se l'invio fallisce resti in viaggio.", tip: "Se vedi un errore, il formulario NON è chiuso" },
  { icon: "🍋", title: "Chiedi a Dark Lemon", subtitle: "Foto e aiuto sul FIR", label: "AI", sublabel: "Assistenza", color: "text-neon-cyan", desc: "Premi Compila con Dark Lemon nel FIR oppure AI in basso. Puoi fotografare un formulario o un elenco: Dark Lemon legge i dati, segnala i dubbi e propone cosa inserire. Sei sempre tu a confermare.", tip: "Dark Lemon nell'app non può inviare al RENTRI o cambiare giacenze" },

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
        <a href="/guidacollaboratori" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-bold text-primary">
          Guida completa con immagini <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      <MNBottomNav basePath={basePath} />
    </MobileShell>
  );
}
