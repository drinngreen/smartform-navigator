import { describe, expect, it } from "vitest";
import {
  buildDraftFieldValues,
  type FIRAlternativeDraftData,
  type TemplateField,
} from "../../components/fir/FIRAlternativeForm";
import { officialPrintFieldGeometry } from "../../lib/firPrintLayout";
import { base45Encode, parseNumeroFir } from "../../lib/firPrintDecorations";

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
  it("codifica i byte firmati RENTRI in Base45 secondo RFC 9285", () => {
    expect(base45Encode(Uint8Array.from([0x41, 0x42]))).toBe("BB8");
    expect(base45Encode(Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe("CW4IS801");
  });

  it("accetta solo il blocco FIR ufficiale di cinque lettere", () => {
    expect(parseNumeroFir("ABCDE 001234 CM")).toEqual({ codiceBlocco: "ABCDE", progressivo: "001234" });
    expect(parseNumeroFir("ZRZXR 000772 TM")).toEqual({ codiceBlocco: "ZRZXR", progressivo: "000772" });
    expect(parseNumeroFir("ABCD 001234 CM")).toBeNull();
    expect(parseNumeroFir("ABCDEF 001234 CM")).toBeNull();
  });

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

  it("riporta nel modulo ufficiale i dati principali presenti nel riepilogo", () => {
    const fields = [
      field("prod", "denominazione produttore", 1, 10, 10),
      field("dest", "denominazione destinatario", 1, 10, 20),
      field("trasp", "denominazione trasportatore", 1, 10, 30),
      field("eer", "codice eer", 1, 10, 40),
      field("descrizione", "descrizione rifiuto", 1, 10, 50),
      field("quantita", "quantità", 1, 10, 60),
      field("targa", "targa automezzo", 1, 10, 70),
    ];
    const draft: FIRAlternativeDraftData = {
      produttore_denominazione: "PRODUTTORE TEST",
      destinatario_denominazione: "DESTINATARIO TEST",
      trasportatore_denominazione: "TRASPORTATORE TEST",
      trasportatore_targa_automezzo: "AB123CD",
      codice_eer: "170405",
      descrizione_rifiuto: "Ferro e acciaio",
      quantita: 1250,
    };

    expect(buildDraftFieldValues(fields, draft)).toEqual({
      prod: "PRODUTTORE TEST",
      dest: "DESTINATARIO TEST",
      trasp: "TRASPORTATORE TEST",
      eer: "170405",
      descrizione: "Ferro e acciaio",
      quantita: "1250",
      targa: "AB123CD",
    });
  });
});