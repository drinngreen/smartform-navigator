import { describe, it, expect } from "vitest";
import {
  confrontaConRegistro,
  dataExcelToIso,
  normalizzaChiaveFir,
  versoMovimento,
  type FormularioElenco,
} from "@/lib/confrontoFormulariExcel";

const riga = (p: Partial<FormularioElenco>): FormularioElenco => ({
  numeroFir: "ZRZXR 000793 KD",
  chiave: "ZRZXR000793KD",
  dataEmissione: "2026-09-14",
  cer: "150106",
  descrizione: null,
  produttore: "MULTY PROGET S.R.L.",
  destinatario: "METALFER SRL",
  quantitaKg: 4000,
  statoFormulario: "Ufficiale",
  tipo: "Uscita",
  numeroInterno: null,
  ...p,
});

describe("confronto elenchi formulari", () => {
  it("normalizza il numero formulario ignorando spazi e maiuscole", () => {
    expect(normalizzaChiaveFir("zrzxr 000793 kd")).toBe("ZRZXR000793KD");
  });

  it("converte le date Excel in formato ISO", () => {
    expect(dataExcelToIso("14/09/2026")).toBe("2026-09-14");
    expect(dataExcelToIso("2026-09-14")).toBe("2026-09-14");
    expect(dataExcelToIso(null)).toBeNull();
  });

  it("separa presenti, mancanti e bozze", () => {
    const elenco = [
      riga({}),
      riga({ numeroFir: "ZRZXR 000701 DD", chiave: "ZRZXR000701DD" }),
      riga({ numeroFir: "FRVKM 001137 NQ", chiave: "FRVKM001137NQ", statoFormulario: "Bozza" }),
    ];
    const esito = confrontaConRegistro(elenco, new Set(["ZRZXR000701DD"]));
    expect(esito.presenti.map((r) => r.chiave)).toEqual(["ZRZXR000701DD"]);
    expect(esito.mancanti.map((r) => r.chiave)).toEqual(["ZRZXR000793KD"]);
    expect(esito.bozze.map((r) => r.chiave)).toEqual(["FRVKM001137NQ"]);
  });

  it("deduce carico e scarico", () => {
    expect(versoMovimento("Ingresso", "MULTY PROGET S.R.L.")).toBe("CARICO");
    expect(versoMovimento("Uscita", "METALFER SRL")).toBe("SCARICO");
    expect(versoMovimento(null, "MULTY PROGET S.R.L.")).toBe("CARICO");
  });
});
