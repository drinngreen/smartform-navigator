
import axios from 'axios'
import { readFileSync, appendFileSync, existsSync, writeFileSync } from 'fs'
import path from 'path'

const BRIDGE = 'http://127.0.0.1:8765'
const LOG_FILE = 'out/rectification.log'

// Ranges to fix
const RANGES = [
  // GLOBAL
  { file: 'fir dicembre 25/rimanenti dicembre 2025.json', base: 6200000, regId: 'R6QSWHZ6HJV', cert: 'certificato.p12', iss: '08934760961' },
  { file: 'fir dicembre 25/fine dicembre finale/movimenti finali dicembre.json', base: 6400000, regId: 'R6QSWHZ6HJV', cert: 'certificato.p12', iss: '08934760961' },
  
  // MULTY
  { file: 'fir dicembre 25/rimanenti dicembre 2025.json', base: 7200000, regId: 'RQEL39R7NS0', cert: 'multyproget.p12', iss: '12347770013' },
  { file: 'fir dicembre 25/fine dicembre finale/movimenti finali dicembre.json', base: 7400000, regId: 'RQEL39R7NS0', cert: 'multyproget.p12', iss: '12347770013' },
  { file: 'out/formulari_multy_excel.json', base: 8000000, regId: 'RQEL39R7NS0', cert: 'multyproget.p12', iss: '12347770013' }
]

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`
  console.log(line)
  appendFileSync(LOG_FILE, line + '\n')
}

// Helpers from sendFirBatchFast
function normDate(d?: string | null){
  const s = String(d || '').trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd,mm,yyyy] = s.split('/')
    return `${yyyy}-${mm}-${dd}`
  }
  return null
}

function buildPayload(item: any, base: number, idx: number, anno: number, isMulty: boolean, firCodeOverride?: string) {
  const fir = item?.fir || item
  // Force progressive matching what we sent
  const prog = base + idx + 1
  
  // Data Extraction
  const dataReg = String(fir?.conferimentoDestinatario?.dataOraArrivo || (String(fir?.identificativi?.dataEmissione||new Date().toISOString().slice(0,10))+'T12:00:00'))
  const quantAcc = Number(fir?.conferimentoDestinatario?.quantitaAccettataKg || 0)
  const quantDecl = Number(fir?.rifiuto?.quantitaDichiarataKg || 0)
  const quantita = Math.max(quantAcc>0?quantAcc:quantDecl, 0.001)
  const um = String(fir?.rifiuto?.unitaMisura||'KG').toLowerCase()==='kg' ? 'kg' : 'l'
  const eerRaw = String(fir?.rifiuto?.codiceEER || fir?.cer || (fir?.rifiuto?.cer||''))
  const eer = eerRaw.replace(/[^0-9]/g,'').padStart(6,'0').slice(0,6)
  const provenienza = String(fir?.rifiuto?.provenienza||'U')
  
  // FIR Info for Annotation
  let firCode = firCodeOverride || String(fir?.identificativi?.codiceFIR||'')
  let firDate = normDate(String(fir?.identificativi?.dataEmissione||''))
  
  // Format FIR Code with spaces if needed (Standard format XXXX NNNNNN YY)
  // But let's keep it simple or clean it up
  if (firCode) firCode = firCode.toUpperCase()
  
  let annot = ''
  if (firCode && firCode !== 'ND') {
    annot = `FIR: ${firCode}`
    if (firDate) {
        const [y,m,d] = firDate.split('-')
        annot += ` del ${d}/${m}/${y}`
    }
  }

  const payload:any = {
    riferimenti: {
      numero_registrazione: { anno: Number(anno), progressivo: String(prog) },
      data_ora_registrazione: dataReg.endsWith('Z') ? dataReg : (dataReg+'Z'),
      causale_operazione: 'RE'
    },
    rifiuto: {
      codice_eer: eer,
      stato_fisico: 'S',
      quantita: { valore: Number(quantita.toFixed(3)), unita_misura: um },
      provenienza
    },
    annotazioni: annot // THIS IS THE FIX
  }
  
  if (isMulty){
    payload.intermediario = { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' }
    payload.intermediari = [ { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' } ]
  }
  
  return payload
}

interface CsvRecord {
  id: string
  anno: number
  prog: number
}

function loadCsvMap(path: string): Map<number, string> {
  const map = new Map<number, string>()
  if (!existsSync(path)) return map
  const lines = readFileSync(path, 'utf-8').split('\n')
  for (const line of lines) {
    const p = line.split(';')
    // Timestamp;TransazioneID;Anno;Progressivo;ID_Movimento_RENTRI...
    if (p.length >= 5) {
      const prog = Number(p[3])
      const id = p[4]
      if (prog && id && id.startsWith('M1')) {
        map.set(prog, id)
      }
    }
  }
  return map
}

async function updateMovement(regId: string, movementId: string, payload: any, cert: string, iss: string) {
  const url = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${regId}/movimenti/${movementId}`
  const body = {
    url,
    method: 'PUT',
    payload: JSON.stringify(payload),
    filename: cert,
    issuer: iss
  }
  
  try {
    const res = await axios.post(`${BRIDGE}/send-rentri`, body)
    if (res.data?.status >= 200 && res.data?.status < 300) {
      return { success: true, status: res.data.status }
    } else {
      return { success: false, status: res.data?.status, error: JSON.stringify(res.data) }
    }
  } catch (e:any) {
    return { success: false, status: 500, error: e.message }
  }
}

async function main() {
  log('Starting Rectification Process...')
  
  // Load Maps
  const globalMap = loadCsvMap('out/report_global_final.csv')
  const multyMap = loadCsvMap('out/report_multy_final.csv')
  
  let totalFixed = 0
  let totalFailed = 0
  
  for (const range of RANGES) {
    log(`Processing range base ${range.base} from ${range.file}`)
    
    if (!existsSync(range.file)) {
      log(`File not found: ${range.file}`)
      continue
    }
    
    const raw = readFileSync(range.file, 'utf-8')
    const data = JSON.parse(raw)
    let items: any[] = []
    if (Array.isArray(data)) items = data
    else if (Array.isArray(data.items)) items = data.items
    else if (Array.isArray(data.movimenti)) items = data.movimenti
    
    const map = range.regId === 'R6QSWHZ6HJV' ? globalMap : multyMap
    const isMulty = range.regId === 'RQEL39R7NS0'
    
    // Iterate items
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const prog = range.base + i + 1
      const movementId = map.get(prog)
      
      if (!movementId) {
        // Maybe it wasn't sent or failed? Skip.
        continue
      }
      
      // Build Corrected Payload
      const payload = buildPayload(item, range.base, i, 2025, isMulty)
      
      // Send Update
      process.stdout.write(`Updating ${prog} (${movementId})... `)
      const res = await updateMovement(range.regId, movementId, payload, range.cert, range.iss)
      
      if (res.success) {
        process.stdout.write(`OK (${res.status})\n`)
        totalFixed++
      } else {
        process.stdout.write(`FAIL (${res.status})\n`)
        log(`Failed update for ${prog}: ${res.error}`)
        totalFailed++
      }
      
      // Small delay to be nice
      await new Promise(r => setTimeout(r, 50))
    }
  }
  
  log(`Rectification Complete. Fixed: ${totalFixed}, Failed: ${totalFailed}`)
}

main().catch(e => log(`Critical Error: ${e.message}`))
