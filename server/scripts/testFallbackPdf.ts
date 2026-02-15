
import { generateFallbackPDF } from '../utils/firFallback';
import fs from 'fs';

async function test() {
    const dummyData = {
        produttore: { codiceFiscale: 'IT12345678901', unitaLocaleId: 'UL_TEST' },
        rifiuto: { codice_eer: '150106', quantita: { valore: 100 } },
        trasportatore: { denominazione: 'TRANSPORT S.R.L.' },
        destinatario: { denominazione: 'RECOVERY S.P.A.' }
    };

    console.log("Generating PDF...");
    try {
        const path = await generateFallbackPDF(dummyData, "ERRORE CONNESSIONE RENTRI: TIMEOUT");
        console.log("PDF generated at:", path);
        if (fs.existsSync(path)) {
            console.log("File exists! Size:", fs.statSync(path).size);
        } else {
            console.error("File missing!");
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
