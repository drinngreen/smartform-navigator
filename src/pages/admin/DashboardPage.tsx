import { Radio, Signal, Phone } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { DesktopIconGrid, type DesktopIconDef } from "@/components/desktop/DesktopIconGrid";
import zoliLemonIcon from "@/assets/zoli-dark-lemon-icon.png";
import intermediazionIcon from "@/assets/intermediazione-icon.png";

import iconGpsFlotta from "@/assets/menu-icons/gps_flotta.png";
import iconPersonale from "@/assets/menu-icons/personale.png";
import iconRegistroFir from "@/assets/menu-icons/registro_fir.png";
import iconRentri from "@/assets/menu-icons/rentri.png";
import iconFatturazione from "@/assets/menu-icons/fatturazione.png";
import iconGestioneFormulari from "@/assets/menu-icons/gestione_formulari.png";
import iconReportChiamate from "@/assets/menu-icons/report_chiamate.png";
import iconZoliMessages from "@/assets/menu-icons/zoli_messages.png";
import iconAnalytics from "@/assets/menu-icons/analytics.png";
import iconAppMobile from "@/assets/menu-icons/app_mobile.png";
import iconNotifiche from "@/assets/menu-icons/notifiche.png";
import iconSms from "@/assets/menu-icons/sms.png";
import iconWhatsapp from "@/assets/menu-icons/whatsapp.png";
import iconEmail from "@/assets/menu-icons/email.png";
import systemPromptIcon from "@/assets/system-prompt-icon.png";

const desktopIcons: DesktopIconDef[] = [
  { id: "gps", label: "GPS Flotta", iconImage: iconGpsFlotta, href: "/admin/gps", color: "6, 182, 212" },
  { id: "personale", label: "Personale", iconImage: iconPersonale, href: "/admin/personale", color: "16, 185, 129" },
  { id: "registro", label: "Registro FIR", iconImage: iconRegistroFir, href: "/admin/registro", color: "249, 115, 22" },
  { id: "formulari", label: "Formulari", iconImage: iconGestioneFormulari, href: "/admin/formulari", color: "34, 197, 94" },
  { id: "gestione-fir", label: "Gestione FIR", iconImage: iconRegistroFir, href: "/admin/gestione-fir", color: "59, 130, 246" },
  { id: "rentri", label: "RENTRI", iconImage: iconRentri, href: "/admin/rentri", color: "236, 72, 153" },
  { id: "fatturazione", label: "Fatturazione", iconImage: iconFatturazione, href: "/admin/fatturazione", color: "20, 184, 166" },
  { id: "chiamate", label: "Report Chiamate", iconImage: iconReportChiamate, href: "/admin/chiamate", color: "34, 197, 94" },
  { id: "messaggi", label: "Zoli Messages", iconImage: iconZoliMessages, href: "/admin/messaggi", color: "244, 114, 182" },
  { id: "sms", label: "SMS", iconImage: iconSms, href: "/admin/sms", color: "59, 130, 246" },
  { id: "whatsapp", label: "WhatsApp", iconImage: iconWhatsapp, href: "/admin/whatsapp", color: "34, 197, 94" },
  { id: "email", label: "Email", iconImage: iconEmail, href: "/admin/email", color: "249, 115, 22" },
  { id: "rubrica", label: "Rubrica", iconImage: iconPersonale, href: "/admin/rubrica", color: "16, 185, 129" },
  { id: "ai", label: "Zoli Dark Lemon", iconImage: zoliLemonIcon, href: "/admin/zoli-dark-lemon", color: "59, 130, 246" },
  { id: "analytics", label: "Analytics", iconImage: iconAnalytics, href: "/admin/analytics", color: "249, 115, 22" },
  { id: "intermediazione", label: "Intermediazione", iconImage: intermediazionIcon, href: "/admin/intermediazione", color: "168, 85, 247" },
  { id: "app", label: "App Mobile", iconImage: iconAppMobile, href: "/admin/app-mobile", color: "251, 191, 36" },
  { id: "notifiche", label: "Notifiche", iconImage: iconNotifiche, href: "/admin/notifiche", color: "239, 68, 68" },
  { id: "system-prompt", label: "System Prompt", iconImage: systemPromptIcon, href: "/admin/system-prompt", color: "251, 191, 36" },
  { id: "social-guests", label: "Ospiti Social", iconImage: iconPersonale, href: "/admin/social-guests", color: "139, 92, 246" },
  { id: "modulo-alt", label: "Modulo Alternativo", iconImage: iconGestioneFormulari, href: "/admin/modulo-alternativo", color: "245, 158, 11" },
];

export default function DashboardPage() {
  const { profile } = useAuth();
  const firstName = profile?.nome?.split(" ")[0] || "Operatore";

  return (
    <AdminLayout title={`Benvenuto, ${firstName}`} subtitle="Centro di Comando Zoli Dragon 2²">
      {/* System Status Bar */}
      <div className="mb-4 flex items-center gap-4 p-3 rounded-2xl bg-gradient-to-r from-card/60 to-transparent border border-border/20 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
          <span className="text-xs font-mono uppercase tracking-wider text-white">Sistema Operativo</span>
        </div>
        <div className="h-4 w-px bg-border/30" />
        <div className="flex items-center gap-2">
          <Signal className="h-3.5 w-3.5 text-white animate-pulse" />
          <span className="text-xs font-mono text-white/80">Connessione Stabile</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-xs font-mono text-white">
          <Radio className="h-3.5 w-3.5 animate-pulse" />
          <span>LIVE DATA</span>
        </div>
      </div>

      <DesktopIconGrid icons={desktopIcons} />
    </AdminLayout>
  );
}
