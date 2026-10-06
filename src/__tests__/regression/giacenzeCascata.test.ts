import { describe, it, expect } from "vitest";
import { saldiAlGiorno, verificaNuoviMovimenti, type MovimentoGiacenza } from "@/lib/giacenzeCascata";

const base = [{ cer: "170405", saldo: 1000 }, { cer: "170407", saldo: 500 }, { cer: "160214", saldo: 0 }];

describe("Giacenze a cascata dal 22/09", () => {
  it("fino al 21/09 resta la fotografia fissa", () => {
    const m: MovimentoGiacenza[] = [{ data: "2026-09-22", cer: "170405", carico: 100, scarico: 0 }];
    expect(saldiAlGiorno(base, m, "2026-09-21").get("170405")).toBe(1000);
  });
  it("un movimento del 22/09 vale per il 22, il 23 e oggi; un secondo si somma", () => {
    const m: MovimentoGiacenza[] = [
      { data: "2026-09-22", cer: "170405", carico: 200, scarico: 0 },
      { data: "2026-09-25", cer: "170405", carico: 0, scarico: 50 },
    ];
    expect(saldiAlGiorno(base, m, "2026-09-22").get("170405")).toBe(1200);
    expect(saldiAlGiorno(base, m, "2026-09-23").get("170405")).toBe(1200);
    expect(saldiAlGiorno(base, m, "2026-09-25").get("170405")).toBe(1150);
    expect(saldiAlGiorno(base, m, "2026-10-06").get("170405")).toBe(1150);
  });
  it("cernita: sposta i kg, totale invariato", () => {
    const m: MovimentoGiacenza[] = [
      { data: "2026-09-24", cer: "170407", carico: 0, scarico: 400 },
      { data: "2026-09-24", cer: "160214", carico: 400, scarico: 0 },
    ];
    const s = saldiAlGiorno(base, m, "2026-10-01");
    expect(s.get("170407")).toBe(100);
    expect(s.get("160214")).toBe(400);
    expect([...s.values()].reduce((a, b) => a + b, 0)).toBe(1500);
  });
  it("rifiuta uno scarico che porta sotto zero, anche nei giorni successivi", () => {
    const esistenti: MovimentoGiacenza[] = [{ data: "2026-09-30", cer: "170407", carico: 0, scarico: 400 }];
    const r = verificaNuoviMovimenti(base, esistenti, [{ data: "2026-09-23", cer: "170407", carico: 0, scarico: 200 }]);
    expect(r.ok).toBe(false);
  });
  it("rifiuta qualsiasi data fino al 21/09", () => {
    expect(verificaNuoviMovimenti(base, [], [{ data: "2026-09-21", cer: "170405", carico: 1, scarico: 0 }]).ok).toBe(false);
  });
  it("accetta un carico valido", () => {
    expect(verificaNuoviMovimenti(base, [], [{ data: "2026-09-22", cer: "170405", carico: 10, scarico: 0 }]).ok).toBe(true);
  });
});
