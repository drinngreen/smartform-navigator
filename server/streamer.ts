import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'fs'
import axios from 'axios'
import { buildMovimentiFromXml } from './rentriClient.ts'

type StreamState = { registryId:string, filename:string, issuer:string, xmlPath:string, batch:number, running:boolean, submitted:number, accepted:number, duplicates:number, next:{ anno:number, progressivo:string, date:string } }
const states:Record<string,StreamState>={}

function onlyDigits(s:string){ return (s||'').replace(/[^0-9]/g,'') }
function incProg(p:string){ const d = onlyDigits(p); const w = d.length || 7; return (parseInt(d||'0')+1).toString().padStart(w,'0') }
function chunk<T>(arr:T[], size:number){ const out:T[][]=[]; for(let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size)); return out }
async function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)) }

async function suggestNext(registryId:string, filename:string, issuer:string){
  const body = { registryId, filename, issuer, limit: 1, order: 'desc' }
  const res = await axios.post('http://localhost:8765/suggest-next', body)
  const d = res.data?.data
  return { date: String(d?.date||new Date().toISOString().slice(0,10)), anno: Number(d?.anno||new Date().getFullYear()), progressivo: String(d?.progressivo||'0000001') }
}

async function sendRegistrazioni(url:string, payload:any[], filename:string, issuer:string){
  const res = await axios.post('http://localhost:8765/send-registrazioni', { url, payload: JSON.stringify(payload), filename, issuer })
  const status = Number(res.data?.status||0)
  let transazioneId=''
  try { const d = JSON.parse(String(res.data?.data||'{}')); transazioneId = String(d?.transazione_id||'') } catch {}
  return { status, transazioneId, raw: String(res.data?.data||'') }
}

async function getLastDestinatario(registryId:string, filename:string, issuer:string){
  try {
    const res = await axios.post('http://localhost:8765/list-movimenti', { registryId, filename, issuer, limit: 1, order: 'desc' })
    const raw = String(res.data?.data||'[]')
    const arr = JSON.parse(raw)
    const el = Array.isArray(arr) ? arr[0] : null
    const d = el?.destinatario || el?.riferimenti?.destinatario || null
    if (d && (d.denominazione || d.codice_fiscale || d.num_autorizzazione)) {
      return {
        denominazione: String(d.denominazione||'ND'),
        codice_fiscale: String(d.codice_fiscale||'00000000000'),
        num_autorizzazione: String(d.num_autorizzazione||'ND')
      }
    }
  } catch {}
  return null
}

async function checkTransazione(registryId:string, transazioneId:string, filename:string, issuer:string){
  for (let i=0;i<120;i++){
    try {
      const res = await axios.post('http://localhost:8765/check-status', { api: 'dati-registri', transazioneId, filename, issuer })
      const ok = res.data?.success === true
      const body = String(res.data?.data||'')
      if (ok && body.length>0) return body
    } catch {}
    await sleep(1000)
  }
  return ''
}

function parseAccepted(bodyStr:string){ try { const m = JSON.parse(bodyStr); const arr = Array.isArray(m?.esito?.numero_registrazioni) ? m.esito.numero_registrazioni : []; return arr.length } catch { return 0 } }
function parseDuplicates(bodyStr:string){ try { const m = JSON.parse(bodyStr); const v = Array.isArray(m?.validazione) ? m.validazione : []; return v.filter((x:any)=>{ const c = String(x?.codice_messaggio||''); return c.includes('movimentoDuplicatoDatabase') || c.toUpperCase().includes('DUPLICATO') }).length } catch { return 0 } }

function parseAcceptedFlexible(bodyStr:string){
  try {
    const m = JSON.parse(bodyStr)
    const es = m?.esito || {}
    if (Array.isArray(es.numero_registrazioni)) return es.numero_registrazioni.length
    if (typeof es.numero_registrazioni === 'number') return es.numero_registrazioni
    if (es.numero_registrazioni && typeof es.numero_registrazioni === 'object') {
      const keys = Object.keys(es.numero_registrazioni)
      return keys.length
    }
    if (typeof es.totale_registrazioni_accettate === 'number') return es.totale_registrazioni_accettate
    if (typeof es.numero_registrazioni_accettate === 'number') return es.numero_registrazioni_accettate
    return 0
  } catch { return 0 }
}

function parseErrorFlags(bodyStr:string){
  try {
    const m = JSON.parse(bodyStr)
    const errore = !!m?.errore
    const codes = Array.isArray(m?.validazione) ? m.validazione.map((v:any)=>String(v?.codice_messaggio||'')) : []
    return { errore, codes }
  } catch { return { errore: false, codes: [] } }
}

function ensureOut(){ if (!existsSync('out')) mkdirSync('out') }
function logBatch(kind:'stream', data:any){ try { ensureOut(); appendFileSync('out/stream-log.jsonl', JSON.stringify({ ts: Date.now(), ...data })+'\n') } catch {} }

