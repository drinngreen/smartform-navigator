import { describe, expect, it } from "vitest";
import { mapStoreToRentriFirPayload } from "@/lib/rentriFirPayloadFromStore";
import { mapFormToRentriPayload } from "@/lib/rentriFormMapper";
import { luogoProduzioneRentri } from "@/lib/rentriLuogoProduzione";
import { elenchiComuni } from "@/lib/comuneIstat";

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
    expect(payload.dati_partenza.produttore.luogo_produzione).toEqual({ indirizzo: "Via Capri", civico: "1", cap: "10030", citta: { comune_id: "001225" } });
    expect(payload.dati_partenza.produttore.indirizzo.citta.comune_id).toBe("001195");
  });
  it("alternativo trasmette il campo ministeriale luogo di produzione", async () => {
    const payload = await mapFormToRentriPayload("multy", {
      conducente: "MARIO ROSSI", "luogo di produzione se diverso produttore": "Via Capri 1 - 10030 Rondissone (TO)",
    }) as any;
    expect(payload.dati_partenza.produttore.luogo_produzione).toEqual({ indirizzo: "Via Capri", civico: "1", cap: "10030", citta: { comune_id: "001225" } });
  });
  it("non inventa un cantiere quando non è compilato", async () => {
    expect(await luogoProduzioneRentri("")).toBeUndefined();
  });
  it("cantiere non risolvibile blocca l'invio anziché usare Piscina", async () => {
    await expect(mapStoreToRentriFirPayload("multy", { ...base, produttoreLuogoProduzioneDiverso: "Cantiere senza indirizzo" })).rejects.toThrow(/Comune del cantiere/);
  });

  const id = async (nome: string, sigla: string) => (await elenchiComuni()).byName[`${nome}|${sigla}`];
  const casi: [string, string, string, string, string][] = [
    ["VIA TRENTO 64 ORBASSANO 10043", "VIA TRENTO", "64", "10043", "ORBASSANO|TO"],
    ["VIALE DELLO SPORT 34, 21026 GAVIRATE VA", "VIALE DELLO SPORT", "34", "21026", "GAVIRATE|VA"],
    ["VIA VIRGILIO MONTINI 67 LUMENZZANE 25065 BS", "VIA VIRGILIO MONTINI", "67", "25065", "LUMEZZANE|BS"],
    ["Piossasco via regione tetti scaglia 9/4 10045", "via regione tetti scaglia", "9/4", "10045", "PIOSSASCO|TO"],
    ["PARCO DI CALISTHENICS  Viale delle Piagge 25  56124  PISA  PI", "Viale delle Piagge", "25", "56124", "PISA|PI"],
    ["VIA ROMA DESTRA 108  30016  JESOLO  VE", "VIA ROMA DESTRA", "108", "30016", "JESOLO|VE"],
    ["VIA ALBA 11 MONCALIERI 10024 TO", "VIA ALBA", "11", "10024", "MONCALIERI|TO"],
    ["VIA BUNIVA 7a 10060 None (TO)", "VIA BUNIVA", "7a", "10060", "NONE|TO"],
  ];
  for (const [testo, via, civico, cap, comune] of casi) {
    it(`testo reale: ${testo}`, async () => {
      const [n, s] = comune.split("|");
      expect(await luogoProduzioneRentri(testo)).toEqual({ indirizzo: via, civico, cap, citta: { comune_id: await id(n, s) } });
    });
  }
  it("non indovina il comune dal solo CAP condiviso", async () => {
    await expect(luogoProduzioneRentri("VIA BUNIVA 7 10060")).rejects.toThrow(/Comune del cantiere/);
  });
  it("comune scritto nel campo apposito non viene cambiato", async () => {
    expect(await luogoProduzioneRentri("Via Trecate 13/B", "Romentino", "NO", "28068")).toEqual({ indirizzo: "Via Trecate", civico: "13/B", cap: "28068", citta: { comune_id: await id("ROMENTINO", "NO") } });
  });
});

describe("Cantiere senza numero civico", () => {
  it("riconosce il comune subito dopo la via", async () => {
    const r = await luogoProduzioneRentri("Via Roma, Piscina (TO)") as any;
    expect(r.citta.comune_id).toBe("001195");
    expect(r.indirizzo).toMatch(/Via Roma/);
  });
  it("riconosce il comune dopo un CAP condiviso", async () => {
    const r = await luogoProduzioneRentri("Loc. Bivio, 10060 Cumiana") as any;
    expect(r.citta.comune_id).toBe("001097");
  });
});
