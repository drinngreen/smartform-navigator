import { createRoot } from "react-dom/client";
import "./index.css";
import { preloadMenuIcons } from "./lib/preloadIcons";
import { ErrorBoundary } from "./components/ErrorBoundary";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root non trovato");

const root = createRoot(rootEl);

try {
  preloadMenuIcons();
} catch (error) {
  console.error("[bootstrap] preloadMenuIcons failed", error);
}

window.addEventListener("unhandledrejection", (event) => {
  console.error("[unhandledrejection]", event.reason);
});

window.addEventListener("error", (event) => {
  console.error("[window.error]", event.error || event.message);
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function bootstrap() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { default: App } = await import("./App");
      root.render(
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      );
      return;
    } catch (error) {
      console.error(`[bootstrap] failed to load App (attempt ${attempt}/3)`, error);
      if (attempt < 3) await sleep(300 * attempt);
    }
  }

  root.render(
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-xl w-full rounded-xl border border-border bg-card p-6 text-center">
        <h1 className="text-xl font-semibold mb-2">Errore di caricamento moduli</h1>
        <p className="text-sm text-muted-foreground">Ricarica la pagina, sto ritentando automaticamente quando un modulo non risponde.</p>
      </div>
    </div>
  );
}

bootstrap();
