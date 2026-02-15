import { createClient } from './client';
import { CONFIG } from './config';

async function run() {
    console.log("--- TEST: ELENCO FIR MULTY (CORRECTED) ---");
    const client = await createClient('multy');
    const { unitId, issuer } = CONFIG.companies.multy;

    const params = new URLSearchParams({
        identificativo_soggetto: issuer,
        num_iscr_sito: unitId,
        limit: '10'
    });

    const path = `/formulari/v1.0?${params.toString()}`;

    console.log(`\nTesting GET ${path} ...`);
    try {
        const res = await client.get(path);
        console.log("✅ SUCCESS!");
        console.log(JSON.stringify(res, null, 2));
    } catch (e: any) {
        console.log(`❌ FAILED: ${e.message}`);
    }
}

run();
