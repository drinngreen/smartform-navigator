import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Shield, UserPlus } from "lucide-react";
import logoDragon from "@/assets/logo-dragon.png";

export default function SocialGuestAuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inviteCode = searchParams.get("invite");

  const [mode, setMode] = useState<"register" | "login">("register");
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [codiceFiscale, setCodiceFiscale] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteData, setInviteData] = useState<any>(null);

  // Check if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/social");
    });
  }, [navigate]);

  // Validate invite code if present (optional)
  useEffect(() => {
    if (!inviteCode) return;
    (supabase as any)
      .rpc("lookup_social_invite", { p_code: inviteCode })
      .then(({ data }: any) => {
        const invite = Array.isArray(data) ? data[0] : data;
        setInviteData(invite ?? null);
        if (invite?.guest_name) setNome(invite.guest_name);
        if (invite?.guest_cf) setCodiceFiscale(invite.guest_cf);
      });
  }, [inviteCode]);

  const handleRegister = async () => {
    if (!nome.trim() || !cognome.trim() || !codiceFiscale.trim() || !password.trim()) {
      setError("Compila tutti i campi");
      return;
    }
    if (codiceFiscale.length !== 16) {
      setError("Il codice fiscale deve avere 16 caratteri");
      return;
    }
    if (password.length < 6) {
      setError("La password deve avere almeno 6 caratteri");
      return;
    }

    setLoading(true);
    setError("");

    const email = `${codiceFiscale.toLowerCase()}@social.zoli.internal`;

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome, cognome, codice_fiscale: codiceFiscale },
      },
    });

    if (signUpError) {
      if (signUpError.message.includes("already registered")) {
        setError("Codice fiscale già registrato. Prova ad accedere.");
      } else {
        setError(signUpError.message);
      }
      setLoading(false);
      return;
    }

    if (data.user) {
      // Create social-only profile
      await supabase.from("profiles").insert({
        user_id: data.user.id,
        nome,
        cognome,
        codice_fiscale: codiceFiscale.toUpperCase(),
        tenant_id: "167d07ad-9184-484e-85a6-da5ceafa42a3",
        is_social_only: true,
        invited_by: inviteData?.invited_by || null,
      });

      await supabase.from("user_roles").insert({
        user_id: data.user.id,
        role: "user",
      });

      // Mark invite as used if present
      if (inviteData) {
        await supabase
          .from("social_invites")
          .update({ used_by: data.user.id, used_at: new Date().toISOString() })
          .eq("id", inviteData.id);
      }

      navigate("/social");
    }

    setLoading(false);
  };

  const handleLogin = async () => {
    if (!codiceFiscale.trim() || !password.trim()) {
      setError("Inserisci codice fiscale e password");
      return;
    }
    setLoading(true);
    setError("");

    const email = `${codiceFiscale.toLowerCase()}@social.zoli.internal`;
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("Credenziali non valide");
      setLoading(false);
      return;
    }

    navigate("/social");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <img src={logoDragon} alt="" className="h-16 w-16 mx-auto mb-4" style={{ filter: 'drop-shadow(0 0 12px rgba(192, 173, 103, 0.6))' }} />
          <h1 className="text-xl font-mono tracking-wider text-foreground">Social Global Reco</h1>
          <p className="text-xs text-muted-foreground mt-1">Comunità trasportatori — Accesso ospite</p>
        </div>

        {/* Toggle */}
        <div className="flex bg-secondary rounded-lg p-1">
          <button
            onClick={() => { setMode("register"); setError(""); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${mode === "register" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            <UserPlus size={14} className="inline mr-1" /> Registrati
          </button>
          <button
            onClick={() => { setMode("login"); setError(""); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            <Shield size={14} className="inline mr-1" /> Accedi
          </button>
        </div>

        <div className="space-y-3">
          {mode === "register" && (
            <>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome"
                className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-sm"
              />
              <input
                value={cognome}
                onChange={(e) => setCognome(e.target.value)}
                placeholder="Cognome"
                className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-sm"
              />
            </>
          )}
          <input
            value={codiceFiscale}
            onChange={(e) => setCodiceFiscale(e.target.value.toUpperCase())}
            placeholder="Codice Fiscale"
            maxLength={16}
            className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-sm font-mono tracking-wider"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-sm"
          />

          {error && <p className="text-xs text-destructive text-center">{error}</p>}

          <button
            onClick={mode === "register" ? handleRegister : handleLogin}
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold text-sm disabled:opacity-50 hover:brightness-110 transition-all"
          >
            {loading ? "..." : mode === "register" ? "Registrati come Ospite" : "Accedi"}
          </button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Accesso riservato alla community Global Reco
        </p>
      </div>
    </div>
  );
}
