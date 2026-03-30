import { jsx as _jsx } from "react/jsx-runtime";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { preloadMenuIcons } from "./lib/preloadIcons";
import { ErrorBoundary } from "./components/ErrorBoundary";
const rootEl = document.getElementById("root");
if (!rootEl)
    throw new Error("Root element #root non trovato");
window.addEventListener("unhandledrejection", (event) => {
    console.error("[unhandledrejection]", event.reason);
});
window.addEventListener("error", (event) => {
    console.error("[window.error]", event.error || event.message);
});
createRoot(rootEl).render(_jsx(ErrorBoundary, { children: _jsx(App, {}) }));
// Defer non-critical icon preload to idle time (prevents slow black startup)
const schedulePreload = () => {
    try {
        preloadMenuIcons();
    }
    catch (error) {
        console.error("[bootstrap] preloadMenuIcons failed", error);
    }
};
if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(schedulePreload, { timeout: 1200 });
}
else {
    globalThis.setTimeout(schedulePreload, 350);
}
