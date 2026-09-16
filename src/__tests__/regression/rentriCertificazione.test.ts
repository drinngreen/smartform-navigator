import { describe, it, expect } from "vitest";
import {
  validaPayloadFirRentri,
  normalizzaPayloadFirRentri,
  normalizzaNumeroFir,
  formatoNumeroFirValido,
  cfValido,
  statoFisicoRentri,
  provenienzaRentri,
  STATO_FISICO_RENTRI,
} from "@/lib/rentriValidazione";
import { mapMovimentiToRentri } from "@/lib/rentriRegistroSync";
import {
  estraiTransazioneId,
  registriDisponibili,
  RENTRI_UNITA_LOCALI,
  RENTRI_ISSUERS,
} from "@/lib/rentriVpsApi";

/**
 * Prove di certificazione RENTRI — nessuna scrittura, nessuna chiamata di rete.
 * Ogni test è la "prova" citata dal referto: se fallisce, il punto NON è certificato.
 */

// Payload FIR realistico (struttura POST /formulari/v1.0) con dati Multyproget reali.
function payloadFirReale(numeroFir = "ZRZXR000001") {
  return {
    dati_partenza: {
      numero_fir: numeroFir,
      produttore: {
        denominazione: "MULTY PROGET S.R.L.",
        codice_fiscale: "12347770013",
        indirizzo: { citta: { comune_id: "001219" } },
      },
      destinatario: {
        denominazione: "GLOBAL RECO S.R.L.",
        codice_fiscale: "08934760961",
        attivita: "R13",
        indirizzo: { citta: { comune_id: "001272" } },
      },
      trasportatori: [
        {
          denominazione: "NIYOL ETICONS LOGISTICA SRL SB",
          codice_fiscale: "09879800010",
          numero_iscrizione_albo: "TO/0643471",
        },
      ],
      rifiuto: {
        codice_eer: "170405",
        descrizione: "Ferro e acciaio",
        stato_fisico: "S",
        provenienza: "S",
        quantita: { valore: 1200, unita_misura: "kg" },
      },
      dati_trasporto_partenza: {
        targa_automezzo: "AB123CD",
        data_ora_inizio_trasporto: "2026-09-16T08:00:00Z",
      },
    },
  };
}

describe("Certificazione RENTRI — payload di emissione FIR", () => {
  it("accetta un payload completo e conforme (prova: nessun errore)", () => {
    const errori = validaPayloadFirRentri(payloadFirReale());
    expect(errori).toEqual([]);
  });

  it("accetta i codici fiscali reali delle tre aziende (checksum ufficiale)", () => {
    expect(cfValido("12347770013")).toBe(true); // Multy Proget
    expect(cfValido("09879800010")).toBe(true); // Niyol
    expect(cfValido("08934760961")).toBe(true); // Global Reco
  });

  it("normalizza il numero FIR a 6 cifre (ZRZXR742 → ZRZXR000742)", () => {
    expect(normalizzaNumeroFir("ZRZXR742")).toBe("ZRZXR000742");
    expect(normalizzaNumeroFir("BPJMG1")).toBe("BPJMG000001");
    expect(normalizzaNumeroFir("FRVKM742QM")).toBe("FRVKM000742QM");
    expect(formatoNumeroFirValido("ZRZXR000742")).toBe(true);
    expect(formatoNumeroFirValido("ZRZXR742")).toBe(false);
  });

  it("blocca i payload non conformi PRIMA dell'invio", () => {
    const casi: Array<[string, Record<string, unknown>, string]> = [
      ["numero FIR mancante", { ...payloadFirReale(""), }, "numero_fir"],
      ["CER non a 6 cifre", (() => { const p = payloadFirReale(); p.dati_partenza.rifiuto.codice_eer = "1704"; return p; })(), "codice_eer"],
      ["quantità nulla", (() => { const p = payloadFirReale(); p.dati_partenza.rifiuto.quantita = { valore: 0, unita_misura: "kg" }; return p; })(), "quantita"],
      ["senza trasportatore", (() => { const p = payloadFirReale(); p.dati_partenza.trasportatori = []; return p; })(), "trasportatori"],
      ["CF destinatario errato", (() => { const p = payloadFirReale(); p.dati_partenza.destinatario.codice_fiscale = "08934760960"; return p; })(), "destinatario.codice_fiscale"],
      ["senza targa", (() => { const p = payloadFirReale(); p.dati_partenza.dati_trasporto_partenza.targa_automezzo = ""; return p; })(), "targa_automezzo"],
    ];
    for (const [nome, payload, campoAtteso] of casi) {
      const errori = validaPayloadFirRentri(normalizzaPayloadFirRentri(payload));
      expect(
        errori.some((e) => e.campo.includes(campoAtteso)),
        `il caso «${nome}» doveva produrre un errore su ${campoAtteso}`,
      ).toBe(true);
    }
  });

  it("normalizza alias liberi verso la codifica ufficiale (stato fisico, provenienza, virgola)", () => {
    expect(statoFisicoRentri("solido non pulverulento")).toBe("S");
    expect(statoFisicoRentri("Solido Polverulento")).toBe("SP");
    expect(statoFisicoRentri("liquido")).toBe("L");
    expect(statoFisicoRentri("non_esiste")).toBe("");
    expect(provenienzaRentri("urbano")).toBe("U");
    expect(provenienzaRentri("speciale")).toBe("S");
    for (const c of STATO_FISICO_RENTRI) expect(statoFisicoRentri(c.toLowerCase())).toBe(c);

    const p = payloadFirReale();
    p.dati_partenza.rifiuto.stato_fisico = "solido non pulverulento";
    p.dati_partenza.rifiuto.provenienza = "speciale";
    p.dati_partenza.rifiuto.quantita = { valore: "1.200,5" as unknown as number, unita_misura: "kg" };
    const n = normalizzaPayloadFirRentri(p);
    const dp = n.dati_partenza as Record<string, unknown>;
    const rif = dp.rifiuto as Record<string, unknown>;
    expect(rif.stato_fisico).toBe("S");
    expect(rif.provenienza).toBe("S");
    expect((rif.quantita as Record<string, unknown>).valore).toBe(1200.5);
    // L'originale non viene toccato
    expect(p.dati_partenza.rifiuto.stato_fisico).toBe("solido non pulverulento");
  });
});

