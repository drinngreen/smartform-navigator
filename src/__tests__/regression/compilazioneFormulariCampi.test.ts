import { describe, expect, it } from "vitest";
import { mnInitialFIRData, useMNFIRStore } from "@/stores/mnFirStore";
import { useFIRStore } from "@/stores/firStore";
import { mapStoreToDatabaseFields } from "@/hooks/useFIRForms";
import { mapStoreToRentriFirPayload } from "@/lib/rentriFirPayloadFromStore";
import { dataOggiLocale, parseQuantitaFir } from "@/lib/firFieldValues";

const baseRentri = {
  ...mnInitialFIRData,
  selectedFirNumber: "ZRZXR 000772 TM",
  produttoreDenominazione: "MULTY PROGET SRL",
  produttoreCF: "12347770013",
  produttoreUnitaLocale: "VIA RIVAROSSA 18/20 - 10060 Piscina (TO)",
  destinatarioDenominazione: "FERMET SRL",
  destinatarioCF: "08934760960",
  destinatarioUnitaLocale: "VIA ROMA 1 - 10060 Piscina (TO)",
  destinatarioNumeroAut: "AUT-2",
  destinatarioTipoAut: "AIA",
  destinatarioCodiceOperazione: "R13",
  trasportatoreDenominazione: "MULTY PROGET SRL",
  trasportatoreCF: "12347770013",
  conducenteNomeCognome: "MARIO ROSSI",
  codiceEER: "170405",
  quantita: "1000",
  dataEmissione: "2026-11-23",
  oraDataInizioTrasporto: "2026-11-24",
  oraInizioTrasporto: "10:45",
};

describe("Compilazione formulari: quantità e date", () => {
  it("legge correttamente decimali e separatori italiani senza troncare o moltiplicare", () => {
    expect(parseQuantitaFir("1.234,56")).toBe(1234.56);
    expect(parseQuantitaFir("20.000")).toBe(20000);
    expect(parseQuantitaFir("75,5")).toBe(75.5);
    expect(parseQuantitaFir("1234.56")).toBe(1234.56);
    expect(() => parseQuantitaFir("abc")).toThrow(/non valida/);
    expect(() => parseQuantitaFir("0")).toThrow(/maggiore di zero/);
  });

  it("usa il giorno italiano, non il giorno UTC precedente", () => {
    expect(dataOggiLocale(new Date("2026-11-23T23:30:00Z"))).toBe("2026-11-24");
  });

  it("conserva kg con virgola, litri e data/ora di arrivo nel salvataggio", () => {
    const saved = mapStoreToDatabaseFields({
      ...mnInitialFIRData,
      quantita: "1.234,56",
      quantitaLitri: "75,5",
      dataOraArrivo: "2026-11-24T12:30",
    });
    expect(saved.quantita).toBe(1234.56);
    expect(saved.form_data).toMatchObject({
      quantita_litri: "75,5",
      arrivo_data_ora: "2026-11-24T12:30",
    });
  });

  it("trasmette la data di inizio trasporto scelta, non quella di emissione", async () => {
    const payload = await mapStoreToRentriFirPayload("multy", baseRentri) as any;
    expect(payload.dati_partenza.dati_trasporto_partenza.data_ora_inizio_trasporto)
      .toBe("2026-11-24T10:45:00+01:00");
  });

  it("trasmette kg con virgola oppure litri, senza inventare 1 kg se manca il peso", async () => {
    const kg = await mapStoreToRentriFirPayload("multy", {
      ...baseRentri,
      quantita: "1.234,56",
    }) as any;
    expect(kg.dati_partenza.rifiuto.quantita).toEqual({ valore: 1234.56, unita_misura: "kg" });

    const litri = await mapStoreToRentriFirPayload("multy", {
      ...baseRentri,
      quantita: "",
      quantitaLitri: "75,5",
    }) as any;
    expect(litri.dati_partenza.rifiuto.quantita).toEqual({ valore: 75.5, unita_misura: "l" });

    await expect(mapStoreToRentriFirPayload("multy", {
      ...baseRentri,
      quantita: "",
      quantitaLitri: "",
    })).rejects.toThrow(/Quantità/);
  });

  it("blocca l'invio se manca la data invece di sostituirla con oggi", async () => {
    await expect(mapStoreToRentriFirPayload("multy", {
      ...baseRentri,
      dataEmissione: "",
      oraDataInizioTrasporto: "",
    })).rejects.toThrow(/Data di inizio trasporto mancante/);
  });
});

