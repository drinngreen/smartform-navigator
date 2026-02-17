import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import logoDragon from "@/assets/logo-dragon.png";

const ALLOWED_EMAIL = "superadmin@zoli.live";

export default function SuperAdminAuthPage() {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      const e = user.email?.toLowerCase() ?? "";
      if (e === ALLOWED_EMAIL && isAdmin) {
        navigate("/super", { replace: true });
      }
    }
  }, [user, isAdmin, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.toLowerCase() !== ALLOWED_EMAIL) {
      toast.error("Accesso consentito solo a superadmin@zoli.live");
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error("Credenziali non valide");
    } else {
      toast.success("Accesso Super Admin!");
      navigate("/super", { replace: true });
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <img src={logoDragon} alt="Logo" className="h-20 w-20 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <img src={logoDragon} alt="Logo" className="h-20 w-20" style={{ filter: "drop-shadow(0 0 16px rgba(239, 68, 68, 0.6))" }} />
            <Shield className="absolute -top-2 -right-2 text-red-500" size={28} />
          </div>
          <h1 className="font-display text-3xl text-foreground tracking-wider mb-2" style={{ textShadow: "0 0 20px rgba(239, 68, 68, 0.5)" }}>
            SUPER ADMIN
          </h1>
          <p className="text-red-400 text-sm uppercase tracking-widest font-bold">Accesso Riservato</p>
        </div>

        <div className="bg-card rounded-2xl p-6" style={{ boxShadow: "0 0 2px hsl(0, 84%, 60%), 0 0 12px rgba(239, 68, 68, 0.3)", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="superadmin@zoli.live" className="w-full pl-10 pr-4 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-10 pr-12 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full py-3 rounded-lg font-display font-semibold tracking-wider bg-red-600 text-white hover:bg-red-500 transition-all disabled:opacity-50">
              {isSubmitting ? "CARICAMENTO..." : "ACCEDI SUPER ADMIN"}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">Super Admin • ZOLI DRAGON</p>
      </div>
    </div>
  );
}
