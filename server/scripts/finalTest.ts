
import axios from 'axios';
import { COMPANIES } from '../companyEndpoints';

const BRIDGE_URL = 'http://127.0.0.1:8765';

async function finalTest(key: string) {
    const config = COMPANIES[key];
    console.log(`\n--- FINAL TEST FOR ${key.toUpperCase()} ---`);
    console.log(`Block: ${config.blockCode}`);
    console.log(`Unit: ${config.unitId}`);

    const payload = {
        tipoFormulario: "FIR",
        produttore: {
            codiceFiscale: config.issuer, // No IT prefix based on latest finding
            unitaLocaleId: config.unitId
        },
        quantita: 1
    };

    console.log("Payload:", JSON.stringify(payload));

    try {
        const res = await axios.post(`${BRIDGE_URL}/send-rentri`, {
            url: `https://api.rentri.gov.it/vidimazione-formulari/v1.0/vidimazione?codiceBlocco=${config.blockCode}`,
            method: 'POST',
            payload: JSON.stringify(payload),
            filename: config.p12File,
            issuer: config.issuer // Explicit issuer
        });

        if (res.data.success) {
            console.log(`✅ SUCCESS! FIR:`, res.data.data);
        } else {
            console.log(`❌ FAILED:`, res.data.data);
            
            // Retry with IT prefix just in case
            console.log("   Retrying with IT prefix...");
            payload.produttore.codiceFiscale = "IT" + config.issuer;
            const res2 = await axios.post(`${BRIDGE_URL}/send-rentri`, {
                url: `https://api.rentri.gov.it/vidimazione-formulari/v1.0/vidimazione?codiceBlocco=${config.blockCode}`,
                method: 'POST',
                payload: JSON.stringify(payload),
                filename: config.p12File,
                issuer: config.issuer
            });
            if (res2.data.success) console.log(`   ✅ SUCCESS (IT prefix)! FIR:`, res2.data.data);
            else console.log(`   ❌ FAILED (IT prefix):`, res2.data.data);
        }
    } catch (e: any) {
        console.log(`❌ Exception:`, e.message);
    }
}

async function main() {
    await finalTest('multy');
    await finalTest('niyol');
}

main();
