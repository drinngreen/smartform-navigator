
import axios from 'axios';
import { COMPANIES } from '../companyEndpoints';

const BRIDGE_URL = 'http://127.0.0.1:8765';

async function testCompany(key: string) {
    const config = COMPANIES[key];
    console.log(`\n--- TESTING ${config.name} ---`);
    console.log(`P12: ${config.p12File}`);
    console.log(`Issuer: ${config.issuer}`);
    console.log(`UnitID: ${config.unitId}`);
    console.log(`BlockCode: ${config.blockCode}`);

    // Test 1: List Movimenti (Checks Auth + Registry Access)
    console.log(`[1/2] Testing Registry Access (List Movimenti)...`);
    try {
        const res = await axios.post(`${BRIDGE_URL}/list-movimenti`, {
            registryId: config.registryId,
            filename: config.p12File,
            issuer: config.issuer,
            limit: 1
        });
        
        if(res.data && res.data.success) {
            console.log(`✅ ACCESS OK! Found ${(JSON.parse(res.data.data) || []).length} items.`);
        } else {
            console.error(`❌ ACCESS FAILED:`, res.data);
        }
    } catch (e: any) {
        console.error(`❌ EXCEPTION:`, e.message);
    }

    // Test 2: Vidimazione Check (Dry Run - just validating params)
    // Note: We can't really "dry run" vidimazione without consuming a number, 
    // but we can try to call the endpoint with a minimal payload and see if we get a 400 (Bad Request) 
    // which implies Auth was OK, vs a 403/401.
    // However, the user specifically wants to "find blocks" or "create new ones".
    // Let's try to query the block status if possible. 
    // Since we don't have a "GET /blocks" endpoint in the bridge, we'll try to vidimate 1 FIR with the specific block code.
    // If it works, we get a number. If it fails with "fir.nonTrovato", the block code is wrong.
    
    console.log(`[2/2] Testing Vidimazione Block ${config.blockCode}...`);
    const payload = {
        tipoFormulario: "FIR",
        produttore: {
            codiceFiscale: "IT" + config.issuer, 
            unitaLocaleId: config.unitId
        },
        quantita: 1
    };

    try {
        const res = await axios.post(`${BRIDGE_URL}/send-rentri`, {
            url: `https://api.rentri.gov.it/vidimazione-formulari/v1.0/vidimazione?codiceBlocco=${config.blockCode}`,
            method: 'POST',
            payload: JSON.stringify(payload),
            filename: config.p12File,
            issuer: "IT" + config.issuer // Trying with IT prefix as per previous findings
        });

        if (res.data && res.data.success) {
            console.log(`✅ VIDIMAZIONE OK! Response:`, res.data.data);
        } else {
            const errData = typeof res.data.data === 'string' ? JSON.parse(res.data.data) : res.data.data;
            if(errData?.model_state?.codice_blocco?.[0] === 'fir.nonTrovato') {
                console.error(`❌ BLOCK ERROR: Block code '${config.blockCode}' not found or mismatch with UnitID '${config.unitId}'.`);
            } else {
                console.error(`❌ VIDIMAZIONE FAILED:`, JSON.stringify(errData, null, 2));
            }
        }
    } catch (e: any) {
        console.error(`❌ EXCEPTION:`, e.message);
    }
}

async function main() {
    await testCompany('global');
    await testCompany('multy');
    await testCompany('niyol');
}

main();
