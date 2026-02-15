
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

// Configurazione
const SUPABASE_URL = 'https://qpugfjfvxfvrutzxnadn.supabase.co'
const SUPABASE_KEY = 'sb_secret_mzMYWzmGRUI_MBhURzJmjg_F4GMF3o2'
const BRIDGE_URL = 'http://127.0.0.1:8765'

// Dati MULTY PROGET
const ISSUER = '12347770013'
const CERT_FILE = 'multyproget.p12' // Spero sia questo il nome
const AZIENDA = 'MULTY'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function vidimaBloccoMulty(quantita: number) {
  console.log(`[MULTY] Avvio richiesta vidimazione per ${quantita} FIR...`)

  // Payload Vidimazione (Semplice, senza Unità Locale specifica se c'è un blocco default)
  // Oppure possiamo provare a specificare l'UL se la sapessimo.
  // Dalle immagini vedo "SEDE LEGALE" o un codice UL nel registro.
  // Provo prima SENZA UL (solo CF), spesso il blocco virtuale è cross-UL o default.
  
  const payload = {
    tipoFormulario: "FIR",
    produttore: {
        codiceFiscale: "IT" + ISSUER, 
        unitaLocaleId: "OP2501XMQ021914"
    },
    quantita: quantita
  }

  try {
      console.log(`[1/3] Invio richiesta POST /vidimazione?codiceBlocco=FRVKM...`)
      const res = await axios.post(`${BRIDGE_URL}/send-rentri`, {
        url: `https://api.rentri.gov.it/vidimazione-formulari/v1.0/vidimazione?codiceBlocco=FRVKM`,
        method: 'POST',
        payload: JSON.stringify(payload),
        filename: CERT_FILE,
        issuer: "IT" + ISSUER // Forziamo IT nell'issuer del JWT
      })

      if (!res.data || !res.data.success) {
          console.error('[ERROR] Richiesta fallita:', JSON.stringify(res.data, null, 2))
          return
      }

      // Parsing risposta
      const responseBody = typeof res.data.data === 'string' ? JSON.parse(res.data.data) : res.data.data
      const idTransazione = responseBody.idTransazione || responseBody.idRichiesta

      if (!idTransazione) {
          console.error('[ERROR] Nessun ID Transazione:', responseBody)
          return
      }

      console.log(`[2/3] ACCETTATA! ID Transazione: ${idTransazione}`)
      console.log(`[WAIT] Attesa elaborazione...`)
      
      // Polling
      let tentativi = 0
      let completato = false
      let vidimazioni = []

      while (!completato && tentativi < 10) {
          await sleep(3000)
          tentativi++
          
          const pollRes = await axios.post(`${BRIDGE_URL}/send-rentri`, {
            url: `https://api.rentri.gov.it/vidimazione-formulari/v1.0/stato-transazione/${idTransazione}`,
            method: 'GET',
            payload: "",
            filename: CERT_FILE,
            issuer: ISSUER
          })

          if (pollRes.data && pollRes.data.success) {
              const statoBody = typeof pollRes.data.data === 'string' ? JSON.parse(pollRes.data.data) : pollRes.data.data
              console.log(`[STATUS] ${statoBody.stato}`)

              if (statoBody.stato === 'COMPLETATA') {
                  completato = true
                  vidimazioni = statoBody.elencoVidimazioni || statoBody.vidimazioni || []
              }
          }
      }

      if (vidimazioni.length > 0) {
          console.log(`[3/3] Ricevuti ${vidimazioni.length} codici FIR!`)
          console.log('Codici:', vidimazioni)
          
          // Salvataggio
          const rows = vidimazioni.map((v: any) => ({
              codice_fir: v.identificativo, // O campo simile
              stato: 'DISPONIBILE',
              azienda: AZIENDA,
              raw_response: v
          }))

          await supabase.from('buffer_fir').insert(rows)
          console.log('[SUCCESS] Magazzino Multy rifornito!')
      } else {
          console.error('[TIMEOUT] Nessun codice ricevuto.')
      }

  } catch (e: any) {
      console.error('[EXCEPTION]', e.message)
  }
}

vidimaBloccoMulty(1)
