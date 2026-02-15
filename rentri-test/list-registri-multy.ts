import { createClient } from './client';
import { CONFIG } from './config';

async function run() {
    console.log("--- TEST: ELENCO REGISTRAZIONI (MULTY PROGET) ---");
    try {
        const client = await createClient('multy');
        const registryId = CONFIG.companies.multy.registryId;
        
        // Endpoint from Program.cs: /dati-registri/v1.0/operatore/{registryId}/registrazioni
        const path = `/dati-registri/v1.0/operatore/${registryId}/registrazioni?limit=10&order=desc`;
        
        const res = await client.get(path);
        
        console.log("✅ SUCCESS!");
        console.log(JSON.stringify(res, null, 2));
    } catch (e: any) {
        console.error("❌ FAILED:", e.message);
    }
}

run();
