import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, User, Lock, CreditCard, LockKeyhole } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";

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

export default function AuthPage() {
  const navigate = useNavigate();
  const { user, isLoading, signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    nome: "", cognome: "", codiceFiscale: "", email: "", password: "", confirmPassword: "",
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
      if (isAdminMode) {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          toast.error(error.message.includes("Invalid login") ? "Email o password non validi" : error.message);
        } else {
          toast.success("Accesso admin effettuato!");
        }
        setIsSubmitting(false);
        return;
      }

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
        const { error } = await signIn(generatedEmail, formData.password);
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
        const { error } = await signUp(generatedEmail, formData.password, formData.nome, formData.cognome, formData.codiceFiscale.toUpperCase());
        if (error) {
          toast.error(error.message.includes("already registered") ? "Codice fiscale già registrato" : error.message);
        } else {
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
        <div className="text-primary animate-pulse text-2xl font-display tracking-wider">ZOLI DRAGON</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "linear-gradient(hsl(var(--primary)/0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)/0.3) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl">🐉</div>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-wider">ZOLI DRAGON</h1>
          <p className="text-muted-foreground text-sm mt-1">Command Core</p>
        </div>

        {/* Card */}
        <div className="relative bg-card/80 backdrop-blur-xl border border-border rounded-xl p-6 shadow-2xl">
          <div className="absolute inset-0 rounded-xl border border-primary/20 pointer-events-none" />

          {/* Tab switcher */}
          {!isAdminMode && (
            <div className="flex gap-2 mb-6">
              <button onClick={() => setIsLogin(true)} className={`flex-1 py-3 rounded-md text-sm font-display font-semibold transition-all ${isLogin ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                ACCEDI
              </button>
              <button onClick={() => setIsLogin(false)} className={`flex-1 py-3 rounded-md text-sm font-display font-semibold transition-all ${!isLogin ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                REGISTRATI
              </button>
            </div>
          )}

          {isAdminMode && (
            <div className="mb-6">
              <div className="flex items-center gap-2 text-primary mb-2">
                <LockKeyhole size={18} />
                <span className="font-display font-semibold">Accesso Admin</span>
              </div>
              <button onClick={() => { setIsAdminMode(false); setIsLogin(true); setErrors({}); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                ← Torna al login utente
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isAdminMode && (
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Email</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="admin@example.com" className="w-full pl-10 pr-4 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
            )}

            {!isAdminMode && !isLogin && (
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

            {!isAdminMode && (
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Codice Fiscale</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input type="text" value={formData.codiceFiscale} onChange={(e) => setFormData({ ...formData, codiceFiscale: e.target.value.toUpperCase() })} placeholder="RSSMRA80A01H501X" maxLength={16} className="w-full pl-10 pr-4 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary uppercase" />
                </div>
                {errors.codiceFiscale && <p className="text-destructive text-xs mt-1">{errors.codiceFiscale}</p>}
              </div>
            )}

            {!isAdminMode && !isLogin && (
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Conferma Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="••••••••" className="w-full pl-10 pr-4 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                {errors.confirmPassword && <p className="text-destructive text-xs mt-1">{errors.confirmPassword}</p>}
              </div>
            )}

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

            <button type="submit" disabled={isSubmitting} className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-display font-semibold tracking-wider hover:brightness-110 transition-all disabled:opacity-50">
              {isSubmitting ? "CARICAMENTO..." : isAdminMode ? "ACCEDI COME ADMIN" : isLogin ? "ACCEDI" : "REGISTRATI"}
            </button>
          </form>

          {!isAdminMode && (
            <button onClick={() => { setIsAdminMode(true); setErrors({}); }} className="flex items-center justify-center gap-2 mx-auto mt-4 text-muted-foreground hover:text-foreground transition-colors text-sm">
              <LockKeyhole size={14} /> Accesso Admin
            </button>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">ZOLI DRAGON v1.0.0 • RENTRI Ready</p>
      </div>
    </div>
  );
}
