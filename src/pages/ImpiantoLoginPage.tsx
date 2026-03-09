import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import logoDragon from "@/assets/dragon-logo-gold.png";

const TENANT_MAP: Record<string, { id: string; label: string; color: string }> = {
  global: { id: "167d07ad-9184-484e-85a6-da5ceafa42a3", label: "GLOBAL RECO", color: "59, 130, 246" },
  multyproget: { id: "77ec9a3d-a6d4-4235-8e68-1a6f345de57a", label: "MULTYPROGET", color: "249, 115, 22" },
  niyol: { id: "819c783e-4ecf-4774-85b7-7e7a1c5848fa", label: "NIYOL", color: "6, 182, 212" },
};

export default function ImpiantoLoginPage() {
  const navigate = useNavigate();
  const { tenant } = useParams<{ tenant: string }>();
  const ctx = TENANT_MAP[tenant || "global"] || TENANT_MAP.global;

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
        body: { action: "login", email: email.trim().toLowerCase(), password, tenant_id: ctx.id },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Login fallito");

      localStorage.setItem(`impianto_session_${tenant || "global"}`, JSON.stringify(data));
      toast.success(`Benvenuto, ${data.account.ragione_sociale}`);
      navigate(`/area-impianto/${tenant || "global"}/dashboard`);
    } catch (err: any) {
      toast.error(err.message || "Errore di login");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logoDragon} alt="Logo" className="h-20 w-20 mx-auto mb-4" style={{ filter: `drop-shadow(0 0 16px rgba(${ctx.color}, 0.6))` }} />
          <h1 className="font-display text-3xl text-foreground tracking-wider mb-2" style={{ textShadow: `0 0 20px rgba(${ctx.color}, 0.5)` }}>
            AREA IMPIANTO
          </h1>
          <p className="text-sm uppercase tracking-widest font-bold" style={{ color: `rgb(${ctx.color})` }}>
            {ctx.label} — Accesso Riservato
          </p>
        </div>

        <div className="bg-card rounded-2xl p-6" style={{ boxShadow: `0 0 2px rgba(${ctx.color}, 0.6), 0 0 12px rgba(${ctx.color}, 0.3)`, border: `1px solid rgba(${ctx.color}, 0.3)` }}>
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
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2"
                  style={{ ["--tw-ring-color" as any]: `rgba(${ctx.color}, 0.6)` }}
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
                  className="w-full pl-10 pr-12 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2"
                  style={{ ["--tw-ring-color" as any]: `rgba(${ctx.color}, 0.6)` }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-lg font-display font-semibold tracking-wider text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: `rgb(${ctx.color})` }}
            >
              {isSubmitting ? "CARICAMENTO..." : "ACCEDI"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">Area Impianto {ctx.label} • ZOLI DRAGON</p>
      </div>
    </div>
  );
}
