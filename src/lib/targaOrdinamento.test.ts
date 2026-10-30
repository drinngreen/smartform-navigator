import { describe, it, expect } from "vitest";
import { cognomeDaConducente, filtraTarghe, ordinaTarghePerCognome } from "./targaOrdinamento";

// Righe reali di cliente_targhe (formato Prometeo "COGNOME NOME").
const AHMETOVIC = { id: "1", targa: "DT852GM", conducente_default: "AHMETOVIC BRAJM" };
const AGUILERA = { id: "2", targa: "GP359SS", conducente_default: "AGUILERA EDWIN" };
const ALBINI = { id: "3", targa: "BM157ST", conducente_default: "ALBINI CARLO" };
const SENZA = { id: "4", targa: "ZZ999AA", conducente_default: "" };

describe("cognomeDaConducente", () => {
  it("prima parola del conducente", () => expect(cognomeDaConducente("BASSO ARMANI SAMUEL")).toBe("BASSO"));
  it("conducente assente", () => expect(cognomeDaConducente(null)).toBe(""));
});

describe("ordinaTarghePerCognome", () => {
  it("ordina sul cognome, non sulla targa", () => {
    const out = ordinaTarghePerCognome([ALBINI, AHMETOVIC, AGUILERA]).map((t) => t.targa);
    expect(out).toEqual(["GP359SS", "DT852GM", "BM157ST"]);
  });
  it("mezzi senza autista in coda per targa", () => {
    const out = ordinaTarghePerCognome([SENZA, ALBINI, { ...SENZA, id: "5", targa: "AA000BB" }]).map((t) => t.targa);
    expect(out).toEqual(["BM157ST", "AA000BB", "ZZ999AA"]);
  });
});

describe("filtraTarghe", () => {
  const tutte = [AGUILERA, AHMETOVIC, ALBINI, SENZA];
  it("cerca per cognome", () => expect(filtraTarghe(tutte, "ahmet").map((t) => t.targa)).toEqual(["DT852GM"]));
  it("cerca per targa anche spezzata", () =>
    expect(filtraTarghe(tutte, "dt 852").map((t) => t.targa)).toEqual(["DT852GM"]));
  it("cognome + targa insieme", () => {
    expect(filtraTarghe(tutte, "ahmet dt852").map((t) => t.targa)).toEqual(["DT852GM"]);
    expect(filtraTarghe(tutte, "ahmet gp359")).toEqual([]);
  });
  it("query vuota o solo spazi: elenco completo", () => expect(filtraTarghe(tutte, "   ")).toHaveLength(4));
});
