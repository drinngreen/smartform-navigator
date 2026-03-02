import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { preloadMenuIcons } from "./lib/preloadIcons";
import { ErrorBoundary } from "./components/ErrorBoundary";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root non trovato");

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

createRoot(rootEl).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

