
import axios from 'axios';
import { COMPANIES } from '../companyEndpoints';

const BRIDGE_URL = 'http://127.0.0.1:8765';

async function discoverRegistryId(key: string) {
    const config = COMPANIES[key];
    console.log(`\n[${key.toUpperCase()}] Discovery Registry ID...`);
    try {
        // Try to list registries associated with the operator
        const res = await axios.post(`${BRIDGE_URL}/list-rentri`, {
            url: `https://api.rentri.gov.it/anagrafiche/v1.0/registri`,
            filename: config.p12File,
            issuer: "IT" + config.issuer
        });

        if (res.data.success) {
            const data = JSON.parse(res.data.data);
            if (Array.isArray(data) && data.length > 0) {
                console.log(`✅ FOUND REGISTRIES:`);
                data.forEach((r: any) => {
                    console.log(`   - ID: ${r.identificativo_registro} (${r.descrizione})`);
                });
                return data[0].identificativo_registro;
            } else {
                console.log(`⚠️ No registries found in list.`);
            }
        } else {
            console.log(`❌ Failed to list registries:`, res.data.data);
            // Try without IT prefix
            const res2 = await axios.post(`${BRIDGE_URL}/list-rentri`, {
                url: `https://api.rentri.gov.it/anagrafiche/v1.0/registri`,
                filename: config.p12File,
                issuer: config.issuer
            });
            if (res2.data.success) {
                 const data = JSON.parse(res2.data.data);
                 if (Array.isArray(data) && data.length > 0) {
                    console.log(`✅ FOUND REGISTRIES (No IT):`);
                    data.forEach((r: any) => {
                        console.log(`   - ID: ${r.identificativo_registro} (${r.descrizione})`);
                    });
                    return data[0].identificativo_registro;
                }
            }
        }
    } catch (e: any) {
        console.log(`❌ Exception discovering registry: ${e.message}`);
    }
    return null;
}

async function bruteForceVidimazione(key: string, registryIdOverride?: string) {
    const config = COMPANIES[key];
    const registryId = registryIdOverride || config.registryId;
    
    console.log(`\n[${key.toUpperCase()}] Brute Force Vidimazione Block '${config.blockCode}'...`);
    
    if (!config.blockCode) {
        console.log(`⚠️ No block code defined for ${key}, skipping.`);
        return;
    }

    const variations = [
        { name: "Full UnitID", unitId: config.unitId },
        { name: "No UnitID (Sede Legale)", unitId: undefined },
        { name: "Prefix Only (split -)", unitId: config.unitId.split('-')[0] },
        { name: "Suffix Only (split -)", unitId: config.unitId.split('-')[1] || "TO0001" }, // Fallback to TO0001 if split fails but we know it
        { name: "Explicit Null", unitId: null },
    ];

    for (const v of variations) {
        if (v.name.includes("Suffix") && !v.unitId) continue;
        
        console.log(`   👉 Trying: ${v.name} [${v.unitId || 'NONE'}]`);
        
        const payload: any = {
            tipoFormulario: "FIR",
            produttore: {
                codiceFiscale: "IT" + config.issuer,
            },
            quantita: 1
        };

        if (v.unitId) {
            payload.produttore.unitaLocaleId = v.unitId;
        }

        try {
            const res = await axios.post(`${BRIDGE_URL}/send-rentri`, {
                url: `https://api.rentri.gov.it/vidimazione-formulari/v1.0/vidimazione?codiceBlocco=${config.blockCode}`,
                method: 'POST',
                payload: JSON.stringify(payload),
                filename: config.p12File,
                issuer: "IT" + config.issuer
            });

            if (res.data.success) {
                console.log(`   ✅ SUCCESS!!! Vidimazione worked with: ${v.name}`);
                console.log(`   📄 FIR NUMBER:`, res.data.data);
                return; // Stop on success
            } else {
                let errCode = "Unknown";
                try {
                    const d = typeof res.data.data === 'string' ? JSON.parse(res.data.data) : res.data.data;
                    errCode = d?.model_state?.codice_blocco?.[0] || d?.title || JSON.stringify(d);
                } catch {}
                console.log(`      ❌ Failed: ${errCode.substring(0, 100)}...`);
            }
        } catch (e: any) {
            console.log(`      ❌ Exception: ${e.message}`);
        }
    }
}

async function main() {
    // 1. GLOBAL
    // await bruteForceVidimazione('global');

    // 2. MULTY
    await bruteForceVidimazione('multy');

    // 3. NIYOL (First discover registry)
    const niyolRegId = await discoverRegistryId('niyol');
    if (niyolRegId) {
        console.log(`Updating Niyol Registry ID to: ${niyolRegId}`);
        COMPANIES.niyol.registryId = niyolRegId;
        // Also try to list movements to verify
         try {
            const res = await axios.post(`${BRIDGE_URL}/list-movimenti`, {
                registryId: niyolRegId,
                filename: COMPANIES.niyol.p12File,
                issuer: COMPANIES.niyol.issuer, // Try without IT first? or with?
                limit: 1
            });
            if(res.data.success) console.log(`✅ Niyol Registry Access OK!`);
            else console.log(`❌ Niyol Registry Access Failed even with new ID.`);
        } catch {}

        await bruteForceVidimazione('niyol');
    } else {
        console.log(`❌ Could not find Niyol Registry ID, skipping vidimazione test.`);
    }
}

main();
