import { describe, it, expect } from "vitest";
import { pesoPartenzaLocale, pesoDestinoLocale, pesiDaRentri, infoPesoDestino } from "./pesiFormulario";

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
    expect(r).toEqual({ numero: "FRVKM001381TS", partenza: 500, destino: 620, stato: null });
  });
  it("RENTRI: lo stato del formulario viene letto", () => {
    const r = pesiDaRentri({ numero_fir: "ZRZXR 000823 FC", stato: "InserimentoAccettazione" });
    expect(r.stato).toBe("InserimentoAccettazione");
    expect(r.destino).toBeNull();
  });
});

describe("motivo del peso a destino mancante", () => {
  const base = { inRegistro: false, rentriLetto: true };
  it("RENTRI non ancora letto: non si afferma niente", () => {
    const i = infoPesoDestino({ pesoDestino: null, inRentri: false, cartaceo: false, inRegistro: false, rentriLetto: false });
    expect(i.stato).toBe("non_verificato");
    expect(i.testo).toBe("non verificato");
  });
  it("già nel registro ma senza kg accettati: lo dice", () => {
    const i = infoPesoDestino({ pesoDestino: null, inRentri: false, cartaceo: false, inRegistro: true, rentriLetto: true });
    expect(i.stato).toBe("registro_senza_peso");
    expect(i.testo).toBe("nel registro, senza peso");
  });
  it("bozza mai inviata: non è 'non accettato', è 'non inviato'", () => {
    const i = infoPesoDestino({ pesoDestino: null, inRentri: false, cartaceo: false, ...base });
    expect(i.stato).toBe("non_inviato");
    expect(i.testo).toBe("non inviato");
  });
  it("FIR cartaceo fuori dal RENTRI: peso da registrare a mano", () => {
    const i = infoPesoDestino({ pesoDestino: null, inRentri: false, cartaceo: true, ...base });
    expect(i.stato).toBe("cartaceo_non_registrato");
    expect(i.testo).toBe("non registrato");
  });
  it("partito e non ancora accettato: in arrivo", () => {
    const i = infoPesoDestino({ pesoDestino: null, inRentri: true, statoRentri: "InserimentoAccettazione", cartaceo: false, ...base });
    expect(i.stato).toBe("in_arrivo");
    expect(i.testo).toBe("in arrivo");
  });
  it("formulario annullato sul RENTRI: lo dice", () => {
    const i = infoPesoDestino({ pesoDestino: null, inRentri: true, statoRentri: "Annullato", cartaceo: false, ...base });
    expect(i.stato).toBe("annullato");
    expect(i.testo).toBe("annullato");
  });
  it("viaggio concluso senza kg accettati: lo dice", () => {
    const i = infoPesoDestino({ pesoDestino: null, inRentri: true, statoRentri: "FIR Concluso", cartaceo: false, ...base });
    expect(i.stato).toBe("peso_non_comunicato");
    expect(i.testo).toBe("senza kg accettati");
  });
  it("con i kg a destino non serve nessuna etichetta", () => {
    const i = infoPesoDestino({ pesoDestino: 530, inRentri: true, cartaceo: false, ...base });
    expect(i.stato).toBe("accettato");
    expect(i.testo).toBe("");
  });
});
