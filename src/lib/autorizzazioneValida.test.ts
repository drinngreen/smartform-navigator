import { describe, expect, it } from "vitest";
import { ordinaAutorizzazioni, scegliAutorizzazione } from "./autorizzazioneValida";

const OGGI = "2026-11-18";
const vecchia = { n: "vecchia", data_inizio: "2015-01-01", data_scadenza: "2027-01-01", tipo: "DESTINATARIO" };
const senza = { n: "senza", data_inizio: null, data_scadenza: null, tipo: "DESTINATARIO" };
const scaduta = { n: "scaduta", data_inizio: "2010-01-01", data_scadenza: "2018-01-01", tipo: "DESTINATARIO" };
const rinnovo = { n: "rinnovo", data_inizio: "2024-05-01", data_scadenza: "2034-05-01", tipo: "DESTINATARIO" };
const trasporto = { n: "trasporto", data_inizio: "2025-01-01", data_scadenza: "2030-01-01", tipo: "TRASPORTATORE" };

describe("autorizzazione proposta nei formulari", () => {
  it("valide prima (la più recente), poi senza scadenza, poi scadute", () => {
    expect(ordinaAutorizzazioni([scaduta, senza, vecchia, rinnovo], OGGI).map((a) => a.n)).toEqual(["rinnovo", "vecchia", "senza", "scaduta"]);
  });
  it("la preferenza per l'impianto non fa proporre una scaduta", () => {
    expect(scegliAutorizzazione([scaduta, trasporto], (a) => a.tipo === "DESTINATARIO", OGGI)?.n).toBe("trasporto");
    expect(scegliAutorizzazione([scaduta, trasporto, rinnovo], (a) => a.tipo === "DESTINATARIO", OGGI)?.n).toBe("rinnovo");
  });
  it("se sono tutte scadute propone la scaduta più di recente", () => {
    const recente = { ...scaduta, n: "recente", data_scadenza: "2025-06-01" };
    expect(scegliAutorizzazione([scaduta, recente], undefined, OGGI)?.n).toBe("recente");
  });
});
