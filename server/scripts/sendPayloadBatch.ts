import axios from 'axios'
import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'fs'
const BRIDGE = 'http://127.0.0.1:8765'
const DELAY_MS = Number(process.env.SEND_DELAY_MS || 100)
function ensureLogDir(){ if (!existsSync('out')) mkdirSync('out') }
function logLine(obj:any){ try { ensureLogDir(); const row = { ts: new Date().toISOString(), ...obj }; appendFileSync('out/invio_massivo.log', JSON.stringify(row)+'\n') } catch {} }
function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)) }
function loadMovimenti(file:string){
  const raw = readFileSync(file, 'utf-8')
  const obj = JSON.parse(raw)
  const arr = Array.isArray(obj?.movimenti) ? obj.movimenti : []
  return arr
}
async function sendBatch(registryId:string, filename:string, issuer:string, payload:any[]){
  const url = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${registryId}/movimenti`
  const body = { url, payload: JSON.stringify(payload), filename, issuer }
  const res = await axios.post(`${BRIDGE}/send-rentri`, body)
  const status = Number(res.data?.status || 0)
  let transazioneId = ''
  try { const d = JSON.parse(String(res.data?.data||'{}')); transazioneId = String(d?.transazione_id||'') } catch {}
  return { status, transazioneId }
}
async function pollTransazione(registryId:string, transazioneId:string, filename:string, issuer:string){
  for(let i=0;i<30;i++){
    const body = { api:'dati-registri', transazioneId, filename, issuer }
    const res = await axios.post(`${BRIDGE}/check-status`, body)
    const ok = res.data?.success === true
    const bodyStr = String(res.data?.data || '')
    if (ok && bodyStr.length > 0) return bodyStr
    await sleep(500)
  }
  return ''
}
function countAccepted(bodyStr:string){
  try { const m = JSON.parse(bodyStr); const esito = m?.esito; const arr = Array.isArray(esito?.numero_registrazioni) ? esito.numero_registrazioni : []; return arr.length } catch { return 0 }
}
async function main(){
  const args = process.argv.slice(2)
  const inIdx = args.indexOf('--in')
  const regIdx = args.indexOf('--registry')
  const fnIdx = args.indexOf('--filename')
  const issIdx = args.indexOf('--issuer')
  const batchIdx = args.indexOf('--batch')
  const concIdx = args.indexOf('--concurrency')
  const input = inIdx>=0 ? args[inIdx+1] : ''
  const registryId = regIdx>=0 ? args[regIdx+1] : ''
  const filename = fnIdx>=0 ? args[fnIdx+1] : ''
  const issuer = issIdx>=0 ? args[issIdx+1] : ''
  const batchSize = batchIdx>=0 ? Math.max(1, Number(args[batchIdx+1])) : 100
  const concurrency = concIdx>=0 ? Math.max(1, Number(args[concIdx+1])) : 5
  const movs = loadMovimenti(input)
  let idx = 0
  const pending:{ tid:string }[] = []
  while (idx < movs.length){
    const slice = movs.slice(idx, Math.min(idx + batchSize, movs.length))
    idx += slice.length
    const sent = await sendBatch(registryId, filename, issuer, slice)
    const last = slice[slice.length-1]
    const key = `${last?.riferimenti?.numero_registrazione?.anno}_${last?.riferimenti?.numero_registrazione?.progressivo}`
    logLine({ kind:'SEND', registryId, status: sent.status, transazioneId: sent.transazioneId, key, count: slice.length })
    if (sent.status===202 && sent.transazioneId) pending.push({ tid: sent.transazioneId })
    await sleep(DELAY_MS)
    while (pending.length > 0){
      const group = pending.splice(0, concurrency)
      const results = await Promise.all(group.map(async g=>{
        const bodyStr = await pollTransazione(registryId, g.tid, filename, issuer)
        const acc = countAccepted(bodyStr)
        logLine({ kind:'RESULT', registryId, transazioneId: g.tid, accepted: acc, body: bodyStr })
        return acc
      }))
      await sleep(DELAY_MS)
    }
  }
}
main()
