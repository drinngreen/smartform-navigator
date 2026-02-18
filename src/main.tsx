import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { preloadMenuIcons } from "./lib/preloadIcons";

// Preload all menu icons immediately at startup
preloadMenuIcons();

// Zoli Dragon v1.0.1 - RENTRI Ready - Force rebuild
createRoot(document.getElementById("root")!).render(<App />);