describe("Riapertura bozza: nessun campo compilato deve sparire", () => {
  it("ripristina quantità, trasportatore, respingimento e sezioni intermodali", () => {
    const source = {
      ...mnInitialFIRData,
      selectedFirNumber: "ZRZXR 000772 TM",
      quantita: "1250,5",
      quantitaLitri: "80,5",
      trasportatoreDataAlbo: "2026-01-15",
      trasportatoreSituatoIn: "Piscina (TO)",
      trasportatoreNomeAutista: "MARIO ROSSI",
      causaleRespingimento: "Peso non conforme",
      dataOraArrivo: "2026-11-24T12:30",
      dataFineTrasporto: "2026-11-24",
      oraFineTrasporto: "12:30",
      trasbordoTotFirmaConducente: "Firma conducente",
      interTerrDenominazione: "TRASPORTI ROSSI",
      interTerrCF: "12345678901",
      interTerrAlbo: "TO123",
      interTerrConducente: "MARIO ROSSI",
      interTerrTarga: "AA000BB",
      interTerrRimorchio: "CC000DD",
      interFerroDenominazione: "FERROVIE ESEMPIO",
      interFerroIdTreno: "TRENO-1",
      interFerroCF: "10987654321",
      interFerroTratta: "Torino-Milano",
      interFerroRid: true,
      interFerroStazionePartenza: "Torino",
      interFerroStazioneArrivo: "Milano",
      interFerroDataPartenza: "2026-11-24",
      interFerroDataArrivo: "2026-11-25",
      interMareDenominazione: "NAVIGAZIONE ESEMPIO",
      interMareIdNave: "NAVE-1",
      interMareCF: "11223344556",
      interMareImdg: true,
      interMarePortoPartenza: "Genova",
      interMarePortoArrivo: "Napoli",
      interMareDataPartenza: "2026-11-24",
      interMareDataArrivo: "2026-11-26",
    };
    const saved = mapStoreToDatabaseFields(source);
    useMNFIRStore.getState().loadFromDatabase({
      id: "bozza-locale-test",
      ...saved,
      numero_fir: source.selectedFirNumber,
      status: "bozza",
    } as any);
    const restored = useMNFIRStore.getState().data;

    expect(restored).toMatchObject({
      quantita: "1250.5",
      quantitaLitri: "80,5",
      trasportatoreDataAlbo: "2026-01-15",
      trasportatoreSituatoIn: "Piscina (TO)",
      trasportatoreNomeAutista: "MARIO ROSSI",
      causaleRespingimento: "Peso non conforme",
      dataOraArrivo: "2026-11-24T12:30",
      trasbordoTotFirmaConducente: "Firma conducente",
      interTerrDenominazione: "TRASPORTI ROSSI",
      interTerrAlbo: "TO123",
      interTerrTarga: "AA000BB",
      interFerroDenominazione: "FERROVIE ESEMPIO",
      interFerroRid: true,
      interFerroDataArrivo: "2026-11-25",
      interMareDenominazione: "NAVIGAZIONE ESEMPIO",
      interMareImdg: true,
      interMareDataArrivo: "2026-11-26",
    });
  });

  it("ripristina gli stessi campi anche nel secondo tipo di formulario", () => {
    const saved = mapStoreToDatabaseFields({
      ...mnInitialFIRData,
      quantitaLitri: "80,5",
      dataOraArrivo: "2026-11-24T12:30",
      interTerrDenominazione: "TRASPORTI ROSSI",
      interFerroRid: true,
      interMareImdg: true,
    });
    useFIRStore.getState().loadFromDatabase({
      id: "bozza-secondo-modulo-test",
      ...saved,
      numero_fir: "ZRZXR 000772 TM",
      status: "bozza",
    } as any);
    expect(useFIRStore.getState().data).toMatchObject({
      quantitaLitri: "80,5",
      dataOraArrivo: "2026-11-24T12:30",
      interTerrDenominazione: "TRASPORTI ROSSI",
      interFerroRid: true,
      interMareImdg: true,
    });
  });
});

import { mapStoreToDatabaseFields as mapDigitazione } from "@/hooks/useFIRForms";
import { useMNFIRStore as storeDigitazione } from "@/stores/mnFirStore";
describe("digitazione quantità parziale", () => {
  it("non blocca l'autosalvataggio mentre si scrive 12, o 0", () => {
    const base = storeDigitazione.getState().data;
    for (const q of ["12,", "0", "1.", "abc", 15 as unknown as string]) {
      expect(() => mapDigitazione({ ...base, quantita: q })).not.toThrow();
    }
    expect(mapDigitazione({ ...base, quantita: "12," }).quantita).toBeNull();
  });
});
