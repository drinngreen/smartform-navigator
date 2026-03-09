import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, Factory } from "lucide-react";
import logoDragon from "@/assets/dragon-logo-gold.png";

export default function ImpiantoLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { toast.error("Inserire email e password"); return; }
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("impianto-auth", {
        body: { action: "login", email: email.trim().toLowerCase(), password },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Login fallito");

      localStorage.setItem("impianto_session", JSON.stringify(data));
      toast.success(`Benvenuto, ${data.account.ragione_sociale}`);
      navigate("/area-impianto/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Errore di login");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <img src={logoDragon} alt="Logo" className="h-20 w-20 mx-auto" style={{ filter: "drop-shadow(0 0 16px rgba(59, 130, 246, 0.6))" }} />
            <Factory className="absolute -top-2 -right-2 text-blue-400" size={28} />
          </div>
          <h1 className="font-display text-3xl text-foreground tracking-wider mb-2" style={{ textShadow: "0 0 20px rgba(59, 130, 246, 0.5)" }}>
            AREA IMPIANTO
          </h1>
          <p className="text-blue-400 text-sm uppercase tracking-widest font-bold">Accesso Riservato Destinatari</p>
        </div>

        {/* Login Form */}
        <div className="bg-card rounded-2xl p-6" style={{ boxShadow: "0 0 2px hsl(217, 91%, 60%), 0 0 12px rgba(59, 130, 246, 0.3)", border: "1px solid rgba(59, 130, 246, 0.3)" }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Email Impianto</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@impianto.it"
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full py-3 rounded-lg font-display font-semibold tracking-wider bg-blue-600 text-white hover:bg-blue-500 transition-all disabled:opacity-50">
              {isSubmitting ? "CARICAMENTO..." : "ACCEDI"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">Area Impianto • ZOLI DRAGON</p>
      </div>
    </div>
  );
}
