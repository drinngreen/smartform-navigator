import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'fs'
import axios from 'axios'
import { buildMovimentiFromXml } from './rentriClient'

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
function countDuplicates(bodyStr:string){
  try { const m = JSON.parse(bodyStr); const val = Array.isArray(m?.validazione) ? m.validazione : []; return val.filter((v:any)=>String(v?.codice_messaggio||'').includes('movimentoDuplicatoDatabase')).length } catch { return 0 }
}

async function main(){
  const args = process.argv.slice(2)
  const xmlPath = args[0]
  const registryId = args[1]
  const filename = args[2]
  const issuer = args[3] || ''
  const batchSize = Number(args[4] || 200)
  const xml = readFileSync(xmlPath, 'utf-8')
  const list = buildMovimentiFromXml(xml)
  const url = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${registryId}/movimenti`
  let accepted = 0, duplicates = 0, submitted = 0
  const chunks = chunk(list, batchSize)
  for (const c of chunks){
    const sent = await sendBatch(url, c, filename, issuer)
    submitted += c.length
    if (sent.status === 202 && sent.transazioneId){
      const bodyStr = await checkResult(registryId, sent.transazioneId, filename, issuer)
      accepted += countAccepted(bodyStr)
      duplicates += countDuplicates(bodyStr)
      try {
        if (!existsSync('out')) mkdirSync('out')
        appendFileSync('out/resend-log.jsonl', JSON.stringify({ registryId, transazioneId: sent.transazioneId, count: c.length, accepted: countAccepted(bodyStr), duplicates: countDuplicates(bodyStr) })+"\n")
      } catch {}
    } else if (sent.status === 200) {
      const bodyStr = sent.dataStr
      accepted += countAccepted(bodyStr)
      duplicates += countDuplicates(bodyStr)
      try {
        if (!existsSync('out')) mkdirSync('out')
        appendFileSync('out/resend-log.jsonl', JSON.stringify({ registryId, transazioneId: null, count: c.length, accepted: countAccepted(bodyStr), duplicates: countDuplicates(bodyStr) })+"\n")
      } catch {}
    }
  }
  const missing = Math.max(0, list.length - accepted - duplicates)
  console.log(JSON.stringify({ xmlPath, registryId, submitted, accepted, duplicates, missing }, null, 2))
}

main()
