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
const standardFormSrc = readFileSync(
  resolve(__dirname, "../../components/fir/FIRFormComplete.tsx"),
  "utf8",
);
const alternativeFormSrc = readFileSync(
  resolve(__dirname, "../../components/fir/FIRAlternativeForm.tsx"),
  "utf8",
);
const firStoreSrc = readFileSync(resolve(__dirname, "../../stores/firStore.ts"), "utf8");
const rentriMapperSrc = readFileSync(resolve(__dirname, "../../lib/rentriFormMapper.ts"), "utf8");

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

  it("mostra anche al produttore le autorizzazioni realmente collegate", () => {
    expect(src).toContain('{(aziendaKey || clienteId) && (');
    expect(src).not.toContain('autorizzazione produttore non richiesta');
  });

  it("non nasconde al produttore i titoli classificati per natura dell'autorizzazione", () => {
    const producerAuthorizationBranch = src.match(
      /const autsOrdinate =[\s\S]*?: ruolo === "PRODUTTORE"\s*\? ([^\n]+)\n\s*: dbAuts\.filter/,
    );
    expect(producerAuthorizationBranch?.[1].trim()).toBe("dbAuts");
  });

  it("azzera l'autorizzazione precedente prima di caricare una nuova azienda", () => {
    const resets = src.match(/onSelectAutorizzazione\(\{ numero: "", tipo: "", data: "" \}\)/g) || [];
    expect(resets.length).toBeGreaterThanOrEqual(3);
  });

  it("non precarica autorizzazioni inventate sul produttore", () => {
    expect(firStoreSrc).toContain('produttoreNumeroAut: ""');
    expect(firStoreSrc).toContain('produttoreTipoAut: ""');
    expect(firStoreSrc).toContain('produttoreDataAut: ""');
    expect(firStoreSrc).not.toContain('produttoreNumeroAut: "MI58420"');
  });

  it("non sostituisce il produttore mancante con l'emittente RENTRI", () => {
    expect(rentriMapperSrc).toContain('denominazione: str("prod_denominazione")');
    expect(rentriMapperSrc).toContain('codice_fiscale: str("prod_cf")');
    expect(rentriMapperSrc).not.toContain('str("prod_denominazione") || cfg.issuer');
    expect(rentriMapperSrc).not.toContain('str("prod_cf") || cfg.issuer');
  });

  it("permette di cambiare azienda e reagisce alla gomma della sezione", () => {
    expect(src).toContain("clearSelection");
    expect(src).toMatch(/prevCfRef/);
    expect(src).toContain("Cambia");
  });

  it("usa la tendina database collegata alle autorizzazioni in entrambi i moduli standard", () => {
    for (const source of [formSrc, standardFormSrc]) {
      expect(source).toContain('<PresetAziendaSelector');
      expect(source).toContain('ruolo="DESTINATARIO"');
      expect(source).toContain('u("destinatarioNumeroAut", aut.numero)');
      expect(source).toContain('u("destinatarioDataAut", aut.data)');
    }
  });

  it("usa il database, non l'elenco statico, anche nel modulo alternativo", () => {
    expect(alternativeFormSrc).toContain('.from("anagrafica_aziende_mp")');
    expect(alternativeFormSrc).toContain('.from("cliente_autorizzazioni")');
    expect(alternativeFormSrc).toContain('.eq("destinatario", true)');
    expect(alternativeFormSrc).not.toContain('DESTINATARI.filter');
    expect(alternativeFormSrc).toContain('autorizzazione: authByCompany.get(row.id)?.numero_autorizzazione');
  });
});

