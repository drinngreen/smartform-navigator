import { createClient } from './client';

async function run() {
    console.log("--- TEST: LOOKUP CODIFICHE ---");
    const client = await createClient('global');

    // Types to check
    const types = ['STATO_FISICO', 'TIPO_TRASPORTO', 'STATO_FISICO_RIFIUTO'];

    for (const t of types) {
        const path = `/codifiche/v1.0/lookup?tipo=${t}`;
        console.log(`\nFetching ${t} ...`);
        try {
            const res = await client.get(path);
            console.log("✅ SUCCESS!");
            console.log(JSON.stringify(res, null, 2));
        } catch (e: any) {
            console.log(`❌ FAILED: ${e.message}`);
            // console.log(JSON.stringify(e.response?.data || {}, null, 2));
        }
    }
    
    // Also try to get the list of types if possible
    // Maybe GET /codifiche/v1.0/tipi ? Just guessing.
}

run();
