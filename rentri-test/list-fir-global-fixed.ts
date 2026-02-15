import { createClient } from './client';
import { CONFIG } from './config';

async function run() {
    console.log("--- TEST: ELENCO FIR GLOBAL (CORRECTED) ---");
    const client = await createClient('global');
    const { unitId, issuer } = CONFIG.companies.global;

    // Based on error 400: num_iscr_sito and identificativo_soggetto are required
    const params = new URLSearchParams({
        identificativo_soggetto: issuer, // Try CF first
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
