import { describe, expect, it } from "vitest";
import {
  applicaMovimentiRealiPostSnapshot,
  GIACENZE_SNAPSHOT_18_MATTINA,
} from "@/lib/giacenzeSnapshot18Settembre";

describe("fotografia giacenze certificata del 18 settembre", () => {
  it("riproduce il totale del primo PDF", () => {
    const totale = Object.values(GIACENZE_SNAPSHOT_18_MATTINA).reduce((sum, row) => sum + row.saldo, 0);
    expect(totale).toBeCloseTo(276538.17, 2);
  });

  it("applica soltanto le due cernite reali successive mantenendo invariato il totale", () => {
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

    expect(risultato["170407"].saldo).toBe(6885.5);
    expect(risultato["160214"].saldo).toBe(5715);
    expect(risultato["160216"].saldo).toBe(3005);
    expect(risultato["120102"]).toEqual(GIACENZE_SNAPSHOT_18_MATTINA["120102"]);
    expect(risultato["150103"]).toEqual(GIACENZE_SNAPSHOT_18_MATTINA["150103"]);
    expect(Object.values(risultato).reduce((sum, row) => sum + row.saldo, 0)).toBeCloseTo(276538.17, 2);
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