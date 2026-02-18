/**
 * Preload all menu icons at app startup to eliminate loading delays.
 * Images are decoded eagerly so they render instantly when needed.
 */

import iconAnalytics from "@/assets/menu-icons/analytics.png";
import iconAppMobile from "@/assets/menu-icons/app_mobile.png";
import iconDashboard from "@/assets/menu-icons/dashboard.png";
import iconDestinatario from "@/assets/menu-icons/destinatario.png";
import iconFatturazione from "@/assets/menu-icons/fatturazione.png";
import iconGestioneFormulari from "@/assets/menu-icons/gestione_formulari.png";
import iconGpsFlotta from "@/assets/menu-icons/gps_flotta.png";
import iconNotifiche from "@/assets/menu-icons/notifiche.png";
import iconPersonale from "@/assets/menu-icons/personale.png";
import iconPrivati from "@/assets/menu-icons/privati.png";
import iconProduttore from "@/assets/menu-icons/produttore.png";
import iconRegistroFir from "@/assets/menu-icons/registro_fir.png";
import iconRentri from "@/assets/menu-icons/rentri.png";
import iconReportChiamate from "@/assets/menu-icons/report_chiamate.png";
import iconZoliMessages from "@/assets/menu-icons/zoli_messages.png";
import zoliLemonIcon from "@/assets/zoli-dark-lemon-icon.png";

const ALL_ICONS = [
  iconAnalytics, iconAppMobile, iconDashboard, iconDestinatario,
  iconFatturazione, iconGestioneFormulari, iconGpsFlotta, iconNotifiche,
  iconPersonale, iconPrivati, iconProduttore, iconRegistroFir,
  iconRentri, iconReportChiamate, iconZoliMessages, zoliLemonIcon,
];

let preloaded = false;

export function preloadMenuIcons() {
  if (preloaded) return;
  preloaded = true;

  ALL_ICONS.forEach((src) => {
    const img = new Image();
    img.decoding = "async";
    img.fetchPriority = "high" as any;
    img.src = src;
  });
}
