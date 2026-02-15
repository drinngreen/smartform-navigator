
import axios from 'axios';
import { COMPANIES } from '../companyEndpoints';

const BRIDGE_URL = 'http://127.0.0.1:8765';

async function findNiyolRegistry() {
    const config = COMPANIES.niyol;
    console.log(`\n--- DISCOVERY NIYOL REGISTRY ---`);
    console.log(`P12: ${config.p12File}`);
    console.log(`Issuer: ${config.issuer}`);

    try {
        // Attempt 1: Get Operator Profile / Registri
        // URL: /dati-registri/v1.0/operatore/registri (Doesn't exist as per docs? Usually it's /anagrafiche/v1.0/registri)
        // But we are "operatore".
        // Let's try to LIST REGISTRIES via /anagrafiche/v1.0/registri
        
        console.log(`[1] Listing Registries via /anagrafiche/v1.0/registri...`);
        const res = await axios.post(`${BRIDGE_URL}/list-rentri`, {
            url: `https://api.rentri.gov.it/anagrafiche/v1.0/registri`,
            filename: config.p12File,
            issuer: config.issuer
        });

        console.log(`Response Status:`, res.data.status);
        if (res.data.success) {
            const data = JSON.parse(res.data.data);
            console.log(`FOUND REGISTRIES:`, JSON.stringify(data, null, 2));
        } else {
            console.error(`ERROR:`, res.data.data);
        }

    } catch (e: any) {
        console.error(`EXCEPTION:`, e.message);
    }
}