describe("Certificazione RENTRI — movimenti a registro", () => {
  it("esclude righe senza CER o con quantità non positiva e pulisce il CER", () => {
    const out = mapMovimentiToRentri(
      [
        { id: "ok-1", cer: "17.04.05", descrizione_rifiuto: "Ferro", quantita_kg: 100, data_movimento: "2026-09-16", tipo_movimento: "carico", numero_fir: "ZRZXR000001", produttore_denominazione: null, destinatario_denominazione: null, stato_movimento: "effettivo" },
        { id: "ko-cer", cer: null, descrizione_rifiuto: null, quantita_kg: 50, data_movimento: "2026-09-16", tipo_movimento: "carico", numero_fir: null, produttore_denominazione: null, destinatario_denominazione: null, stato_movimento: "effettivo" },
        { id: "ko-qta", cer: "170405", descrizione_rifiuto: null, quantita_kg: 0, data_movimento: "2026-09-16", tipo_movimento: "scarico", numero_fir: null, produttore_denominazione: null, destinatario_denominazione: null, stato_movimento: "effettivo" },
      ],
      "multy",
    );
    expect(out).toHaveLength(1);
    expect(out[0].codice_eer).toBe("170405");
    expect(out[0].tipo_movimento).toBe("CARICO");
    expect(out[0].num_iscr_sito).toBe(RENTRI_UNITA_LOCALI.multy);
    expect(out[0].riferimento_interno).toBe("ok-1");
  });

  it("ogni azienda usa la propria unità locale ufficiale (isolamento)", () => {
    const riga = { id: "x", cer: "170405", descrizione_rifiuto: null, quantita_kg: 1, data_movimento: "2026-09-16", tipo_movimento: "carico", numero_fir: null, produttore_denominazione: null, destinatario_denominazione: null, stato_movimento: "effettivo" };
    expect(mapMovimentiToRentri([riga], "multy")[0].num_iscr_sito).toBe("OP2501XMQ021914-TO0001");
    expect(mapMovimentiToRentri([riga], "niyol")[0].num_iscr_sito).toBe("OP2501SXW021767-TO0001");
    expect(mapMovimentiToRentri([riga], "multyproget")[0].num_iscr_sito).toBe("OP2501XMQ021914-TO0001");
  });
});

describe("Certificazione RENTRI — configurazione e transazioni", () => {
  it("Multy e Niyol hanno issuer e almeno un registro configurato", () => {
    expect(RENTRI_ISSUERS.multy).toBe("12347770013");
    expect(RENTRI_ISSUERS.niyol).toBe("09879800010");
    expect(registriDisponibili("multy").length).toBeGreaterThanOrEqual(3);
    expect(registriDisponibili("niyol").length).toBeGreaterThanOrEqual(1);
    expect(registriDisponibili("multyproget").length).toBeGreaterThanOrEqual(3);
  });

  it("l'id transazione viene estratto comunque sia annidato nella risposta", () => {
    expect(estraiTransazioneId({ transazione_id: "abc-123" })).toBe("abc-123");
    expect(estraiTransazioneId({ data: { transazioneId: "def-456" } })).toBe("def-456");
    expect(estraiTransazioneId({ risposta: { result: { id_transazione: "ghi-789" } } })).toBe("ghi-789");
    expect(estraiTransazioneId({})).toBeNull();
    expect(estraiTransazioneId(null)).toBeNull();
  });
});

