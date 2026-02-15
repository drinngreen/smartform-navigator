
import { createClient } from '@supabase/supabase-js'

// Configurazione Supabase (Usa le stesse credenziali del worker)
const SUPABASE_URL = 'https://qpugfjfvxfvrutzxnadn.supabase.co'
const SUPABASE_KEY = 'sb_secret_mzMYWzmGRUI_MBhURzJmjg_F4GMF3o2'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function main() {
  console.log('[RESET] Ripristino richieste in errore o bloccate...')

  // Aggiorna tutte le richieste che sono in ERROR o PROCESSING per farle riprovare
  // Nota: Rimuovo error_log dalla query perché la colonna potrebbe mancare
  const { data, error } = await supabase
    .from('richieste_vidimazione')
    .update({ status: 'PENDING' })
    .in('status', ['ERROR', 'PROCESSING'])
    .select()

  if (error) {
    console.error('[RESET] Errore:', error.message)
  } else {
    console.log(`[RESET] Ripristinate ${data.length} richieste a PENDING.`)
    console.log('[RESET] Il Worker dovrebbe processarle a breve.')
  }
}

main()
