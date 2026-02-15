import { createClient } from './client';
import { CONFIG } from './config';
import { v4 as uuidv4 } from 'uuid';

async function run() {
    console.log("--- TEST: CREA FIR GLOBAL (PAYLOAD COMPLETO) ---");
    const client = await createClient('global');
    const { unitId, issuer } = CONFIG.companies.global;

    // Format is usually free but let's try a standard-looking one
    // Valid FIR obtained via vidimazione API (Block SKKZR, Prog 1)
    const firNumber = `SKKZR000001HD`; 

    // Helper to get current ISO time
    const now = new Date().toISOString();

    const payload = {
        num_iscr_sito: unitId,
        dati_partenza: {
            numero_fir: firNumber,
            produttore: {
                denominazione: "GLOBAL RECO S.R.L.",
                codice_fiscale: issuer,
                nazione_id: "IT",
                indirizzo: {
                    citta: { comune_id: "058091" }, // Roma (ISTAT)
                    indirizzo: "VIA DEL COMMERCIO 1",
                    cap: "00100"
                },
                luogo_produzione: {
                    citta: { comune_id: "058091" },
                    indirizzo: "VIA PRODUZIONE 1",
                    cap: "00100"
                },
                autorizzazione: {
                    numero: "AUT-PROD-001",
                    tipo: "AIA"
                },
                contatto: {
                    nome: "Mario Rossi",
                    email: "info@globalreco.it"
                }
            },
            destinatario: {
                denominazione: "IMPIANTO DESTINATARIO TEST",
                codice_fiscale: issuer, // Sending to self for test to ensure valid CF
                nazione_id: "IT",
                attivita: "R13",
                autorizzazione: {
                    numero: "AUT-DEST-001",
                    tipo: "AIA"
                },
                indirizzo: {
                    citta: { comune_id: "058091" },
                    indirizzo: "VIA DESTINAZIONE 1",
                    cap: "00100"
                }
            },
            trasportatori: [
                {
                    denominazione: "GLOBAL RECO S.R.L.", // Self transport
                    codice_fiscale: issuer,
                    nazione_id: "IT",
                    tipo_trasporto: "Terrestre", // User suggestion
                    // numero_iscrizione_albo: "MI012345",
                    indirizzo: {
                         citta: { comune_id: "058091" },
                         indirizzo: "VIA TRASPORTO 1",
                         cap: "00100"
                    }
                }
            ],
            rifiuto: {
                codice_eer: "150101",
                descrizione: "IMBALLAGGI IN CARTA E CARTONE",
                provenienza: "U", // Urbano, per provare. S=Speciale
                stato_fisico: "SP", // User suggestion
                pericoloso: false,
                quantita: {
                    valore: 100,
                    unita_misura: "kg"
                },
                caratteristiche_pericolo: [] // Non pericoloso
            },
            dati_trasporto_partenza: {
                conducente: {
                    nome: "LUIGI",
                    cognome: "VERDI"
                },
                targa_automezzo: "AB123CD",
                targa_rimorchio: "EF456GH",
                data_ora_inizio_trasporto: now
            },
            annotazioni: "FIR DI PROVA GENERATO DA API"
        }
    };

    const path = '/formulari/v1.0';

    console.log(`\nTesting POST ${path} ...`);
    console.log(`Payload preview (numero_fir): ${payload.dati_partenza.numero_fir}`);
    
    try {
        const res = await client.post(path, payload);
        console.log("✅ SUCCESS!");
        console.log(JSON.stringify(res, null, 2));
    } catch (e: any) {
        console.log(`❌ FAILED: ${e.message}`);
        if (e.response && e.response.data) {
             console.log("Details:", JSON.stringify(e.response.data, null, 2));
        }
    }
}

run();