describe("Valori ufficiali RENTRI: autorizzazione e attività destinatario", () => {
  it("normalizza il tipo autorizzazione e l'operazione R/D, bloccando i tipi non ufficiali", async () => {
    const { mapStoreToRentriFirPayload } = await import("@/lib/rentriFirPayloadFromStore");
    const base = {
      selectedFirNumber: "ZRZXR 000772 TM",
      produttoreDenominazione: "MULTY PROGET SRL",
      produttoreCF: "12347770013",
      destinatarioDenominazione: "FERMET SRL",
      destinatarioCF: "08934760960",
      codiceEER: "170405",
      quantita: "1000",
      produttoreNumeroAut: "AUT-1",
      produttoreTipoAut: "Art. 208",
      destinatarioNumeroAut: "AUT-2",
      destinatarioTipoAut: "dicitura inventata",
      destinatarioCodiceOperazione: "R 13 - messa in riserva",
    };
    // Il RENTRI esige numero e tipo del destinatario: dicitura non ufficiale => invio bloccato
    await expect(mapStoreToRentriFirPayload("multy", base)).rejects.toThrow(/destinatario/i);

    const valido = { ...base, destinatarioTipoAut: "AIA" };
    const p = (await mapStoreToRentriFirPayload("multy", valido)) as any;
    expect(p.dati_partenza.produttore.autorizzazione).toEqual({ numero: "AUT-1", tipo: "RecSmalArt208" });
    expect(p.dati_partenza.destinatario.autorizzazione).toEqual({ numero: "AUT-2", tipo: "AIA" });
    expect(p.dati_partenza.destinatario.attivita).toBe("R13");

    // Manca del tutto l'autorizzazione del destinatario => invio bloccato con messaggio chiaro
    await expect(
      mapStoreToRentriFirPayload("multy", { ...valido, destinatarioNumeroAut: "", destinatarioTipoAut: "" }),
    ).rejects.toThrow(/Autorizzazione del destinatario mancante/);

    const q = (await mapStoreToRentriFirPayload("multy", {
      ...valido,
      destinatarioCodiceOperazione: "",
      destinatarioOperazione: "D",
      produttoreTipoAut: "AIA",
    })) as any;
    expect(q.dati_partenza.produttore.autorizzazione.tipo).toBe("AIA");
    expect(q.dati_partenza.destinatario.attivita).toBe("D15");
  });
});

describe("Tendina ufficiale delle autorizzazioni (9 voci)", () => {
  const VOCI: Array<[string, string]> = [
    ["Autorizzazione unica per i nuovi impianti di recupero/smaltimento - art. 208 decreto legislativo 3 aprile 2006, n. 152.", "RecSmalArt208"],
    ["Autorizzazione all'esercizio di operazioni di recupero e/o smaltimento dei rifiuti con impianti mobili - art.208, comma 15 del decreto legislativo 3 aprile 2006, n. 152.", "RecSmalImpMobiliArt208"],
    ["Autorizzazione alla realizzazione di impianti di ricerca e sperimentazione - art. 211 del decreto legislativo 3 aprile 2006, n. 152.", "RicercaSperimentazione"],
    ["Autorizzazione Integrata Ambientale - artt. 29-ter e 213 del decreto legislativo 3 aprile 2006, n. 152.", "AIA"],
    ["Operazioni di recupero mediante Comunicazione in 'Procedura Semplificata' - artt.214 e 216 del decreto legislativo 3 aprile 2006, n. 152 e autorizzazione unica ambientale (AUA) - Decreto Presidente Repubblica n.59 del 13 marzo 2013.", "RecProcSemplificata"],
    ["Provvedimenti che autorizzano le operazioni di bonifica, ai sensi del comma 7 dell'art. 242 del decreto legislativo 3 aprile 2006, n. 152.", "OpBonifica"],
    ["Autorizzazioni 'straordinarie' art. 191 del decreto legislativo 3 aprile 2006, n. 152.", "Straordinario"],
    ["Comunicazione al trattamento di rifiuti e materiali in impianti di trattamento di acque reflue urbane - art. 110 c.3 del D.Lgs. 152/2006.", "ComTrattamentoAcqueReflue"],
    ["Autorizzazione al trattamento di rifiuti liquidi in impianti di trattamento di acque reflue urbane - artt. 110 c.2 con provvedimento secondo artt. 208 oppure 29-ter e 213 del D.Lgs. 152/2006.", "AutTrattamentoAcqueReflue"],
  ];

  it.each(VOCI)("riconosce «%s»", async (testo, atteso) => {
    const payload = await mapStoreToRentriFirPayload("multyproget", {
      ...baseStore,
      destinatarioNumeroAut: "AUA 302-11752",
      destinatarioTipoAut: testo,
    });
    const dp = payload.dati_partenza as Record<string, any>;
    expect(dp.destinatario.autorizzazione.tipo).toBe(atteso);
  });
});
