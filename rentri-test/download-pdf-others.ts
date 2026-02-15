import { createClient } from './client';
import fs from 'fs';
import path from 'path';

async function run() {
    console.log("--- TEST: DOWNLOAD PDF OTHERS ---");

    const targets = [
        { company: 'multy', fir: 'ZRZXR000484MJ' },
        { company: 'niyol', fir: 'BPJMG000263PF' }
    ] as const;

    for (const t of targets) {
        console.log(`\nDownloading for ${t.company.toUpperCase()} - FIR: ${t.fir}...`);
        try {
            const client = await createClient(t.company);
            const p = `/formulari/v1.0/${t.fir}/pdf`;
            
            // client.get returns the body directly
            const data = await client.get(p, { responseType: 'arraybuffer' });
            
            let jsonObj: any = data;
            
            // Handle Buffer -> String -> JSON
            if (Buffer.isBuffer(data)) {
                const str = data.toString('utf-8');
                try {
                    jsonObj = JSON.parse(str);
                } catch (e) {
                    // Not JSON, maybe raw PDF?
                    if (str.startsWith('%PDF')) {
                        jsonObj = { content: data.toString('base64'), mime: 'application/pdf', nome_file: `${t.fir}.pdf` };
                    }
                }
            }

            if (jsonObj && jsonObj.content && jsonObj.mime === 'application/pdf') {
                console.log(`✅ FOUND PDF! Filename: ${jsonObj.nome_file}`);
                const pdfBuffer = Buffer.from(jsonObj.content, 'base64');
                const outFile = path.join(process.cwd(), 'rentri-test', `${t.company}_${t.fir}.pdf`);
                fs.writeFileSync(outFile, pdfBuffer);
                console.log(`Saved to ${outFile}`);
            } else {
                console.log("⚠️ Content not recognized as PDF JSON wrapper.");
                if (Buffer.isBuffer(data)) console.log(`Received ${data.length} bytes.`);
                else console.log("Received Object:", JSON.stringify(data).substring(0, 100));
            }

        } catch (e: any) {
            console.log(`❌ Error: ${e.message}`);
        }
    }
}

run();
