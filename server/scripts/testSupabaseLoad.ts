
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Configurazione Supabase (Usa le stesse credenziali del worker)
const SUPABASE_URL = 'https://qpugfjfvxfvrutzxnadn.supabase.co'
const SUPABASE_KEY = 'sb_secret_mzMYWzmGRUI_MBhURzJmjg_F4GMF3o2'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const NUM_TESTS = 10 // Numero di richieste simulate

async function main() {
  console.log(`[TEST] Inserimento di ${NUM_TESTS} richieste di vidimazione simulate...`)
  
  const requests = []
  
  for (let i = 0; i < NUM_TESTS; i++) {
    const fakePayload = {
      tipo_operazione: "EMISSIONE_TEST",
      dati_fir: {
        produttore: { denominazione: `Test Produttore ${i+1}`, codice_fiscale: "TEST_CF_001" },
        trasportatore: { denominazione: "Global Reco", targa: `AA00${i}XX` },
        rifiuto: { cer: "170405", quantita: 100 + i }
      },
      note: `Stress test simulazione #${i+1}`
    }
    
    requests.push({
      status: 'PENDING',
      payload: fakePayload
    })
  }

  // Insert in batch
  const { data, error } = await supabase
    .from('richieste_vidimazione')
    .insert(requests)
    .select()

  if (error) {
    console.error('[TEST] Errore inserimento:', error.message)
  } else {
    console.log(`[TEST] Inserite ${data.length} richieste con successo!`)
    console.log('[TEST] Ora controlla il terminale del Worker per vedere se le processa.')
  }
}

main()
