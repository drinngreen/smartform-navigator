import axios from 'axios'
import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'fs'
import { XMLParser } from 'fast-xml-parser'

type Head = any

const BRIDGE = 'http://localhost:8765'
const DELAY_MS = 250
const BATCH_SIZE = 200
const GLOBAL = { registryId: 'R6QSWHZ6HJV', filename: 'certificato.p12', issuer: '08934760961' }
const MULTY  = { registryId: 'RQEL39R7NS0', filename: 'multyproget.p12', issuer: '12347770013' }
const GLOBAL_XML = 'test/registro Global Reco al 2412.xml'
const MULTY_XML  = 'test/registro Multyproget al2412.xml'

function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)) }
function ensureLog(){ if (!existsSync('out')) mkdirSync('out') }
function logLine(obj:any){ try { ensureLog(); appendFileSync('out/invio_massivo.log', JSON.stringify(obj)+'\n') } catch {} }
function normInt(x:any){ const s = String(x||'').replace(/[^0-9]/g,''); const n = parseInt(s||'0',10); return isNaN(n)?0:n }
function dateOnly(s:string){ const d = String(s||''); return d.includes('T')?d.split('T')[0]:d }

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
  for(let i=0;i<30;i++){
    const body = { registryId, transazioneId, filename, issuer }
    const res = await axios.post(`${BRIDGE}/check-transazione`, body)
    const ok = res.data?.success === true
    const bodyStr = String(res.data?.data || '')
    if (ok && bodyStr.length > 0) return bodyStr
    await sleep(2000)
  }
  return ''
}
function countAccepted(bodyStr:string){
  try { const m = JSON.parse(bodyStr); const esito = m?.esito; const arr = Array.isArray(esito?.numero_registrazioni) ? esito.numero_registrazioni : []; return arr.length } catch { return 0 }
}

async function main(){
  const xmlG = readFileSync(GLOBAL_XML, 'utf-8')
  const xmlM = readFileSync(MULTY_XML, 'utf-8')
  const yearG = parseRegistroAnno(xmlG)
  const yearM = parseRegistroAnno(xmlM)
  const baseG = parseRegistroXml(xmlG)
  const baseM = parseRegistroXml(xmlM)
  let idxG = 0, idxM = 0
  const existingG = await listMovimenti(GLOBAL.registryId, GLOBAL.filename, GLOBAL.issuer, 10000)
  const existingM = await listMovimenti(MULTY.registryId, MULTY.filename, MULTY.issuer, 10000)
  let maxProgG = 0, maxProgM = 0
  for (const el of existingG){ const {anno,progressivo}=extractAnnoProg(el); if (anno===yearG && typeof progressivo === 'number') maxProgG = Math.max(maxProgG, progressivo) }
  for (const el of existingM){ const {anno,progressivo}=extractAnnoProg(el); if (anno===yearM && typeof progressivo === 'number') maxProgM = Math.max(maxProgM, progressivo) }
  console.log(`Start alternate mass: Global year=${yearG} max=${maxProgG}, Multy year=${yearM} max=${maxProgM}`)
  let consecutiveErrG = 0, consecutiveErrM = 0
  while (idxG < baseG.length || idxM < baseM.length){
    if (existsSync('out/guard.pause')) { console.log('Guard: pausa 60s'); await sleep(60000) }
    if (idxG < baseG.length){
      const slice = baseG.slice(idxG, Math.min(idxG + BATCH_SIZE, baseG.length))
      idxG += slice.length
      const payload = slice.map((mov, i)=>{
        const p = buildPayloadMinimal(mov, false)
        const prog = String(maxProgG + i + 1).padStart(7,'0')
        p.riferimenti.numero_registrazione.anno = yearG
        p.riferimenti.numero_registrazione.progressivo = prog
        return p
      })
      maxProgG += slice.length
      const sentRes = await sendOne(GLOBAL.registryId, GLOBAL.filename, GLOBAL.issuer, payload)
      logLine({ kind:'SEND', registryId:GLOBAL.registryId, status: sentRes.status, transazioneId: sentRes.transazioneId, count: payload.length, last_progressivo: payload[payload.length-1].riferimenti.numero_registrazione.progressivo })
      if (sentRes.status === 202 && sentRes.transazioneId){
        const bodyStr = await checkResult(GLOBAL.registryId, sentRes.transazioneId, GLOBAL.filename, GLOBAL.issuer)
        const acc = countAccepted(bodyStr)
        if (acc > 0) consecutiveErrG = 0; else consecutiveErrG++
      } else if (sentRes.status >= 400){ consecutiveErrG++ } else { consecutiveErrG = 0 }
      if (consecutiveErrG > 5){ console.log('Global: Troppi errori consecutivi, stop'); break }
      await sleep(DELAY_MS)
    }
    if (idxM < baseM.length){
      if (existsSync('out/guard.pause')) { console.log('Guard: pausa 60s'); await sleep(60000) }
      const slice = baseM.slice(idxM, Math.min(idxM + BATCH_SIZE, baseM.length))
      idxM += slice.length
      const payload = slice.map((mov, i)=>{
        const p = buildPayloadMinimal(mov, true)
        const prog = String(maxProgM + i + 1).padStart(7,'0')
        p.riferimenti.numero_registrazione.anno = yearM
        p.riferimenti.numero_registrazione.progressivo = prog
        return p
      })
      maxProgM += slice.length
      const sentRes = await sendOne(MULTY.registryId, MULTY.filename, MULTY.issuer, payload)
      logLine({ kind:'SEND', registryId:MULTY.registryId, status: sentRes.status, transazioneId: sentRes.transazioneId, count: payload.length, last_progressivo: payload[payload.length-1].riferimenti.numero_registrazione.progressivo })
      if (sentRes.status === 202 && sentRes.transazioneId){
        const bodyStr = await checkResult(MULTY.registryId, sentRes.transazioneId, MULTY.filename, MULTY.issuer)
        const acc = countAccepted(bodyStr)
        if (acc > 0) consecutiveErrM = 0; else consecutiveErrM++
      } else if (sentRes.status >= 400){ consecutiveErrM++ } else { consecutiveErrM = 0 }
      if (consecutiveErrM > 5){ console.log('Multy: Troppi errori consecutivi, stop'); break }
      await sleep(DELAY_MS)
    }
  }
  console.log(`Alternate mass completed: Global sent=${idxG}, Multy sent=${idxM}`)
}

main()
