import axios from 'axios'
import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'fs'
import { buildMovimentiFromXml } from '../rentriClient'
import { XMLParser } from 'fast-xml-parser'

const BRIDGE = 'http://localhost:8765'
const DELAY_MS = Number(process.env.SEND_DELAY_MS || 500)
const DRY_RUN = process.env.DRY_RUN === '1'
const MAX_CONSECUTIVE_ERRORS = Number(process.env.MAX_CONSECUTIVE_ERRORS || 100)

const BYPASS_RENTRI_LIST = process.env.BYPASS_RENTRI_LIST === '1'
const FAST_MODE = process.env.FAST_MODE === '1'
const STATUS_POLL_ATTEMPTS = Number(process.env.STATUS_POLL_ATTEMPTS || (FAST_MODE ? 1 : 30))
const STATUS_POLL_DELAY_MS = Number(process.env.STATUS_POLL_DELAY_MS || (FAST_MODE ? 500 : 2000))
function loadBlacklistKeys(){
  try {
    const { readFileSync, existsSync } = require('fs')
    const p1 = 'out/blacklist.sent.json'
    const p2 = 'out/blacklist.remote.json'
    const keys = new Set<string>()
    if (existsSync(p1)){ const j1 = JSON.parse(readFileSync(p1,'utf-8')); const a1 = Array.isArray(j1?.keys)?j1.keys:[]; a1.forEach((x:any)=>keys.add(String(x))) }
    if (existsSync(p2)){ const j2 = JSON.parse(readFileSync(p2,'utf-8')); const a2 = Array.isArray(j2?.keys)?j2.keys:[]; a2.forEach((x:any)=>keys.add(String(x))) }
    return keys
  } catch { return new Set<string>() }
}

const GLOBAL = { registryId: 'R6QSWHZ6HJV', filename: 'certificato.p12', issuer: '08934760961' }
const MULTY  = { registryId: 'RQEL39R7NS0', filename: 'multyproget.p12', issuer: '12347770013' }

const GLOBAL_XML = 'test/registro Global Reco al 2412.xml'
const MULTY_XML  = 'test/registro Multyproget al2412.xml'

function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)) }
function normInt(x:any){ const s = String(x||'').replace(/[^0-9]/g,''); const n = parseInt(s||'0',10); return isNaN(n)?0:n }
function keyAnnoProg(anno:any, prog:any){ return `${normInt(anno)}_${normInt(prog)}` }
function parseJsonSafe(s:string){ try { return JSON.parse(s) } catch { return [] } }
function yFromDate(d:string){ try { return new Date(d.includes('T')?d.split('T')[0]:d).getFullYear() } catch { return new Date().getFullYear() } }
function ensureLogDir(){ if (!existsSync('out')) mkdirSync('out') }
function logLine(obj:any){ try { ensureLogDir(); if (obj?.kind==='SEND' || obj?.kind==='RESULT') appendFileSync('out/invio_massivo.log', JSON.stringify(obj)+'\n') } catch {} }
function loadAttemptsKeys(){
  const keys = new Set<string>()
  try {
    const p = 'bridge-service/bin/Debug/net8.0/logs/attempts.jsonl'
    if (existsSync(p)){
      const raw = readFileSync(p,'utf-8')
      const lines = raw.trim().split(/\r?\n/).slice(-5000)
      for (const l of lines){
        try {
          const j = JSON.parse(l)
          const payloadStr = j?.payload
          if (typeof payloadStr === 'string' && payloadStr.length){
            try {
              const arr = JSON.parse(payloadStr)
              const one = Array.isArray(arr) ? arr[0] : arr
              const anno = one?.riferimenti?.numero_registrazione?.anno
              const prog = one?.riferimenti?.numero_registrazione?.progressivo
              if (anno && prog){ keys.add(`${normInt(anno)}_${normInt(prog)}`) }
            } catch {}
          }
        } catch {}
      }
    }
  } catch {}
  return keys
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
    provenienza: 'U'
  }))
}
function parseRegistroAnno(xml:string){
  const obj = xmlParser.parse(xml) || {}
  const reg = obj?.RegistroCronologico?.Registrazioni
  const annoAttr = reg?.['@_Anno']
  return Number(annoAttr||new Date().getFullYear())
}

