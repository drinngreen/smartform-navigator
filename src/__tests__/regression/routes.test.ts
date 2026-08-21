import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const appSource = fs.readFileSync(path.resolve(process.cwd(), "src/App.tsx"), "utf8");

/**
 * Un import lazy rotto non si vede in fase di build finché l'utente non apre
 * quella pagina: qui lo intercettiamo subito.
 */
describe("registro rotte", () => {
  const imports = [...appSource.matchAll(/import\(["'](\.\/[^"']+)["']\)/g)].map((m) => m[1]);

  it("trova almeno 30 pagine lazy", () => {
    expect(imports.length).toBeGreaterThan(30);
  });

  it("ogni pagina lazy esiste su disco", () => {
    const missing = imports.filter((rel) => {
      const base = path.resolve(process.cwd(), "src", rel.replace(/^\.\//, ""));
      return ![".tsx", ".ts", "/index.tsx", "/index.ts"].some((ext) => fs.existsSync(base + ext));
    });
    expect(missing).toEqual([]);
  });

  it("le rotte critiche restano registrate", () => {
    const critical = [
      "/mn/admin/dev-multyproget",
      "/mn/admin/dev-multyproget/rentri-console",
    ];
    for (const route of critical) {
      expect(appSource.includes(route), `rotta mancante: ${route}`).toBe(true);
    }
  });
});
