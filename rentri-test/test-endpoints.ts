import { createClient } from './client';
import { CONFIG } from './config';

async function run() {
    console.log("--- TEST: ENDPOINT DISCOVERY (GLOBAL RECO) ---");
    const client = await createClient('global');
    const { unitId, issuer } = CONFIG.companies.global;

    const endpoints = [
        `/vidimazione-formulari/v1.0?identificativo=${issuer}`,
        `/vidimazione-formulari/v1.0?identificativo=${unitId}`,
        `/vidimazione-formulari/v1.0/vidimazione?identificativo=${issuer}`
    ];

    for (const ep of endpoints) {
        console.log(`\nTesting GET ${ep} ...`);
        try {
            const res = await client.get(ep);
            console.log("✅ SUCCESS!");
            console.log(JSON.stringify(res, null, 2));
        } catch (e: any) {
            console.log(`❌ FAILED: ${e.message}`);
        }
    }
}

run();
