import { createClient } from './client';

async function run() {
    console.log("--- TEST: RECUPERO NUMERO FIR NUOVO (SKKZR) ---");
    const client = await createClient('global');
    
    const blockNew = 'SKKZR';
    const prog = 1; // Assuming it starts at 1
    
    // Also try checking the transaction if possible, but we don't know the endpoint for sure.
    // Let's rely on the direct fetch of the FIR which we know works.
    
    const path = `/vidimazione-formulari/v1.0/${blockNew}/${prog}`;

    console.log(`Trying GET ${path}...`);
    try {
        const res = await client.get(path);
        console.log("✅ SUCCESS!");
        console.log(JSON.stringify(res, null, 2));
        
        if (res.numero_fir) {
            console.log("\n!!! FOUND VALID FIR NUMBER !!!");
            console.log(`NUMERO FIR: "${res.numero_fir}"`);
            console.log("Use this in create-fir-global.ts");
        }
    } catch (e: any) {
        console.log(`❌ ${e.response?.status || 'Error'}: ${e.message}`);
        if (e.response?.status === 404) {
             console.log("Not found yet. Maybe async process is still running or it didn't start at 1.");
        }
    }
}

run();
