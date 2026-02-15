import axios from 'axios'
import { readFileSync, existsSync, mkdirSync, appendFileSync } from 'fs'
import { XMLParser } from 'fast-xml-parser'

const BRIDGE = 'http://localhost:8765'
const MULTY = { registryId: 'RQEL39R7NS0', filename: 'multyproget.p12', issuer: '12347770013', xml: 'test/registro Multyproget al2412.xml' }

function ensureOut(){ if (!existsSync('out')) mkdirSync('out') }
function logLine(obj:any){ try { ensureOut(); appendFileSync('out/accepted_push.log', JSON.stringify(obj)+'\n') } catch {} }
function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)) }
function normInt(x:any){ const s = String(x||'').replace(/[^0-9]/g,''); const n = parseInt(s||'0',10); return isNaN(n)?0:n }
function dateOnly(s:string){ const d = String(s||''); return d.includes('T')?d.split('T')[0]:d }
function normEER(s:string){ const t = String(s||'').replace(/[^0-9\*]/g,''); return t }
function normUM(s:string){ const t = String(s||'').trim().toLowerCase(); return t==='kg'?'kg':(t==='l'||t==='lt'?'l':t) }
function getFir(m:any){
  const candidates = [
    m?.numero_fir, m?.numeroFIR, m?.NumeroFIR, m?.fir, m?.NumeroFir, m?.numeroDocumento, m?.numero_documento,
    m?.riferimenti?.numero_fir, m?.riferimenti?.fir, m?.documento?.numero
  ]
  for (const c of candidates){
    if (typeof c === 'string' && c.trim()) return c.trim().toUpperCase()
  }
  try {
    for (const [k,v] of Object.entries(m)){
      if (typeof v === 'string' && v.trim() && k.toLowerCase().includes('fir')) return v.trim().toUpperCase()
    }
  } catch {}
  return ''
}

const xmlParser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true })
function parseRegistroXml(xml:string){
  const obj = xmlParser.parse(xml) || {}
  const reg = obj?.RegistroCronologico?.Registrazioni?.Movimento
  const arr = Array.isArray(reg) ? reg : (reg ? [reg] : [])
  return arr.map((m:any)=>({
    anno: normInt(m?.Anno||new Date().getFullYear()),
    progressivo: normInt(m?.Progressivo||''),
    data: String(m?.DataRegistrazione||''),
    codice_eer: String(m?.CodEERMat||''),
    quantita: Number(m?.Quantita||0),
    unita_misura: String(m?.UnitaMisura||'KG'),
    provenienza: 'U',
    fir: getFir(m)
  }))
}

async function listRentriMovimenti(registryId:string, filename:string, issuer:string, year:number){
  const from = `${year}-01-01`
  const to = `${year}-12-31`
  const body = { registryId, filename, issuer, limit: 10000, order: 'desc', from, to }
  const res = await axios.post(`${BRIDGE}/list-movimenti`, body)
  const raw = String(res.data?.data || '')
  try { const arr = JSON.parse(raw); return Array.isArray(arr)?arr:[] } catch { return [] }
}
function firFromRentri(el:any){
  const a = el?.riferimenti?.numero_fir
  const b = el?.documento?.numero
  const c = el?.riferimento_operazione?.fir || el?.riferimenti_operazione?.fir
  const s = String(a||b||c||'').trim().toUpperCase()
  return s
}

