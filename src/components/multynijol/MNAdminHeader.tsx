import { useMemo, useState, useEffect } from "react";
import { Phone, PhoneOff, MessageSquare, PanelRight, LogOut } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import zoliLemonIcon from "@/assets/zoli-dark-lemon-icon.png";
import { useZoliDarkLemonWidgetStore } from "@/stores/zoliDarkLemonWidgetStore";
import { useFirDaFirmareCount } from "@/hooks/useFirDaFirmareCount";


interface MNAdminHeaderProps {
  title: string;
  subtitle?: string;
}

export function MNAdminHeader({ title, subtitle }: MNAdminHeaderProps) {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isWidgetOpen = useZoliDarkLemonWidgetStore((s) => s.isOpen);
  const toggleWidget = useZoliDarkLemonWidgetStore((s) => s.toggle);
  const isSidePanel = useZoliDarkLemonWidgetStore((s) => s.sidePanel);
  const setSidePanel = useZoliDarkLemonWidgetStore((s) => s.setSidePanel);

  const handleLogout = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  // Detect current context for message routing
  const currentContext = (location.pathname.includes("/mn/admin/niyol")) ? "niyol"
    : (location.pathname.includes("/mn/admin/multyproget") || location.pathname.includes("/mn/admin/dev-multyproget")) ? "multyproget"
    : null;

  const messagesPath = currentContext ? `/mn/admin/${currentContext}/messaggi` : "/mn/admin";

  // Formulari in arrivo da firmare su RENTRI (badge arancione)
  const firDaFirmare = useFirDaFirmareCount(
    currentContext === "niyol" ? "niyol" : currentContext === "multyproget" ? "multy" : null
  );



  const widgetButtonClassName = useMemo(() => {
    return `p-2 rounded-lg border transition-all duration-300 ${
      isWidgetOpen
        ? "bg-blue-500/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
        : "bg-secondary/50 border-border hover:bg-secondary hover:border-blue-500/30"
    }`;
  }, [isWidgetOpen]);

  return (
    <div className="px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-display text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)] tracking-wide">{title}</h1>
        {subtitle && (
          <p className="text-sm text-white/90 font-mono mt-1 drop-shadow-[0_0_6px_rgba(255,255,255,0.3)]">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* AI Widget toggle */}
        <button onClick={toggleWidget} className={widgetButtonClassName} title="Zoli Dark Lemon AI">
          <img src={zoliLemonIcon} alt="AI" className="h-5 w-5" />
        </button>

        {/* Side Panel toggle */}
        <button
          onClick={() => setSidePanel(!isSidePanel)}
          className={`p-2 rounded-lg border transition-all duration-300 ${
            isSidePanel
              ? "bg-green-500/20 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
              : "bg-secondary/50 border-border hover:bg-secondary hover:border-green-500/30"
          }`}
          title="Pannello laterale Dark Lemon"
        >
          <PanelRight className="h-5 w-5 text-white/80" />
        </button>

        {/* Messages */}
        <button
          onClick={() => navigate(messagesPath)}
          className="p-2 rounded-lg bg-secondary/50 border border-border hover:bg-secondary transition-colors"
          title="Messaggi"
        >
          <MessageSquare className="h-5 w-5 text-white/80" />
        </button>

        {/* Notifications */}
        <NotificationBell
          appContext={currentContext === "niyol" ? "mn_niyol" : currentContext === "multyproget" ? "mn_multyproget" : "mn_admin"}
          signCount={firDaFirmare}
          onSignBadgeClick={() => navigate(currentContext ? `/mn/admin/${currentContext}/rentri-console?tab=dafirmare` : "/mn/admin")}
        />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg bg-red-500/10 border border-red-500/40 hover:bg-red-500/20 hover:border-red-500/60 transition-all duration-300"
          title="Logout"
        >
          <LogOut className="h-5 w-5 text-red-400" />
        </button>
      </div>
    </div>
  );
}
