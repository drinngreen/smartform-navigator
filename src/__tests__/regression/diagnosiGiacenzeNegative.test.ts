import { describe, it, expect } from "vitest";
import { diagnosiNegativi, proponiSoluzione } from "@/lib/diagnosiGiacenzeNegative";
import type { FirGiacenzaCandidato } from "@/lib/rentriFirGiacenze";

const base = [{ cer: "170402", saldo: 1000 }, { cer: "170405", saldo: 5000 }];
const carico = (numero: string, cer: string, kg: number, idoneo = true): FirGiacenzaCandidato => ({
  numero_fir: numero, data_emissione: "2026-11-20", data_arrivo: "2026-11-21", cer, kg_accettati: kg,
  segno: "CARICO", controparte: "", produttore: "", destinatario: "Multyproget", idoneo,
  motivo: idoneo ? "Pronto da registrare" : "Non ancora accettato dal destinatario",
  cantiere_diverso: false, cantiere_verificato: true, luogo_produzione: "",
});

describe("Diagnosi giacenze negative", () => {
  const mov = [
    { data: "2026-11-20", cer: "170402", carico: 0, scarico: 800, rif: "FIR A" },
    { data: "2026-11-22", cer: "170402", carico: 0, scarico: 700, rif: "FIR B" },
    { data: "2026-11-22", cer: "170405", carico: 0, scarico: 100, rif: "FIR C" },
  ];
  it("trova solo i CER sotto zero, quanti kg mancano e lo scarico che li ha portati sotto", () => {
    const d = diagnosiNegativi(base, mov, "2026-11-28");
    expect(d).toHaveLength(1);
    expect(d[0].cer).toBe("170402");
    expect(d[0].mancano).toBe(500);
    expect(d[0].dataNegativo).toBe("2026-11-22");
    expect(d[0].scarichiCausa.map((m) => m.rif)).toEqual(["FIR B"]);
  });
  it("se i carichi accettati non confermati coprono il buco la soluzione è confermarli", () => {
    const [d] = diagnosiNegativi(base, mov, "2026-11-28");
    const s = proponiSoluzione(d, [carico("X1", "170402", 300), carico("X2", "170402", 400), carico("X3", "170405", 999)]);
    expect(s.pronti.map((c) => c.numero_fir)).toEqual(["X1", "X2"]);
    expect(s.saldoDopo).toBe(200);
    expect(s.risolvibile).toBe(true);
  });
  it("se non bastano dice quanti kg mancheranno ancora", () => {
    const [d] = diagnosiNegativi(base, mov, "2026-11-28");
    const s = proponiSoluzione(d, [carico("X1", "170402", 300)]);
    expect(s.risolvibile).toBe(false);
    expect(s.saldoDopo).toBe(-200);
    expect(s.motivo).toContain("200 kg");
  });
  it("i formulari non ancora accettati non si contano come risolutivi", () => {
    const [d] = diagnosiNegativi(base, mov, "2026-11-28");
    const s = proponiSoluzione(d, [carico("X1", "170402", 0, false)]);
    expect(s.pronti).toHaveLength(0);
    expect(s.inArrivo).toHaveLength(1);
    expect(s.risolvibile).toBe(false);
  });
});
