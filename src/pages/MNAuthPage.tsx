import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Eye, EyeOff, User, Lock, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import logoDragon from "@/assets/logo-dragon.png";

const MULTYNIYOL_TENANT_ID = "dc2a6046-d9a8-4549-8e45-82367d695ac6";

const CONTEXT_CONFIG = {
  multyproget: {
    title: "Multyproget Trasporti",
    orgId: "0d9cd11c-4ca8-4e5f-90ab-1529899124b5",
    accent: "hsl(25, 95%, 53%)",
    accentGlow: "rgba(249, 115, 22, 0.5)",
    borderColor: "rgba(249, 115, 22, 0.25)",
  },
  niyol: {
    title: "Niyol Trasporti",
    orgId: "b3eae77a-e973-425d-b7fb-283007583e72",
    accent: "hsl(187, 92%, 69%)",
    accentGlow: "rgba(6, 182, 212, 0.5)",
    borderColor: "rgba(6, 182, 212, 0.25)",
  },
} as const;

type MNContext = keyof typeof CONTEXT_CONFIG;

const loginSchema = z.object({
  codiceFiscale: z.string().length(16, "Codice fiscale deve avere 16 caratteri"),
  password: z.string().min(6, "Password deve avere almeno 6 caratteri"),
});

const signupSchema = z.object({
  nome: z.string().min(2, "Nome richiesto"),
  cognome: z.string().min(2, "Cognome richiesto"),
  codiceFiscale: z.string().length(16, "Codice fiscale deve avere 16 caratteri"),
  password: z.string().min(6, "Password deve avere almeno 6 caratteri"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non corrispondono",
  path: ["confirmPassword"],
});

const generateEmailFromCF = (codiceFiscale: string) => {
  return `${codiceFiscale.toLowerCase()}@zoli.internal`;
};

export default function MNAuthPage() {
  const navigate = useNavigate();
  const { context: paramContext } = useParams<{ context?: string }>();
  const context: MNContext = (paramContext === "multyproget" || paramContext === "niyol") ? paramContext : "multyproget";
  const config = CONTEXT_CONFIG[context];
  
  const { user, isLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    nome: "", cognome: "", codiceFiscale: "", password: "", confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isLoading && user) navigate("/");
  }, [user, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      const generatedEmail = generateEmailFromCF(formData.codiceFiscale);

      if (isLogin) {
        const result = loginSchema.safeParse({ codiceFiscale: formData.codiceFiscale, password: formData.password });
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => { if (err.path[0]) fieldErrors[err.path[0] as string] = err.message; });
          setErrors(fieldErrors);
          setIsSubmitting(false);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({ email: generatedEmail, password: formData.password });
        if (error) {
          toast.error(error.message.includes("Invalid login") ? "Codice fiscale o password non validi" : error.message);
        } else {
          toast.success("Accesso effettuato!");
        }
      } else {
        const result = signupSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => { if (err.path[0]) fieldErrors[err.path[0] as string] = err.message; });
          setErrors(fieldErrors);
          setIsSubmitting(false);
          return;
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: generatedEmail,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { nome: formData.nome, cognome: formData.cognome, codice_fiscale: formData.codiceFiscale.toUpperCase() },
          },
        });

        if (authError) {
          toast.error(authError.message.includes("already registered") ? "Codice fiscale già registrato" : authError.message);
          setIsSubmitting(false);
          return;
        }

        if (authData.user) {
          await supabase.from("profiles").insert({
            user_id: authData.user.id,
            nome: formData.nome,
            cognome: formData.cognome,
            codice_fiscale: formData.codiceFiscale.toUpperCase(),
            tenant_id: MULTYNIYOL_TENANT_ID,
            mn_context: context,
          });

          await supabase.from("user_roles").insert({ user_id: authData.user.id, role: "user" });

          await supabase.from("memberships").insert({
            user_id: authData.user.id,
            organization_id: config.orgId,
            role: "operator",
          });

          toast.success("Registrazione completata!");
        }
      }
    } catch {
      toast.error("Errore durante l'operazione");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <img src={logoDragon} alt="Logo" className="h-20 w-20" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-30" style={{
        backgroundImage: 'linear-gradient(rgba(192, 173, 103, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(192, 173, 103, 0.04) 1px, transparent 1px)',
        backgroundSize: '50px 50px',
      }} />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={logoDragon} alt="Logo" className="h-20 w-20 animate-float" style={{ filter: `drop-shadow(0 0 12px ${config.accentGlow})` }} />
          </div>
          <h1 className="font-display font-normal text-3xl text-foreground tracking-wider mb-2" style={{ textShadow: `0 0 20px ${config.accentGlow}` }}>
            {config.title.toUpperCase()}
          </h1>
          <p className="text-muted-foreground text-sm uppercase tracking-widest">
            Accesso Trasportatori
          </p>
        </div>

        <div className="relative bg-card rounded-[2rem] p-6 overflow-hidden" style={{
          boxShadow: `0 0 2px ${config.accent}, 0 0 12px ${config.accentGlow}`,
          border: `1px solid ${config.borderColor}`,
        }}>
          {/* Tab switcher */}
          <div className="flex gap-1 bg-secondary/30 p-1 rounded-lg mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className="flex-1 py-3 rounded-md text-sm font-display font-semibold transition-all"
              style={isLogin ? { background: config.accent, color: "hsl(var(--primary-foreground))" } : {}}
            >
              ACCEDI
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className="flex-1 py-3 rounded-md text-sm font-display font-semibold transition-all text-muted-foreground hover:text-foreground"
              style={!isLogin ? { background: config.accent, color: "hsl(var(--primary-foreground))" } : {}}
            >
              REGISTRATI
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Nome</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input type="text" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Mario" className="w-full pl-10 pr-4 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  {errors.nome && <p className="text-destructive text-xs mt-1">{errors.nome}</p>}
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Cognome</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input type="text" value={formData.cognome} onChange={(e) => setFormData({ ...formData, cognome: e.target.value })} placeholder="Rossi" className="w-full pl-10 pr-4 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  {errors.cognome && <p className="text-destructive text-xs mt-1">{errors.cognome}</p>}
                </div>
              </>
            )}

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Codice Fiscale</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input type="text" value={formData.codiceFiscale} onChange={(e) => setFormData({ ...formData, codiceFiscale: e.target.value.toUpperCase() })} placeholder="RSSMRA80A01H501X" maxLength={16} className="w-full pl-10 pr-4 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary uppercase" />
              </div>
              {errors.codiceFiscale && <p className="text-destructive text-xs mt-1">{errors.codiceFiscale}</p>}
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" className="w-full pl-10 pr-12 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-destructive text-xs mt-1">{errors.password}</p>}
            </div>

            {!isLogin && (
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Conferma Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="••••••••" className="w-full pl-10 pr-4 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                {errors.confirmPassword && <p className="text-destructive text-xs mt-1">{errors.confirmPassword}</p>}
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="w-full py-3 rounded-lg font-display font-semibold tracking-wider hover:brightness-110 transition-all disabled:opacity-50" style={{ background: config.accent, color: "hsl(var(--primary-foreground))" }}>
              {isSubmitting ? "CARICAMENTO..." : isLogin ? "ACCEDI" : "REGISTRATI"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">{config.title} • ZOLI DRAGON v1.0.0</p>
      </div>
    </div>
  );
}
