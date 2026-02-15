
import { readFileSync, writeFileSync } from 'fs'

const LOG_FILE = 'out/invio_massivo.log'
const OUT_MULTY_TODAY = 'out/report_multy_excel_today.csv'

interface MovementRecord {
  timestamp: string
  transazioneId: string
  anno: number
  progressivo: number
  movementId: string
}

function main(){
  try {
    const content = readFileSync(LOG_FILE, 'utf-8')
    const lines = content.split('\n').filter(x => x.trim())
    
    const todayMovements: MovementRecord[] = []
    
    // We only care about logs from "today" (2026-01-28)
    const todayPrefix = '2026-01-28'

    for(const line of lines){
      try {
        const j = JSON.parse(line)
        if (j.kind !== 'RESULT') continue
        if (!j.ts.startsWith(todayPrefix)) continue
        if (j.registryId !== 'RQEL39R7NS0') continue // Only Multy
        
        // Parse the body to get actual accepted movements
        const body = JSON.parse(j.body || '{}')
        const esito = body.esito
        if (!esito || !Array.isArray(esito.numero_registrazioni)) continue

        const tid = j.transazioneId
        const list = esito.numero_registrazioni
        for(const item of list){
            const rec: MovementRecord = {
                timestamp: j.ts,
                transazioneId: tid,
                anno: item.anno,
                progressivo: item.progressivo,
                movementId: item.identificativo
            }
            todayMovements.push(rec)
        }

      } catch {}
    }

    // Sort by progressive
    todayMovements.sort((a,b) => a.progressivo - b.progressivo)

    // Generate CSV
    const header = 'Timestamp;TransazioneID;Anno;Progressivo;ID_Movimento_RENTRI\n'
    
    const csvContent = header + todayMovements.map(m => 
        `${m.timestamp};${m.transazioneId};${m.anno};${m.progressivo};${m.movementId}`
    ).join('\n')

    writeFileSync(OUT_MULTY_TODAY, csvContent)

    console.log(`Generato Report Multy Excel (Oggi): ${OUT_MULTY_TODAY}`)
    console.log(`Totale movimenti accettati oggi: ${todayMovements.length}`)

  } catch(e) {
    console.error('Errore generazione report:', e)
  }
}

main()
