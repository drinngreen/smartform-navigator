import { describe, it, expect } from "vitest";
import { aspettoEsterioreRentri } from "@/lib/rentriFirma";
import { datiTrasportoDaPayload } from "@/services/rentriApi";

describe("aspetto esteriore verso RENTRI", () => {
  it("rinfusa diventa rinfusa=true", () => {
    expect(aspettoEsterioreRentri("rinfusa", "")).toEqual({ rinfusa: true });
  });
  it("colli con numero diventa rinfusa=false e numero_colli", () => {
    expect(aspettoEsterioreRentri("colli", "3")).toEqual({ rinfusa: false, numero_colli: "3" });
  });
  it("nessuna scelta non invia nulla", () => {
    expect(aspettoEsterioreRentri("", "")).toEqual({});
  });
});

describe("dati primo trasporto inviati dopo l'emissione", () => {
  const base = {
    dati_partenza: {
      dati_trasporto_partenza: {
        conducente: { nome: "MUHAREM", cognome: "HALILOVIC" },
        targa_automezzo: "DR328GP",
        data_ora_inizio_trasporto: "2026-10-30T11:21:00Z",
      },
    },
  };
  it("produce conducente, targa e data/ora", () => {
    expect(datiTrasportoDaPayload(base)).toEqual({
      conducente: { nome: "MUHAREM", cognome: "HALILOVIC" },
      targa_automezzo: "DR328GP",
      data_ora_inizio_trasporto: "2026-10-30T11:21:00Z",
    });
  });
  it("senza cognome conducente non invia", () => {
    const p = JSON.parse(JSON.stringify(base));
    p.dati_partenza.dati_trasporto_partenza.conducente.cognome = "";
    expect(datiTrasportoDaPayload(p)).toBeNull();
  });
});
