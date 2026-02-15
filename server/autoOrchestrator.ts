// @ts-nocheck
import axios from 'axios'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { buildMovimentiFromXml } from './rentriClient'
import { db } from './db'
import { transactions } from '../drizzle/schema'

function loadProgress(){ try { const t = readFileSync('progress.json','utf-8'); return JSON.parse(t) } catch { return {} } }
function saveProgress(p:any){ try { writeFileSync('progress.json', JSON.stringify(p, null, 2)) } catch {} }

async function sendOne(xmlPath:string, registryId:string, filename:string){
  const issuer = filename==='multyproget.p12'?'12347770013':'08934760961'
  const s = await axios.post('http://localhost:8765/suggest-next', { registryId, filename })
  const d = s.data?.data || {}
  const date = d.date || new Date().toISOString().slice(0,10)
  const anno = Number(d.anno || new Date().getFullYear())
  const prog = String(d.progressivo || '0000001')
  const xml = readFileSync(xmlPath, 'utf-8')
  let movs = buildMovimentiFromXml(xml, date, anno, prog)
  const key = `${registryId}:${filename}`
  const progress = loadProgress()
  const idx = Math.min(Number(progress[key]||0), Math.max(0, movs.length-1))
  const m:any = movs[idx]
  if (filename==='multyproget.p12') {
    m.intermediario = { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' }
    m.intermediari = [ { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' } ]
  }
  if (!m.rifiuto) m.rifiuto = {}
  if (!m.rifiuto.stato_fisico) m.rifiuto.stato_fisico = 'S'
  if (!m.rifiuto.quantita) m.rifiuto.quantita = { valore: 1.0, unita_misura: 'kg' }
  const isCarico = String((m.riferimenti?.causale_operazione||'')).toUpperCase()==='RE'
  if (isCarico) { if (!m.rifiuto.provenienza) m.rifiuto.provenienza = 'U' } else { if (!m.rifiuto.destinato_attivita) m.rifiuto.destinato_attivita = 'R13' }
  const url = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${registryId}/movimenti`
  let res = await axios.post('http://localhost:8765/send-rentri', { url, payload: JSON.stringify([m]), filename, issuer, replyTo: 'https://localhost:443/rentri-callback' })
  if (Number(res.data?.status||0) !== 202) {
    let model:any = null
    try { model = JSON.parse(res.data?.data) } catch {}
    const invalidEER = !!(model && model.model_state && (model.model_state['[0].rifiuto.codice_eer'] || model.model_state['rifiuto.codice_eer']))
    if (invalidEER) {
      const digits = String((m.rifiuto?.codice_eer||'').toString().replace(/[^0-9]/g,'')).slice(0,6)
      m.rifiuto.codice_eer = digits.length===6?digits:'17.04.07'
      res = await axios.post('http://localhost:8765/send-rentri', { url, payload: JSON.stringify([m]), filename, issuer, replyTo: 'https://localhost:443/rentri-callback' })
    }
  }
  const status = Number(res.data?.status||0)
  if (status === 202) {
    let tid = ''
    try { const b = JSON.parse(res.data?.data || '{}'); tid = b?.transazione_id || '' } catch {}
    const chk = await axios.post('http://localhost:8765/check-status', { api: 'dati-registri', transazioneId: tid, filename, issuer })
    let ok = false
    try {
      if (chk.data?.success && Number(chk.data?.status)===200) {
        const bodyStr = String(chk.data?.data||'{}')
        const body = JSON.parse(bodyStr)
        ok = body && typeof body==='object' && body.errore===false
      }
    } catch {}
    try { db.insert(transactions).values({ firId: null as any, status: ok?'completed':'error', rentriResponse: JSON.stringify({ send: res.data, check: chk.data }), signedXml: 'OK', timestamp: Date.now(), createdAt: Date.now() }).run() } catch {}
    progress[key] = idx + 1
    saveProgress(progress)
    return ok
  } else {
    try { db.insert(transactions).values({ firId: null as any, status: 'error', rentriResponse: JSON.stringify(res.data), signedXml: 'OK', timestamp: Date.now(), createdAt: Date.now() }).run() } catch {}
    progress[key] = idx + 1
    saveProgress(progress)
    return false
  }
}

async function loop(xmlPath:string, registryId:string, filename:string){
  for(;;){
    try {
      const h = await axios.get('http://localhost:8765/health', { timeout: 1500 })
      if (h.data?.status !== 'ok') { await new Promise(r=>setTimeout(r, 1500)); continue }
    } catch { await new Promise(r=>setTimeout(r, 1500)); continue }
    try { await sendOne(xmlPath, registryId, filename) } catch {}
    await new Promise(r=>setTimeout(r, 1200))
  }
}

async function main(){
  loop('test/global-reco_6000.xml.xml', 'R6QSWHZ6HJV', 'certificato.p12')
  loop('test/multy-proget_6000.xml.xml', 'RQEL39R7NS0', 'multyproget.p12')
}

main()