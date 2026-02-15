
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'
import dotenv from 'dotenv'
import fs from 'fs'
import { generateFallbackPDF } from '../utils/firFallback'
import { COMPANIES } from '../companyEndpoints'

// Configurazione Supabase
const SUPABASE_URL = 'https://qpugfjfvxfvrutzxnadn.supabase.co'
const SUPABASE_KEY = 'sb_secret_mzMYWzmGRUI_MBhURzJmjg_F4GMF3o2'

// Configurazione Bridge RENTRI Locale
const BRIDGE_URL = 'http://127.0.0.1:8765'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function getCompanyConfig(payload: any): any {
    // Logica euristica per determinare l'azienda dal payload
    // Cerca la P.IVA nel produttore
    const piva = payload?.produttore?.codiceFiscale?.replace('IT', '') || '';
    
    // Mappa P.IVA -> Key Config
    if (piva === '08934760961') return COMPANIES['global'];
    if (piva === '12347770013') return COMPANIES['multy'];
    if (piva === '09879800010') return COMPANIES['niyol'];
    
    // Fallback: Se c'è un campo 'company_key' nel payload (custom)
    if (payload?.company_key && COMPANIES[payload.company_key]) return COMPANIES[payload.company_key];

    // Fallback disperato: Global Reco (come prima) ma con warning
    console.warn(`[WORKER] Azienda non riconosciuta dal payload (PIVA: ${piva}). Uso GLOBAL come default.`);
    return COMPANIES['global'];
}

async function vidimaFir(richiesta: any) {
  console.log(`[WORKER] Processando richiesta ID: ${richiesta.id}`)
  
  // 0. Determina l'azienda
  const reqPayload = richiesta.payload || {};
  const config = getCompanyConfig(reqPayload);
  console.log(`[WORKER] Azienda rilevata: ${config.name} (P12: ${config.p12File})`);

  // 1. Prepara il payload per RENTRI
  const payloadRentri = {
    riferimenti: {
        numero_registrazione: { 
            anno: new Date().getFullYear(), 
            progressivo: String(Date.now()).slice(-7) 
        },
        data_ora_registrazione: new Date().toISOString(),
        causale_operazione: 'EMI' 
    },
    ...reqPayload,
    // Sovrascrivi produttore con dati corretti da config se mancano
    produttore: {
        codiceFiscale: config.issuer, // Assicura che sia corretto
        unitaLocaleId: config.unitId, // Assicura che sia corretto
        ...reqPayload.produttore
    }
  }

  // 2. Chiama il Bridge Locale
  try {
    // Usa l'endpoint di VIDIMAZIONE corretto, non movimenti!
    // URL: .../vidimazione?codiceBlocco=...
    const rentriUrl = `https://api.rentri.gov.it/vidimazione-formulari/v1.0/vidimazione?codiceBlocco=${config.blockCode}`;
    
    const res = await axios.post(`${BRIDGE_URL}/send-rentri`, {
        url: rentriUrl,
        method: 'POST',
        payload: JSON.stringify(payloadRentri),
        filename: config.p12File,
        issuer: config.issuer // Usa l'issuer corretto (P.IVA)
    })

    if (res.data && res.data.success) {
        console.log(`[WORKER] Successo RENTRI per ${richiesta.id}`)
        await supabase
            .from('richieste_vidimazione')
            .update({ 
                status: 'COMPLETED', 
                response_data: res.data,
                updated_at: new Date()
            })
            .eq('id', richiesta.id)
    } else {
        // Se fallisce (es. fir.nonTrovato), lancia errore per attivare il fallback
        throw new Error(JSON.stringify(res.data))
    }

  } catch (e: any) {
    console.error(`[WORKER] Errore RENTRI per ${richiesta.id}:`, e.message)


    try {
        console.log(`[WORKER] Tentativo generazione FIR di EMERGENZA per ${richiesta.id}...`)
        const pdfPath = await generateFallbackPDF(payloadRentri, e.message || "Errore sconosciuto")
        const pdfBuffer = fs.readFileSync(pdfPath)
        const pdfBase64 = pdfBuffer.toString('base64')

        // Aggiorna Supabase con stato COMPLETED (per sbloccare UI) ma con dati di fallback
        await supabase
            .from('richieste_vidimazione')
            .update({ 
                status: 'COMPLETED', 
                response_data: {
                    success: false,
                    is_fallback: true,
                    fallback_reason: e.message,
                    pdf_content: pdfBase64, // Frontend dovrà decodificare questo
                    message: "GENERATO FIR DI EMERGENZA (ERRORE RENTRI)"
                },
                updated_at: new Date()
            })
            .eq('id', richiesta.id)

        console.log(`[WORKER] FIR di EMERGENZA generato e salvato per ${richiesta.id}`)
        
        // Opzionale: Pulizia file temporaneo
        // fs.unlinkSync(pdfPath) 

    } catch (pdfError: any) {
        console.error(`[WORKER] Errore generazione PDF fallback:`, pdfError)
        await supabase
            .from('richieste_vidimazione')
            .update({ 
                status: 'ERROR', 
                error_log: e.message + " | Fallback failed: " + pdfError.message,
                updated_at: new Date()
            })
            .eq('id', richiesta.id)
    }
  }
}

async function loop() {
  console.log('[WORKER] In ascolto su Supabase...')
  while (true) {
    try {
        // Cerca richieste PENDING
        const { data, error } = await supabase
            .from('richieste_vidimazione')
            .select('*')
            .eq('status', 'PENDING')
            .limit(1) // Una alla volta per sicurezza

        if (error) {
            console.error('[WORKER] Errore Supabase:', error.message)
        } else if (data && data.length > 0) {
            const richiesta = data[0]
            // Marca subito come PROCESSING per non riprenderla
            await supabase.from('richieste_vidimazione').update({ status: 'PROCESSING' }).eq('id', richiesta.id)
            
            // Esegue il lavoro
            await vidimaFir(richiesta)
        }

    } catch (e) {
        console.error('[WORKER] Loop error:', e)
    }
    
    // Attendi 2 secondi
    await new Promise(r => setTimeout(r, 2000))
  }
}

// Avvio
loop()
