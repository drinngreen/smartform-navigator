// Cattura screenshot dell'area di lavoro in modo robusto:
// - limita l'area alla viewport (evita rendering infiniti su pagine enormi)
// - salta iframe/video/canvas esterni e i pannelli Dark Lemon
// - timeout di sicurezza: se html2canvas si blocca, ritorna null invece di appendere l'UI
// - output JPEG compresso per non superare i limiti di payload della Edge Function

const MAX_WIDTH = 1100;
const TIMEOUT_MS = 22000;
const MAX_DATAURL_BYTES = 3_000_000;

export interface WorkspaceShot {
  dataUrl: string;
  type: string;
  name: string;
}

function getWorkspaceElement(): HTMLElement {
  return (
    (document.querySelector("[data-admin-layout] main") as HTMLElement) ||
    (document.querySelector("main") as HTMLElement) ||
    (document.querySelector("[data-page-content]") as HTMLElement) ||
    document.body
  );
}

function shrink(dataUrl: string, factor: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * factor));
      c.height = Math.max(1, Math.round(img.height * factor));
      const ctx = c.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.6));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function captureWorkspaceScreenshot(): Promise<WorkspaceShot | null> {
  try {
    const el = getWorkspaceElement();
    if (!el) return null;

    const { default: html2canvas } = await import("html2canvas");

    const width = Math.min(el.clientWidth || window.innerWidth, window.innerWidth);
    const height = Math.min(el.clientHeight || window.innerHeight, Math.round(window.innerHeight * 1.5));
    const scale = Math.min(1, MAX_WIDTH / Math.max(width, 1));

    const render = html2canvas(el, {
      scale,
      width,
      height,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      useCORS: true,
      logging: false,
      imageTimeout: 2500,
      removeContainer: true,
      foreignObjectRendering: false,
      backgroundColor: "#0b1220",
      ignoreElements: (node) => {
        const e = node as HTMLElement;
        if (!e || !e.tagName) return false;
        const tag = e.tagName.toLowerCase();
        if (tag === "iframe" || tag === "video" || tag === "audio" || tag === "script" || tag === "style" || tag === "noscript") return true;
        if (e.dataset && e.dataset.darkLemon === "true") return true;
        return false;
      },
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    const canvas = await Promise.race([
      render,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), TIMEOUT_MS);
      }),
    ]);
    if (timer) clearTimeout(timer);

    if (!canvas) return null;

    let dataUrl = (canvas as HTMLCanvasElement).toDataURL("image/jpeg", 0.72);
    if (dataUrl.length > MAX_DATAURL_BYTES) dataUrl = await shrink(dataUrl, 0.6);
    if (dataUrl.length > MAX_DATAURL_BYTES) dataUrl = await shrink(dataUrl, 0.5);

    return { dataUrl, type: "image/jpeg", name: "screenshot.jpg" };
  } catch {
    return null;
  }
}
