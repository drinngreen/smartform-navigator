import { createClient } from './client';
import { CONFIG } from './config';
import fs from 'fs';
import path from 'path';

const DELAY = 2000;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function runCompany(companyKey: 'multy' | 'niyol') {
    console.log(`\n\n=============================================`);
    console.log(`=== STARTING FULL CYCLE FOR: ${companyKey.toUpperCase()} ===`);
    console.log(`=============================================`);

    const client = await createClient(companyKey);
    const conf = CONFIG.companies[companyKey];
    
    // Data for payload (simplified for test)
    const companyData = {
        multy: {
            denominazione: "MULTY PROGET S.R.L.",
            indirizzo: "VIA RIVAROSSA 18/20",
            comune_id: "001195" // Taken from API discovery
        },
        niyol: {
            denominazione: "NIYOL ETICONS LOGISTICA SRL SB",
            indirizzo: "VIA RIVAROSSA 18-20",
            comune_id: "001195" // Taken from API discovery
        }
    };
    const details = companyData[companyKey];

    try {
        // 1. DISCOVERY & VIDIMATION
        const block = conf.blockCode!; 
        console.log(`\n1. Discovering status for block ${block}...`);
        
        // We need to find the current count first to know what to ask for
        // Using the CF-based list endpoint which worked
        const listPath = `/vidimazione-formulari/v1.0?identificativo=${conf.issuer}`;
        const listRes = await client.get(listPath);
        
        const blockInfo = listRes.find((b: any) => b.codice_blocco === block);
        if (!blockInfo) throw new Error(`Block ${block} not found in list`);
        
        const currentCount = blockInfo.numero_fir_vidimati || 0;
        const nextProg = currentCount + 1;
        console.log(`   > Current Vidimated: ${currentCount}. Next should be: ${nextProg}`);

        console.log(`\n2. Vidimating on block ${block}...`);
        await client.post(`/vidimazione-formulari/v1.0/${block}`, {});
        console.log(`   > Vidimation Requested.`);

        // 3. GET FIR NUMBER DIRECTLY
        console.log(`\n3. Fetching New FIR Number (${block}/${nextProg})...`);
        let firNumberFull = "";
        
        for (let i = 0; i < 5; i++) {
            await sleep(DELAY);
            try {
                const firPath = `/vidimazione-formulari/v1.0/${block}/${nextProg}`;
                const check = await client.get(firPath);
                
                if (check.numero_fir) {
                    firNumberFull = check.numero_fir;
                    console.log(`   > GOT FIR NUMBER: "${firNumberFull}"`);
                    break;
                }
            } catch (e: any) {
                console.log(`   > Retry ${i+1}: ${e.message}`);
                // If 404, it might mean the async process hasn't finished creating it yet
            }
        }

        if (!firNumberFull) {
            throw new Error("Could not retrieve FIR Number from Vidimation Transaction.");
        }

        // Clean FIR Number for Payload (Remove spaces)
        const firNumberPayload = firNumberFull.replace(/\s/g, '');
        console.log(`   > Payload FIR: ${firNumberPayload}`);

        // 3. CREATE FIR
        console.log(`\n3. Creating FIR...`);
        const now = new Date().toISOString();
        const payload = {
            num_iscr_sito: conf.unitId,
            dati_partenza: {
                numero_fir: firNumberPayload,
                produttore: {
                    denominazione: details.denominazione,
                    codice_fiscale: conf.issuer,
                    nazione_id: "IT",
                    indirizzo: {
                        citta: { comune_id: details.comune_id },
                        indirizzo: details.indirizzo,
                        cap: "10040" // Guessing CAP for Via Rivarossa (San Benigno Canavese?)
                    },
                    luogo_produzione: {
                        citta: { comune_id: details.comune_id },
                        indirizzo: details.indirizzo,
                        cap: "10040"
                    },
                    contatto: {
                        nome: "Test",
                        email: "test@example.com"
                    }
                },
                destinatario: {
                    denominazione: details.denominazione, // Self
                    codice_fiscale: conf.issuer,
                    nazione_id: "IT",
                    attivita: "R13",
                    indirizzo: {
                        citta: { comune_id: details.comune_id },
                        indirizzo: details.indirizzo,
                        cap: "10040"
                    }
                },
                trasportatori: [
                    {
                        denominazione: details.denominazione, // Self
                        codice_fiscale: conf.issuer,
                        nazione_id: "IT",
                        tipo_trasporto: "Terrestre",
                        indirizzo: {
                             citta: { comune_id: details.comune_id },
                             indirizzo: details.indirizzo,
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
                    data_ora_inizio_trasporto: now
                },
                annotazioni: "TEST AUTOMATICO TRAE"
            }
        };

        const createRes = await client.post('/formulari/v1.0', payload);
        const createTxId = createRes.transazione_id;
        console.log(`   > Creation Started. Tx: ${createTxId}`);

        // 4. CHECK CREATION RESULT
        console.log(`\n4. Waiting for Creation Result...`);
        let created = false;
        for (let i = 0; i < 5; i++) {
            await sleep(DELAY);
            try {
                const res = await client.get(`/formulari/v1.0/${createTxId}/result`);
                if (res.errore === false) {
                    console.log("   > ✅ FIR CREATED SUCCESSFULLY!");
                    created = true;
                    break;
                } else if (res.errore === true) {
                    console.log("   > ❌ FIR CREATION FAILED:");
                    console.log(JSON.stringify(res.validazione, null, 2));
                    throw new Error("Creation validation failed");
                }
            } catch (e: any) {
                console.log(`   > Retry ${i+1}: ${e.message}`);
            }
        }

        if (!created) throw new Error("Creation timed out");

        // 5. DOWNLOAD PDF
        console.log(`\n5. Downloading PDF...`);
        const pdfRes = await client.get(`/formulari/v1.0/${firNumberPayload}/pdf`, { responseType: 'arraybuffer' });
        
        let pdfBuffer: Buffer | null = null;
        if (Buffer.isBuffer(pdfRes)) {
            pdfBuffer = pdfRes;
        } else {
             // Try parse JSON
             try {
                 const json = JSON.parse(Buffer.from(pdfRes).toString());
                 if (json.content) {
                     pdfBuffer = Buffer.from(json.content, 'base64');
                 }
             } catch(e) {}
        }

        if (pdfBuffer && pdfBuffer.length > 100) {
            const outFile = path.join(process.cwd(), 'rentri-test', `${companyKey}_${firNumberPayload}.pdf`);
            fs.writeFileSync(outFile, pdfBuffer);
            console.log(`   > ✅ PDF Saved to: ${outFile}`);
        } else {
            console.log("   > ⚠️ Could not extract PDF from response");
        }

    } catch (e: any) {
        console.log(`\n❌ ERROR in ${companyKey} cycle: ${e.message}`);
        if (e.response?.data) {
            console.log("Details:", JSON.stringify(e.response.data, null, 2));
        }
    }
}

async function main() {
    await runCompany('multy');
    await runCompany('niyol');
}

main();