function buildPayloadMinimal(mov:any){
  const anno = mov.anno || new Date().getFullYear()
  const progressivo = String(mov.progressivo||'')
  const dataIso = `${(mov.data||new Date().toISOString().slice(0,10))}T00:00:00Z`
  const eer = normEER(mov.codice_eer || '').replace(/\./g,'')
  const um = normUM(mov.unita_misura || 'kg')
  const quantita = typeof mov.quantita === 'number' ? (mov.quantita>0?mov.quantita:1) : 1
  const provenienza = String(mov.provenienza || 'U')
  const fir = getFir(mov) || mov.fir || ''
  const base:any = {
    riferimenti: {
      numero_registrazione: { anno: Number(anno), progressivo: String(progressivo) },
      data_ora_registrazione: dataIso,
      causale_operazione: 'RE'
    },
    rifiuto: {
      codice_eer: eer,
      stato_fisico: 'S',
      quantita: { valore: quantita, unita_misura: um },
      provenienza
    }
  }
  if (fir && typeof fir === 'string' && fir.trim()){
    base.riferimenti.numero_fir = fir.trim()
    base.documento = { numero: fir.trim() }
  }
  base.intermediario = { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' }
  base.intermediari = [ { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' } ]
  return base
}

async function sendBatch(registryId:string, filename:string, issuer:string, payload:any[]){
  const url = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${registryId}/movimenti`
  const body = { url, payload: JSON.stringify(payload), filename, issuer }
  const res = await axios.post(`${BRIDGE}/send-rentri`, body)
  const status = Number(res.data?.status||0)
  let tid = ''
  try { const d = JSON.parse(String(res.data?.data||'{}')); tid = String(d?.transazione_id||'') } catch {}
  return { status, transazioneId: tid, raw: res.data }
}
async function checkResult(tid:string, filename:string, issuer:string){
  for(let i=0;i<30;i++){
    const res = await axios.post(`${BRIDGE}/check-status`, { api:'dati-registri', transazioneId: tid, filename, issuer })
    const ok = res.data?.success===true && Number(res.data?.status)===200
    const body = String(res.data?.data||'')
    if (ok && body.length>0) return body
    await sleep(2000)
  }
  return ''
}
function countAccepted(body:string){ try { const m=JSON.parse(body); const es=m?.esito; const arr=Array.isArray(es?.numero_registrazioni)?es.numero_registrazioni:[]; return arr.length } catch { return 0 } }

async function main(){
  ensureOut()
  const xml = readFileSync(MULTY.xml, 'utf-8')
  const year = new Date().getFullYear()
  const local = parseRegistroXml(xml)
  const rentri = await listRentriMovimenti(MULTY.registryId, MULTY.filename, MULTY.issuer, year)
  function rentriSignature(el:any){
    try {
      const eer = normEER(el?.rifiuto?.codice_eer || el?.codice_eer)
      const q = Number(el?.rifiuto?.quantita?.valore || el?.quantita?.valore || el?.quantita || 0)
      const um = normUM(el?.rifiuto?.quantita?.unita_misura || el?.quantita?.unita_misura || el?.unita_misura || 'kg')
      const prov = String(el?.rifiuto?.provenienza || el?.provenienza || 'U')
      const caus = String(el?.riferimenti?.causale_operazione || el?.causale_operazione || 'RE')
      const dt = dateOnly(el?.riferimenti?.data_ora_registrazione || el?.data_ora_registrazione || '')
      return `${dt}|${caus}|${eer}|${q}|${um}|${prov}`
    } catch { return '' }
  }
  function localSignature(m:any){
    try {
      const eer = normEER(m?.codice_eer || '')
      const q = Number(m?.quantita || 0)
      const um = normUM(m?.unita_misura || 'kg')
      const prov = String(m?.provenienza || 'U')
      const caus = 'RE'
      const dt = dateOnly(m?.data || '')
      return `${dt}|${caus}|${eer}|${q}|${um}|${prov}`
    } catch { return '' }
  }
  const sigs = new Set<string>()
  for (const r of rentri){ const s = rentriSignature(r); if (s) sigs.add(s) }
  const validLocal = local.filter(m=>{
    const cerDigits = normEER(m.codice_eer||'').replace(/\./g,'')
    const isCerOk = /^\d{6}$/.test(cerDigits)
    const isQtyOk = Number(m.quantita||0) > 0
    return isCerOk && isQtyOk
  })
  const candidates = validLocal.filter(m=>{ const s=localSignature(m); return s && !sigs.has(s) }).slice(0,5)
  const payload = candidates.map(buildPayloadMinimal)
  const sent = await sendBatch(MULTY.registryId, MULTY.filename, MULTY.issuer, payload)
  logLine({ kind:'SEND', registryId:MULTY.registryId, status: sent.status, transazioneId: sent.transazioneId, count: payload.length, raw: sent.raw })
  if (sent.status===202 && sent.transazioneId){
    const body = await checkResult(sent.transazioneId, MULTY.filename, MULTY.issuer)
    const acc = countAccepted(body)
    logLine({ kind:'RESULT', registryId:MULTY.registryId, transazioneId: sent.transazioneId, accepted: acc })
    console.log(JSON.stringify({ status:'done', accepted: acc }))
  } else {
    console.log(JSON.stringify({ status:'error', code: sent.status }))
  }
}

main()
