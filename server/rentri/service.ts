import { createClient } from './client';
import { RENTRI_CONFIG, CompanyKey } from './config';

const SLEEP_MS = 2000;
const MAX_RETRIES = 15; // 30 seconds max
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export class RentriService {
    
    // 1. Vidimate and Get New FIR Number
    static async vidimateFir(company: CompanyKey): Promise<string> {
        const client = await createClient(company);
        const blockCode = RENTRI_CONFIG.companies[company].blockCode;
        if (!blockCode) throw new Error(`Block code not configured for ${company}`);

        console.log(`[RentriService] Vidimating block ${blockCode} for ${company}...`);
        
        // Step A: Start Vidimation Transaction
        const vidRes = await client.post(`/vidimazione-formulari/v1.0/${blockCode}`, {});
        const txId = vidRes.transazione_id;
        
        // Step B: Poll for Result
        console.log(`[RentriService] Polling for FIR Number (Tx: ${txId})...`);
        
        for (let i = 0; i < MAX_RETRIES; i++) {
            await sleep(SLEEP_MS);
            try {
                const res = await client.get(`/vidimazione-formulari/v1.0/transazioni/${txId}/result`);
                if (res.esito && res.esito.numero_fir) {
                    return res.esito.numero_fir; // e.g. "SKKZR 000001 HD"
                }
            } catch (e) {
                // Ignore errors during polling
            }
        }
        
        throw new Error("Timeout waiting for Vidimation Result");
    }

    // 2. Create FIR (Emission) and Return PDF
    static async createFir(company: CompanyKey, payload: any): Promise<{ firNumber: string, pdfBase64: string }> {
        const client = await createClient(company);
        
        // Ensure FIR Number is clean (no spaces) for payload
        const rawFirNumber = payload.dati_partenza.numero_fir;
        if (!rawFirNumber) throw new Error("Missing dati_partenza.numero_fir");
        
        const cleanFirNumber = rawFirNumber.replace(/\s/g, '');
        payload.dati_partenza.numero_fir = cleanFirNumber;

        console.log(`[RentriService] Creating FIR ${cleanFirNumber} for ${company}...`);
        
        // Step A: Post Creation
        const createRes = await client.post('/formulari/v1.0', payload);
        const txId = createRes.transazione_id;

        // Step B: Poll for Success
        console.log(`[RentriService] Polling for Creation Result (Tx: ${txId})...`);
        let created = false;
        
        for (let i = 0; i < MAX_RETRIES; i++) {
            await sleep(SLEEP_MS);
            try {
                const res = await client.get(`/formulari/v1.0/${txId}/result`);
                if (res.errore === false) {
                    created = true;
                    break;
                } else if (res.errore === true) {
                    throw new Error(`FIR Creation Failed: ${JSON.stringify(res.validazione)}`);
                }
            } catch (e: any) {
                if (e.message && e.message.includes("FIR Creation Failed")) throw e;
            }
        }

        if (!created) throw new Error("Timeout waiting for FIR Creation");

        // Step C: Download PDF
        console.log(`[RentriService] Downloading PDF for ${cleanFirNumber}...`);
        try {
            const pdfRes = await client.get(`/formulari/v1.0/${cleanFirNumber}/pdf`, { responseType: 'arraybuffer' });
            
            let pdfBase64 = '';
            
            // Handle different response types (Buffer vs JSON string)
            if (Buffer.isBuffer(pdfRes)) {
                 try {
                     const json = JSON.parse(pdfRes.toString('utf-8'));
                     if (json.content) pdfBase64 = json.content;
                 } catch {
                     // Assume raw PDF if not JSON
                     // But wait, my tests showed it returns a JSON object with 'content' field (base64) 
                     // OR sometimes just raw buffer depending on endpoint.
                     // The endpoint /pdf usually returns JSON { mime, content, nome_file }
                     // Let's assume raw PDF if it starts with %PDF
                     const str = pdfRes.toString('utf-8');
                     if (str.startsWith('%PDF')) {
                         pdfBase64 = pdfRes.toString('base64');
                     }
                 }
            } else if (typeof pdfRes === 'object' && pdfRes.content) {
                 pdfBase64 = pdfRes.content;
            }

            if (!pdfBase64) {
                 // Last resort: check if pdfRes is the JSON object directly (axios might parse it)
                 if (pdfRes.content) pdfBase64 = pdfRes.content;
                 else throw new Error("Could not extract PDF content");
            }

            return { firNumber: rawFirNumber, pdfBase64 };

        } catch (e: any) {
             throw new Error(`Failed to download PDF: ${e.message}`);
        }
    }
}
