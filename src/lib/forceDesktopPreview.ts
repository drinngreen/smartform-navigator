/**
 * Forza il rendering in modalità desktop quando l'app è aperta dentro
 * l'iframe dell'editor (anteprima), ignorando il selettore mobile.
 * I dispositivi mobili reali (non in iframe) non sono toccati.
 */
const DESKTOP_WIDTH = 1440;

function isInEditorPreview(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin: siamo comunque dentro un iframe
    return true;
  }
}

export function forceDesktopPreview(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (!isInEditorPreview()) return;

  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (meta) {
    meta.setAttribute("content", `width=${DESKTOP_WIDTH}, initial-scale=1.0`);
  }

  const styleId = "force-desktop-preview";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      html, body, #root {
        min-width: ${DESKTOP_WIDTH}px;
      }
    `;
    document.head.appendChild(style);
  }

  document.documentElement.setAttribute("data-force-desktop", "true");
}
