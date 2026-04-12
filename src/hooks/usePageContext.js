import { useLocation } from "react-router-dom";
import { useCallback, useMemo } from "react";

const ROUTE_MAP = [
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

function getPageTitle(pathname) {
  for (const [pattern, title] of ROUTE_MAP) {
    if (pattern.test(pathname)) return title;
  }
  return "Pagina sconosciuta";
}

function extractFormFields() {
  const fields = [];
  const inputs = document.querySelectorAll("main input, main select, main textarea, [data-page-content] input, [data-page-content] select, [data-page-content] textarea");

  inputs.forEach((el) => {
    const input = el;
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

  return fields.slice(0, 30);
}

function extractTableData() {
  const tables = document.querySelectorAll("main table, [data-page-content] table");
  if (tables.length === 0) return "";

  const lines = [];

  tables.forEach((table, tIdx) => {
    if (table.closest("[class*='z-[9999]']")) return;
    if (tIdx > 1) return;

    const headers = Array.from(table.querySelectorAll("thead th")).map((th) => th.textContent?.trim() || "");
    if (headers.length > 0) {
      lines.push(`| ${headers.join(" | ")} |`);
      lines.push(`| ${headers.map(() => "---").join(" | ")} |`);
    }

    const rows = table.querySelectorAll("tbody tr");
    const maxRows = Math.min(rows.length, 10);
    for (let i = 0; i < maxRows; i += 1) {
      const cells = Array.from(rows[i].querySelectorAll("td")).map((td) => td.textContent?.trim()?.substring(0, 40) || "");
      lines.push(`| ${cells.join(" | ")} |`);
    }

    if (rows.length > 10) {
      lines.push(`... e altre ${rows.length - 10} righe`);
    }
  });

  return lines.join("\n");
}

function extractPageText() {
  const main = document.querySelector("main") || document.querySelector("[data-page-content]") || document.body;
  const clone = main.cloneNode(true);

  clone.querySelectorAll("[class*='z-[9999]']").forEach((el) => el.remove());
  clone.querySelectorAll("script, style, svg").forEach((el) => el.remove());

  return clone.innerText
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .substring(0, 2500);
}

export function usePageContext() {
  const location = useLocation();

  const routeInfo = useMemo(() => ({
    route: location.pathname,
    pageTitle: getPageTitle(location.pathname),
  }), [location.pathname]);

  const capturePageContent = useCallback(() => {
    const formFields = extractFormFields();
    const tableData = extractTableData();
    const pageText = extractPageText();

    const parts = [];
    parts.push(`📍 Pagina: ${routeInfo.pageTitle}`);
    parts.push(`📎 Route: ${routeInfo.route}`);

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
