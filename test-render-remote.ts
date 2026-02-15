import axios from 'axios';
import https from 'https';

// --- CONFIGURAZIONE ---
const RENDER_URL = process.env.RENDER_URL || 'https://smartform-navigator.onrender.com';

const payloadFir: any = {
    num_iscr_sito: "OP2501XMQ021914-TO0001",
    dati_partenza: {
        produttore: {
            denominazione: "MULTY PROGET S.R.L.",
            codice_fiscale: "12347770013",
            nazione_id: "IT",
            indirizzo: {
                citta: { comune_id: "001195" },
                indirizzo: "VIA RIVAROSSA 18/20",
                cap: "10040"
            },
            luogo_produzione: {
                citta: { comune_id: "001195" },
                indirizzo: "VIA RIVAROSSA 18/20",
                cap: "10040"
            }
        },
        destinatario: {
            denominazione: "MULTY PROGET S.R.L.",
            codice_fiscale: "12347770013",
            nazione_id: "IT",
            attivita: "R13",
            indirizzo: {
                citta: { comune_id: "001195" },
                indirizzo: "VIA RIVAROSSA 18/20",
                cap: "10040"
            }
        },
        trasportatori: [
            {
                denominazione: "MULTY PROGET S.R.L.",
                codice_fiscale: "12347770013",
                nazione_id: "IT",
                tipo_trasporto: "Terrestre",
                indirizzo: {
                        citta: { comune_id: "001195" },
                        indirizzo: "VIA RIVAROSSA 18/20",
                        cap: "10040"
                }
            }
        ],
        rifiuto: {
            codice_eer: "150101",
            descrizione: "IMBALLAGGI IN CARTA E CARTONE",
            provenienza: "U",
            stato_fisico: "SP",
            pericoloso: false,
            quantita: {
                valore: 50,
                unita_misura: "kg"
            },
            caratteristiche_pericolo: []
        },
        dati_trasporto_partenza: {
            conducente: {
                nome: "MARIO",
                cognome: "BIANCHI"
            },
            targa_automezzo: "XX000YY",
            data_ora_inizio_trasporto: new Date().toISOString()
        },
        annotazioni: "TEST DA REMOTO (RENDER)"
    }
};

async function runTest() {
    console.log(`--- TEST RENDER API (${RENDER_URL}) ---`);
    
    try {
        console.log(`Using RENDER_URL: ${RENDER_URL}`);
        
        // 1. Check Health
        console.log("\nChecking Health...");
        const health = await axios.get(`${RENDER_URL}/health`);
        console.log("✅ Health OK:", health.data);

        // 2. Test Vidimation Only (Multy)
        console.log("\nTesting Vidimation Only (Multy)...");
        const vidRes = await axios.post(`${RENDER_URL}/vidimate`, {
            company: 'multy'
        });
        console.log("✅ Vidimation OK! New FIR:", vidRes.data.firNumber);
        
        // Inject the vidimated number into the payload for step 3
        payloadFir.dati_partenza.numero_fir = vidRes.data.firNumber;
        console.log("Using this FIR number for next step to save vidimations.");

        // 3. Test Full Cycle (Create + PDF)
        console.log("\nTesting Creation + PDF (using vidimated number)...");
        const createRes = await axios.post(`${RENDER_URL}/firma-fir`, {
            societaId: 'multy',
            payloadFir
        });
        
        console.log("✅ Creation OK!");
        console.log("FIR Number:", createRes.data.firNumber);
        if (createRes.data.pdfBase64) {
            console.log("PDF Received! Length:", createRes.data.pdfBase64.length);
            const fs = require('fs');
            const path = require('path');
            const outFile = path.join(process.cwd(), 'rentri-test', `render_test_${createRes.data.firNumber}.pdf`);
            fs.writeFileSync(outFile, Buffer.from(createRes.data.pdfBase64, 'base64'));
            console.log("Saved PDF to:", outFile);
        } else {
            console.log("⚠️ PDF Missing in response");
        }

    } catch (e: any) {
        console.error("❌ TEST FAILED:", e.message);
        if (e.response) {
            console.error("Status:", e.response.status);
            console.error("Data:", JSON.stringify(e.response.data, null, 2));
        }
    }
}

runTest();
