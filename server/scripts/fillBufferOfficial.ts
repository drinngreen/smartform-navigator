
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

// Configurazione
const SUPABASE_URL = 'https://qpugfjfvxfvrutzxnadn.supabase.co'
const SUPABASE_KEY = 'sb_secret_mzMYWzmGRUI_MBhURzJmjg_F4GMF3o2'
const BRIDGE_URL = 'http://127.0.0.1:8765'

// Dati Global
const ISSUER = '08934760961'
const REG_ID = 'R6QSWHZ6HJV' // Unità Locale ID per Global
const CERT_FILE = 'certificato.p12'
const AZIENDA = 'GLOBAL'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Helper: Pausa
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function vidimaBlocco(quantita: number) {
  console.log(`[START] Avvio richiesta vidimazione per ${quantita} FIR...`)

  // 1. Richiesta Vidimazione (Payload Minimale con Prefisso IT)
  const payload = {
    tipoFormulario: "FIR",
    produttore: {
        codiceFiscale: "IT" + ISSUER // Aggiungo prefisso IT
    },
    quantita: quantita
  }

  try {
      console.log(`[1/3] Invio richiesta POST /vidimazione...`)
      const res = await axios.post(`${BRIDGE_URL}/send-rentri`, {
        url: `https://api.rentri.gov.it/vidimazione-formulari/v1.0/vidimazione`,
        method: 'POST',
        payload: JSON.stringify(payload),
        filename: CERT_FILE,
        issuer: ISSUER
      })

      if (!res.data || !res.data.success) {
          console.error('[ERROR] Richiesta fallita:', JSON.stringify(res.data, null, 2))
          return
      }

      // Parsing risposta: ci aspettiamo un idTransazione
      // La risposta del bridge mette il body in res.data.data
      const responseBody = typeof res.data.data === 'string' ? JSON.parse(res.data.data) : res.data.data
      const idTransazione = responseBody.idTransazione || responseBody.idRichiesta

      if (!idTransazione) {
          console.error('[ERROR] Nessun ID Transazione ricevuto:', responseBody)
          return
      }

      console.log(`[2/3] Richiesta accettata. ID Transazione: ${idTransazione}`)
      console.log(`[WAIT] Attesa elaborazione RENTRI...`)
      
      // 2. Polling per risultato
      let tentativi = 0
      let completato = false
      let vidimazioni = []

      while (!completato && tentativi < 10) {
          await sleep(3000) // Aspetta 3 secondi
          tentativi++
          
          console.log(`[POLL] Controllo stato (Tentativo ${tentativi})...`)
          const pollRes = await axios.post(`${BRIDGE_URL}/send-rentri`, {
            url: `https://api.rentri.gov.it/vidimazione-formulari/v1.0/stato-transazione/${idTransazione}`,
            method: 'GET',
            payload: "", // GET non ha payload
            filename: CERT_FILE,
            issuer: ISSUER
          })

          if (pollRes.data && pollRes.data.success) {
              const statoBody = typeof pollRes.data.data === 'string' ? JSON.parse(pollRes.data.data) : pollRes.data.data
              console.log(`[STATUS] Stato attuale: ${statoBody.stato}`)

              if (statoBody.stato === 'COMPLETATA' || statoBody.vidimazioni) {
                  completato = true
                  vidimazioni = statoBody.vidimazioni || statoBody.elencoVidimazioni || []
              } else if (statoBody.stato === 'ERRORE') {
                  console.error('[ERROR] Elaborazione fallita lato RENTRI.')
                  return
              }
          }
      }

      if (vidimazioni.length > 0) {
          console.log(`[3/3] Ricevuti ${vidimazioni.length} codici FIR! Salvataggio su DB...`)
          
          // 3. Salvataggio su Supabase
          const rows = vidimazioni.map((v: any) => ({
              codice_fir: v.numeroVidimazione || v.identificativo,
              stato: 'DISPONIBILE',
              azienda: AZIENDA,
              raw_response: v // Salviamo tutto il blocco (QR, etc)
          }))

          const { error } = await supabase.from('buffer_fir').insert(rows)
          
          if (error) console.error('[DB ERROR]', error.message)
          else console.log('[SUCCESS] Magazzino rifornito con successo!')

      } else {
          console.error('[TIMEOUT] Non ho ricevuto i codici in tempo.')
      }

  } catch (e: any) {
      console.error('[EXCEPTION]', e.message)
  }
}

// Eseguiamo per 1 solo FIR di test per iniziare
vidimaBlocco(1)
