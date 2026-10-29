import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, expect, it } from "vitest";

const db = new PGlite();
const tenant = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const ids = ["53fbdee1-b9db-42a6-9bcc-99fc9913fe01", "0bf2d4c0-b2b1-4853-81ee-a0fc87665b0e"];
beforeAll(async () => {
  await db.exec(`CREATE SCHEMA auth;
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT '${ids[0]}'::uuid$$;
    CREATE FUNCTION can_access_tenant(uuid) RETURNS boolean LANGUAGE sql AS $$SELECT true$$;
    CREATE TABLE privati_conferimenti(id uuid PRIMARY KEY,tenant_id uuid,data date,kg_pesati numeric);
    CREATE TABLE ricevute_privati(conferimento_id uuid,numero_ricevuta text);
    CREATE TABLE movimenti_impianto(privati_conferimento_id uuid,stato_movimento text,updated_at timestamptz);
    CREATE TABLE rentri_invii_privati(conferimento_id uuid);`);
  await db.exec(readFileSync(`${process.cwd()}/drizzle/migrations/0010_private_receipt_traced_cancellation.sql`, "utf8"));
}, 30000);
afterAll(() => db.close());

async function seed(date = "2026-10-29") {
  for (const [i, id] of ids.entries()) {
    await db.query("INSERT INTO privati_conferimenti(id,tenant_id,data,kg_pesati) VALUES($1,$2,$3,$4)", [id,tenant,date,i ? 154 : 80]);
    await db.query("INSERT INTO ricevute_privati(conferimento_id,numero_ricevuta) VALUES($1,$2)", [id,i ? "00364/2026" : "00363/2026"]);
    await db.query("INSERT INTO movimenti_impianto VALUES($1,'effettivo',now())", [id]);
  }
}
const cancel = () => db.query("SELECT annulla_conferimenti_privati($1::uuid[],'Annullamento richiesto') AS result", [ids]);
it("annulla 80+154 kg conservando entrambe le ricevute e non ripete lo storno", async () => {
  await db.exec("BEGIN");
  try {
    await seed();
    expect((await cancel()).rows).toEqual([{ result: { annullati: 2, kg_stornati: 234 } }]);
    expect((await db.query("SELECT count(*)::int n FROM privati_conferimenti_attivi")).rows).toEqual([{ n: 0 }]);
    expect((await db.query("SELECT numero_ricevuta FROM ricevute_privati ORDER BY numero_ricevuta")).rows).toEqual([{numero_ricevuta:"00363/2026"},{numero_ricevuta:"00364/2026"}]);
    expect((await cancel()).rows).toEqual([{ result: { annullati: 0, kg_stornati: 0 } }]);
  } finally { await db.exec("ROLLBACK"); }
});
it("blocca il 21 settembre senza annullare alcuna ricevuta", async () => {
  await db.exec("BEGIN");
  try { await seed("2026-09-21"); await expect(cancel()).rejects.toThrow("immutabili"); }
  finally { await db.exec("ROLLBACK"); }
});
it("blocca una richiesta mista quando un conferimento risulta inviato al RENTRI", async () => {
  await db.exec("BEGIN");
  try {
    await seed(); await db.query("INSERT INTO rentri_invii_privati VALUES($1)", [ids[1]]);
    await expect(cancel()).rejects.toThrow("RENTRI");
  } finally { await db.exec("ROLLBACK"); }
  expect((await db.query("SELECT count(*)::int n FROM privati_conferimenti")).rows).toEqual([{ n: 0 }]);
});