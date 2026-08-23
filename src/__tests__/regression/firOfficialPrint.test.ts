import { describe, expect, it } from "vitest";
import {
  buildDraftFieldValues,
  type FIRAlternativeDraftData,
  type TemplateField,
} from "../../components/fir/FIRAlternativeForm";
import { officialPrintFieldGeometry } from "../../lib/firPrintLayout";

function field(
  id: string,
  name: string,
  page: number,
  x: number,
  y: number,
  width = 35,
  height = 1.5,
): TemplateField {
  return { id, name, page, x, y, width, height, type: "short_text" };
}

describe("stampa del formulario ufficiale", () => {
  it("proietta i campi della vecchia scansione sulle righe del nuovo foglio 1", () => {
    const produttore = officialPrintFieldGeometry(
      field("prod", "denominazione produttore", 1, 20.026, 13.083, 35.157),
    );
    const destinatario = officialPrintFieldGeometry(
      field("dest", "denominazione destinatario", 1, 20.157, 24.294, 35.288),
    );

    expect(produttore.x).toBeCloseTo(17.83, 1);
    expect(produttore.y).toBeCloseTo(8.66, 1);
    expect(destinatario.x).toBeCloseTo(17.96, 1);
    expect(destinatario.y).toBeCloseTo(19.99, 1);
  });

  it("usa la calibrazione distinta del secondo foglio", () => {
    const trasbordo = officialPrintFieldGeometry(
      field("trasbordo", "denominazione trasbordo totale", 2, 20.33, 33.74, 55),
    );
    expect(trasbordo.x).toBeCloseTo(17.35, 1);
    expect(trasbordo.y).toBeCloseTo(32.18, 1);
  });

  it("non copia il produttore nel blocco del nuovo trasportatore a pagina 2", () => {
    const templateField = field(
      "nuovo-trasportatore",
      "denominazione del nuovo trasportatore o del produttore detentore originale",
      2,
      20.11,
      11.62,
    );
    const draft: FIRAlternativeDraftData = {
      produttore_denominazione: "PRODUTTORE PAGINA UNO",
      form_data: { trasbordo_parziale_denominazione: "NUOVO TRASPORTATORE" },
    };

    expect(buildDraftFieldValues([templateField], draft)[templateField.id]).toBe("NUOVO TRASPORTATORE");
  });
});