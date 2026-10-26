import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { saldiAlGiorno } from "@/lib/giacenzeCascata";

const multy = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const plant = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const person = "00000000-0000-0000-0000-000000000001";
const db = new PGlite();
const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

describe("Salvataggio privati con giacenze ufficiali a cascata", () => {
  beforeAll(async () => {
    await db.exec(`
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT '${person}'::uuid$$;
      CREATE FUNCTION can_access_tenant(uuid) RETURNS boolean LANGUAGE sql AS $$SELECT true$$;
      CREATE FUNCTION normalize_cer(text) RETURNS text LANGUAGE sql AS $$SELECT upper(trim($1))$$;
      CREATE FUNCTION inventory_lock_key(uuid,uuid,text) RETURNS bigint LANGUAGE sql AS $$SELECT 1::bigint$$;
      CREATE FUNCTION recalculate_magazzino_giacenza(uuid,uuid,text) RETURNS void LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'Legacy recalculation called'; END$$;
      CREATE TABLE anagrafica_privati(id uuid PRIMARY KEY);
      INSERT INTO anagrafica_privati VALUES ('${person}');
      CREATE TABLE impianti(id uuid, tenant_id uuid);
      CREATE TABLE privati_conferimenti(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid, impianto_id uuid, cer text, kg_pesati numeric, nome_privato text, cf_pi text, importo_pagato numeric, prezzo_kg numeric, metodo_pag text, note text, privato_id uuid, tipo_utenza text, targa_automezzo text, modello_automezzo text, data date, gruppo_id uuid);
      CREATE TABLE movimenti_impianto(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid,impianto_id uuid,tipo_movimento text,ruolo_impianto text,cer text,descrizione_rifiuto text,quantita_kg numeric,data_movimento date,origine text,produttore_denominazione text,trasportatore_denominazione text,destinatario_denominazione text,esito_accettazione text,note text,privati_conferimento_id uuid UNIQUE,stato_movimento text,updated_at timestamptz,created_at timestamptz DEFAULT now());
      CREATE TABLE giacenze_applicazioni(documento text,cer text,segno text,quantita_kg numeric,tenant_id uuid,impianto_id uuid,movimento_id uuid,causale text,attore text,created_by uuid);
      CREATE TABLE ricevute_privati(conferimento_id uuid,numero_ricevuta text);
      CREATE TABLE magazzino_giacenze(tenant_id uuid,impianto_id uuid,cer text,quantita_kg numeric,saldo_iniziale_kg numeric,saldo_snapshot_at timestamptz);
      INSERT INTO magazzino_giacenze VALUES ('${multy}','${plant}','170405',81945,4130,NULL);
      CREATE FUNCTION test_receipt() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN INSERT INTO ricevute_privati VALUES(NEW.id,'RICEVUTA'); RETURN NEW; END$$;
    `);
    await db.exec(fixture("privati-atomic.sql"));
    await db.exec(fixture("privati-stock-fix.sql"));
    await db.exec(`
      CREATE TRIGGER test_stock AFTER INSERT OR UPDATE ON movimenti_impianto FOR EACH ROW EXECUTE FUNCTION recalculate_stock_after_plant_movement();
      CREATE TRIGGER test_private AFTER INSERT OR UPDATE ON privati_conferimenti FOR EACH ROW EXECUTE FUNCTION sync_privati_conferimento_to_inventory();
      CREATE TRIGGER test_receipt AFTER INSERT ON privati_conferimenti FOR EACH ROW EXECUTE FUNCTION test_receipt();
    `);
  }, 30000);
  afterAll(() => db.close());

  async function save(kg: number, date: string) {
    return db.query(`SELECT crea_conferimento_privato_atomico($1::uuid,$2::uuid,$3::uuid,'Privato','','domestica',$4::jsonb,$5::date,0,'contanti','','','') AS result`,
      [multy, plant, person, JSON.stringify([{ cer: "170405", kg }]), date]);
  }

  it("salva 470 kg senza confrontare 81945 con 4130 né riscrivere il saldo legacy", async () => {
    await db.exec("BEGIN");
    try {
      await save(470, "2026-10-26");
      expect((await db.query("SELECT count(*)::int AS n FROM privati_conferimenti")).rows).toEqual([{ n: 1 }]);
      expect((await db.query("SELECT quantita_kg::float AS kg FROM magazzino_giacenze")).rows).toEqual([{ kg: 81945 }]);
      expect((await db.query("SELECT quantita_kg::float AS kg FROM movimenti_impianto")).rows).toEqual([{ kg: 470 }]);
      expect((await db.query("SELECT count(*)::int AS n FROM ricevute_privati")).rows).toEqual([{ n: 1 }]);
    } finally { await db.exec("ROLLBACK"); }
    expect((await db.query("SELECT count(*)::int AS n FROM privati_conferimenti")).rows).toEqual([{ n: 0 }]);
  });

  it("il carico dal 22/09 vale una sola volta da quel giorno in avanti", () => {
    const base = [{ cer: "170405", saldo: 81945 }];
    const movements = [{ data: "2026-09-22", cer: "170405", carico: 470, scarico: 0 }];
    expect(saldiAlGiorno(base, movements, "2026-09-21").get("170405")).toBe(81945);
    expect(saldiAlGiorno(base, movements, "2026-09-22").get("170405")).toBe(82415);
    expect(saldiAlGiorno(base, movements, "2026-10-26").get("170405")).toBe(82415);
  });

  it("blocca un conferimento datato 21/09 senza lasciare righe", async () => {
    await expect(save(470, "2026-09-21")).rejects.toThrow("immutabili");
    expect((await db.query("SELECT count(*)::int AS n FROM privati_conferimenti")).rows).toEqual([{ n: 0 }]);
  });

  it("mantiene il limite annuale di 1500 kg", async () => {
    await db.exec("BEGIN");
    try {
      await save(1500, "2026-10-26");
      await expect(save(1, "2026-10-26")).rejects.toThrow("1500 kg");
    } finally { await db.exec("ROLLBACK"); }
  });
});