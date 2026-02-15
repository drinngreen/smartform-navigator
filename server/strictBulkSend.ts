import { readFileSync } from 'fs'
import axios from 'axios'
import { buildMovimentiFromXml } from './rentriClient'

function chunk<T>(arr:T[], size:number){ const out:T[][]=[]; for(let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size)); return out }
function onlyDigits(s:string){ return (s||'').replace(/[^0-9]/g,'') }
function incProg(p:string){ const d = onlyDigits(p); const w = d.length || 7; return (parseInt(d||'0')+1).toString().padStart(w,'0') }
async function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)) }

async function suggestNext(registryId:string, filename:string, issuer:string){
  const body = { registryId, filename, issuer, limit: 1, order: 'desc' }
  const res = await axios.post('http://localhost:8765/suggest-next', body)
  const d = res.data?.data
  return { date: String(d?.date||new Date().toISOString().slice(0,10)), anno: Number(d?.anno||new Date().getFullYear()), progressivo: String(d?.progressivo||'0000001') }
}

async function sendBatch(url:string, payload:any[], filename:string, issuer:string){
  const res = await axios.post('http://localhost:8765/send-registrazioni', { url, payload: JSON.stringify(payload), filename, issuer })
  const status = Number(res.data?.status||0)
  let transazioneId = ''
  try { const d = JSON.parse(String(res.data?.data||'{}')); transazioneId = String(d?.transazione_id||'') } catch {}
  return { status, transazioneId, raw: String(res.data?.data||'') }
}

async function checkTransazione(registryId:string, transazioneId:string, filename:string, issuer:string){
  for (let i=0;i<90;i++){
    try {
      const res = await axios.post('http://localhost:8765/check-transazione', { registryId, transazioneId, filename, issuer })
      const body = String(res.data?.data||'')
      if (res.data?.success && body.length > 0) return body
    } catch {}
    await sleep(2000)
  }
  return ''
}

function parseAccepted(bodyStr:string){ try { const m = JSON.parse(bodyStr); const arr = Array.isArray(m?.esito?.numero_registrazioni) ? m.esito.numero_registrazioni : []; return arr.length } catch { return 0 } }
function parseDuplicates(bodyStr:string){ try { const m = JSON.parse(bodyStr); const v = Array.isArray(m?.validazione) ? m.validazione : []; return v.filter((x:any)=>String(x?.codice_messaggio||'').includes('movimentoDuplicatoDatabase')).length } catch { return 0 } }

async function getLastActors(registryId:string, filename:string, issuer:string){
  try {
    const res = await axios.post('http://localhost:8765/list-movimenti', { registryId, filename, issuer, limit: 1, order: 'desc' })
    const raw = String(res.data?.data||'[]')
    const arr = JSON.parse(raw)
    const el = Array.isArray(arr) ? arr[0] : null
    const prod = el?.produttore || el?.riferimenti?.produttore || null
    const tras = el?.trasportatore || el?.riferimenti?.trasportatore || null
    const dest = el?.destinatario || el?.riferimenti?.destinatario || null
    return { prod, tras, dest }
  } catch { return { prod:null, tras:null, dest:null } }
}
function ensureActors(m:any, issuer:string, actors:{prod:any,tras:any,dest:any}){
  const out:any = { ...m }
  out.rifiuto = out.rifiuto || {}
  out.rifiuto.stato_fisico = out.rifiuto.stato_fisico || 'S'
  out.rifiuto.quantita = out.rifiuto.quantita || { valore: 1.0, unita_misura: 'kg' }
  const isCarico = String((out.riferimenti?.causale_operazione||'')).toUpperCase()==='RE'
  if (isCarico) { out.rifiuto.provenienza = out.rifiuto.provenienza || 'U' } else { out.rifiuto.destinato_attivita = out.rifiuto.destinato_attivita || 'R13' }
  const p = actors.prod || {}
  const t = actors.tras || {}
  const d = actors.dest || {}
  out.produttore = {
    denominazione: String((out.produttore?.denominazione || p.denominazione || 'ND')),
    codice_fiscale: String((out.produttore?.codice_fiscale || p.codice_fiscale || issuer)),
    indirizzo: String((out.produttore?.indirizzo || p.indirizzo || 'ND'))
  }
  out.trasportatore = {
    denominazione: String((out.trasportatore?.denominazione || t.denominazione || 'ND')),
    codice_fiscale: String((out.trasportatore?.codice_fiscale || t.codice_fiscale || '00000000000')),
    num_iscrizione_albo: String((out.trasportatore?.num_iscrizione_albo || t.num_iscrizione_albo || 'ND'))
  }
  out.destinatario = {
    denominazione: String((out.destinatario?.denominazione || d.denominazione || 'ND')),
    codice_fiscale: String((out.destinatario?.codice_fiscale || d.codice_fiscale || '00000000000')),
    num_autorizzazione: String((out.destinatario?.num_autorizzazione || d.num_autorizzazione || 'ND'))
  }
  return out
}

async function runOne(xmlPath:string, registryId:string, filename:string, issuer:string, batch:number){
  const xml = readFileSync(xmlPath,'utf-8')
  const base = buildMovimentiFromXml(xml)
  const start = await suggestNext(registryId, filename, issuer)
  let prog = start.progressivo
  const anno = start.anno
  const date = start.date
  const actors = await getLastActors(registryId, filename, issuer)
  const remappedRaw = base.map(m=>({
    ...m,
    riferimenti: { ...m.riferimenti, numero_registrazione: { anno, progressivo: prog = incProg(prog) }, data_ora_registrazione: date+'T12:00:00Z' }
  }))
  const remapped = remappedRaw.map(m=>ensureActors(m, issuer, actors))
  const url = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${registryId}/movimenti`
  let submitted=0, accepted=0, duplicates=0
  for (const c of chunk(remapped, batch)){
    const s = await sendBatch(url, c, filename, issuer)
    submitted += c.length
    if (s.transazioneId){
      const body = await checkTransazione(registryId, s.transazioneId, filename, issuer)
      accepted += parseAccepted(body)
      duplicates += parseDuplicates(body)
    } else if (s.status === 200){
      accepted += parseAccepted(s.raw)
      duplicates += parseDuplicates(s.raw)
    }
  }
  const missing = Math.max(0, remapped.length - accepted)
  return { xmlPath, registryId, submitted, accepted, duplicates, missing }
}

async function main(){
  const g = await runOne('test/global-reco_6000.xml.xml','R6QSWHZ6HJV','certificato.p12','08934760961',200)
  const m = await runOne('test/multy-proget_6000.xml.xml','RQEL39R7NS0','multyproget.p12','12347770013',200)
  console.log(JSON.stringify({ global: g, multy: m }, null, 2))
}

main()
