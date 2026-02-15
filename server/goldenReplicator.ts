// @ts-nocheck
import axios from 'axios'
import { appendFileSync, existsSync, mkdirSync } from 'fs'

type Head = any

async function suggest(registryId:string, filename:string){
  try { const s = await axios.post('http://localhost:8765/suggest-next', { registryId, filename }) ; return s.data?.data || {} } catch { return {} }
}
async function head(registryId:string, filename:string, issuer?:string){
  const body = { registryId, filename, issuer, limit: 200, order: 'desc' }
  const res = await axios.post('http://localhost:8765/list-movimenti', body)
  let arr:Head[]=[]
  try { arr = JSON.parse(String(res.data?.data||'[]')) } catch {}
  return (Array.isArray(arr) && arr.length>0) ? arr[0] : null
}

function computeNextFromList(list:Head[]){
  let max = 0
  for (const h of (list||[])){
    const p = parseInt(String(h?.riferimenti?.numero_registrazione?.progressivo||'0').replace(/[^0-9]/g,''),10)
    if (!isNaN(p)) max = Math.max(max, p)
  }
  return (max+1).toString()
}

function buildFromHead(h:Head, sugg:any, filename:string){
  const caus = String(h?.riferimenti?.causale_operazione||'RE')
  const isMulty = filename==='multyproget.p12'
  const rawSugg = String(sugg?.progressivo||'')
  const headProgDigits = String(h?.riferimenti?.numero_registrazione?.progressivo||'0').replace(/[^0-9]/g,'')
  const nextFromHead = (parseInt(headProgDigits||'0',10)+1).toString()
  const nextProg = rawSugg ? String(rawSugg).replace(/[^0-9]/g,'') : nextFromHead
  const m:any = {
    riferimenti: {
      numero_registrazione: { anno: Number(sugg?.anno||new Date().getFullYear()), progressivo: nextProg },
      data_ora_registrazione: String(sugg?.date||new Date().toISOString().slice(0,10)+'T12:00:00Z'),
      causale_operazione: caus
    },
    rifiuto: {
      codice_eer: String(h?.rifiuto?.codice_eer||'170407').replace(/\s+/g,''),
      stato_fisico: String(h?.rifiuto?.stato_fisico||'S'),
      quantita: { valore: Number(h?.rifiuto?.quantita?.valore??0), unita_misura: String(h?.rifiuto?.quantita?.unita_misura||'kg') },
      ...(caus==='RE' ? { provenienza: String(h?.rifiuto?.provenienza||'U') } : { destinato_attivita: String(h?.rifiuto?.destinato_attivita||'R13') })
    },
    annotazioni: String(h?.annotazioni||'')
  }
  if (isMulty) {
    if (h?.produttore) m.produttore = h.produttore
    if (h?.trasportatore) m.trasportatore = h.trasportatore
    if (h?.destinatario) m.destinatario = h.destinatario
    if (h?.integrazione_fir) m.integrazione_fir = h.integrazione_fir
    m.intermediario = { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' }
    m.intermediari = [ { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' } ]
  }
  return m
}

function ensureOut(){ if (!existsSync('out')) mkdirSync('out') }
function parseAcceptedFlexible(bodyStr:string){
  try {
    const m = JSON.parse(bodyStr)
    const es = m?.esito || {}
    if (Array.isArray(es.numero_registrazioni)) return es.numero_registrazioni.length
    if (typeof es.numero_registrazioni === 'number') return es.numero_registrazioni
    if (es.numero_registrazioni && typeof es.numero_registrazioni === 'object') return Object.keys(es.numero_registrazioni).length
    if (typeof es.totale_registrazioni_accettate === 'number') return es.totale_registrazioni_accettate
    if (typeof es.numero_registrazioni_accettate === 'number') return es.numero_registrazioni_accettate
    return 0
  } catch { return 0 }
}
function parseDuplicates(bodyStr:string){
  try {
    const m = JSON.parse(bodyStr)
    const v = Array.isArray(m?.validazione) ? m.validazione : []
    return v.filter((x:any)=>{ const c = String(x?.codice_messaggio||''); return c.includes('movimentoDuplicatoDatabase') || c.toUpperCase().includes('DUPLICATO') }).length
  } catch { return 0 }
}

async function sendOne(registryId:string, filename:string){
  const issuer = filename==='multyproget.p12'?'12347770013':'08934760961'
  const sugg = await suggest(registryId, filename)
  const resList = await axios.post('http://localhost:8765/list-movimenti', { registryId, filename, issuer, limit: 200, order: 'desc' })
  let arr:Head[]=[]
  try { arr = JSON.parse(String(resList.data?.data||'[]')) } catch {}
  const h = (Array.isArray(arr) && arr.length>0) ? arr[0] : null
  if (!h) { console.log(JSON.stringify({ registryId, ok:false, reason:'no_head' })); return }
  const m = buildFromHead(h, { ...sugg, progressivo: computeNextFromList(arr) }, filename)
  const url = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${registryId}/movimenti`
  const res = await axios.post('http://localhost:8765/send-rentri', { url, payload: JSON.stringify([m]), filename, issuer, replyTo: 'https://localhost:443/rentri-callback' })
  const status = Number(res.data?.status||0)
  if (status !== 202) { console.log(JSON.stringify({ registryId, ok:false, status })); return }
  let tid = ''
  try { const b = JSON.parse(res.data?.data || '{}'); tid = b?.transazione_id || '' } catch {}
  const chk = await axios.post('http://localhost:8765/check-status', { api: 'dati-registri', transazioneId: tid, filename, issuer })
  let ok = false
  let details:any = {}
  try { if (chk.data?.success && Number(chk.data?.status)===200) { const body = JSON.parse(String(chk.data?.data||'{}')); ok = body && body.errore===false; details = { errore: body?.errore, validazione: body?.validazione } } } catch {}
  console.log(JSON.stringify({ registryId, ok, details }))
  try {
    ensureOut()
    const body = String(chk.data?.data||'{}')
    const accepted = parseAcceptedFlexible(body)
    const duplicates = parseDuplicates(body)
    const log = { ts: Date.now(), registryId, filename, count: 1, accepted, duplicates, errore: details?.errore===true, codes: Array.isArray(details?.validazione)?details.validazione.map((v:any)=>String(v?.codice_messaggio||'')):[] }
    appendFileSync('out/stream-log.jsonl', JSON.stringify(log)+'\n')
  } catch {}
}

export async function runOnce(){
  await Promise.all([
    sendOne('R6QSWHZ6HJV','certificato.p12'),
    sendOne('RQEL39R7NS0','multyproget.p12')
  ])
}

async function main(){
  await runOnce()
}

main()
