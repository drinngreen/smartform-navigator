import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Factory, LogIn, Eye, EyeOff } from "lucide-react";

export default function ImpiantoLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { toast.error("Inserire email e password"); return; }
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("impianto-auth", {
        body: { action: "login", email: email.trim().toLowerCase(), password },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Login fallito");

      // Save session to localStorage
      localStorage.setItem("impianto_session", JSON.stringify(data));
      toast.success(`Benvenuto, ${data.account.ragione_sociale}`);
      navigate("/area-impianto/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Errore di login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-500/20 border-2 border-blue-500/50 mb-4"
               style={{ boxShadow: "0 0 30px rgba(59,130,246,0.3)" }}>
            <Factory className="h-10 w-10 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Area Riservata Impianto</h1>
          <p className="text-sm text-slate-400 mt-1">Accedi per visualizzare i formulari ricevuti</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5 p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Email Impianto</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@impianto.it"
              className="mt-1 bg-secondary/50 border-border"
              autoFocus
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Password</Label>
            <div className="relative mt-1">
              <Input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-secondary/50 border-border pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white">
            {loading ? "Accesso..." : <><LogIn className="h-4 w-4 mr-2" /> Accedi</>}
          </Button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          Powered by Zoli Dragon · Piattaforma Gestione Rifiuti
        </p>
      </div>
    </div>
  );
}
