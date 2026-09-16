import { describe, expect, it } from "vitest";
import {
  chiaveIndirizzo,
  normalizzaTesto,
  scomponiIndirizzo,
  soggettiDalFormulario,
  descriviEsitoRegistrazione,
} from "@/lib/anagraficaAutoRegistrazione";

describe("registrazione automatica in anagrafica", () => {
  it("scompone l'indirizzo scritto nei formulari", () => {
    expect(scomponiIndirizzo("VIA RIVAROSSA 12 - 10071 BORGARO TORINESE (TO)")).toEqual({
      via: "VIA RIVAROSSA 12",
      cap: "10071",
      comune: "BORGARO TORINESE",
      provincia: "TO",
    });
  });

  it("gestisce l'indirizzo senza parentesi sulla provincia", () => {
    expect(scomponiIndirizzo("Via Roma 10, 10100 Torino TO")).toEqual({
      via: "Via Roma 10",
      cap: "10100",
      comune: "Torino",
      provincia: "TO",
    });
  });

  it("non perde l'indirizzo quando manca il CAP", () => {
    expect(scomponiIndirizzo("Strada Provinciale 5").via).toBe("Strada Provinciale 5");
  });

  it("riconosce come uguali due indirizzi scritti in modo diverso", () => {
    const a = chiaveIndirizzo({ indirizzo: "Via Roma, 10", cap: "10100", comune: "Torino", provincia: "TO" });
    const b = chiaveIndirizzo({ indirizzo: "VIA ROMA 10", cap: "10100", citta: "TORINO", provincia: "to" });
    expect(a).toBe(b);
  });

  it("ignora spazi e punteggiatura nel confronto dei codici fiscali", () => {
    expect(normalizzaTesto(" 123 477.70013 ")).toBe("12347770013");
  });

  it("estrae i soggetti compilati senza ripetere la stessa azienda", () => {
    const soggetti = soggettiDalFormulario({
      produttoreDenominazione: "Multyproget srl",
      produttoreCF: "12347770013",
      produttoreUnitaLocale: "VIA RIVAROSSA 12 - 10071 BORGARO TORINESE (TO)",
      destinatarioDenominazione: "Fermet spa",
      destinatarioCF: "00112233445",
      destinatarioUnitaLocale: "VIA INDUSTRIA 4 - 10040 LEINI (TO)",
      trasportatoreDenominazione: "Multyproget srl",
      trasportatoreCF: "12347770013",
      intermediarioDenominazione: "",
    });
    expect(soggetti.map((s) => s.ruolo)).toEqual(["PRODUTTORE", "DESTINATARIO"]);
  });

  it("non considera i soggetti senza denominazione", () => {
    expect(soggettiDalFormulario({ produttoreDenominazione: "   " })).toHaveLength(0);
  });

  it("descrive l'esito solo quando qualcosa è stato registrato", () => {
    expect(descriviEsitoRegistrazione({ aziendeCreate: [], sediCreate: [], errori: [] })).toBe("");
    expect(
      descriviEsitoRegistrazione({ aziendeCreate: ["Fermet spa"], sediCreate: [], errori: [] }),
    ).toContain("Fermet spa");
  });
});
