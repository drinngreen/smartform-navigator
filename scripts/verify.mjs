#!/usr/bin/env node
/**
 * Gate di verifica unico: da eseguire PRIMA di dichiarare completata
 * qualunque modifica.
 *
 *   node scripts/verify.mjs            -> typecheck + test di regressione
 *   node scripts/verify.mjs --smoke    -> aggiunge lo smoke test browser
 */
import { spawnSync } from "node:child_process";

const withSmoke = process.argv.includes("--smoke");

const steps = [
  { name: "Typecheck TypeScript", cmd: "npx", args: ["tsc", "--noEmit"] },
  { name: "Test di regressione", cmd: "npx", args: ["vitest", "run", "--reporter=basic"] },
];

if (withSmoke) {
  steps.push({ name: "Smoke test rotte", cmd: "python3", args: ["scripts/smoke_routes.py"] });
}

const failed = [];

for (const step of steps) {
  console.log(`\n=== ${step.name} ===`);
  const res = spawnSync(step.cmd, step.args, { stdio: "inherit", shell: false });
  if (res.status !== 0) failed.push(step.name);
}

console.log("\n================ ESITO VERIFICA ================");
for (const step of steps) {
  console.log(`${failed.includes(step.name) ? "FAIL" : "OK  "}  ${step.name}`);
}

if (failed.length) {
  console.log("\nVerifica FALLITA: non dichiarare la modifica completata.");
  process.exit(1);
}
console.log("\nVerifica superata.");
