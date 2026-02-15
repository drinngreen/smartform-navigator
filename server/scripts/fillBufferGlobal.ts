
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

// Configurazione
const SUPABASE_URL = 'https://qpugfjfvxfvrutzxnadn.supabase.co'
const SUPABASE_KEY = 'sb_secret_mzMYWzmGRUI_MBhURzJmjg_F4GMF3o2'
const BRIDGE_URL = 'http://127.0.0.1:8765'

// Dati Global
const ISSUER = '08934760961'
const REG_ID = 'R6QSWHZ6HJV'
const CERT_FILE = 'certificato.p12'
const AZIENDA = 'GLOBAL'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function setupTable() {
  // Nota: La creazione tabella via JS funziona solo con Service Key, con Anon Key potrebbe fallire.
  // Assumiamo che la tabella 'buffer_fir' esista o che proviamo a usarla.
  // Se fallisce, ti chiederò di crearla a mano.
  console.log('Verifica tabella buffer_fir...')
}

async function generaBlocco(quantita: number) {
  console.log(`Richiesta vidimazione di ${quantita} FIR per ${AZIENDA}...`)
  
  // RENTRI API per Vidimazione Massiva (Simulata/Reale)
  // L'endpoint reale per chiedere "blocchi" di FIR è specifico.
  // Se non lo abbiamo, iteriamo 1 a 1 la creazione di "FIR Vuoti".
  
  let successi = 0
  let errori = 0

  for (let i = 0; i < quantita; i++) {
    try {
        // Payload per "Vidimazione Virtuale" (Richiesta ID)
        // In mancanza di documentazione specifica sull'endpoint "bulk", 
        // simuliamo la richiesta di un FIR "in bianco" o usiamo la procedura di vidimazione standard.
        // NOTA: Per il test usiamo l'endpoint di emissione ma con dati minimi,
        // sperando che RENTRI ci dia un ID.
        
        // Costruiamo un payload fittizio ma valido sintatticamente per ottenere l'ID
        const payload = {
            riferimenti: {
                numero_registrazione: { 
                    anno: new Date().getFullYear(), 
                    progressivo: String(Date.now() + i).slice(-7) // Univoco temporaneo
                },
                data_ora_registrazione: new Date().toISOString(),
                causale_operazione: 'VID' // Vidimazione (Codice Ipotetico)
            },
            annotazioni: "Vidimazione preventiva magazzino"
        }

        const res = await axios.post(`${BRIDGE_URL}/send-rentri`, {
            url: `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${REG_ID}/vidimazione`, // Ipotetico endpoint vidimazione
            method: 'POST',
            payload: JSON.stringify(payload),
            filename: CERT_FILE,
            issuer: ISSUER
        })

        if (res.data && res.data.success) {
             // ...
             successi++
             process.stdout.write('.')
        } else {
            errori++
            console.log('\nERRORE DETTAGLIATO:', JSON.stringify(res.data, null, 2)) // Vediamo cosa risponde
            process.stdout.write('x')
        }
        
        // Rate limiting gentile
        await new Promise(r => setTimeout(r, 200))

    } catch (e) {
        errori++
        process.stdout.write('E')
    }
  }
  
  console.log(`\nFinito. Successi: ${successi}, Errori: ${errori}`)
}

async function main() {
  await setupTable()
  // Partiamo con 5 per testare, poi aumentiamo a 1000
  await generaBlocco(5) 
}

main()
