import { createClient } from './client';
import { CONFIG } from './config';

async function run() {
    const companies = ['multy', 'niyol'] as const;

    for (const company of companies) {
        console.log(`\n--- CHECKING VIDIMAZIONE ACCESS: ${company.toUpperCase()} ---`);
        const client = await createClient(company);
        const { issuer, unitId } = CONFIG.companies[company];

        // 1. Try with Subject ID (CF) - Should list all blocks for the company
        const path1 = `/vidimazione-formulari/v1.0?identificativo=${issuer}`;
        console.log(`Testing GET ${path1} ...`);
        try {
            const res = await client.get(path1);
            console.log("✅ SUCCESS (CF)!");
            console.log(JSON.stringify(res, null, 2));
        } catch (e: any) {
            console.log(`❌ FAILED (CF): ${e.response?.status || 'Error'} - ${e.message}`);
        }

        // 2. Try with Unit ID - Should list blocks for specific unit
        const path2 = `/vidimazione-formulari/v1.0?identificativo=${unitId}`;
        console.log(`Testing GET ${path2} ...`);
        try {
            const res = await client.get(path2);
            console.log("✅ SUCCESS (UnitID)!");
            console.log(JSON.stringify(res, null, 2));
        } catch (e: any) {
            console.log(`❌ FAILED (UnitID): ${e.response?.status || 'Error'} - ${e.message}`);
        }
    }
}

run();
