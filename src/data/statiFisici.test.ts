import { describe, expect, it } from "vitest";
import {
  STATI_FISICI,
  STATI_FISICI_OPTIONS,
  statoFisicoCode,
  statoFisicoDbValue,
  statoFisicoLabel,
  statoFisicoRentri,
} from "@/data/statiFisici";

/**
 * Regola voluta dall'ufficio il 30/10/2026: la tendina degli stati fisici del
 * formulario contiene esattamente e solo queste cinque diciture, in quest'ordine.
 */
const ELENCHO_RICHIESTO = [
  "Fangoso",
  "In polvere o pulverulento",
  "Liquido",
  "Solido",
  "Vischioso sciropposo",
];

describe("tendina stati fisici del formulario", () => {
  it("contiene esattamente le cinque diciture richieste, nell'ordine allegato", () => {
    expect(STATI_FISICI_OPTIONS.map((o) => o.label)).toEqual(ELENCHO_RICHIESTO);
  });

  it("non rimette in tendina le diciture vecchie", () => {
    const etichette = STATI_FISICI_OPTIONS.map((o) => o.label.toLowerCase());
    expect(etichette).not.toContain("solido non pulverulento");
    expect(etichette).not.toContain("solido pulverulento");
    expect(etichette).not.toContain("fangoso palabile");
    expect(etichette).not.toContain("aeriforme");
    expect(etichette).not.toContain("altro");
  });

  it("associa a ogni dicitura il codice ufficiale RENTRI giusto", () => {
    const attesi: Record<string, string> = {
      Fangoso: "FP",
      "In polvere o pulverulento": "SP",
      Liquido: "L",
      Solido: "S",
      "Vischioso sciropposo": "VS",
    };
    for (const stato of STATI_FISICI) {
      expect(attesi[stato.label]).toBe(stato.rentri);
      expect(statoFisicoRentri(stato.code)).toBe(stato.rentri);
      expect(statoFisicoRentri(stato.label)).toBe(stato.rentri);
      expect(statoFisicoRentri(stato.dbValue)).toBe(stato.rentri);
    }
  });

  it("salva in archivio la dicitura e rilegge il codice della tendina", () => {
    expect(statoFisicoDbValue("1")).toBe("in polvere o pulverulento");
    expect(statoFisicoDbValue("7")).toBe("vischioso sciropposo");
    expect(statoFisicoCode("In polvere o pulverulento")).toBe("1");
    expect(statoFisicoCode("vischioso sciropposo")).toBe("7");
    expect(statoFisicoLabel("3")).toBe("Fangoso");
  });

  it("riconosce le diciture vecchie già in archivio senza esporle in tendina", () => {
    expect(statoFisicoCode("solido non pulverulento")).toBe("2");
    expect(statoFisicoCode("solido pulverulento")).toBe("1");
    expect(statoFisicoCode("fangoso palabile")).toBe("3");
    expect(statoFisicoCode("liquido")).toBe("4");
    expect(statoFisicoCode("altro")).toBe("6");
    expect(statoFisicoDbValue("6")).toBe("altro");
    expect(statoFisicoRentri("solido non pulverulento")).toBe("S");
  });

  it("lascia passare i codici RENTRI già corretti e rifiuta le scritte ignote", () => {
    expect(statoFisicoRentri("SP")).toBe("SP");
    expect(statoFisicoRentri("VS")).toBe("VS");
    expect(statoFisicoRentri("")).toBe("");
    expect(statoFisicoRentri("stato a caso")).toBe("");
    expect(statoFisicoCode("")).toBe("");
  });
});
