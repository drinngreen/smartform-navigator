import { createClient } from './client';

async function run() {
    const companies = ['multy', 'niyol'] as const;

    for (const company of companies) {
        console.log(`\n--- CHECKING IDENTITY: ${company.toUpperCase()} ---`);
        try {
            const client = await createClient(company);
            
            // 1. Who am I? (Generic check if endpoint exists, otherwise try registers)
            // The documentation mentions /anagrafiche or similar common services?
            // Let's try to list registries/units to see what we have access to.
            
            const paths = [
                // Try to find available units/registries
                '/dati-registri/v1.0/registri', 
                '/dati-registri/v1.0/operatori/me', // Guess
                '/anagrafiche/v1.0/operatori/me', // Guess
                // Try the endpoint that worked for Global Reco but with minimal params
                '/vidimazione-formulari/v1.0?limit=10'
            ];

            for (const path of paths) {
                console.log(`GET ${path}...`);
                try {
                    const res = await client.get(path);
                    console.log("✅ SUCCESS!");
                    console.log(JSON.stringify(res, null, 2));
                } catch (e: any) {
                    console.log(`❌ ${e.response?.status || 'Error'}: ${e.message}`);
                    // console.log(JSON.stringify(e.response?.data || {}, null, 2));
                }
            }

        } catch (e: any) {
            console.log(`💀 FATAL for ${company}: ${e.message}`);
        }
    }
}

run();
