import type { TemplateField } from "@/components/fir/FIRAlternativeForm";

/**
 * I campi del template sono stati posizionati sulle precedenti scansioni, nelle
 * quali il foglio occupava solo una parte dell'immagine (con margini esterni).
 * Le nuove pagine ufficiali sono invece ritagliate sul foglio A4: convertiamo
 * quindi le coordinate dal vecchio rettangolo-pagina al foglio corrente.
 */
const LEGACY_PAGE_BOUNDS: Record<number, { left: number; top: number; width: number; height: number }> = {
  1: { left: 2.1216407355, top: 5.25, width: 96.4639321075, height: 89.45 },
  2: { left: 5.4455445545, top: 4, width: 90.6647807638, height: 92.25 },
};

const OFFICIAL_PAGE_BOUNDS: Record<number, { left: number; top: number; width: number; height: number }> = {
  1: { left: 2.1216407355, top: 3.9316239316, width: 93.4061694447, height: 89.4444444444 },
  2: { left: 5.4455445545, top: 2.735042735, width: 90.264425234, height: 92.3076923077 },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function officialPrintFieldGeometry(field: TemplateField): Pick<TemplateField, "x" | "y" | "width" | "height"> {
  const source = LEGACY_PAGE_BOUNDS[field.page];
  const target = OFFICIAL_PAGE_BOUNDS[field.page];
  if (!source || !target) {
    return { x: field.x, y: field.y, width: field.width, height: field.height };
  }

  const x = target.left + ((field.x - source.left) / source.width) * target.width;
  const y = target.top + ((field.y - source.top) / source.height) * target.height;
  const width = (field.width / source.width) * target.width;
  const height = (field.height / source.height) * target.height;

  return {
    x: clamp(x, 0, 100),
    y: clamp(y, 0, 100),
    width: clamp(width, 0, 100 - clamp(x, 0, 100)),
    height: clamp(height, 0, 100 - clamp(y, 0, 100)),
  };
}