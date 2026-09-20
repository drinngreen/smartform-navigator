import { describe, expect, it } from "vitest";
import {
  applicaMovimentiRealiPostSnapshot,
  GIACENZE_SNAPSHOT_18_MATTINA,
} from "@/lib/giacenzeSnapshot18Settembre";

describe("fotografia giacenze certificata del 18 settembre", () => {
  it("riproduce esattamente i totali dei due PDF allegati", () => {
    const righe = Object.values(GIACENZE_SNAPSHOT_18_MATTINA);
    const carico = righe.reduce((sum, row) => sum + row.carico, 0);
    const scarico = righe.reduce((sum, row) => sum + row.scarico, 0);
    const saldo = righe.reduce((sum, row) => sum + row.saldo, 0);
    expect(carico).toBeCloseTo(740513.04, 2);
    expect(scarico).toBeCloseTo(463974.87, 2);
    expect(saldo).toBeCloseTo(276538.17, 2);
    expect(carico - scarico).toBeCloseTo(saldo, 2);
    righe.forEach((row) => expect(row.carico - row.scarico).toBeCloseTo(row.saldo, 2));
  });

  it("non applica due volte le cernite già comprese negli allegati", () => {
    const risultato = applicaMovimentiRealiPostSnapshot(
      GIACENZE_SNAPSHOT_18_MATTINA,
      [
        { cer: "170407", tipo_movimento: "SCARICO", quantita_kg: 4000, created_at: "2026-09-18T15:01:38.467761Z" },
        { cer: "160214", tipo_movimento: "CARICO", quantita_kg: 4000, created_at: "2026-09-18T15:01:38.467761Z" },
        { cer: "170407", tipo_movimento: "SCARICO", quantita_kg: 3000, created_at: "2026-09-18T15:01:38.947239Z" },
        { cer: "160216", tipo_movimento: "CARICO", quantita_kg: 3000, created_at: "2026-09-18T15:01:38.947239Z" },
      ],
      "2026-09-18",
    );

    expect(risultato["170407"]).toEqual({ carico: 16185.5, scarico: 9300, saldo: 6885.5 });
    expect(risultato["160214"]).toEqual({ carico: 34955, scarico: 29240, saldo: 5715 });
    expect(risultato["160216"]).toEqual({ carico: 3005, scarico: 0, saldo: 3005 });
    expect(risultato["120102"]).toEqual(GIACENZE_SNAPSHOT_18_MATTINA["120102"]);
    expect(risultato["150103"]).toEqual(GIACENZE_SNAPSHOT_18_MATTINA["150103"]);
    const righe = Object.values(risultato);
    const carico = righe.reduce((sum, row) => sum + row.carico, 0);
    const scarico = righe.reduce((sum, row) => sum + row.scarico, 0);
    const saldo = righe.reduce((sum, row) => sum + row.saldo, 0);
    expect(carico).toBeCloseTo(740513.04, 2);
    expect(scarico).toBeCloseTo(463974.87, 2);
    expect(saldo).toBeCloseTo(276538.17, 2);
    expect(carico - scarico).toBeCloseTo(saldo, 2);
    righe.forEach((row) => expect(row.carico - row.scarico).toBeCloseTo(row.saldo, 2));
  });

  it("ignora movimenti antecedenti alla fotografia", () => {
    const risultato = applicaMovimentiRealiPostSnapshot(
      GIACENZE_SNAPSHOT_18_MATTINA,
      [{ cer: "120102", tipo_movimento: "CARICO", quantita_kg: 5000, created_at: "2026-09-15T13:49:31.908907Z" }],
      "2026-09-18",
    );
    expect(risultato["120102"]).toEqual(GIACENZE_SNAPSHOT_18_MATTINA["120102"]);
  });
});