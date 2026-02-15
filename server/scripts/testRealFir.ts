
import axios from 'axios'

// Configurazione
const BRIDGE_URL = 'http://127.0.0.1:8765'
const ISSUER = '08934760961'
const REG_ID = 'R6QSWHZ6HJV'
const CERT_FILE = 'certificato.p12'

async function testRealFir() {
  console.log('[TEST REALE] Inizio procedura di Emissione FIR...')

  // 1. Dati FIR "Sacrificale"
  // FIX: Formato data esatto senza Z, e causale EMI corretta
  const now = new Date()
  const dataReg = now.toISOString().substring(0, 19) // "YYYY-MM-DDTHH:mm:ss" senza Z
  
  const firPayload = {
    riferimenti: {
        numero_registrazione: { 
            anno: now.getFullYear(), 
            progressivo: Math.floor(Math.random() * 10000) // Rimosso TEST- prefix, vuole numero
        },
        data_ora_registrazione: dataReg + "+01:00", // Aggiunto fuso orario esplicito
        causale_operazione: 'EMI'
    },
    rifiuto: {
        codice_eer: "15.01.06", // PUNTINI OBBLIGATORI
        stato_fisico: 1,        // INTERO 1 invece di "S"
        pericoloso: false,
        quantita: { valore: 1, unita_misura: "kg" },
        provenienza: "U",
        destinato_attivita: "R13" // Obbligatorio spesso
    },
    soggetti: {
        produttore: { codice_fiscale: ISSUER },
        trasportatore: { codice_fiscale: ISSUER },
        destinatario: { codice_fiscale: ISSUER }
    },
    annotazioni: "TEST TECNICO"
  }

  try {
      // STEP 1: Emissione
      console.log('[1/2] Invio richiesta Emissione FIR...')
      const resEmi = await axios.post(`${BRIDGE_URL}/send-rentri`, {
        url: `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${REG_ID}/movimenti`,
        method: 'POST',
        payload: JSON.stringify(firPayload),
        filename: CERT_FILE,
        issuer: ISSUER
      })

      if (!resEmi.data || !resEmi.data.success) {
          console.error('[ERRORE EMISSIONE]', JSON.stringify(resEmi.data, null, 2))
          return
      }

      console.log('[SUCCESS] FIR Emesso con successo!')
      const firData = typeof resEmi.data.data === 'string' ? JSON.parse(resEmi.data.data) : resEmi.data.data
      const firId = firData.identificativo || firData.id
      console.log('ID FIR Ricevuto:', firId)

      // STEP 2: Annullamento Immediato
      console.log(`[2/2] Avvio Annullamento per FIR ${firId}...`)
      
      // Per annullare serve una causale di rettifica/annullamento
      // Usiamo lo stesso payload ma con causale 'ANN' (Annullamento) o DELETE method se supportato
      // RENTRI usa endpoint specifico o causale ANN
      
      const annullaPayload = {
          ...firPayload,
          riferimenti: {
              ...firPayload.riferimenti,
              causale_operazione: 'ANN', // Causale Annullamento
              data_ora_registrazione: new Date().toISOString()
          },
          annotazioni: "ANNULLAMENTO TEST TECNICO"
      }

      const resAnn = await axios.post(`${BRIDGE_URL}/send-rentri`, {
        url: `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${REG_ID}/movimenti/${firId}`, // Spesso è una PUT o POST su ID
        method: 'PUT', // Rettifica/Annullamento
        payload: JSON.stringify(annullaPayload),
        filename: CERT_FILE,
        issuer: ISSUER
      })

      if (resAnn.data && resAnn.data.success) {
          console.log('[SUCCESS] FIR Annullato correttamente!')
      } else {
          console.error('[WARNING] Annullamento fallito (fallo manualmente):', JSON.stringify(resAnn.data, null, 2))
      }

  } catch (e: any) {
      console.error('[EXCEPTION]', e.message)
  }
}

testRealFir()
