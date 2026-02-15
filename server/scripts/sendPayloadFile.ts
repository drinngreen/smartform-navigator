import axios from 'axios'
import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'fs'

const BRIDGE = 'http://127.0.0.1:8765'
const STATUS_POLL_ATTEMPTS = 60
const STATUS_POLL_DELAY_MS = 2000
const DELAY_MS = Number(process.env.SEND_DELAY_MS || 200)

function ensureLogDir(){ if (!existsSync('out')) mkdirSync('out') }
function logLine(obj:any){ try { ensureLogDir(); const row = { ts: new Date().toISOString(), ...obj }; if (row?.kind==='SEND' || row?.kind==='RESULT' || row?.kind==='RESULT_PENDING') appendFileSync('out/invio_massivo.log', JSON.stringify(row)+'\n') } catch {} }

function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)) }

async function sendOne(registryId:string, filename:string, issuer:string, payload:any[]){
  const url = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${registryId}/movimenti`
  const body = { url, payload: JSON.stringify(payload), filename, issuer }
  const res = await axios.post(`${BRIDGE}/send-rentri`, body)
  const status = Number(res.data?.status || 0)
  const dataStr = String(res.data?.data || '')
  let transazioneId = ''
  if (status === 202){ try { const d = JSON.parse(dataStr||'{}'); transazioneId = String(d?.transazione_id||'') } catch {} }
  return { status, transazioneId, dataStr }
}
async function checkResult(registryId:string, transazioneId:string, filename:string, issuer:string){
  for(let i=0;i<STATUS_POLL_ATTEMPTS;i++){
    const body = { api: 'dati-registri', transazioneId, filename, issuer }
    const res = await axios.post(`${BRIDGE}/check-status`, body)
    const ok = res.data?.success === true
    const bodyStr = String(res.data?.data || '')
    if (ok && bodyStr.length > 0) return bodyStr
    await sleep(STATUS_POLL_DELAY_MS)
  }
  return ''
}
function countAccepted(bodyStr:string){
  try { const m = JSON.parse(bodyStr); const esito = m?.esito; const arr = Array.isArray(esito?.numero_registrazioni) ? esito.numero_registrazioni : []; return arr.length } catch { return 0 }
}

function loadMovimenti(file:string){
  const raw = readFileSync(file, 'utf-8')
  const obj = JSON.parse(raw)
  return Array.isArray(obj?.movimenti) ? obj.movimenti : []
}

async function main(){
  const args = process.argv.slice(2)
  const inIdx = args.indexOf('--in')
  const regIdx = args.indexOf('--registry')
  const fnIdx = args.indexOf('--filename')
  const issIdx = args.indexOf('--issuer')
  const limitIdx = args.indexOf('--limit')
  const input = inIdx>=0 ? args[inIdx+1] : ''
  const registryId = regIdx>=0 ? args[regIdx+1] : ''
  const filename = fnIdx>=0 ? args[fnIdx+1] : ''
  const issuer = issIdx>=0 ? args[issIdx+1] : ''
  const movs = loadMovimenti(input)
  const limit = limitIdx>=0 ? Number(args[limitIdx+1]) : movs.length
  for (let i=0;i<Math.min(movs.length, Math.max(1, limit)); i++){
    const payload = [movs[i]]
    const key = `${payload[0]?.riferimenti?.numero_registrazione?.anno}_${payload[0]?.riferimenti?.numero_registrazione?.progressivo}`
    const sent = await sendOne(registryId, filename, issuer, payload)
    logLine({ kind:'SEND', registryId, status: sent.status, transazioneId: sent.transazioneId, key })
    if (sent.status === 202 && sent.transazioneId){
      const bodyStr = await checkResult(registryId, sent.transazioneId, filename, issuer)
      const acc = countAccepted(bodyStr)
      logLine({ kind:'RESULT', registryId, transazioneId: sent.transazioneId, accepted: acc, body: bodyStr })
      if (!bodyStr || acc===0) logLine({ kind:'RESULT_PENDING', registryId, transazioneId: sent.transazioneId, accepted: 0 })
    } else if (sent.status === 200) {
      const acc = countAccepted(sent.dataStr)
      logLine({ kind:'RESULT', registryId, transazioneId: sent.transazioneId, accepted: acc, body: sent.dataStr })
    }
    await sleep(DELAY_MS)
  }
}
main()
