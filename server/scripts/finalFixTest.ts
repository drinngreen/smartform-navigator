
import axios from 'axios';
import { COMPANIES } from '../companyEndpoints';

const BRIDGE_URL = 'http://127.0.0.1:8765';

async function testMulty() {
    const config = COMPANIES['multy'];
    console.log(`\n--- TEST MIRATO MULTY PROGET ---`);
    console.log(`Issuer: ${config.issuer}`);
    console.log(`Block: ${config.blockCode}`);

    // Tentativo 1: Payload Standard (quello che dovrebbe funzionare)
    // Ma con una modifica: proviamo a omettere riferimenti temporali complessi
    const payload = {
        tipoFormulario: "FIR",
        produttore: {
            codiceFiscale: config.issuer,
            unitaLocaleId: config.unitId
        },
        quantita: 1
    };

    try {
        const res = await axios.post(`${BRIDGE_URL}/send-rentri`, {
            // Trying Operator Specific Endpoint
            url: `https://api.rentri.gov.it/vidimazione-formulari/v1.0/operatore/${config.registryId}/vidimazione?codiceBlocco=${config.blockCode}`,
            method: 'POST',
            payload: JSON.stringify(payload),
            filename: config.p12File,
            issuer: config.issuer
        });

        if (res.data.success) {
            console.log(`✅ SUCCESS! FIR Creato:`, res.data.data);
        } else {
            console.log(`❌ FALLITO STANDARD:`, res.data.data);
            
            // Tentativo 2: Senza Unità Locale (se il blocco è su Sede Legale)
            console.log("   Riprovo SENZA Unità Locale...");
            const p2 = JSON.parse(JSON.stringify(payload));
            delete p2.produttore.unitaLocaleId;
            
            const res2 = await axios.post(`${BRIDGE_URL}/send-rentri`, {
                url: `https://api.rentri.gov.it/vidimazione-formulari/v1.0/vidimazione?codiceBlocco=${config.blockCode}`,
                method: 'POST',
                payload: JSON.stringify(p2),
                filename: config.p12File,
                issuer: config.issuer
            });
            
            if (res2.data.success) console.log(`   ✅ SUCCESS (No UL)! FIR:`, res2.data.data);
            else console.log(`   ❌ FALLITO (No UL):`, res2.data.data);
        }
    } catch (e: any) {
        console.log(`Exception:`, e.message);
    }
}

async function testNiyol() {
    const config = COMPANIES['niyol'];
    console.log(`\n--- TEST MIRATO NIYOL ---`);
    console.log(`Issuer: ${config.issuer}`);
    console.log(`Block: ${config.blockCode}`);

    const payload = {
        tipoFormulario: "FIR",
        produttore: {
            codiceFiscale: config.issuer,
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
            issuer: config.issuer
        });

        if (res.data.success) {
            console.log(`✅ SUCCESS! FIR Creato:`, res.data.data);
        } else {
            console.log(`❌ FALLITO STANDARD:`, res.data.data);
             // Tentativo 2: Senza Unità Locale
            console.log("   Riprovo SENZA Unità Locale...");
            const p2 = JSON.parse(JSON.stringify(payload));
            delete p2.produttore.unitaLocaleId;
            const res2 = await axios.post(`${BRIDGE_URL}/send-rentri`, {
                url: `https://api.rentri.gov.it/vidimazione-formulari/v1.0/vidimazione?codiceBlocco=${config.blockCode}`,
                method: 'POST',
                payload: JSON.stringify(p2),
                filename: config.p12File,
                issuer: config.issuer
            });
            if (res2.data.success) console.log(`   ✅ SUCCESS (No UL)! FIR:`, res2.data.data);
            else console.log(`   ❌ FALLITO (No UL):`, res2.data.data);
        }
    } catch (e: any) {
        console.log(`Exception:`, e.message);
    }
}

async function main() {
    await testMulty();
    await testNiyol();
}

main();
