import { describe, expect, it } from "vitest";
import { mapStoreToRentriFirPayload } from "@/lib/rentriFirPayloadFromStore";
import { mapFormToRentriPayload } from "@/lib/rentriFormMapper";
import { luogoProduzioneRentri } from "@/lib/rentriLuogoProduzione";

const base = {
  selectedFirNumber: "ZRZXR 000974 BL", produttoreCF: "12347770013",
  produttoreUnitaLocale: "VIA RIVAROSSA 18/20 - 10060 Piscina (TO)",
  destinatarioNumeroAut: "AUT-2", destinatarioTipoAut: "AIA",
  conducenteNomeCognome: "MARIO ROSSI", codiceEER: "170407", quantita: "1000",
};
describe("Cantiere nel campo RENTRI luogo_produzione", () => {
  it("standard separa cantiere Rondissone da unità locale Piscina", async () => {
    const payload = await mapStoreToRentriFirPayload("multy", {
      ...base, cantiereIndirizzo: "Via Capri 1", cantiereComune: "Rondissone", cantiereProvincia: "TO", cantiereCAP: "10030",
    }) as any;
    expect(payload.dati_partenza.produttore.luogo_produzione).toEqual({ indirizzo: "Via Capri 1", cap: "10030", citta: { comune_id: "001221" } });
    expect(payload.dati_partenza.produttore.indirizzo.citta.comune_id).toBe("001195");
  });
  it("alternativo trasmette il campo ministeriale luogo di produzione", async () => {
    const payload = await mapFormToRentriPayload("multy", {
      conducente: "MARIO ROSSI", "luogo di produzione se diverso produttore": "Via Capri 1 - 10030 Rondissone (TO)",
    }) as any;
    expect(payload.dati_partenza.produttore.luogo_produzione).toEqual({ indirizzo: "Via Capri 1", cap: "10030", citta: { comune_id: "001221" } });
  });
  it("non inventa un cantiere quando non è compilato", async () => {
    expect(await luogoProduzioneRentri("")).toBeUndefined();
  });
  it("cantiere non risolvibile blocca l'invio anziché usare Piscina", async () => {
    await expect(mapStoreToRentriFirPayload("multy", { ...base, produttoreLuogoProduzioneDiverso: "Cantiere senza indirizzo" })).rejects.toThrow(/Comune del cantiere/);
  });
});