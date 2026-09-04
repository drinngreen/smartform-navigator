/**
 * Stampa del MODULO UFFICIALE del formulario (3 pagine ministeriali) con i dati
 * compilati fino a quel momento, valida sia per il modulo alternativo sia per il
 * modulo standard (MNFIRFormComplete).
 *
 * Le decorazioni obbligatorie (numero FIR in alto e in basso a destra, dicitura di
 * vidimazione virtuale con data/ora di produzione e QR Code RENTRI 28x28 mm) sono
 * prodotte da `firPrintDecorations`.
 */
import { supabase } from "@/lib/supabaseClient";
import pag1 from "@/assets/formulario_pag_1.png";
import pag2 from "@/assets/formulario_pag_2.png";
import pag3 from "@/assets/formulario_pag_3.png";
import {
  buildDraftFieldValues,
  isNumeroFirFieldName,
  type TemplateField,
  type FIRAlternativeDraftData,
} from "@/components/fir/FIRAlternativeForm";
import {
  buildPageDecorationsHtml,
  resolveFirQrDataUrl,
  type PrintCliente,
} from "@/lib/firPrintDecorations";
import { officialPrintFieldGeometry, formatPrintValue } from "@/lib/firPrintLayout";

const PAGE_IMAGES = [pag1, pag2, pag3];

export async function loadOfficialTemplateFields(): Promise<TemplateField[]> {
  const { data } = await supabase
    .from("fir_form_templates")
    .select("fields")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data?.fields as unknown as TemplateField[]) || []).filter(Boolean);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildPagesHtml(
  fields: TemplateField[],
  values: Record<string, string | boolean>,
  numeroFir: string,
  decorationsFor: (page: number) => string,
): string {
  return [1, 2, 3]
    .map((pageNum) => {
      const inner = fields
        .filter((f) => f.page === pageNum)
        .map((field) => {
          if (isNumeroFirFieldName(field.name)) return ""; // stampato dalle decorazioni
          const raw = values[field.id];
          const val = typeof raw === "boolean" ? (raw ? "X" : "") : formatPrintValue(String(raw ?? ""), field.type);
          if (!val) return "";
          const geometry = officialPrintFieldGeometry(field);
          return `<span style="position:absolute;left:${geometry.x}%;top:${geometry.y}%;width:${geometry.width}%;height:${geometry.height}%;display:flex;align-items:center;font-family:'Courier New',monospace;font-size:3.2mm;font-weight:700;line-height:1;color:#12275c;overflow:hidden;white-space:nowrap;padding:0 0.6mm;box-sizing:border-box;">${escapeHtml(val)}</span>`;
        })
        .join("");
      return `<div style="position:relative;page-break-after:always;"><img src="${PAGE_IMAGES[pageNum - 1]}" style="width:100%;height:auto;display:block;" />${inner}${decorationsFor(pageNum)}</div>`;
    })
    .join("");
}


export interface OfficialPrintOptions {
  /** Dati del formulario (stessa forma del record `fir_forms`). */
  draft: FIRAlternativeDraftData;
  numeroFir?: string | null;
  cliente?: PrintCliente | null;
  /** Se true stampa il modulo vuoto (solo decorazioni + numero FIR). */
  blank?: boolean;
}

/**
 * Apre la finestra di stampa con il modulo ufficiale compilato.
 * Ritorna false se il popup è stato bloccato.
 */
export async function printOfficialFir(options: OfficialPrintOptions): Promise<boolean> {
  const { draft, blank } = options;
  const numeroFir = String(options.numeroFir || draft.numero_fir || "").trim();

  const fields = await loadOfficialTemplateFields();
  const values = blank ? {} : buildDraftFieldValues(fields, draft);
  const qrDataUrl = numeroFir
    ? await resolveFirQrDataUrl(numeroFir, options.cliente, { allowLocalFallback: true })
    : null;

  const producedAt = new Date();
  const decorationsFor = (page: number) =>
    buildPageDecorationsHtml({
      numeroFir,
      cliente: options.cliente,
      qrDataUrl,
      producedAt,
      page,
    });

  const pagesHtml = buildPagesHtml(fields, values as Record<string, string | boolean>, numeroFir, decorationsFor);


  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  printWindow.document.write(
    `<html><head><title>FIR ${escapeHtml(numeroFir)}</title><style>@media print{@page{margin:5mm;size:A4;}body{margin:0;}}body{margin:0;padding:0;}</style></head><body>${pagesHtml}</body></html>`,
  );
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 800);
  return true;
}
