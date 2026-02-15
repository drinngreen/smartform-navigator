import axios from 'axios'
import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'fs'
import { XMLParser } from 'fast-xml-parser'

type Head = any

const BRIDGE = 'http://localhost:8765'
const DELAY_MS = 100
const BATCH_SIZE = 500
const POLL_CONCURRENCY = 5

const GLOBAL = { registryId: 'R6QSWHZ6HJV', filename: 'certificato.p12', issuer: '08934760961' }
const MULTY  = { registryId: 'RQEL39R7NS0', filename: 'multyproget.p12', issuer: '12347770013' }
const GLOBAL_XML = 'test/registro Global Reco al 2412.xml'
const MULTY_XML  = 'test/registro Multyproget al2412.xml'

function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)) }
function ensureLog(){ if (!existsSync('out')) mkdirSync('out') }
function logLine(obj:any){ try { ensureLog(); appendFileSync('out/invio_massivo.log', JSON.stringify(obj)+'\n') } catch {} }
function normInt(x:any){ const s = String(x||'').replace(/[^0-9]/g,''); const n = parseInt(s||'0',10); return isNaN(n)?0:n }

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
function parseRegistroAnno(xml:string){
  const obj = xmlParser.parse(xml) || {}
  const reg = obj?.RegistroCronologico?.Registrazioni
  const annoAttr = reg?.['@_Anno']
  return Number(annoAttr||new Date().getFullYear())
}

async function listMovimenti(registryId:string, filename:string, issuer:string, limit=10000){
  const body = { registryId, filename, issuer, limit, order: 'desc' }
  const res = await axios.post(`${BRIDGE}/list-movimenti`, body)
  let arr:Head[]=[]
  try { arr = JSON.parse(String(res.data?.data||'[]')) } catch {}
  return arr
}

function buildPayloadMinimal(mov:any, isMulty:boolean){
  const dataIso = `${(mov.data||new Date().toISOString().slice(0,10))}T00:00:00Z`
  const eer = String(mov.codice_eer || mov.codice_cer || mov.codice_cer_formattato || '').replace(/[^0-9\*]/g,'')
  const um = (mov.unita_misura || 'kg').toString().toLowerCase()
  const unita = um === 'kg' ? 'kg' : (um === 'l' || um === 'lt' ? 'l' : um)
  const quantita = typeof mov.quantita === 'number' ? mov.quantita : parseFloat(String(mov.quantita||'1'))
  const provenienza = String(mov.provenienza || 'U')
  const base:any = {
    riferimenti: {
      numero_registrazione: { anno: new Date().getFullYear(), progressivo: '1' },
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
  for(let i=0;i<60;i++){
    const body = { registryId, transazioneId, filename, issuer }
    const res = await axios.post(`${BRIDGE}/check-transazione`, body)
    if (res.data?.success === true && Number(res.data?.status)===200) return String(res.data?.data||'')
    await sleep(1000)
  }
  return ''
}

function countAccepted(bodyStr:string){
  try { const m = JSON.parse(bodyStr); const es = m?.esito; const arr = Array.isArray(es?.numero_registrazioni) ? es.numero_registrazioni : []; return arr.length } catch { return 0 }
}

async function main(){
  const xmlG = readFileSync(GLOBAL_XML, 'utf-8')
  const xmlM = readFileSync(MULTY_XML, 'utf-8')
  const yearG = parseRegistroAnno(xmlG)
  const yearM = parseRegistroAnno(xmlM)
  const baseG = parseRegistroXml(xmlG)
  const baseM = parseRegistroXml(xmlM)
  const existingG = await listMovimenti(GLOBAL.registryId, GLOBAL.filename, GLOBAL.issuer, 10000)
  const existingM = await listMovimenti(MULTY.registryId, MULTY.filename, MULTY.issuer, 10000)
  let maxProgG = 0, maxProgM = 0
  for (const el of existingG){ const nr = el?.riferimenti?.numero_registrazione || {}; const a = Number(nr?.anno||0); const p = Number(nr?.progressivo||0); if (a===yearG) maxProgG = Math.max(maxProgG, p) }
  for (const el of existingM){ const nr = el?.riferimenti?.numero_registrazione || {}; const a = Number(nr?.anno||0); const p = Number(nr?.progressivo||0); if (a===yearM) maxProgM = Math.max(maxProgM, p) }
  let idxG = 0, idxM = 0
  const queue:{ reg:string, tid:string, fn:string, iss:string }[] = []
  console.log(`Fast alternate: Global max=${maxProgG}, Multy max=${maxProgM}`)
  while (idxG < baseG.length || idxM < baseM.length){
    if (existsSync('out/guard.pause')) { await sleep(60000) }
    if (idxG < baseG.length){
      const slice = baseG.slice(idxG, Math.min(idxG + BATCH_SIZE, baseG.length))
      idxG += slice.length
      const payload = slice.map((mov, i)=>{
        const p = buildPayloadMinimal(mov, false)
        p.riferimenti.numero_registrazione.anno = yearG
        p.riferimenti.numero_registrazione.progressivo = String(maxProgG + i + 1).padStart(7,'0')
        return p
      })
      maxProgG += slice.length
      const sent = await sendBatch(GLOBAL.registryId, GLOBAL.filename, GLOBAL.issuer, payload)
      logLine({ kind:'SEND', registryId:GLOBAL.registryId, status: sent.status, transazioneId: sent.transazioneId, count: payload.length, last_progressivo: payload[payload.length-1].riferimenti.numero_registrazione.progressivo })
      if (sent.status===202 && sent.transazioneId) queue.push({ reg: GLOBAL.registryId, tid: sent.transazioneId, fn: GLOBAL.filename, iss: GLOBAL.issuer })
      await sleep(DELAY_MS)
    }
    if (idxM < baseM.length){
      if (existsSync('out/guard.pause')) { await sleep(60000) }
      const slice = baseM.slice(idxM, Math.min(idxM + BATCH_SIZE, baseM.length))
      idxM += slice.length
      const payload = slice.map((mov, i)=>{
        const p = buildPayloadMinimal(mov, true)
        p.riferimenti.numero_registrazione.anno = yearM
        p.riferimenti.numero_registrazione.progressivo = String(maxProgM + i + 1).padStart(7,'0')
        return p
      })
      maxProgM += slice.length
      const sent = await sendBatch(MULTY.registryId, MULTY.filename, MULTY.issuer, payload)
      logLine({ kind:'SEND', registryId:MULTY.registryId, status: sent.status, transazioneId: sent.transazioneId, count: payload.length, last_progressivo: payload[payload.length-1].riferimenti.numero_registrazione.progressivo })
      if (sent.status===202 && sent.transazioneId) queue.push({ reg: MULTY.registryId, tid: sent.transazioneId, fn: MULTY.filename, iss: MULTY.issuer })
      await sleep(DELAY_MS)
    }
    while (queue.length > 0){
      const batch = queue.splice(0, POLL_CONCURRENCY)
      await Promise.all(batch.map(async q=>{
        const bodyStr = await pollTransazione(q.reg, q.tid, q.fn, q.iss)
        const acc = countAccepted(bodyStr)
        logLine({ kind:'RESULT', registryId:q.reg, transazioneId:q.tid, accepted: acc })
      }))
    }
  }
  console.log('Fast alternate completed')
}

main()