async function listAllMovimenti(registryId:string, filename:string, issuer:string, year:number){
  const out:any[] = []
  const seen = new Set<string>()
  function keyOf(el:any){ const nr = el?.riferimenti?.numero_registrazione || el?.numero_registrazione; return `${nr?.anno ?? ''}_${String(nr?.progressivo ?? '').replace(/[^0-9]/g,'')}` }
  async function fetchRange(from:string, to:string){
    let cursorFrom = from
    for (let page=0; page<500; page++){
      const body = { registryId, filename, issuer, limit: 100, order: 'asc', from: cursorFrom, to }
      const res = await axios.post(`${BRIDGE}/list-movimenti`, body)
      const raw = String(res.data?.data || '')
      const arr = parseJsonSafe(raw)
      if (!Array.isArray(arr) || arr.length === 0) break
      for (const el of arr){
        const k = keyOf(el)
        if (!seen.has(k)) { seen.add(k); out.push(el) }
      }
      const last = arr[arr.length-1]
      const lastDateStr = String(last?.riferimenti?.data_ora_registrazione || last?.data_ora_registrazione || '')
      const lastDate = lastDateStr ? (lastDateStr.includes('T')?lastDateStr.split('T')[0]:lastDateStr) : ''
      if (!lastDate) break
      const d = new Date(lastDate)
      if (isNaN(d.getTime())) break
      d.setDate(d.getDate()+1)
      cursorFrom = d.toISOString().slice(0,10)
      if (new Date(cursorFrom).getTime() > new Date(to).getTime()) break
      if (page % 3 === 0) console.log(`RENTRI fetch: scaricati ${out.length}, avanzamento da ${from} a ${cursorFrom}`)
    }
  }
  async function fetchDay(day:string){
    let cursorFrom = `${day}T00:00:00Z`
    const to = `${day}T23:59:59Z`
    let added = 0
    for (let page=0; page<500; page++){
      const body = { registryId, filename, issuer, limit: 100, order: 'asc', from: cursorFrom, to }
      let arr:any[] = []
      try {
        const res = await axios.post(`${BRIDGE}/list-movimenti`, body)
        const raw = String(res.data?.data || '')
        arr = parseJsonSafe(raw)
      } catch {
        try {
          const res2 = await axios.post(`${BRIDGE}/list-registrazioni`, body)
          const raw2 = String(res2.data?.data || '')
          const arr2 = parseJsonSafe(raw2)
          arr = Array.isArray(arr2) ? arr2.map((x:any)=>({
            riferimenti: {
              numero_registrazione: x?.numero_registrazione,
              data_ora_registrazione: x?.data_registrazione,
              causale_operazione: x?.causale_operazione
            },
            rifiuto: x?.rifiuto
          })) : []
        } catch { arr = [] }
      }
      if (!Array.isArray(arr) || arr.length === 0) break
      for (const el of arr){
        const k = keyOf(el)
        if (!seen.has(k)) { seen.add(k); out.push(el); added++ }
      }
      const last = arr[arr.length-1]
      const lastDateStr = String(last?.riferimenti?.data_ora_registrazione || last?.data_ora_registrazione || '')
      if (!lastDateStr) break
      const dd = new Date(lastDateStr)
      if (isNaN(dd.getTime())) break
      dd.setSeconds(dd.getSeconds()+1)
      cursorFrom = dd.toISOString().replace('.000','')
      if (new Date(cursorFrom).getTime() > new Date(to).getTime()) break
    }
    console.log(`${day}: ${added} records. Totale parziale: ${out.length}`)
  }
  // Giornaliero solo per 2025-11 e 2025-12 (Global dataset recente)
  const monthsDaily = ['11','12']
  for (const mm of monthsDaily){
    const daysInMonth = new Date(year, Number(mm), 0).getDate()
    for (let d=1; d<=daysInMonth; d++){
      const day = `${year}-${mm}-${String(d).padStart(2,'0')}`
      await fetchDay(day)
    }
    console.log(`RENTRI fetch: mese ${mm} completato (daily), totale ${out.length}`)
  }
  console.log(`RENTRI fetch: totale scaricati ${out.length}`)
  return out
}