async function testVidimazionePermutations(key: string) {
    const config = COMPANIES[key];
    console.log(`\n--- TESTING VIDIMAZIONE PERMUTATIONS FOR ${config.name} ---`);
    
    // Base Payload
    const basePayload = {
        tipoFormulario: "FIR",
        produttore: {
            codiceFiscale: "IT" + config.issuer, 
            // unitaLocaleId will be varied
        },
        quantita: 1
    };

    const variations = [
        { name: "With UnitID (Original)", unitId: config.unitId },
        { name: "With UnitID (No Suffix)", unitId: config.unitId.split('-')[0] },
        { name: "Without UnitID", unitId: undefined },
        { name: "With UnitID (Prefix IT)", unitId: config.unitId, cf: "IT" + config.issuer },
        { name: "With UnitID (No Prefix CF)", unitId: config.unitId, cf: config.issuer },
        { name: "Sede Legale Explicit", unitId: null, cf: "IT" + config.issuer }, // No Unit ID
        { name: "Sede Legale Explicit (No IT)", unitId: null, cf: config.issuer }, // No Unit ID
        { name: "Try Short UnitID + IT CF", unitId: config.unitId.split('-')[0], cf: "IT" + config.issuer },
        { name: "Try Short UnitID + No IT CF", unitId: config.unitId.split('-')[0], cf: config.issuer },

        // 3. Last resort: Try to create a NEW BLOCK just to see if we can?
        // POST /vidimazione-formulari/v1.0/vidimazione (NO BLOCK CODE)
        // Payload: { tipoFormulario: "FIR", produttore: {...}, quantita: 1, annotazioni: "Test" }
        
        // Actually, maybe the block code IS WRONG?
        // Screenshot 2 says: "Codice blocco: ZRZXR"
        // Screenshot 2 says: "Unità locale: OP2501XMQ021914-TO0001"
        
        // Is it possible that the BLOCK is not "vidimazione"?
        // The endpoint is .../vidimazione?codiceBlocco=...
        // This endpoint CONSUMES a number from the block.
        
        // Maybe we are not authorized to use this block?
        // Or maybe the block is "exhausted"? "FIR emessi: 482".
        
        // Let's try to query the block status via a different endpoint if it exists?
        // No known endpoint for block status.
        
        // Let's try to use the Registry ID in the URL?
        // The URL is generic: https://api.rentri.gov.it/vidimazione-formulari/v1.0/vidimazione
        
        // Is there a header missing? "Rentri-Software-House-Id"?
        // We are sending it in the axios call inside 'main' script logic?
        // Let's check 'directTestMulty.js' or similar.
        
        // Let's try one more specific variation:
        // "codiceFiscale": "12347770013" (NO IT) AND "unitaLocaleId": "OP2501XMQ021914-TO0001"
        // We tried that: "With UnitID (No Prefix CF)". Failed.
        
        // Maybe "unitaLocaleId" should be just "TO0001"?
        { name: "Suffix Only", unitId: "TO0001", cf: "IT" + config.issuer },
        { name: "With UnitID (Original) + Extra Params", unitId: config.unitId, cf: "IT" + config.issuer }, // Same as original but let's re-verify
    ];
    
    // One more idea:
    // Is the BLOCK CODE case sensitive? "ZRZXR".
    // Is it possible the block code is NOT associated with the user at all?
    // Let's try to query the Registry Status first?
    
    // Try to list the Blocks?
    // GET /vidimazione-formulari/v1.0/blocchi-virtuali?limit=50
    // This endpoint exists in docs.
    
    if (key === 'multy' || key === 'niyol') {
        console.log(`\n[Discovery] Listing Virtual Blocks for ${key}...`);
        try {
            const res = await axios.post(`${BRIDGE_URL}/list-rentri`, {
                url: `https://api.rentri.gov.it/vidimazione-formulari/v1.0/blocchi-virtuali?limit=50`,
                filename: config.p12File,
                issuer: "IT" + config.issuer
            });
            if (res.data.success) {
                 console.log(`✅ FOUND BLOCKS:`, res.data.data);
            } else {
                 console.log(`❌ FAILED TO LIST BLOCKS:`, res.data.data);
                 // Retry without IT prefix
                 const res2 = await axios.post(`${BRIDGE_URL}/list-rentri`, {
                    url: `https://api.rentri.gov.it/vidimazione-formulari/v1.0/blocchi-virtuali?limit=50`,
                    filename: config.p12File,
                    issuer: config.issuer
                });
                if (res2.data.success) console.log(`✅ FOUND BLOCKS (No IT):`, res2.data.data);
                else console.log(`❌ FAILED TO LIST BLOCKS (No IT):`, res2.data.data);
            }
        } catch (e: any) { console.log("Exception listing blocks:", e.message); }
    }

    for (const v of variations) {
        if (key === 'global' && v.name.includes("No Suffix") && !config.unitId.includes("-")) continue;

        console.log(`Trying: ${v.name}...`);
        const payload = JSON.parse(JSON.stringify(basePayload));
        // FIX: The field name might be "idUnitaLocale" or "identificativoUnitaLocale" instead of "unitaLocaleId"?
        // Documentation check: The standard model is "produttore": { "codiceFiscale": "...", "unitaLocaleId": "..." }
        // BUT, maybe the block is assigned to the "SEDE LEGALE" which is NOT an "Unità Locale" in the RENTRI sense?
        // Screenshot shows: "Unità locale: OP2501XMQ021914-TO0001 VIA RIVAROSSA..."
        // This LOOKS like a Unit ID.
        
        // Let's try sending "sedeLegale": true? No such field.
        
        // Let's try sending ONLY codiceFiscale (already tried).
        
        if (v.unitId) payload.produttore.unitaLocaleId = v.unitId;
        else delete payload.produttore.unitaLocaleId;
        
        if (v.cf) payload.produttore.codiceFiscale = v.cf;

        // NEW VARIATION: Check if "unitaLocaleId" should be nested differently? No.
        
        console.log("Payload sent:", JSON.stringify(payload));
        
        // Also try to query the block details if possible? No endpoint.

        try {
            const res = await axios.post(`${BRIDGE_URL}/send-rentri`, {
                url: `https://api.rentri.gov.it/vidimazione-formulari/v1.0/vidimazione?codiceBlocco=${config.blockCode}`,
                method: 'POST',
                payload: JSON.stringify(payload),
                filename: config.p12File,
                issuer: v.cf || ("IT" + config.issuer)
            });

            if (res.data.success) {
                console.log(`✅ SUCCESS! Variation '${v.name}' worked! Response:`, res.data.data);
                return; // Stop on first success
            } else {
                const err = typeof res.data.data === 'string' ? JSON.parse(res.data.data) : res.data.data;
                const code = err?.model_state?.codice_blocco?.[0] || err?.title || "Unknown";
                console.log(`❌ Failed (${code}).`);
            }
        } catch (e: any) {
            console.log(`❌ Exception: ${e.message}`);
        }
    }
}

async function main() {
    // 1. Retry Niyol Vidimazione (Auth fixed?)
    console.log("--- RETRYING NIYOL VIDIMAZIONE ---");
    const niyolConfig = COMPANIES.niyol;
    try {
        const payload = {
            tipoFormulario: "FIR",
            produttore: {
                codiceFiscale: "IT" + niyolConfig.issuer, 
                unitaLocaleId: niyolConfig.unitId
            },
            quantita: 1
        };
        const res = await axios.post(`${BRIDGE_URL}/send-rentri`, {
            url: `https://api.rentri.gov.it/vidimazione-formulari/v1.0/vidimazione?codiceBlocco=${niyolConfig.blockCode}`,
            method: 'POST',
            payload: JSON.stringify(payload),
            filename: niyolConfig.p12File,
            issuer: "IT" + niyolConfig.issuer 
        });
        if (res.data.success) {
            console.log(`✅ NIYOL VIDIMAZIONE OK!`, res.data.data);
        } else {
            console.log(`❌ NIYOL VIDIMAZIONE FAILED:`, res.data.data);
        }
    } catch(e:any) { console.log("Exception Niyol:", e.message); }

    // 2. Test Permutations for Global and Multy
    // await testVidimazionePermutations('global');
    await testVidimazionePermutations('multy'); // Test Multy with fixed Unit ID
}

main();
