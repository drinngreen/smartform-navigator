import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { collectMatchingRegistryIds } from "../../lib/registryMatching";

/**
 * Regressione: le tendine dei formulari devono SEMPRE leggere l'anagrafica
 * completa importata da Prometeo e tutti i dati collegati.
 * Se qualcuno rimuove una di queste query, le tendine tornano vuote/incomplete.
 */
const src = readFileSync(
  resolve(__dirname, "../../components/fir/PresetAziendaSelector.tsx"),
  "utf8",
);
const formSrc = readFileSync(
  resolve(__dirname, "../../components/fir/MNFIRFormComplete.tsx"),
  "utf8",
);

const TABELLE_OBBLIGATORIE = [
  "anagrafica_aziende_mp",
  "cliente_autorizzazioni",
  "cliente_cantieri",
  "cliente_targhe",
  "cliente_conducenti",
  "cliente_partner_default",
];

describe("tendine formulari - fonti dati anagrafica", () => {
  it("legge tutte le tabelle collegate", () => {
    for (const t of TABELLE_OBBLIGATORIE) {
      expect(src, `manca la lettura di ${t}`).toContain(`.from("${t}")`);
    }
  });

  it("carica l'anagrafica completa con paginazione (non solo i primi 1000)", () => {
    expect(src).toMatch(/\.range\(page \* 1000, page \* 1000 \+ 999\)/);
  });

  it("non limita i dati collegati a poche righe", () => {
    const limits = [...src.matchAll(/\.limit\((\d+)\)/g)].map((m) => Number(m[1]));
    expect(limits.length).toBeGreaterThan(0);
    expect(Math.max(...limits)).toBeGreaterThanOrEqual(1000);
  });

  it("risolve i duplicati di anagrafica per CF/P.IVA", () => {
    expect(src).toContain("resolveClienteIds");
  });

  it("risolve i duplicati anche per ragione sociale (cantieri divisi su più righe)", () => {
    expect(src).toContain("normalizeRegistryValue");
  });

  it("unisce tutti i duplicati anche con CF/P.IVA e ragioni sociali formattati diversamente", () => {
    const ids = collectMatchingRegistryIds(
      { id: "selected", ragione_sociale: "A.F.I.M. S.R.L.S.", codice_fiscale: "IT 03926910047" },
      [
        { id: "auth-row", ragione_sociale: "AFIM SRLS", partita_iva: "03926910047" },
        { id: "site-row", ragione_sociale: "A F I M SRLS", codice_fiscale: "IT03926910047" },
        { id: "other", ragione_sociale: "ALTRA SRL", partita_iva: "00000000000" },
      ],
    );
    expect(ids).toEqual(["selected", "auth-row", "site-row"]);
  });

  it("non presenta come errore l'assenza di autorizzazione del produttore", () => {
    expect(src).toContain('ruolo === "PRODUTTORE" ? "autorizzazione produttore non richiesta"');
    expect(src).toContain('ruolo !== "PRODUTTORE" && autsOrdinate.length === 0');
  });

  it("permette di cambiare azienda e reagisce alla gomma della sezione", () => {
    expect(src).toContain("clearSelection");
    expect(src).toMatch(/prevCfRef/);
    expect(src).toContain("Cambia");
  });

  it("compila numero e data autorizzazione anche dalla tendina destinatario principale", () => {
    expect(formSrc).toContain('select("numero_autorizzazione,tipo,ente_rilascio,data_inizio,data_scadenza")');
    expect(formSrc).toContain('u("destinatarioNumeroAut", soggetto.autorizzazione || "")');
    expect(formSrc).toContain('u("destinatarioDataAut", soggetto.dataAut || "")');
  });
});

