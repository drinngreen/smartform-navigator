import { createClient } from './client';
import { CONFIG } from './config';

async function run() {
    const id = process.argv[2] || 'DUMMY-ID';
    console.log(`--- TEST: DETTAGLIO FIR GLOBAL (ID: ${id}) ---`);
    const client = await createClient('global');

    const path = `/formulari/v1.0/${id}`;

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
