// @ts-nocheck
import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'fs'
import axios from 'axios'
import { buildMovimentiFromXml } from './rentriClient'

type Suggest = { date:string, anno:number, progressivo:string }

async function suggestNext(registryId:string, filename:string, issuer?:string): Promise<Suggest|undefined> {
  try {
    const body = { registryId, filename, issuer: issuer||undefined, limit: 50, order: 'desc' }
    const res = await axios.post('http://localhost:8765/suggest-next', body)
    const d = res.data?.data
    if (d && d.date && d.anno && d.progressivo) return { date: String(d.date), anno: Number(d.anno), progressivo: String(d.progressivo) }
  } catch {}
  return undefined
}

function onlyDigits(s:string){ return (s||'').replace(/[^0-9]/g,'') }
function incProg(p:string){ const d = onlyDigits(p); const width = d.length || 7; const n = (parseInt(d||'0')+1).toString().padStart(width,'0'); return n }
function chunk<T>(arr:T[], size:number){ const out:T[][]=[]; for(let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size)); return out }
async function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)) }

async function sendBatch(url:string, payload:any[], filename:string, issuer:string){
  const body = { url, payload: JSON.stringify(payload), filename, issuer }
  const res = await axios.post('http://localhost:8765/send-rentri', body)
  const status = Number(res.data?.status || 0)
  const dataStr = String(res.data?.data || '')
  let transazioneId = ''
  if (status === 202){ try { const d = JSON.parse(dataStr || '{}'); transazioneId = String(d?.transazione_id||'') } catch {}
    return { status, transazioneId, dataStr }
  }
  return { status, transazioneId, dataStr }
}

async function checkResult(registryId:string, transazioneId:string, filename:string, issuer:string){
  for(let i=0;i<60;i++){
    const body = { registryId, transazioneId, filename, issuer }
    const res = await axios.post('http://localhost:8765/check-transazione', body)
    const ok = res.data?.success === true
    const bodyStr = String(res.data?.data || '')
    if (ok && bodyStr.length > 0){ return bodyStr }
    await sleep(2000)
  }
  return ''
}

function countAccepted(bodyStr:string){
  try { const m = JSON.parse(bodyStr); const esito = m?.esito; const arr = Array.isArray(esito?.numero_registrazioni) ? esito.numero_registrazioni : []; return arr.length } catch { return 0 }
}

async function main(){
  const [xmlPath, registryId, filename, issuer, batchStr] = process.argv.slice(2)
  const batchSize = Number(batchStr || 200)
  const xml = readFileSync(xmlPath, 'utf-8')
  const base = buildMovimentiFromXml(xml)
  const start = await suggestNext(registryId, filename, issuer)
  if (!start) { console.error('No suggest-next available'); process.exit(1) }
  let prog = start.progressivo
  let anno = start.anno
  const date = start.date
  const remapped = base.map((mov:any)=>{
    prog = incProg(prog)
    return {
      ...mov,
      riferimenti: {
        ...mov.riferimenti,
        numero_registrazione: { anno, progressivo: prog },
        data_ora_registrazione: date+'T12:00:00Z'
      }
    }
  })
  const url = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${registryId}/movimenti`
  let submitted = 0, accepted = 0
  const chunks = chunk(remapped, batchSize)
  for (const c of chunks){
    const sent = await sendBatch(url, c, filename, issuer)
    submitted += c.length
    if (sent.status === 202 && sent.transazioneId){
      const bodyStr = await checkResult(registryId, sent.transazioneId, filename, issuer)
      accepted += countAccepted(bodyStr)
      try { if (!existsSync('out')) mkdirSync('out'); appendFileSync('out/remap-log.jsonl', JSON.stringify({ registryId, transazioneId: sent.transazioneId, count: c.length, accepted: countAccepted(bodyStr) })+'\n') } catch {}
    } else if (sent.status === 200) {
      const bodyStr = sent.dataStr
      accepted += countAccepted(bodyStr)
      try { if (!existsSync('out')) mkdirSync('out'); appendFileSync('out/remap-log.jsonl', JSON.stringify({ registryId, transazioneId: null, count: c.length, accepted: countAccepted(bodyStr) })+'\n') } catch {}
    }
  }
  console.log(JSON.stringify({ xmlPath, registryId, submitted, accepted }, null, 2))
}

main()
