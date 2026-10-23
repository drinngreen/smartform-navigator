import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (rel: string) => fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");

const dashboard = read("src/pages/multynijol/MNDevDashboardPage.tsx");
const impianto = read("src/components/multynijol/dev/DevImpiantoModule.tsx");

/**
 * "Carico di lavorazione" deve restare un'azione di primo livello, affiancata a
 * Impianto: se la sposteremo di nuovo dentro un sottomenu, questo test lo segnala.
 */
describe("Carico di lavorazione come azione accanto a Impianto", () => {
  it("esiste come scheda autonoma nella barra principale", () => {
    expect(dashboard).toMatch(/<TabsTrigger\s+value="carico-lavorazione"/);
    expect(dashboard).toMatch(/<TabsContent\s+value="carico-lavorazione"/);
  });

  it("compare subito dopo Impianto, prima di Niyol", () => {
    const iImpianto = dashboard.indexOf('value="impianto"');
    const iCarico = dashboard.indexOf('value="carico-lavorazione"');
    const iNiyol = dashboard.indexOf('value="niyol"');
    expect(iImpianto).toBeGreaterThan(-1);
    expect(iCarico).toBeGreaterThan(iImpianto);
    expect(iCarico).toBeLessThan(iNiyol);
  });

  it("apre il modulo operazioni di magazzino in sola carica", () => {
    const content = dashboard.match(/<TabsContent\s+value="carico-lavorazione">([\s\S]*?)<\/TabsContent>/);
    expect(content, "contenuto scheda carico-lavorazione mancante").toBeTruthy();
    expect(content![1]).toMatch(/<OperazioniMagazzinoModule\s+soloCarico\s*\/>/);
  });

  it("non è duplicato dentro il modulo Impianto", () => {
    expect(impianto).not.toMatch(/setCaricoLavorazioneOpen/);
    expect(impianto).not.toMatch(/<OperazioniMagazzinoModule\s+soloCarico/);
  });
});
