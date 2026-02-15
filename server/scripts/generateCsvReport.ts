
import { readFileSync, writeFileSync, existsSync } from 'fs'

const LOG_FILE = 'out/invio_massivo.log'
const OUT_GLOBAL = 'out/report_global_final.csv'
const OUT_MULTY = 'out/report_multy_final.csv'

// Mapping configurations
const MAPPINGS = [
  // GLOBAL STREAMS (6M range)
  { file: 'out/ocr.payload.global.json', base: 6000000, type: 'payload' }, // Assumption for first batch
  { file: 'out/ocr.payload.new.global.json', base: 6100000, type: 'payload' },
  { file: 'fir dicembre 25/rimanenti dicembre 2025.json', base: 6200000, type: 'raw' },
  { file: 'out/ocr.payload.final.global.json', base: 6300000, type: 'payload' },
  { file: 'fir dicembre 25/fine dicembre finale/movimenti finali dicembre.json', base: 6400000, type: 'raw' },
  
  // MULTY STREAMS (7M range)
  { file: 'out/ocr.payload.multy.json', base: 7000000, type: 'payload' },
  { file: 'out/ocr.payload.new.multy.json', base: 7100000, type: 'payload' },
  { file: 'fir dicembre 25/rimanenti dicembre 2025.json', base: 7200000, type: 'raw' },
  { file: 'out/ocr.payload.final.multy.json', base: 7300000, type: 'payload' },
  { file: 'fir dicembre 25/fine dicembre finale/movimenti finali dicembre.json', base: 7400000, type: 'raw' },

  // SPECIAL STREAMS
  { file: 'out/formulari_multy_excel.json', base: 8000000, type: 'raw' }
]

interface MovementRecord {
  timestamp: string
  transazioneId: string
  anno: number
  progressivo: number
  movementId: string
  firCode?: string
}

function extractFir(item: any): string {
  // Rentri Payload (Standard)
  if (item?.identificativi?.codiceFIR) return item.identificativi.codiceFIR
  
  // Rentri Payload (Nested in riferimenti.fir)
  if (item?.riferimenti?.fir?.codice_fir) return item.riferimenti.fir.codice_fir
  
  // Raw Item (ocr structured)
  if (item?.fir?.identificativi?.codiceFIR) return item.fir.identificativi.codiceFIR
  if (typeof item?.fir === 'string') return item.fir
  if (item?.codiceFIR) return item.codiceFIR
  
  // Try Annotations (FIR: XXXXX del YYYY)
  if (item?.annotazioni) {
      const match = item.annotazioni.match(/FIR:\s*([A-Z0-9\s]+?)(\s+del|$)/i)
      if (match && match[1]) return match[1].trim()
  }

  return 'ND'
}

function loadFirMap(): Map<number, string> {
  const map = new Map<number, string>()
  
  for (const m of MAPPINGS) {
     try {
       if (!existsSync(m.file)) continue
       const raw = readFileSync(m.file, 'utf-8')
       const data = JSON.parse(raw)
       let items: any[] = []
       if (Array.isArray(data)) items = data
       else if (Array.isArray(data.items)) items = data.items
       else if (Array.isArray(data.movimenti)) items = data.movimenti
       
       items.forEach((item: any, idx: number) => {
        const prog = m.base + idx + 1
        const fir = extractFir(item)
        map.set(prog, fir)
      })
      console.log(`Loaded map from ${m.file}: ${items.length} items (Base ${m.base})`)
    } catch (e) {
      console.warn(`Skipping map ${m.file}:`, e)
    }
  }
  return map
}

function main(){
  try {
    const firMap = loadFirMap()
    const content = readFileSync(LOG_FILE, 'utf-8')
    const lines = content.split('\n').filter(x => x.trim())
    
    const globalMovements: MovementRecord[] = []
    const multyMovements: MovementRecord[] = []

    for(const line of lines){
      try {
        const j = JSON.parse(line)
        if (j.kind !== 'RESULT') continue
        
        // Parse the body to get actual accepted movements
        const body = JSON.parse(j.body || '{}')
        const esito = body.esito
        if (!esito || !Array.isArray(esito.numero_registrazioni)) continue

        const regId = j.registryId
        const ts = j.ts
        const tid = j.transazioneId

        const list = esito.numero_registrazioni
        for(const item of list){
            const rec: MovementRecord = {
                timestamp: ts,
                transazioneId: tid,
                anno: item.anno,
                progressivo: item.progressivo,
                movementId: item.identificativo,
                firCode: firMap.get(Number(item.progressivo)) || 'ND'
            }
            
            if (regId === 'R6QSWHZ6HJV') {
                globalMovements.push(rec)
            } else if (regId === 'RQEL39R7NS0') {
                multyMovements.push(rec)
            }
        }

      } catch {}
    }

    // Sort by progressive
    globalMovements.sort((a,b) => a.progressivo - b.progressivo)
    multyMovements.sort((a,b) => a.progressivo - b.progressivo)

    // Generate CSVs
    const header = 'Timestamp;TransazioneID;Anno;Progressivo;ID_Movimento_RENTRI;Codice_FIR\n'
    
    const csvGlobal = header + globalMovements.map(m => 
        `${m.timestamp};${m.transazioneId};${m.anno};${m.progressivo};${m.movementId};${m.firCode}`
    ).join('\n')

    const csvMulty = header + multyMovements.map(m => 
        `${m.timestamp};${m.transazioneId};${m.anno};${m.progressivo};${m.movementId};${m.firCode}`
    ).join('\n')

    writeFileSync(OUT_GLOBAL, csvGlobal)
    writeFileSync(OUT_MULTY, csvMulty)

    console.log(`Generato Report Global: ${OUT_GLOBAL} (${globalMovements.length} movimenti accertati)`)
    console.log(`Generato Report Multy: ${OUT_MULTY} (${multyMovements.length} movimenti accertati)`)

  } catch(e) {
    console.error('Errore generazione report:', e)
  }
}

main()
