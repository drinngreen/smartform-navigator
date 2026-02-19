import { useParams, Navigate } from "react-router-dom";
import { Radio, Signal } from "lucide-react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { DesktopIconGrid, type DesktopIconDef } from "@/components/desktop/DesktopIconGrid";
import { useMNContextStore, MN_CONTEXTS } from "@/stores/mnContextStore";
import { useEffect } from "react";
import zoliLemonIcon from "@/assets/zoli-dark-lemon-icon.png";

import iconGpsFlotta from "@/assets/menu-icons/gps_flotta.png";
import iconPersonale from "@/assets/menu-icons/personale.png";
import iconRegistroFir from "@/assets/menu-icons/registro_fir.png";
import iconRentri from "@/assets/menu-icons/rentri.png";
import iconFatturazione from "@/assets/menu-icons/fatturazione.png";
import iconGestioneFormulari from "@/assets/menu-icons/gestione_formulari.png";
import iconReportChiamate from "@/assets/menu-icons/report_chiamate.png";
import iconZoliMessages from "@/assets/menu-icons/zoli_messages.png";
import iconAnalytics from "@/assets/menu-icons/analytics.png";
import iconNotifiche from "@/assets/menu-icons/notifiche.png";
import iconPrivati from "@/assets/menu-icons/privati.png";
import iconProduttore from "@/assets/menu-icons/produttore.png";
import iconDestinatario from "@/assets/menu-icons/destinatario.png";
import iconSms from "@/assets/menu-icons/sms.png";
import iconWhatsapp from "@/assets/menu-icons/whatsapp.png";
import iconEmail from "@/assets/menu-icons/email.png";
import intermediazionIcon from "@/assets/intermediazione-icon.png";
import systemPromptIcon from "@/assets/system-prompt-icon.png";

function buildIcons(prefix: string): DesktopIconDef[] {
  return [
    { id: "gps", label: "GPS Flotta", iconImage: iconGpsFlotta, href: `${prefix}/gps`, color: "6, 182, 212" },
    { id: "personale", label: "Personale", iconImage: iconPersonale, href: `${prefix}/personale`, color: "16, 185, 129" },
    { id: "registro", label: "Registro FIR", iconImage: iconRegistroFir, href: `${prefix}/registro`, color: "249, 115, 22" },
    { id: "formulari", label: "Formulari", iconImage: iconGestioneFormulari, href: `${prefix}/formulari`, color: "34, 197, 94" },
    { id: "gestione-fir", label: "Gestione FIR", iconImage: iconRegistroFir, href: `${prefix}/gestione-fir`, color: "59, 130, 246" },
    { id: "rentri", label: "RENTRI", iconImage: iconRentri, href: `${prefix}/rentri`, color: "236, 72, 153" },
    { id: "fatturazione", label: "Fatturazione", iconImage: iconFatturazione, href: `${prefix}/fatturazione`, color: "20, 184, 166" },
    { id: "chiamate", label: "Report Chiamate", iconImage: iconReportChiamate, href: `${prefix}/chiamate`, color: "34, 197, 94" },
    { id: "messaggi", label: "Zoli Messages", iconImage: iconZoliMessages, href: `${prefix}/messaggi`, color: "244, 114, 182" },
    { id: "sms", label: "SMS", iconImage: iconSms, href: `${prefix}/sms`, color: "59, 130, 246" },
    { id: "whatsapp", label: "WhatsApp", iconImage: iconWhatsapp, href: `${prefix}/whatsapp`, color: "34, 197, 94" },
    { id: "email", label: "Email", iconImage: iconEmail, href: `${prefix}/email`, color: "249, 115, 22" },
    { id: "rubrica", label: "Rubrica", iconImage: iconPersonale, href: `${prefix}/rubrica`, color: "16, 185, 129" },
    { id: "ai", label: "Zoli Dark Lemon", iconImage: zoliLemonIcon, href: `${prefix}/zoli-dark-lemon`, color: "59, 130, 246" },
    { id: "impianto", label: "Impianto", iconImage: iconPrivati, href: `${prefix}/impianto/privati`, color: "20, 184, 166", subItems: [
      { label: "Privati", iconImage: iconPrivati, href: `${prefix}/impianto/privati`, color: "20, 184, 166" },
      { label: "Produttore", iconImage: iconProduttore, href: `${prefix}/impianto/produttore`, color: "249, 115, 22" },
      { label: "Destinatario", iconImage: iconDestinatario, href: `${prefix}/impianto/destinatario`, color: "59, 130, 246" },
    ] },
    { id: "conferimenti", label: "Conferimenti", iconImage: iconRegistroFir, href: `${prefix}/conferimenti`, color: "249, 115, 22" },
    { id: "pagamenti", label: "Pagamenti", iconImage: iconFatturazione, href: `${prefix}/pagamenti`, color: "239, 68, 68" },
    { id: "trasportatori", label: "Trasportatori", iconImage: iconPersonale, href: `${prefix}/trasportatori`, color: "6, 182, 212" },
    { id: "storico-ricevute", label: "Storico Ricevute", iconImage: iconRegistroFir, href: `${prefix}/storico-ricevute`, color: "168, 85, 247" },
    { id: "intermediazione", label: "Intermediazione", iconImage: intermediazionIcon, href: `${prefix}/intermediazione`, color: "168, 85, 247" },
    { id: "analytics", label: "Analytics", iconImage: iconAnalytics, href: `${prefix}/analytics`, color: "249, 115, 22" },
    { id: "notifiche", label: "Notifiche", iconImage: iconNotifiche, href: `${prefix}/notifiche`, color: "239, 68, 68" },
    { id: "anagrafica", label: "Anagrafica", iconImage: iconPersonale, href: `${prefix}/anagrafica/privati`, color: "168, 85, 247", subItems: [
      { label: "Privati Cittadini", iconImage: iconPrivati, href: `${prefix}/anagrafica/privati`, color: "168, 85, 247" },
    ] },
    { id: "system-prompt", label: "System Prompt", iconImage: systemPromptIcon, href: `${prefix}/system-prompt`, color: "251, 191, 36" },
  ];
}

const validContexts = ["multyproget", "niyol"];

export default function MNContextDashboardPage() {
  const { context } = useParams<{ context: string }>();
  const { profile } = useAuth();
  const setActiveContext = useMNContextStore((s) => s.setActiveContext);

  const isValid = !!context && validContexts.includes(context);
  const mnCtx = MN_CONTEXTS.find((c) => c.id === context) || MN_CONTEXTS[0];

  useEffect(() => {
    if (isValid) {
      setActiveContext(mnCtx);
    }
  }, [context, isValid]);

  if (!isValid) {
    return <Navigate to="/mn/admin" replace />;
  }

  const firstName = profile?.nome?.split(" ")[0] || "Operatore";
  const prefix = `/mn/admin/${context}`;
  const desktopIcons = buildIcons(prefix);
  const contextLabel = context === "multyproget" ? "Multyproget" : "Niyol";

  return (
    <MNAdminLayout title={`${contextLabel} — ${firstName}`} subtitle="Centro di Comando">
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

      <DesktopIconGrid icons={desktopIcons} storageKey={`desktop-icon-positions-mn-${context}`} />
    </MNAdminLayout>
  );
}
