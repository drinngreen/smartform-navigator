import { describe, expect, it } from "vitest";
import {
  MULTY_CF,
  cutoffGiacenzeDaFir,
  scaricoProduttoreAmmesso,
} from "@/lib/firProduttoreGiacenza";

// Cutoff fissato a oggi ore 08:00 italiane: le prove usano un cutoff esplicito
// corrispondente al 16/09/2026 08:00 CEST = 06:00 UTC.
const CUTOFF = new Date("2026-09-16T06:00:00Z");

const base = {
  numero_fir: "ZRZXR 000800 AB",
  codice_eer: "120102",
  quantita: 1000,
  produttore_cf: MULTY_CF,
  produttore_indirizzo: "VIA RIVAROSSA 18-20",
};

describe("scarico giacenze da FIR con Multyproget produttore — solo da oggi ore 08:00", () => {
  it("il cutoff è oggi alle 08:00 ora italiana", () => {
    const c = cutoffGiacenzeDaFir("2026-09-16");
    // 16 settembre 2026: ora legale (UTC+2) → 08:00 Roma = 06:00 UTC
    expect(c.toISOString()).toBe("2026-09-16T06:00:00.000Z");
  });

  it("accetta un formulario di oggi dopo le 08:00", () => {
    const v = scaricoProduttoreAmmesso({ ...base, data_emissione: "2026-09-16T10:30:00+02:00" }, CUTOFF);
    expect(v.ok).toBe(true);
  });

  it("accetta un formulario esattamente alle 08:00", () => {
    const v = scaricoProduttoreAmmesso({ ...base, data_emissione: "2026-09-16T08:00:00+02:00" }, CUTOFF);
    expect(v.ok).toBe(true);
  });

  it("rifiuta un formulario di stamattina prima delle 08:00", () => {
    const v = scaricoProduttoreAmmesso({ ...base, data_emissione: "2026-09-16T07:59:00+02:00" }, CUTOFF);
    expect(v.ok).toBe(false);
    expect(v.motivo).toContain("08:00");
  });

  it("rifiuta un formulario di ieri (storico)", () => {
    const v = scaricoProduttoreAmmesso({ ...base, data_emissione: "2026-09-15T18:00:00+02:00" }, CUTOFF);
    expect(v.ok).toBe(false);
  });

  it("rifiuta se il produttore non è Multyproget", () => {
    const v = scaricoProduttoreAmmesso(
      { ...base, produttore_cf: "09879800010", data_emissione: "2026-09-16T10:30:00+02:00" },
      CUTOFF,
    );
    expect(v.ok).toBe(false);
    expect(v.motivo).toContain("Multyproget");
  });

  it("rifiuta un carico partito da un cantiere e non dalla sede di via Rivarossa", () => {
    const v = scaricoProduttoreAmmesso(
      {
        ...base,
        produttore_indirizzo: "VIA TORINO 5 — CANTIERE",
        data_emissione: "2026-09-16T10:30:00+02:00",
      },
      CUTOFF,
    );
    expect(v.ok).toBe(false);
    expect(v.motivo).toContain("cantiere");
  });

  it("rifiuta il formulario BPJMG 000488 LL: nome Multyproget ma codice fiscale Niyol", () => {
    const v = scaricoProduttoreAmmesso(
      {
        numero_fir: "BPJMG000488LL",
        codice_eer: "120102",
        quantita: 10000,
        produttore_cf: "09879800010",
        produttore_nome: "MULTYPROGET SRL",
        produttore_indirizzo: "VIA RIVAROSSA 18-20",
        data_emissione: "2026-09-16T06:15:22Z",
      },
      CUTOFF,
    );
    expect(v.ok).toBe(false);
  });

  it("rifiuta senza data/ora leggibile", () => {
    const v = scaricoProduttoreAmmesso({ ...base, data_emissione: "" }, CUTOFF);
    expect(v.ok).toBe(false);
  });

  it("rifiuta senza CER o con quantità nulla anche se l'orario è valido", () => {
    const quando = "2026-09-16T10:30:00+02:00";
    expect(scaricoProduttoreAmmesso({ ...base, codice_eer: "", data_emissione: quando }, CUTOFF).ok).toBe(false);
    expect(scaricoProduttoreAmmesso({ ...base, quantita: 0, data_emissione: quando }, CUTOFF).ok).toBe(false);
  });
});
