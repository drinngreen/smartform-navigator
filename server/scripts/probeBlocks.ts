
import axios from 'axios';
import { COMPANIES } from '../companyEndpoints';

const BRIDGE_URL = 'http://127.0.0.1:8765';

async function probe(key: string) {
    const config = COMPANIES[key];
    console.log(`\n--- PROBING BLOCKS FOR ${key.toUpperCase()} ---`);
    console.log(`Issuer (Auth): ${config.issuer}`);

    // Lista di endpoint potenziali per listare i blocchi
    // La documentazione ufficiale dice:
    // GET /vidimazione-formulari/v1.0/blocchi-virtuali
    
    const endpoints = [
        "https://api.rentri.gov.it/vidimazione-formulari/v1.0/blocchi-virtuali",
        "https://api.rentri.gov.it/vidimazione-formulari/v1.0/operatore/blocchi-virtuali",
        "https://api.rentri.gov.it/dati-registri/v1.0/blocchi-virtuali", // A volte sono sotto dati-registri
        "https://api.rentri.gov.it/anagrafiche/v1.0/blocchi-virtuali"
    ];

    for (const url of endpoints) {
        console.log(`👉 Trying GET ${url}`);
        try {
            // Usiamo send-rentri in modalità GET pura
            const res = await axios.post(`${BRIDGE_URL}/send-rentri`, {
                url: `${url}?limit=50`,
                method: 'GET',
                payload: "", // GET non ha payload
                filename: config.p12File,
                issuer: config.issuer
            });

            if (res.data.success) {
                console.log(`✅ SUCCESS! Found Endpoint: ${url}`);
                console.log(`✅ DATA:`, res.data.data);
                return; // Trovato!
            } else {
                const d = typeof res.data.data === 'string' ? JSON.parse(res.data.data) : res.data.data;
                console.log(`   ❌ Status ${res.data.status}:`, d?.title || d);
            }
        } catch (e: any) {
            console.log(`   ❌ Exception:`, e.message);
        }
    }
}

async function main() {
    // Prima proviamo con Global che sappiamo funzionare, per avere un "controllo positivo"
    // Se fallisce anche Global a listare i blocchi, allora l'endpoint o i permessi di lettura sono il problema.
    await probe('global'); 
    
    // Poi Multy
    // await probe('multy');
    
    // Poi Niyol
    // await probe('niyol');
}

main();
