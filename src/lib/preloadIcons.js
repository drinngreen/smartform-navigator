/**
 * Preload all menu icons at app startup to eliminate loading delays.
 * Uses dynamic imports so a single 503/failure doesn't crash the entire app.
 */
const ICON_MODULES = [
    () => import("@/assets/menu-icons/analytics.png"),
    () => import("@/assets/menu-icons/app_mobile.png"),
    () => import("@/assets/menu-icons/dashboard.png"),
    () => import("@/assets/menu-icons/destinatario.png"),
    () => import("@/assets/menu-icons/fatturazione.png"),
    () => import("@/assets/menu-icons/gestione_formulari.png"),
    () => import("@/assets/menu-icons/gps_flotta.png"),
    () => import("@/assets/menu-icons/notifiche.png"),
    () => import("@/assets/menu-icons/personale.png"),
    () => import("@/assets/menu-icons/privati.png"),
    () => import("@/assets/menu-icons/produttore.png"),
    () => import("@/assets/menu-icons/registro_fir.png"),
    () => import("@/assets/menu-icons/rentri.png"),
    () => import("@/assets/menu-icons/report_chiamate.png"),
    () => import("@/assets/menu-icons/zoli_messages.png"),
    () => import("@/assets/menu-icons/sms.png"),
    () => import("@/assets/menu-icons/whatsapp.png"),
    () => import("@/assets/menu-icons/email.png"),
    () => import("@/assets/zoli-dark-lemon-icon.png"),
    () => import("@/assets/system-prompt-icon.png"),
];
let preloaded = false;
export function preloadMenuIcons() {
    if (preloaded)
        return;
    preloaded = true;
    ICON_MODULES.forEach((loadIcon) => {
        loadIcon()
            .then((mod) => {
            const src = mod.default;
            const img = new Image();
            img.decoding = "async";
            img.src = src;
        })
            .catch((err) => {
            console.warn("[preloadIcons] failed to load an icon, skipping:", err);
        });
    });
}
