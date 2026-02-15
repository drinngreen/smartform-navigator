
import { createClient } from './client';

async function run() {
    console.log("--- TEST: ELENCO FORMULARI (GLOBAL RECO) ---");
    try {
        const client = await createClient('global');
        
        // Endpoint: GET /vidimazione-formulari/v1.0/formulari
        // Prompt says "GET /formulari", mapping to standard structure.
        const res = await client.get('/vidimazione-formulari/v1.0/formulari?limit=10');
        
        console.log("✅ SUCCESS!");
        console.log(JSON.stringify(res, null, 2));
    } catch (e: any) {
        console.error("❌ FAILED:", e.message);
    }
}

run();
