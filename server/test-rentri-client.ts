import { RentriService } from './rentri/service';
import { RENTRI_CONFIG } from './rentri/config';

async function run() {
    console.log("--- TEST SERVER IMPLEMENTATION (FORGE) ---");
    
    // Test 1: Vidimate Global
    try {
        console.log("Testing Vidimation (Global)...");
        // We won't actually vidimate to save numbers, just check client creation and maybe a GET
        // But RentriService.vidimateFir does a POST.
        
        // Let's just try to create a client and call a safe endpoint
        const { createClient } = await import('./rentri/client');
        const client = await createClient('global');
        
        console.log("Client created. Testing GET /vidimazione-formulari/v1.0?limit=1...");
        const res = await client.get('/vidimazione-formulari/v1.0?limit=1');
        console.log("✅ SUCCESS! Response:", JSON.stringify(res).substring(0, 100) + "...");
        
    } catch (e: any) {
        console.log("❌ FAILED:", e.message);
        if (e.data) console.log(JSON.stringify(e.data, null, 2));
    }
}

run();
