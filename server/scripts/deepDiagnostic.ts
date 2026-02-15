
import axios from 'axios';
import { COMPANIES } from '../companyEndpoints';

const BRIDGE_URL = 'http://127.0.0.1:8765';

async function diagnoseNiyol() {
    console.log(`\n--- DIAGNOSING NIYOL AUTH ---`);
    const config = COMPANIES.niyol;
    
    // Try explicit issuers
    const issuersToTry = [
        "09879800010",        // Standard P.IVA
        "IT09879800010",      // P.IVA with IT
        "098798000100",       // Maybe extra zero?
        "RENTRI-100005487"    // DN Qualifier
    ];

    for (const iss of issuersToTry) {
        console.log(`👉 Trying Issuer: '${iss}'`);
        try {
            const res = await axios.post(`${BRIDGE_URL}/send-rentri`, {
                url: `https://api.rentri.gov.it/anagrafiche/v1.0/registri`, // Simple GET
                method: 'GET',
                payload: "",
                filename: config.p12File,
                issuer: iss
            });

            if (res.data.success) {
                console.log(`   ✅ SUCCESS! Correct Issuer is: '${iss}'`);
                console.log(`   Data:`, res.data.data.substring(0, 100) + "...");
                return iss;
            } else {
                const d = typeof res.data.data === 'string' ? JSON.parse(res.data.data) : res.data.data;
                const err = d?.model_state?.generic?.[0] || d?.title || "Unknown";
                console.log(`   ❌ Failed: ${err}`);
            }
        } catch (e: any) {
            console.log(`   ❌ Exception: ${e.message}`);
        }
    }
    return null;
}

async function listBlocksMulty() {
    console.log(`\n--- LISTING BLOCKS FOR MULTY ---`);
    const config = COMPANIES.multy;
    
    // We know '12347770013' works for Auth because movements list worked.
    const issuer = "12347770013"; 
    
    try {
        const res = await axios.post(`${BRIDGE_URL}/send-rentri`, {
            url: `https://api.rentri.gov.it/vidimazione-formulari/v1.0/blocchi-virtuali?limit=50`,
            method: 'GET',
            payload: "",
            filename: config.p12File,
            issuer: issuer
        });

        if (res.data.success) {
            console.log(`✅ BLOCKS LIST:`, res.data.data);
            const blocks = JSON.parse(res.data.data);
            if(Array.isArray(blocks)) {
                blocks.forEach((b:any) => {
                    console.log(`   - Code: ${b.codice_blocco}, Unit: ${b.unita_locale_id || 'NONE'}, Created: ${b.data_creazione}`);
                });
            }
        } else {
            console.log(`❌ FAILED to list blocks:`, res.data.data);
        }
    } catch (e: any) {
        console.log(`❌ Exception: ${e.message}`);
    }
}

async function main() {
    await diagnoseNiyol();
    await listBlocksMulty();
}

main();
