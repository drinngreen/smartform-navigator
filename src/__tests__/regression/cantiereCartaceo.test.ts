import { describe, it, expect } from "vitest";
import { cantiereDaFormulario } from "@/lib/cantiereFormulario";

describe("cantiere sui formulari cartacei", () => {
  it("cantiere fuori Piscina = diverso (giacenze ferme)", () => {
    expect(cantiereDaFormulario({ cantiereIndirizzo: "Via Roma 5", cantiereComune: "Pinerolo" }).diverso).toBe(true);
  });
  it("impianto di Piscina = non diverso", () => {
    expect(cantiereDaFormulario({ cantiereIndirizzo: "Via Rivarossa 18/20", cantiereComune: "Piscina" }).diverso).toBe(false);
  });
  it("nessun cantiere dichiarato = impianto", () => {
    expect(cantiereDaFormulario({}).diverso).toBe(false);
  });
  it("Rivarossa in altro comune = diverso", () => {
    expect(cantiereDaFormulario({ cantiereIndirizzo: "Via Rivarossa 3", cantiereComune: "Torino" }).diverso).toBe(true);
  });
});
