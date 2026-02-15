import axios from 'axios'
import { readFileSync, existsSync, appendFileSync, mkdirSync } from 'fs'
import { XMLParser } from 'fast-xml-parser'

const BRIDGE = 'http://localhost:8765'
const STATUS_POLL_ATTEMPTS = 12
const STATUS_POLL_DELAY_MS = 1200

function ensureLogDir(){ if (!existsSync('out')) mkdirSync('out') }
function logLine(obj:any){ try { ensureLogDir(); if (obj?.kind==='SEND' || obj?.kind==='RESULT') appendFileSync('out/invio_massivo.log', JSON.stringify(obj)+'\n') } catch {} }

const GLOBAL = { registryId: 'R6QSWHZ6HJV', filename: 'certificato.p12', issuer: '08934760961' }
const MULTY  = { registryId: 'RQEL39R7NS0', filename: 'multyproget.p12', issuer: '12347770013' }
const GLOBAL_XML = 'test/registro Global Reco al 2412.xml'
const MULTY_XML  = 'test/registro Multyproget al2412.xml'

function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)) }
function normInt(x:any){ const s = String(x||'').replace(/[^0-9]/g,''); const n = parseInt(s||'0',10); return isNaN(n)?0:n }
function dateOnly(s:string){ const d = String(s||''); return d.includes('T')?d.split('T')[0]:d }
function keyAnnoProg(anno:any, prog:any){ return `${normInt(anno)}_${normInt(prog)}` }

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
    provenienza: 'U'
  }))
}
function findMovByKey(arr:any[], key:string){
  const [a,p] = String(key).split('_'); const anno = Number(a||0); const prog = Number(p||0)
  return arr.find(x=>Number(x.anno)===anno && Number(x.progressivo)===prog)
}
function normUM(s:string){
  const t = String(s||'').trim().toLowerCase()
  if (t==='kg' || t==='kilogrammi') return 'kg'
  if (t==='l' || t==='lt' || t==='litri') return 'l'
  if (t==='ton' || t==='t') return 'kg'
  return t
}
function coerceEer(m:any){
  const raw = String(m?.codice_eer || '').replace(/[^0-9]/g,'')
  if (raw.length >= 6) return raw.slice(0,6)
  return raw.padStart(6,'0').slice(0,6)
}
function buildPayload(mov:any, isMulty:boolean){
  const anno = mov.anno ?? new Date().getFullYear()
  const progressivo = String(mov.progressivo||'')
  const dataIso = `${(mov.data||new Date().toISOString().slice(0,10))}T12:00:00Z`
  const eer = coerceEer(mov)
  const umRaw = (mov.unita_misura || 'kg').toString().toLowerCase()
  let unita = normUM(umRaw)
  let q0 = typeof mov.quantita === 'number' ? mov.quantita : parseFloat(String(mov.quantita||'1'))
  if (umRaw==='ton' || umRaw==='t'){ unita='kg'; q0 = q0 * 1000 }
  const quantita = Math.max(Number((q0||0).toFixed(3)), 0.001)
  const provenienza = String(mov.provenienza || 'U')
  const base:any = {
    riferimenti: {
      numero_registrazione: { anno: Number(anno), progressivo: String(progressivo) },
      data_ora_registrazione: dataIso,
      causale_operazione: 'RE'
    },
    rifiuto: {
      codice_eer: eer,
      stato_fisico: 'S',
      quantita: { valore: quantita, unita_misura: unita },
      provenienza
    }
  }
  if (isMulty){
    base.intermediario = { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' }
    base.intermediari = [ { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' } ]
  }
  return base
}

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

function pickTwoFailed(){
  const picks: { key:string; registryId:string }[] = []
  try {
    const raw = readFileSync('out/invio_massivo.log','utf-8')
    const lines = raw.trim().split(/\r?\n/).reverse()
    for (const l of lines){
      if (picks.length>=2) break
      try {
        const j = JSON.parse(l)
        if (j.kind==='SEND' && Number(j.status)===400 && j.key && j.registryId){
          const key = String(j.key)
          const rid = String(j.registryId)
          if (!picks.find(x=>x.key===key && x.registryId===rid)) picks.push({ key, registryId: rid })
        }
      } catch {}
    }
  } catch {}
  return picks
}

async function main(){
  const targets = pickTwoFailed()
  if (targets.length===0) return
  for (const t of targets){
    const isGlobal = t.registryId === GLOBAL.registryId
    const xmlPath = isGlobal ? GLOBAL_XML : MULTY_XML
    const xml = readFileSync(xmlPath,'utf-8')
    const arr = parseRegistroXml(xml)
    const mov = findMovByKey(arr, t.key)
    if (!mov) continue
    const payload = [buildPayload(mov, !isGlobal)]
    const cfg = isGlobal ? GLOBAL : MULTY
    const sent = await sendOne(cfg.registryId, cfg.filename, cfg.issuer, payload)
    logLine({ kind:'SEND', registryId:cfg.registryId, status: sent.status, transazioneId: sent.transazioneId, key: t.key })
    if (sent.status === 202 && sent.transazioneId){
      const bodyStr = await checkResult(cfg.registryId, sent.transazioneId, cfg.filename, cfg.issuer)
      const acc = countAccepted(bodyStr)
      logLine({ kind:'RESULT', registryId:cfg.registryId, transazioneId: sent.transazioneId, accepted: acc })
    } else if (sent.status === 200){
      const acc = countAccepted(sent.dataStr)
      logLine({ kind:'RESULT', registryId:cfg.registryId, transazioneId: sent.transazioneId, accepted: acc })
    }
    await sleep(500)
  }
}
main()