export async function startStream(key:'global'|'multy', batch:number=200){ 
  let conf:{ xmlPath:string, registryId:string, filename:string, issuer:string } 
  if (key==='global') conf = { xmlPath: 'test/global-reco_6000.xml.xml', registryId: 'R6QSWHZ6HJV', filename: 'certificato.p12', issuer: '' }
  else conf = { xmlPath: 'test/multy-proget_6000.xml.xml', registryId: 'RQEL39R7NS0', filename: 'multyproget.p12', issuer: '12347770013' }
  const state:StreamState = states[key] || { registryId: conf.registryId, filename: conf.filename, issuer: conf.issuer, xmlPath: conf.xmlPath, batch, running: false, submitted: 0, accepted: 0, duplicates: 0, next: { anno: new Date().getFullYear(), progressivo: '0000001', date: new Date().toISOString().slice(0,10) } }
  state.batch = batch
  state.submitted = 0
  state.accepted = 0
  state.duplicates = 0
  const next = await suggestNext(conf.registryId, conf.filename, conf.issuer)
  state.next = { anno: next.anno, progressivo: next.progressivo, date: next.date }
  state.running = true
  states[key] = state
  ;(async()=>{
    const xml = readFileSync(conf.xmlPath,'utf-8')
    const base = buildMovimentiFromXml(xml)
    const lastDest = await getLastDestinatario(conf.registryId, conf.filename, conf.issuer)
    let prog = state.next.progressivo
    const remapped = base.map(m=>({ ...m, riferimenti: { ...m.riferimenti, numero_registrazione: { anno: state.next.anno, progressivo: prog = incProg(prog) }, data_ora_registrazione: state.next.date+'T12:00:00Z' } }))
      .map(m=>{
        const out = { ...m }
        if (!('destinatario' in out)) {
          out.destinatario = lastDest || { denominazione: 'ND', codice_fiscale: '00000000000', num_autorizzazione: 'ND' }
        } else {
          out.destinatario = {
            denominazione: String((out as any).destinatario?.denominazione||'ND'),
            codice_fiscale: String((out as any).destinatario?.codice_fiscale||'00000000000'),
            num_autorizzazione: String((out as any).destinatario?.num_autorizzazione||'ND')
          }
        }
        if (!('produttore' in out)) {
          out.produttore = { denominazione: 'ND', codice_fiscale: (conf.filename==='multyproget.p12'?'12347770013':'08934760961'), indirizzo: 'ND' }
        } else {
          out.produttore = {
            denominazione: String((out as any).produttore?.denominazione||'ND'),
            codice_fiscale: String((out as any).produttore?.codice_fiscale|| (conf.filename==='multyproget.p12'?'12347770013':'08934760961')),
            indirizzo: String((out as any).produttore?.indirizzo||'ND')
          }
        }
        if (!('trasportatore' in out)) {
          out.trasportatore = { denominazione: 'ND', codice_fiscale: '00000000000', num_iscrizione_albo: 'ND' }
        } else {
          out.trasportatore = {
            denominazione: String((out as any).trasportatore?.denominazione||'ND'),
            codice_fiscale: String((out as any).trasportatore?.codice_fiscale||'00000000000'),
            num_iscrizione_albo: String((out as any).trasportatore?.num_iscrizione_albo||'ND')
          }
        }
        return out
      })
    const url = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${conf.registryId}/movimenti`
    for (const c of chunk(remapped, state.batch)){
      if (!state.running) break
      const s = await sendRegistrazioni(url, c, conf.filename, conf.issuer)
      state.submitted += c.length
      if (s.transazioneId){
        const body = await checkTransazione(conf.registryId, s.transazioneId, conf.filename, conf.issuer)
        state.accepted += parseAcceptedFlexible(body)
        state.duplicates += parseDuplicates(body)
        const ef = parseErrorFlags(body)
        logBatch('stream', { registryId: conf.registryId, filename: conf.filename, issuer: conf.issuer, transazioneId: s.transazioneId, count: c.length, accepted: parseAcceptedFlexible(body), duplicates: parseDuplicates(body), errore: ef.errore, codes: ef.codes })
      } else if (s.status===200){
        state.accepted += parseAcceptedFlexible(s.raw)
        state.duplicates += parseDuplicates(s.raw)
        const ef = parseErrorFlags(s.raw)
        logBatch('stream', { registryId: conf.registryId, filename: conf.filename, issuer: conf.issuer, transazioneId: null, count: c.length, accepted: parseAcceptedFlexible(s.raw), duplicates: parseDuplicates(s.raw), errore: ef.errore, codes: ef.codes })
      }
    }
    state.running = false
  })()
}

export function stopStream(key:'global'|'multy'){ const st = states[key]; if (st) st.running = false }
export async function restartStream(key:'global'|'multy', batch:number){ stopStream(key); await sleep(250); return startStream(key, batch) }
export function getStatus(){ return { global: states['global']||null, multy: states['multy']||null } }