function normEER(s:string){ const t = String(s||'').replace(/[^0-9\*]/g,''); return t }
function normUM(s:string){ const t = String(s||'').trim().toLowerCase(); if (t==='kg'||t==='kilogrammi') return 'kg'; if (t==='l'||t==='lt'||t==='litri') return 'l'; if (t==='ton'||t==='t') return 'kg'; return t }
function dateOnly(s:string){ const d = String(s||''); return d.includes('T')?d.split('T')[0]:d }
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
function rentriSignatureFuzzy(el:any){
  try {
    const eer = normEER(el?.rifiuto?.codice_eer || el?.codice_eer)
    const caus = String(el?.riferimenti?.causale_operazione || el?.causale_operazione || 'RE')
    const dt = dateOnly(el?.riferimenti?.data_ora_registrazione || el?.data_ora_registrazione || '')
    return `${dt}|${caus}|${eer}`
  } catch { return '' }
}
function localSignature(m:any){
  try {
    const eer = normEER(m?.codice_eer || m?.codice_cer || m?.codice_cer_formattato || '')
    const q = Number(m?.quantita || 0)
    const um = normUM(m?.unita_misura || 'kg')
    const prov = String(m?.provenienza || 'U')
    const caus = 'RE'
    const dt = dateOnly(m?.data || '')
    return `${dt}|${caus}|${eer}|${q}|${um}|${prov}`
  } catch { return '' }
}
function localSignatureFuzzy(m:any){
  try {
    const eer = normEER(m?.codice_eer || m?.codice_cer || m?.codice_cer_formattato || '')
    const caus = 'RE'
    const dt = dateOnly(m?.data || '')
    return `${dt}|${caus}|${eer}`
  } catch { return '' }
}
function coerceEer(m:any){
  const raw = String(m?.codice_eer || m?.codice_cer || m?.codice_cer_formattato || '').replace(/[^0-9]/g,'')
  if (raw.length === 6) return raw
  if (raw.length > 6) return raw.slice(0,6)
  if (raw.length === 5) return '0'+raw
  if (raw.length === 4) return '00'+raw
  return raw.padStart(6,'0').slice(0,6)
}
function repairPayload(p:any, m:any){
  const eer = coerceEer(m)
  const umRaw = String(m?.unita_misura || p?.rifiuto?.quantita?.unita_misura || 'kg').toLowerCase()
  const um = umRaw==='kg'?'kg':(umRaw==='l'?'l':'kg')
  const q = Number(typeof m?.quantita==='number'?m.quantita:(typeof p?.rifiuto?.quantita?.valore==='number'?p.rifiuto.quantita.valore:1))
  const dataIso = `${(m?.data||dateOnly(p?.riferimenti?.data_ora_registrazione)||new Date().toISOString().slice(0,10))}T12:00:00Z`
  const anno = Number(m?.anno || p?.riferimenti?.numero_registrazione?.anno || new Date().getFullYear())
  const progressivo = String(m?.progressivo || p?.riferimenti?.numero_registrazione?.progressivo || '1')
  const fir = getFir(m)
  const provenienza = String(m?.provenienza || p?.rifiuto?.provenienza || 'U')
  const base:any = {
    riferimenti: {
      numero_registrazione: { anno, progressivo },
      data_ora_registrazione: dataIso,
      causale_operazione: 'RE'
    },
    rifiuto: {
      codice_eer: eer,
      stato_fisico: 'S',
      quantita: { valore: Math.max(q, 0.001), unita_misura: um },
      provenienza
    }
  }
  if (fir && typeof fir==='string' && fir.trim()){
    base.riferimenti.numero_fir = fir.trim()
    base.documento = { numero: fir.trim() }
  }
  if (m?.__isMulty){
    base.intermediario = { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' }
    base.intermediari = [ { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' } ]
  }
  return base
}
function dateDiffDays(a:string,b:string){
  try { const da = new Date(dateOnly(a)).getTime(); const db = new Date(dateOnly(b)).getTime(); return Math.abs(Math.round((da-db)/(1000*60*60*24))) } catch { return 999 }
}
function isDuplicateLocalRentri(local:any, rentri:any){
  try {
    const cerL = normEER(local?.codice_eer || local?.codice_cer || local?.codice_cer_formattato || '')
    const cerR = normEER(rentri?.rifiuto?.codice_eer || rentri?.codice_eer)
    const causR = String(rentri?.riferimenti?.causale_operazione || rentri?.causale_operazione || '')
    const dL = dateOnly(local?.data || '')
    const dR = dateOnly(rentri?.riferimenti?.data_ora_registrazione || rentri?.data_ora_registrazione || '')
    if (!cerL || !cerR) return false
    if (cerL !== cerR) return false
    if (causR !== 'RE') return false
    const dd = dateDiffDays(dL, dR)
    return dd <= 14
  } catch { return false }
}
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
function dateValue(s:string){ try { return new Date(dateOnly(s)).getTime() } catch { return 0 } }
function dedupByFir(arr:any[], registryId:string){
  const out:any[] = []
  const map = new Map<string, any>()
  let skipped = 0
  for (const m of arr){
    const fir = getFir(m)
    if (!fir) { out.push(m); continue }
    const prev = map.get(fir)
    if (!prev){
      map.set(fir, m)
      out.push(m)
      continue
    }
    const dPrev = dateValue(prev?.data || '')
    const dCurr = dateValue(m?.data || '')
    const pPrev = normInt(prev?.progressivo || prev?.riferimenti?.numero_registrazione?.progressivo)
    const pCurr = normInt(m?.progressivo || m?.riferimenti?.numero_registrazione?.progressivo)
    let keepPrev = true
    if (dCurr && dPrev){
      if (dCurr < dPrev) keepPrev = false
      else if (dCurr === dPrev && pCurr < pPrev) keepPrev = false
    } else {
      if (pCurr < pPrev) keepPrev = false
    }
    if (keepPrev){
      skipped++
      logLine({ kind:'DEDUP_FIR_SKIP', registryId, fir, kept:'prev', prev_date:prev?.data, curr_date:m?.data, prev_prog:pPrev, curr_prog:pCurr })
    } else {
      skipped++
      logLine({ kind:'DEDUP_FIR_SKIP', registryId, fir, kept:'curr', prev_date:prev?.data, curr_date:m?.data, prev_prog:pPrev, curr_prog:pCurr })
      const idx = out.indexOf(prev)
      if (idx >= 0) out.splice(idx, 1, m)
      map.set(fir, m)
    }
  }
  return { list: out, skippedFir: skipped }
}

function extractAnnoProg(el:any){
  try {
    const rif = el?.riferimenti || el
    const nr = rif?.numero_registrazione || el?.numero_registrazione
    const anno = normInt(nr?.anno ?? rif?.anno)
    const progressivo = normInt(nr?.progressivo ?? rif?.progressivo)
    if (anno && progressivo) return { anno, progressivo }
  } catch {}
  return { anno: undefined, progressivo: undefined }
}

function buildPayloadMinimal(mov:any, isMulty:boolean){
  const anno = mov.riferimenti?.numero_registrazione?.anno ?? yFromDate(mov.data)
  const progressivo = mov.riferimenti?.numero_registrazione?.progressivo ?? String(mov.progressivo||'')
  const dataIso = mov.riferimenti?.data_ora_registrazione ?? `${(mov.data||new Date().toISOString().slice(0,10))}T12:00:00Z`
  const eer = coerceEer(mov)
  const umRaw = (mov.unita_misura || 'kg').toString().toLowerCase()
  let unita = normUM(umRaw)
  let q0 = typeof mov.quantita === 'number' ? mov.quantita : parseFloat(String(mov.quantita||'1'))
  if (umRaw==='ton' || umRaw==='t'){ unita='kg'; q0 = q0 * 1000 }
  const quantita = Math.max(Number((q0||0).toFixed(3)), 0.001)
  const provenienza = String(mov.provenienza || 'U')
  const fir = getFir(mov)
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
  if (fir && typeof fir === 'string' && fir.trim()){
    base.riferimenti.numero_fir = fir.trim()
    base.documento = { numero: fir.trim() }
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

async function processGlobal(){
  const xml = readFileSync(GLOBAL_XML, 'utf-8')
  const year = parseRegistroAnno(xml)
  const existing = BYPASS_RENTRI_LIST ? [] : await listAllMovimenti(GLOBAL.registryId, GLOBAL.filename, GLOBAL.issuer, year)
  const set = new Set<string>()
  for (const el of existing){
    const { anno, progressivo } = extractAnnoProg(el)
    if (anno!=null && progressivo!=null) set.add(keyAnnoProg(anno, progressivo))
  }
  const blacklist = loadBlacklistKeys()
  const dedupG = dedupByFir(parseRegistroXml(xml), GLOBAL.registryId)
  const base = dedupG.list
  // silent: no verbose FIR skip logs
  let totalLocal = base.length
  let skipped = 0, sent = 0, accepted = 0, toSend = 0
  const existingSignatures = new Set<string>()
  existing.forEach(r=>{ const s = rentriSignature(r); if (s) existingSignatures.add(s); const sf = rentriSignatureFuzzy(r); if (sf) existingSignatures.add(sf) })
  const existingFirs = new Set<string>()
  existing.forEach(r=>{ const f = getFir(r); if (f && typeof f==='string' && f.trim()) existingFirs.add(f.trim().toUpperCase()) })
  const attemptKeys = loadAttemptsKeys()
  let consecutiveErrors = 0
  // silent: no verbose console debug
  // Normalizzazione e calcolo delta per chiavi anno_progressivo (GLOBAL)
  const existingKeysG = new Set<string>()
  existing.forEach((r:any, idx:number)=>{
    const annoR = r?.riferimenti?.numero_registrazione?.anno
    const progRawR = r?.riferimenti?.numero_registrazione?.progressivo
    const progNumR = normInt(progRawR)
    if (annoR && progNumR){
      const key = `${annoR}_${progNumR}`
      existingKeysG.add(key)
    }
  })
  attemptKeys.forEach(k=>existingKeysG.add(k))
  base.forEach((l:any, idx:number)=>{
    const annoL = l.anno || l?.riferimenti?.numero_registrazione?.anno
    const progRawL = l.progressivo || l?.riferimenti?.numero_registrazione?.progressivo
    const progNumL = normInt(progRawL)
    const key = `${annoL}_${progNumL}`
    const duplicateByKey = existingKeysG.has(key)
    const duplicateByContent = existing.some(r=>isDuplicateLocalRentri(l, r))
    if (!duplicateByKey && !duplicateByContent) toSend++
  }
  )
  // silent: no verbose console debug
  if (DRY_RUN){
    console.log('Global: DRY_RUN attivo, non invio. Fine.')
    return
  }
  if (existing.length>0 && toSend === totalLocal){ throw new Error('Possibile fallimento filtro duplicati') }
  if (toSend > 0){
    console.log(`Global: Invio massivo tra 3s... (auto conferma)`)
    await sleep(3000)
  }
  let processed = 0
  for (const mov of base){
    if (existsSync('out/guard.pause')) { console.log('Guard: pausa invii per low_acceptance, attendo 60s'); await sleep(60000) }
    const key = `${mov.anno}_${normInt(mov.progressivo)}`
    if (existingKeysG.has(key) || blacklist.has(key)){ skipped++; processed++; if (processed%1000===0) console.log(`Global: Processati ${processed}... Inviati ${sent}`); continue }
    const duplicateByContent = existing.some(r=>isDuplicateLocalRentri(mov, r))
    const firLocal = getFir(mov)
    if (duplicateByContent && (!firLocal || !firLocal.trim() || existingFirs.has(firLocal.trim().toUpperCase()))){ skipped++; processed++; if (processed%1000===0) console.log(`Global: Processati ${processed}... Inviati ${sent}`); continue }
    const sigLocal = localSignature(mov); const sigFuzzy = localSignatureFuzzy(mov)
    if ((sigLocal && existingSignatures.has(sigLocal)) || (sigFuzzy && existingSignatures.has(sigFuzzy))) { skipped++; processed++; if (processed%1000===0) console.log(`Global: Processati ${processed}... Inviati ${sent}`); continue }
    const one = buildPayloadMinimal(mov, false)
    const eerOk = typeof one?.rifiuto?.codice_eer === 'string' && /^[0-9]{6}$/.test(one.rifiuto.codice_eer)
    const qOk = Number(one?.rifiuto?.quantita?.valore||0) > 0
    const umOk = String(one?.rifiuto?.quantita?.unita_misura||'').toLowerCase()==='kg' || String(one?.rifiuto?.quantita?.unita_misura||'').toLowerCase()==='l'
    if (!eerOk){ skipped++; processed++; if (processed%1000===0) console.log(`Global: Processati ${processed}... Inviati ${sent}`); continue }
    if (!qOk){ skipped++; processed++; if (processed%1000===0) console.log(`Global: Processati ${processed}... Inviati ${sent}`); continue }
    if (!umOk){ skipped++; processed++; if (processed%1000===0) console.log(`Global: Processati ${processed}... Inviati ${sent}`); continue }
    const payload = [one]
    const sentRes = await sendOne(GLOBAL.registryId, GLOBAL.filename, GLOBAL.issuer, payload)
    sent++
    logLine({ kind:'SEND', registryId:GLOBAL.registryId, status: sentRes.status, transazioneId: sentRes.transazioneId, key })
    if (sentRes.status === 202 && sentRes.transazioneId){
      const bodyStr = await checkResult(GLOBAL.registryId, sentRes.transazioneId, GLOBAL.filename, GLOBAL.issuer)
      const acc = countAccepted(bodyStr)
      accepted += acc
      logLine({ kind:'RESULT', registryId:GLOBAL.registryId, transazioneId: sentRes.transazioneId, accepted: acc })
      const sigRentri = rentriSignature(payload[0]); const sigRentriF = rentriSignatureFuzzy(payload[0]); if (sigRentri) existingSignatures.add(sigRentri); if (sigRentriF) existingSignatures.add(sigRentriF)
    } else if (sentRes.status === 200) {
      const acc = countAccepted(sentRes.dataStr)
      accepted += acc
      logLine({ kind:'RESULT', registryId:GLOBAL.registryId, transazioneId: sentRes.transazioneId, accepted: acc })
      const sigRentri = rentriSignature(payload[0]); const sigRentriF = rentriSignatureFuzzy(payload[0]); if (sigRentri) existingSignatures.add(sigRentri); if (sigRentriF) existingSignatures.add(sigRentriF)
    } else if (sentRes.status >= 400) {
      let isDup=false
      let isVal=false
      try {
        const obj = JSON.parse(String(sentRes.dataStr||'{}'))
        const title = String(obj?.title||'')
        const msg = String(obj?.codice_messaggio||'')
        const det = String(obj?.detail||'')
        const ms = obj?.model_state
        if (ms && typeof ms === 'object') isVal = true
        const all = `${title} ${msg} ${det}`.toLowerCase()
        if (all.includes('duplic') || all.includes('movimentoduplicatodatabase')) isDup=true
      } catch {}
      if (isDup) { consecutiveErrors = 0 }
      else if (isVal) {
        const repaired = repairPayload(payload[0], mov)
        const res2 = await sendOne(GLOBAL.registryId, GLOBAL.filename, GLOBAL.issuer, [repaired])
        // silent repair send
        if (res2.status === 202 && res2.transazioneId){
          const bodyStr2 = await checkResult(GLOBAL.registryId, res2.transazioneId, GLOBAL.filename, GLOBAL.issuer)
          const acc2 = countAccepted(bodyStr2)
          accepted += acc2
          logLine({ kind:'RESULT', registryId:GLOBAL.registryId, transazioneId: res2.transazioneId, accepted: acc2 })
        } else if (res2.status === 200) {
          const acc2 = countAccepted(res2.dataStr)
          accepted += acc2
          logLine({ kind:'RESULT', registryId:GLOBAL.registryId, transazioneId: res2.transazioneId, accepted: acc2 })
        } else {
          // silent skip
        }
        consecutiveErrors = 0
      }
      else {
        consecutiveErrors++
        if (consecutiveErrors > MAX_CONSECUTIVE_ERRORS) { console.log(`Global: Errori consecutivi > ${MAX_CONSECUTIVE_ERRORS}, arresto per sicurezza`); break }
      }
    } else {
      consecutiveErrors = 0
    }
    processed++
    if (processed%1000===0) console.log(`Global: Processati ${processed}... Inviati ${sent}`)
    await sleep(DELAY_MS)
  }
  console.log(`Global: Inviati=${sent}, Accettati=${accepted}`)
}

async function processMulty(){
  if (existsSync('out/multy.pause')) { console.log('Multy: pausa richiesta, salto invio'); return }
  const xml = readFileSync(MULTY_XML, 'utf-8')
  const year = parseRegistroAnno(xml)
  const existing = BYPASS_RENTRI_LIST ? [] : await listAllMovimenti(MULTY.registryId, MULTY.filename, MULTY.issuer, year)
  const set = new Set<string>()
  for (const el of existing){
    const { anno, progressivo } = extractAnnoProg(el)
    if (anno!=null && progressivo!=null) set.add(keyAnnoProg(anno, progressivo))
  }
  const blacklist = loadBlacklistKeys()
  const dedupM = dedupByFir(parseRegistroXml(xml), MULTY.registryId)
  const base = dedupM.list
  // silent FIR skip
  let totalLocal = base.length
  let skipped = 0, sent = 0, accepted = 0, toSend = 0
  const existingSignatures = new Set<string>()
  existing.forEach(r=>{ const s = rentriSignature(r); if (s) existingSignatures.add(s); const sf = rentriSignatureFuzzy(r); if (sf) existingSignatures.add(sf) })
  const existingFirs = new Set<string>()
  existing.forEach(r=>{ const f = getFir(r); if (f && typeof f==='string' && f.trim()) existingFirs.add(f.trim().toUpperCase()) })
  const attemptKeysM = loadAttemptsKeys()
  let consecutiveErrors = 0
  // silent debug
  // Normalizzazione e calcolo delta per chiavi anno_progressivo (MULTY)
  const existingKeysM = new Set<string>()
  existing.forEach((r:any, idx:number)=>{
    const annoR = r?.riferimenti?.numero_registrazione?.anno
    const progRawR = r?.riferimenti?.numero_registrazione?.progressivo
    const progNumR = normInt(progRawR)
    if (annoR && progNumR){
      const key = `${annoR}_${progNumR}`
      existingKeysM.add(key)
    }
  })
  attemptKeysM.forEach(k=>existingKeysM.add(k))
  base.forEach((l:any, idx:number)=>{
    const annoL = l.anno || l?.riferimenti?.numero_registrazione?.anno
    const progRawL = l.progressivo || l?.riferimenti?.numero_registrazione?.progressivo
    const progNumL = normInt(progRawL)
    const key = `${annoL}_${progNumL}`
    const duplicateByKey = existingKeysM.has(key)
    const duplicateByContent = existing.some(r=>isDuplicateLocalRentri(l, r))
    if (!duplicateByKey && !duplicateByContent) toSend++
  }
  )
  // silent summary
  if (DRY_RUN){
    console.log('Multy: DRY_RUN attivo, non invio. Fine.')
    return
  }
  if (existing.length>0 && toSend === totalLocal){ throw new Error('Possibile fallimento filtro duplicati') }
  if (toSend > 0){
    console.log(`Multy: Invio massivo tra 3s... (auto conferma)`)
    await sleep(3000)
  }
  let processedM = 0
  for (const mov of base){
    if (existsSync('out/guard.pause')) { console.log('Guard: pausa invii per low_acceptance, attendo 60s'); await sleep(60_000) }
    const key = `${mov.anno}_${normInt(mov.progressivo)}`
    if (existingKeysM.has(key) || blacklist.has(key)){ skipped++; processedM++; if (processedM%1000===0) console.log(`Multy: Processati ${processedM}... Inviati ${sent}`); continue }
    const duplicateByContent = existing.some(r=>isDuplicateLocalRentri(mov, r))
    const firLocal = getFir(mov)
    if (duplicateByContent && (!firLocal || !firLocal.trim() || existingFirs.has(firLocal.trim().toUpperCase()))){ skipped++; processedM++; if (processedM%1000===0) console.log(`Multy: Processati ${processedM}... Inviati ${sent}`); continue }
    const sigLocal = localSignature(mov); const sigFuzzy = localSignatureFuzzy(mov)
    if ((sigLocal && existingSignatures.has(sigLocal)) || (sigFuzzy && existingSignatures.has(sigFuzzy))) { skipped++; processedM++; if (processedM%1000===0) console.log(`Multy: Processati ${processedM}... Inviati ${sent}`); continue }
    const one = buildPayloadMinimal(mov, true)
    const eerOk = typeof one?.rifiuto?.codice_eer === 'string' && /^[0-9]{6}$/.test(one.rifiuto.codice_eer)
    const qOk = Number(one?.rifiuto?.quantita?.valore||0) > 0
    const umOk = String(one?.rifiuto?.quantita?.unita_misura||'').toLowerCase()==='kg' || String(one?.rifiuto?.quantita?.unita_misura||'').toLowerCase()==='l'
    if (!eerOk){ skipped++; processedM++; if (processedM%1000===0) console.log(`Multy: Processati ${processedM}... Inviati ${sent}`); continue }
    if (!qOk){ skipped++; processedM++; if (processedM%1000===0) console.log(`Multy: Processati ${processedM}... Inviati ${sent}`); continue }
    if (!umOk){ skipped++; processedM++; if (processedM%1000===0) console.log(`Multy: Processati ${processedM}... Inviati ${sent}`); continue }
    const payload = [one]
    const sentRes = await sendOne(MULTY.registryId, MULTY.filename, MULTY.issuer, payload)
    sent++
    logLine({ kind:'SEND', registryId:MULTY.registryId, status: sentRes.status, transazioneId: sentRes.transazioneId, key })
    if (sentRes.status === 202 && sentRes.transazioneId){
      const bodyStr = await checkResult(MULTY.registryId, sentRes.transazioneId, MULTY.filename, MULTY.issuer)
      const acc = countAccepted(bodyStr)
      accepted += acc
      logLine({ kind:'RESULT', registryId:MULTY.registryId, transazioneId: sentRes.transazioneId, accepted: acc })
      const sigRentri = rentriSignature(payload[0]); const sigRentriF = rentriSignatureFuzzy(payload[0]); if (sigRentri) existingSignatures.add(sigRentri); if (sigRentriF) existingSignatures.add(sigRentriF)
    } else if (sentRes.status === 200) {
      const acc = countAccepted(sentRes.dataStr)
      accepted += acc
      logLine({ kind:'RESULT', registryId:MULTY.registryId, transazioneId: sentRes.transazioneId, accepted: acc })
      const sigRentri = rentriSignature(payload[0]); const sigRentriF = rentriSignatureFuzzy(payload[0]); if (sigRentri) existingSignatures.add(sigRentri); if (sigRentriF) existingSignatures.add(sigRentriF)
    } else if (sentRes.status >= 400) {
      let isDup=false
      let isVal=false
      try {
        const obj = JSON.parse(String(sentRes.dataStr||'{}'))
        const title = String(obj?.title||'')
        const msg = String(obj?.codice_messaggio||'')
        const det = String(obj?.detail||'')
        const ms = obj?.model_state
        if (ms && typeof ms === 'object') isVal = true
        const all = `${title} ${msg} ${det}`.toLowerCase()
        if (all.includes('duplic') || all.includes('movimentoduplicatodatabase')) isDup=true
      } catch {}
      if (isDup) { consecutiveErrors = 0 }
      else if (isVal) {
        const mov2 = { ...mov, __isMulty: true }
        const repaired = repairPayload(payload[0], mov2)
        const res2 = await sendOne(MULTY.registryId, MULTY.filename, MULTY.issuer, [repaired])
        // silent repair send
        if (res2.status === 202 && res2.transazioneId){
          const bodyStr2 = await checkResult(MULTY.registryId, res2.transazioneId, MULTY.filename, MULTY.issuer)
          const acc2 = countAccepted(bodyStr2)
          accepted += acc2
          logLine({ kind:'RESULT', registryId:MULTY.registryId, transazioneId: res2.transazioneId, accepted: acc2 })
        } else if (res2.status === 200) {
          const acc2 = countAccepted(res2.dataStr)
          accepted += acc2
          logLine({ kind:'RESULT', registryId:MULTY.registryId, transazioneId: res2.transazioneId, accepted: acc2 })
        } else {
          // silent skip
        }
        consecutiveErrors = 0
      }
      else {
        consecutiveErrors++
        if (consecutiveErrors > MAX_CONSECUTIVE_ERRORS) { console.log(`Multy: Errori consecutivi > ${MAX_CONSECUTIVE_ERRORS}, arresto per sicurezza`); break }
      }
    } else {
      consecutiveErrors = 0
    }
    processedM++
    if (processedM%1000===0) console.log(`Multy: Processati ${processedM}... Inviati ${sent}`)
    await sleep(DELAY_MS)
  }
  console.log(`Multy: Inviati=${sent}, Accettati=${accepted}`)
}

async function main(){
  await processGlobal()
  await processMulty()
}

main()
