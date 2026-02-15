import { createClient } from './client';
import { CONFIG } from './config';

async function run() {
    console.log("--- TEST: ELENCO FIR (MULTY PROGET) ---");
    const client = await createClient('multy');
    const { unitId, registryId, issuer } = CONFIG.companies.multy;

    const endpoints = [
        '/vidimazione-formulari/v1.0/formulari?limit=10',
        `/vidimazione-formulari/v1.0/operatore/${unitId}/formulari?limit=10`,
        `/vidimazione-formulari/v1.0/operatore/${registryId}/formulari?limit=10`,
        `/vidimazione-formulari/v1.0/operatore/${issuer}/formulari?limit=10`
    ];

    for (const ep of endpoints) {
        console.log(`\nTesting GET ${ep} ...`);
        try {
            const res = await client.get(ep);
            console.log("✅ SUCCESS!");
            console.log(JSON.stringify(res, null, 2));
            break; // Stop if success
        } catch (e: any) {
            console.log(`❌ FAILED: ${e.message}`);
        }
    }
}

run();
