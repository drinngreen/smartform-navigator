import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Shield, LogOut, ChevronDown, AlertTriangle, ExternalLink } from "lucide-react";
import { FIRPoolSection } from "@/components/superadmin/FIRPoolSection";
import { DigitalSignatureSection } from "@/components/superadmin/DigitalSignatureSection";
import { RegistroCarScarSection } from "@/components/superadmin/RegistroCarScarSection";
import { RENTRILogConsole } from "@/components/superadmin/RENTRILogConsole";
import { SystemPromptReviewSection } from "@/components/superadmin/SystemPromptReviewSection";
import { RENTRIActionsPanel } from "@/components/superadmin/RENTRIActionsPanel";
import { healthCheck } from "@/lib/rentriSuperApi";
import { ngrokHealthCheck } from "@/lib/rentriNgrokApi";
import logoDragon from "@/assets/logo-dragon.png";

const TENANTS = [
  { id: "global", label: "Global Reco", color: "bg-emerald-600" },
  { id: "multy", label: "Multy Proget", color: "bg-orange-600" },
  { id: "niyol", label: "Niyol", color: "bg-cyan-600" },
];

const ADMIN_LINKS = [
  { label: "Admin Global Reco", path: "/admin" },
  { label: "Admin Multy Niyol", path: "/mn/admin" },
];

const ALLOWED_EMAIL = "superadmin@zoli.live";

export default function SuperAdminDashboard() {
  const { user, isAdmin, isLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTenant, setActiveTenant] = useState(TENANTS[0]);
  const [showTenantMenu, setShowTenantMenu] = useState(false);
  const [railwayUp, setRailwayUp] = useState<boolean | null>(null);
  const [ngrokUp, setNgrokUp] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoading) {
      const e = user?.email?.toLowerCase() ?? "";
      if (!user || !isAdmin || e !== ALLOWED_EMAIL) {
        navigate("/superadmin", { replace: true });
      }
    }
  }, [user, isAdmin, isLoading, navigate]);

  useEffect(() => {
    healthCheck().then((r) => setRailwayUp(r.ok));
    ngrokHealthCheck().then((r) => setNgrokUp(r.ok));
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate("/superadmin", { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <img src={logoDragon} alt="" className="h-16 w-16 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Production banner */}
      <div className="bg-red-700 text-white text-center py-2 px-4 font-display text-sm tracking-wider flex items-center justify-center gap-2">
        <AlertTriangle size={16} />
        STAI OPERANDO SUL PORTALE REALE RENTRI — MODALITÀ PRODUZIONE
        <AlertTriangle size={16} />
      </div>

      {/* Top nav */}
      <header className="border-b border-border bg-card px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="text-red-500" size={22} />
            <span className="font-display text-lg tracking-wider">SUPER ADMIN</span>
          </div>

          {/* Tenant switcher */}
          <div className="relative">
            <button onClick={() => setShowTenantMenu(!showTenantMenu)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border hover:bg-secondary transition-all"
            >
              <span className={`w-3 h-3 rounded-full ${activeTenant.color}`} />
              <span className="text-sm font-semibold">{activeTenant.label}</span>
              <ChevronDown size={14} />
            </button>
            {showTenantMenu && (
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 min-w-[200px]">
                {TENANTS.map((t) => (
                  <button key={t.id} onClick={() => { setActiveTenant(t); setShowTenantMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-secondary/50 transition-all first:rounded-t-lg last:rounded-b-lg"
                  >
                    <span className={`w-3 h-3 rounded-full ${t.color}`} />
                    {t.label}
                  </button>
                ))}
                <div className="border-t border-border" />
                {ADMIN_LINKS.map((l) => (
                  <button key={l.path} onClick={() => navigate(l.path)}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-secondary/50 transition-all text-muted-foreground"
                  >
                    <ExternalLink size={14} /> {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Railway status */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${railwayUp === true ? "bg-green-500" : railwayUp === false ? "bg-red-500" : "bg-yellow-500 animate-pulse"}`} />
              Railway {railwayUp === true ? "Online" : railwayUp === false ? "Offline" : "..."}
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${ngrokUp === true ? "bg-green-500" : ngrokUp === false ? "bg-red-500" : "bg-yellow-500 animate-pulse"}`} />
              Ngrok {ngrokUp === true ? "Online" : ngrokUp === false ? "Offline" : "..."}
            </div>
          </div>
        </div>

        <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
          <LogOut size={16} /> Logout
        </button>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <RENTRIActionsPanel tenant={activeTenant.id} />
        <SystemPromptReviewSection />
        <FIRPoolSection tenant={activeTenant.id} />
        <DigitalSignatureSection tenant={activeTenant.id} />
        <RegistroCarScarSection tenant={activeTenant.id} />
        <RENTRILogConsole />
      </main>
    </div>
  );
}
