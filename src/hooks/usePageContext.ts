import { useLocation } from "react-router-dom";
import { useCallback, useMemo } from "react";

export interface PageContext {
  route: string;
  pageTitle: string;
  content?: string;
  formFields?: string[];
  tableData?: string;
}

const ROUTE_MAP: [RegExp, string][] = [
  [/\/formulari/, "Gestione Formulari FIR"],
  [/\/trasportatori/, "Gestione Trasportatori"],
  [/\/aree-riservate/, "Aree Riservate Impianti"],
  [/\/magazzino/, "Magazzino e Giacenze"],
  [/\/privati/, "Anagrafica Privati"],
  [/\/conferimenti/, "Conferimenti Privati"],
  [/\/fatture/, "Fatturazione ERP"],
  [/\/personale/, "Gestione Personale"],
  [/\/social/, "Social / Community"],
  [/\/dark-lemon/, "Dark Lemon AI"],
  [/\/cernite/, "Cernite"],
  [/\/comunicazioni/, "Comunicazioni"],
  [/\/rubrica/, "Rubrica Contatti"],
  [/\/impianti/, "Impianti"],
  [/\/email/, "Email"],
  [/\/mn\/admin\/[\w-]+$/, "Dashboard Principale"],
];

function getPageTitle(pathname: string): string {
  for (const [pattern, title] of ROUTE_MAP) {
    if (pattern.test(pathname)) return title;
  }
  return "Pagina sconosciuta";
}

// ---- Root attivo: se c'è un dialog/sheet/popover aperto (Radix usa portal su body),
// il contesto deve leggere QUELLO, non la pagina sottostante.
function getActiveRoots(): HTMLElement[] {
  const overlays = Array.from(
    document.querySelectorAll<HTMLElement>(
      '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [data-radix-popper-content-wrapper], [role="dialog"]:not([hidden])'
    )
  ).filter((el) => {
    if (el.closest('[data-dark-lemon="true"]')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 40 && r.height > 40;
  });
  if (overlays.length > 0) {
    // solo il più in alto (ultimo nel DOM) e i suoi eventuali figli
    return [overlays[overlays.length - 1]];
  }
  const main =
    (document.querySelector("[data-admin-layout] main") as HTMLElement) ||
    (document.querySelector("main") as HTMLElement) ||
    (document.querySelector("[data-page-content]") as HTMLElement) ||
    document.body;
  return [main];
}

export function hasOpenModal(): boolean {
  const root = getActiveRoots()[0];
  return !!root && root.tagName.toLowerCase() !== "main" && root !== document.body;
}

function extractFormFields(): string[] {
  const fields: string[] = [];
  const roots = getActiveRoots();
  const inputs: Element[] = [];
  roots.forEach((r) => inputs.push(...Array.from(r.querySelectorAll("input, select, textarea"))));
  
  inputs.forEach((el) => {
    const input = el as HTMLInputElement;
    // Skip hidden or widget inputs
    if (input.closest("[class*='z-[9999]']")) return;
    if (input.type === "hidden") return;
    
    const label = input.closest("label")?.textContent?.trim()?.substring(0, 60)
      || input.getAttribute("placeholder")?.substring(0, 60)
      || input.getAttribute("name")
      || input.getAttribute("aria-label");
    
    const value = input.value?.trim();
    if (label && value) {
      fields.push(`${label}: ${value}`);
    } else if (label) {
      fields.push(`${label}: (vuoto)`);
    }
  });
  
  return fields.slice(0, 30); // max 30 fields
}

function extractTableData(): string {
  const roots = getActiveRoots();
  const tables: Element[] = [];
  roots.forEach((r) => tables.push(...Array.from(r.querySelectorAll("table"))));
  if (tables.length === 0) return "";
  
  const lines: string[] = [];
  
  tables.forEach((table, tIdx) => {
    if ((table as HTMLElement).closest("[class*='z-[9999]']")) return;
    if (tIdx > 1) return; // max 2 tables
    
    const headers = Array.from(table.querySelectorAll("thead th")).map(th => th.textContent?.trim() || "");
    if (headers.length > 0) {
      lines.push(`| ${headers.join(" | ")} |`);
      lines.push(`| ${headers.map(() => "---").join(" | ")} |`);
    }
    
    const rows = table.querySelectorAll("tbody tr");
    const maxRows = Math.min(rows.length, 10);
    for (let i = 0; i < maxRows; i++) {
      const cells = Array.from(rows[i].querySelectorAll("td")).map(td => td.textContent?.trim()?.substring(0, 40) || "");
      lines.push(`| ${cells.join(" | ")} |`);
    }
    if (rows.length > 10) {
      lines.push(`... e altre ${rows.length - 10} righe`);
    }
  });
  
  return lines.join("\n");
}

function extractPageText(): string {
  const root = getActiveRoots()[0];
  const clone = root.cloneNode(true) as HTMLElement;
  
  // Remove widget
  clone.querySelectorAll("[class*='z-[9999]']").forEach(el => el.remove());
  // Remove scripts, styles
  clone.querySelectorAll("script, style, svg").forEach(el => el.remove());
  
  const text = clone.innerText
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .substring(0, 2500);
  
  return text;
}

export function usePageContext() {
  const location = useLocation();
  
  const routeInfo = useMemo(() => ({
    route: location.pathname,
    pageTitle: getPageTitle(location.pathname),
  }), [location.pathname]);

  const capturePageContent = useCallback((): PageContext => {
    const formFields = extractFormFields();
    const tableData = extractTableData();
    const pageText = extractPageText();

    const parts: string[] = [];
    parts.push(`📍 Pagina: ${routeInfo.pageTitle}`);
    parts.push(`📎 Route: ${routeInfo.route}`);
    if (hasOpenModal()) {
      parts.push(`🪟 FINESTRA MODALE APERTA: il contenuto qui sotto è quello del popup/dialog attivo, non della pagina sottostante.`);
    }
    
    if (formFields.length > 0) {
      parts.push(`\n📋 Campi form visibili:\n${formFields.join("\n")}`);
    }
    if (tableData) {
      parts.push(`\n📊 Tabelle visibili:\n${tableData}`);
    }
    if (pageText) {
      parts.push(`\n📄 Contenuto pagina:\n${pageText}`);
    }

    return {
      route: routeInfo.route,
      pageTitle: routeInfo.pageTitle,
      content: parts.join("\n").substring(0, 4000),
      formFields,
      tableData,
    };
  }, [routeInfo]);

  return {
    route: routeInfo.route,
    pageTitle: routeInfo.pageTitle,
    capturePageContent,
  };
}
