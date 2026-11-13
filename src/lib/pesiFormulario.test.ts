import { describe, it, expect } from "vitest";
import { pesoPartenzaLocale, pesoDestinoLocale, pesiDaRentri } from "./pesiFormulario";

describe("pesi formulario", () => {
  it("partenza letta anche da quantita_origine", () => {
    expect(pesoPartenzaLocale({ quantita: null, form_data: { quantita_origine: "1000" } })).toBe(1000);
  });
  it("destino a 0 non è un peso valido, usa il registro", () => {
    expect(pesoDestinoLocale({ form_data: { quantita_destino: "0" } }, 830)).toBe(830);
  });
  it("destino mai preso dalla partenza", () => {
    expect(pesoDestinoLocale({ quantita: 500, form_data: {} })).toBeNull();
  });
  it("RENTRI: tonnellate convertite in kg, accettazione separata", () => {
    const r = pesiDaRentri({ numero_fir: "FRVKM 001381 TS", quantita: { valore: 0.5, unita_misura: "t" }, accettazione: { quantita_accettata: { valore: 620, unita_misura: "kg" } } });
    expect(r).toEqual({ numero: "FRVKM001381TS", partenza: 500, destino: 620 });
  });
});
