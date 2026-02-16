import { useState } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileShell } from "@/components/layout/MobileShell";
import { useAuth } from "@/hooks/useAuth";
import { useFIRForms } from "@/hooks/useFIRForms";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { User, Truck, Edit2, FileText, Bell, Settings, HelpCircle, LogOut, Camera } from "lucide-react";
import logoDragon from "@/assets/logo-dragon.png";

export default function ProfiloPage() {
  const { profile, user, signOut, refreshUserData } = useAuth();
  const { myForms } = useFIRForms();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showGuide, setShowGuide] = useState(false);

  const firCount = myForms?.length || 0;

  const handleSaveField = async (field: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ [field]: editValue.trim() || null })
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshUserData();
      toast.success("Aggiornato!");
    } catch (err: any) {
      toast.error(err?.message || "Errore");
    }
    setEditingField(null);
  };

  const guideSteps = [
    { icon: "📋", title: "Ricevi il FIR", subtitle: "L'ufficio prepara tutto", label: "UFFICIO", sublabel: "Vidima", color: "text-neon-cyan", desc: "L'ufficio crea e vidima il FIR. Tu ricevi una notifica quando è pronto. Non devi compilare nulla!", tip: "Controlla le notifiche prima di partire" },
    { icon: "🚛", title: "Parti col carico", subtitle: "Firma e vai", label: "AUTISTA", sublabel: "Parte", color: "text-primary", desc: "Premi INVIA E FIRMA PARTENZA. Il sistema registra ora e GPS automaticamente.", tip: "Controlla che la targa sia corretta" },
    { icon: "📍", title: "Trasporto", subtitle: "GPS attivo", label: "TRASPORTO", sublabel: "Tappe", color: "text-neon-green", desc: "Durante il viaggio il GPS traccia la posizione. In caso di controllo usa il QR Code.", tip: "Tieni il GPS attivo durante tutto il viaggio" },
    { icon: "🏭", title: "Arrivo a destino", subtitle: "Pesatura", label: "IMPIANTO", sublabel: "Accetta", color: "text-neon-magenta", desc: "All'arrivo premi ARRIVATO e inserisci il peso verificato dall'impianto.", tip: "Chiedi sempre la ricevuta di pesatura" },
    { icon: "✅", title: "Chiusura FIR", subtitle: "Completato", label: "CHIUSO", sublabel: "Completato", color: "text-neon-green", desc: "Il FIR viene chiuso automaticamente. Puoi scaricarlo in PDF dalla cronologia.", tip: "Verifica i dati prima della chiusura" },
  ];

  return (
    <MobileShell>
      <div className="px-4 pt-4 pb-2 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(192, 173, 103, 0.15)' }}>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground tracking-wider">PROFILO</h1>
          <p className="text-muted-foreground text-xs font-mono mt-1 uppercase tracking-wider">Il tuo account</p>
        </div>
        <img src={logoDragon} alt="Dragon" className="h-8 w-8 opacity-60" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-20 space-y-4">
        {/* Profile card */}
        <div className="p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-secondary/50 border-2 border-border/30 flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-neon-magenta flex items-center justify-center">
                <Camera className="h-3 w-3 text-white" />
              </button>
            </div>
            <div>
              <p className="font-display font-bold text-lg text-foreground">{profile?.nome} {profile?.cognome}</p>
              <p className="text-xs text-muted-foreground">Autista</p>
              <p className="text-xs text-neon-magenta font-semibold">Global Reco S.r.l.</p>
            </div>
          </div>

          {/* Editable fields */}
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/20 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Truck className="h-3 w-3" /> Targa automezzo
                </p>
                {editingField === "targa_automezzo" ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value.toUpperCase())}
                    onBlur={() => handleSaveField("targa_automezzo")}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveField("targa_automezzo")}
                    className="bg-transparent border-none outline-none text-sm text-foreground font-mono mt-1 w-full"
                  />
                ) : (
                  <p className="text-sm text-foreground font-mono mt-1">{profile?.targa_automezzo || "-"}</p>
                )}
              </div>
              <button onClick={() => { setEditingField("targa_automezzo"); setEditValue(profile?.targa_automezzo || ""); }}>
                <Edit2 className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-secondary/30 border border-border/20 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" /> Autista alternativo
                </p>
                {editingField === "autista_alternativo" ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleSaveField("autista_alternativo")}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveField("autista_alternativo")}
                    className="bg-transparent border-none outline-none text-sm text-foreground font-mono mt-1 w-full"
                  />
                ) : (
                  <p className="text-sm text-foreground font-mono mt-1">{profile?.autista_alternativo || "-"}</p>
                )}
              </div>
              <button onClick={() => { setEditingField("autista_alternativo"); setEditValue(profile?.autista_alternativo || ""); }}>
                <Edit2 className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-2xl bg-card/60 border border-border/30 text-center">
            <FileText className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-display font-bold text-foreground">{firCount}</p>
            <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">FIR Totali</p>
          </div>
          <div className="p-3 rounded-2xl bg-card/60 border border-neon-cyan/20 text-center">
            <Truck className="h-5 w-5 text-neon-cyan mx-auto mb-1" />
            <p className="text-xl font-display font-bold text-foreground">0.0k</p>
            <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">KM Totali</p>
          </div>
          <div className="p-3 rounded-2xl bg-card/60 border border-neon-green/20 text-center">
            <FileText className="h-5 w-5 text-neon-green mx-auto mb-1" />
            <p className="text-xl font-display font-bold text-foreground">0</p>
            <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Ritiri Mese</p>
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-2">
          <div className="p-4 rounded-2xl bg-card/60 border border-border/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <span className="text-sm text-foreground">Notifiche</span>
            </div>
            <div className="w-10 h-5 rounded-full bg-secondary/50 border border-border/30 relative cursor-pointer">
              <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-primary/60 transition-all" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-card/60 border border-border/30 flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-colors">
            <Settings className="h-5 w-5 text-primary" />
            <span className="text-sm text-foreground">Impostazioni App</span>
          </div>

          <button
            onClick={() => setShowGuide(true)}
            className="w-full p-4 rounded-2xl bg-card/60 border border-border/30 flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-colors text-left"
          >
            <HelpCircle className="h-5 w-5 text-primary" />
            <span className="text-sm text-foreground">Assistenza</span>
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={signOut}
          className="w-full py-3 rounded-xl bg-destructive/10 text-destructive font-display text-sm flex items-center justify-center gap-2 hover:bg-destructive/20 transition-colors"
        >
          <LogOut className="h-4 w-4" /> Esci dall'account
        </button>
      </div>

      {/* Guide Modal */}
      {showGuide && (
        <GuideModal steps={guideSteps} onClose={() => setShowGuide(false)} />
      )}

      <BottomNav />
    </MobileShell>
  );
}

