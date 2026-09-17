import { describe, it, expect } from "vitest";
import {
  estraiElencoFormulari,
  interpretaFormulario,
  filtraPerPeriodo,
} from "@/lib/rentriFirIntermediario";
import {
  estraiNumeroFir,
  interpretaMovimentoRegistro,
  normalizzaNumeroFir,
} from "@/lib/rentriRegistroIntermediazione";

const CF_MULTY = "12347770013";

/** Payload reale restituito da RENTRI /formulari/v1.0 */
const formularioRentri = {
  codice_eer: "170407",
  data_emissione: "2026-09-16T22:13:37Z",
  destinatari: [{ codice_fiscale: "02398040358", denominazione: "REGGIO ROTTAMI SRL " }],
  intermediari: [{ codice_fiscale: CF_MULTY, denominazione: "MULTY PROGET S.R.L. " }],
  numero_fir: "XNQLK 066314 LK",
  produttore: { codice_fiscale: "08934760961", denominazione: "GLOBALRECO SRL " },
  quantita: 1100,
  stato: "InserimentoAccettazione",
  trasportatori: [{ codice_fiscale: "08934760961", denominazione: "GLOBALRECO SRL" }],
};

describe("formulari RENTRI con noi intermediario", () => {
  it("riconosce l'intermediario anche quando è dentro l'array intermediari[]", () => {
    const [row] = estraiElencoFormulari([formularioRentri]);
    const r = interpretaFormulario(row, CF_MULTY);
    expect(r.siamoIntermediario).toBe(true);
    expect(r.numeroFir).toBe("XNQLK 066314 LK");
    expect(r.intermediarioCf).toBe(CF_MULTY);
    expect(r.produttore).toBe("GLOBALRECO SRL");
    expect(r.destinatario).toBe("REGGIO ROTTAMI SRL");
    expect(r.eer).toBe("170407");
    expect(r.quantitaKg).toBe(1100);
  });

  it("non segna come nostri i formulari con un altro intermediario", () => {
    const altro = { ...formularioRentri, intermediari: [{ codice_fiscale: "00000000000", denominazione: "ALTRI SRL" }] };
    expect(interpretaFormulario(altro, CF_MULTY).siamoIntermediario).toBe(false);
  });

  it("filtra per periodo lato app", () => {
    const r = interpretaFormulario(formularioRentri, CF_MULTY);
    expect(filtraPerPeriodo([r], "2026-01-01", "2026-09-17")).toHaveLength(1);
    expect(filtraPerPeriodo([r], "2026-01-01", "2026-08-31")).toHaveLength(0);
  });
});

describe("movimenti registro intermediazione già trasmessi", () => {
  const movimento = {
    annotazioni: "Rif. FIR XNQLK030854BP",
    annullato: false,
    riferimenti: {
      causale_operazione_cs: "Carico",
      data_ora_registrazione: "2026-03-02T12:00:00Z",
      numero_registrazione: { anno: 2026, identificativo: "M21RYNI00000009OY8KF", progressivo: 805030 },
    },
    rifiuto: { codice_eer: "170405", quantita: { unita_misura: "kg", valore: 500 } },
  };

  it("estrae il numero formulario dalle annotazioni", () => {
    expect(estraiNumeroFir("Rif. FIR XNQLK030854BP")).toBe("XNQLK030854BP");
    expect(estraiNumeroFir("nessun riferimento")).toBeNull();
  });

  it("interpreta il movimento registrato sul RENTRI", () => {
    const m = interpretaMovimentoRegistro(movimento);
    expect(m.chiaveFir).toBe("XNQLK030854BP");
    expect(m.progressivo).toBe(805030);
    expect(m.identificativo).toBe("M21RYNI00000009OY8KF");
    expect(m.quantitaKg).toBe(500);
    expect(m.annullato).toBe(false);
  });

  it("normalizza i numeri FIR scritti con spazi", () => {
    expect(normalizzaNumeroFir("XNQLK 030854 BP")).toBe(normalizzaNumeroFir("XNQLK030854BP"));
  });
});
