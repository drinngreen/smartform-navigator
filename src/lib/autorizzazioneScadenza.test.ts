import { describe, it, expect } from "vitest";
import { calcolaScadenza } from "./autorizzazioneScadenza";

describe("calcolaScadenza", () => {
  it("emissione + 10 anni", () => expect(calcolaScadenza("2020-10-31", "10")).toBe("2030-10-31"));
  it("durata decimale in mesi", () => expect(calcolaScadenza("2026-01-15", "0,5")).toBe("2026-07-15"));
  it("fine mese inesistente", () => expect(calcolaScadenza("2024-02-29", "1")).toBe("2025-02-28"));
  it("dati incompleti", () => expect(calcolaScadenza("", "5")).toBeNull());
});
