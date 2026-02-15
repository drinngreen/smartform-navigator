import { createClient } from './client';
import fs from 'fs';
import path from 'path';

async function run() {
    console.log("--- TEST: DOWNLOAD FIR PDF ---");
    const client = await createClient('global');

    // Data from previous success
    const firNumber = "SKKZR 000001 HD"; // With spaces
    const firNumberEncoded = encodeURIComponent(firNumber);
    const firNumberNoSpaces = "SKKZR000001HD";
    const txId = "b2ce64ca-0f96-43f3-82e8-507ba33b754f";

    const paths = [
        // Using FIR Number (Encoded)
        `/formulari/v1.0/${firNumberEncoded}/pdf`,
        `/formulari/v1.0/${firNumberEncoded}/stampa`,
        `/formulari/v1.0/${firNumberEncoded}/copia-cortesia`,
        `/formulari/v1.0/${firNumberEncoded}/download`,
        
        // Using FIR Number (No Spaces)
        `/formulari/v1.0/${firNumberNoSpaces}/pdf`,
        
        // Using Transaction ID
        `/formulari/v1.0/transazioni/${txId}/pdf`,
        `/formulari/v1.0/${txId}/pdf`,
        
        // General
        `/formulari/v1.0/pdf?numero_fir=${firNumberEncoded}`,
    ];

    for (const p of paths) {
        console.log(`\nTrying GET ${p} ...`);
        try {
            // client.get returns the body directly
            const data = await client.get(p, { responseType: 'arraybuffer' });
            
            // Check if data is valid (Buffer or ArrayBuffer)
            if (Buffer.isBuffer(data)) {
                 console.log(`✅ SUCCESS! Received Buffer of ${data.length} bytes.`);
                 // Check for PDF signature %PDF
                 const header = data.subarray(0, 5).toString();
                 console.log(`Header: ${header}`);
                 
                 const safeName = p.replace(/[^a-zA-Z0-9]/g, '_');
                 const outFile = path.join(process.cwd(), 'rentri-test', `download_${safeName}.pdf`);
                 fs.writeFileSync(outFile, data);
                 console.log(`Saved to ${outFile}`);
                 
                 if (header.startsWith('%PDF')) {
                     console.log("!!! IT IS A PDF !!!");
                     break;
                 }
            } else {
                  console.log("✅ SUCCESS! Received Object (JSON?)");
                  
                  let jsonObj: any = data;
                  if (data instanceof ArrayBuffer) {
                      const str = Buffer.from(data).toString('utf-8');
                      try {
                          jsonObj = JSON.parse(str);
                      } catch (e) {
                          console.log("Could not parse JSON string");
                      }
                  }

                  if (jsonObj && jsonObj.content && jsonObj.mime === 'application/pdf') {
                      console.log(`Found PDF content in JSON! Filename: ${jsonObj.nome_file}`);
                      const pdfBuffer = Buffer.from(jsonObj.content, 'base64');
                      const safeName = p.replace(/[^a-zA-Z0-9]/g, '_');
                      const outFile = path.join(process.cwd(), 'rentri-test', `download_${safeName}.pdf`);
                      fs.writeFileSync(outFile, pdfBuffer);
                      console.log(`Saved PDF to ${outFile}`);
                      console.log("!!! IT IS A PDF !!!");
                      break;
                  } else {
                      console.log("Content:", JSON.stringify(jsonObj, null, 2).substring(0, 500));
                  }
             }
        } catch (e: any) {
            console.log(`❌ ${e.response?.status || 'Error'}: ${e.message}`);
        }
    }
}

run();