function GuideModal({ steps, onClose }: { steps: any[]; onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-card border border-border/30 rounded-2xl max-w-sm w-full p-5 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground text-lg">✕</button>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🚛</span>
          <h2 className="text-lg font-display font-bold text-foreground">Guida Autista FIR</h2>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-between mb-4">
          {steps.map((s, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center mb-1 transition-all ${
                i === currentStep ? `border-primary bg-primary/20` : i < currentStep ? 'border-neon-green bg-neon-green/10' : 'border-border/30'
              }`}>
                <span className="text-sm">{s.icon}</span>
              </div>
              <span className={`text-[8px] font-mono uppercase tracking-wider ${i === currentStep ? s.color : 'text-muted-foreground'}`}>{s.label}</span>
              <span className="text-[7px] text-muted-foreground">{s.sublabel}</span>
            </div>
          ))}
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentStep ? 'w-4 bg-primary' : 'w-1.5 bg-border'}`} />
          ))}
        </div>

        {/* Step content */}
        <div className="p-4 rounded-xl bg-secondary/30 border border-border/20 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{step.icon}</span>
            <div>
              <span className="text-[10px] font-mono bg-primary/20 text-primary px-2 py-0.5 rounded">Passo {currentStep + 1}/{steps.length}</span>
              <p className="font-display font-bold text-foreground mt-0.5">{step.title}</p>
              <p className="text-xs text-muted-foreground">{step.subtitle}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{step.desc}</p>
          <div className="mt-3 p-2 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-xs text-primary flex items-center gap-1.5">💡 {step.tip}</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            disabled={currentStep === 0}
          >
            ‹ Indietro
          </button>
          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-display font-semibold hover:brightness-110 transition-all flex items-center gap-1"
            >
              Avanti ›
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-neon-green/20 text-neon-green text-sm font-display font-semibold hover:bg-neon-green/30 transition-all"
            >
              Chiudi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
