import { describe, expect, it } from "vitest";
import { interpretaFormulario } from "@/lib/rentriFirIntermediario";
import { ruoliFormulario, statoFormulario } from "@/lib/rentriFirView";

describe("vista formulari RENTRI", () => {
  it("mantiene tutti i ruoli senza confondere società", () => {
    const r = interpretaFormulario({ produttore: { codice_fiscale: "123" }, intermediari: [{ codice_fiscale: "123" }], trasportatori: [{ codice_fiscale: "456" }] }, "123");
    expect(ruoliFormulario(r, "123")).toEqual(["Produttore", "Intermediario"]);
    expect(ruoliFormulario(r, "456")).toEqual(["Trasportatore"]);
    expect(ruoliFormulario(r, "789")).toEqual([]);
    expect(ruoliFormulario(r, "")).toEqual([]);
  });
  it("FIR del blocco FRVKM trasportati dalla società: conto proprio", () => {
    const r = { ...interpretaFormulario({ produttore: { codice_fiscale: "999" }, trasportatori: [{ codice_fiscale: "456" }] }, "456"), numeroFir: "FRVKM 001320 CM" };
    expect(ruoliFormulario(r, "456", "FRVKM")).toEqual(["Conto proprio"]);
    expect(ruoliFormulario({ ...r, numeroFir: "ZRZXR 000010 AB" }, "456", "FRVKM")).toEqual(["Trasportatore"]);
    expect(ruoliFormulario(r, "456")).toEqual(["Trasportatore"]);
  });
  it("non presenta una fase di firma come partenza già firmata", () => {
    expect(statoFormulario("FirmaProduttoreTrasportatoreIniziale")).toContain("da firmare");
    expect(statoFormulario("InserimentoAccettazione")).toContain("verificare dettaglio");
    expect(statoFormulario(null)).toBe("Stato non disponibile");
  });
});