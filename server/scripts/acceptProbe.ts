import axios from 'axios'
import { appendFileSync, existsSync, mkdirSync } from 'fs'

type Head = any

function sleep(ms:number){ return new Promise(res=>setTimeout(res, ms)) }
function ensureOut(){ if (!existsSync('out')) mkdirSync('out') }
function log(e:any){ try { ensureOut(); appendFileSync('out/stream-log.jsonl', JSON.stringify(e)+'\n') } catch {} }

async function list(registryId:string, filename:string, issuer?:string, type:'movimenti'|'registrazioni'='movimenti', limit=50){
  const body = { registryId, filename, issuer, limit, order: 'desc' }
  const url = type==='movimenti' ? 'http://localhost:8765/list-movimenti' : 'http://localhost:8765/list-registrazioni'
  const res = await axios.post(url, body)
  let arr:Head[]=[]
  try { arr = JSON.parse(String(res.data?.data||'[]')) } catch {}
  return arr
}
async function suggest(registryId:string, filename:string){
  try { const s = await axios.post('http://localhost:8765/suggest-next', { registryId, filename }) ; return s.data?.data || {} } catch { return {} }
}
function computeNext(list:Head[]){
  if (!Array.isArray(list)) return '1'
  let max = 0
  for (const h of (list||[])){
    const p = parseInt(String(h?.riferimenti?.numero_registrazione?.progressivo||h?.numero_registrazione?.progressivo||'0').replace(/[^0-9]/g,''),10)
    if (!isNaN(p)) max = Math.max(max, p)
  }
  return (max+1).toString()
}
function padLike(base:string, n:number){
  const digits = base.replace(/[^0-9]/g,'')
  const pad = Math.max(digits.length, 7)
  return String(n).padStart(pad,'0')
}
function build(h:Head, sugg:any, filename:string, progressivo:string){
  const caus = String(h?.riferimenti?.causale_operazione||'RE')
  const isMulty = filename==='multyproget.p12'
  const m:any = {
    riferimenti: {
      numero_registrazione: { anno: Number(sugg?.anno||new Date().getFullYear()), progressivo },
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

function buildMinimal(sugg:any, progressivo:string){
  return {
    riferimenti: {
      numero_registrazione: { anno: Number(sugg?.anno||new Date().getFullYear()), progressivo },
      data_ora_registrazione: String(sugg?.date||new Date().toISOString().slice(0,10)+'T12:00:00Z'),
      causale_operazione: 'RE'
    }
  }
}
async function tryCombination(registryId:string, filename:string, issuer:string, endpoint:'movimenti'|'registrazioni', payloadVariant:'fromHead'|'minimal'){
  const listMov = await list(registryId, filename, issuer, 'movimenti', 50)
  const baseHead = listMov[0] || (await list(registryId, filename, issuer, 'registrazioni', 50))[0]
  const sugg = await suggest(registryId, filename)
  const nextNum = computeNext(listMov.length>0?listMov:await list(registryId, filename, issuer, 'registrazioni', 50))
  const progressivo = String(parseInt(nextNum,10))
  const model = payloadVariant==='fromHead' && baseHead ? build(baseHead, sugg, filename, progressivo) : buildMinimal(sugg, progressivo)
  const payload = JSON.stringify([model])
  const url = endpoint==='movimenti'
    ? `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${registryId}/movimenti`
    : `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${registryId}/registrazioni`
  const sendPath = endpoint==='movimenti' ? 'http://localhost:8765/send-rentri' : 'http://localhost:8765/send-registrazioni'
  const res = await axios.post(sendPath, { url, payload, filename, issuer, replyTo: 'https://localhost:443/rentri-callback' })
  const status = Number(res.data?.status||0)
  if (status !== 202) { log({ ts: Date.now(), registryId, filename, endpoint, http: status, accepted:0, duplicates:0, errore:true }); return { ok:false, http: status } }
  let tid = ''
  try { const b = JSON.parse(res.data?.data || '{}'); tid = b?.transazione_id || '' } catch {}
  for (let i=0;i<20;i++){
    const chk = await axios.post('http://localhost:8765/check-status', { api: 'dati-registri', transazioneId: tid, filename, issuer })
    try {
      if (chk.data?.success && Number(chk.data?.status)===200) {
        const body = JSON.parse(String(chk.data?.data||'{}'))
        const es = body?.esito
        let acc = 0, dup = 0
        if (es && Array.isArray(es.numero_registrazioni)) acc = es.numero_registrazioni.length
        if (Array.isArray(body?.validazione)) dup = body.validazione.filter((v:any)=>String(v?.codice_messaggio||'').includes('movimentoDuplicatoDatabase')).length
        log({ ts: Date.now(), registryId, filename, endpoint, count:1, accepted: acc, duplicates: dup, errore: !!body?.errore })
        if (acc>0) {
          for (let k=0;k<10;k++){
            const lr = await list(registryId, filename, issuer, 'registrazioni', 50)
            const found = lr.find(el=>{
              const nr = el.numero_registrazione || el?.riferimenti?.numero_registrazione || {}
              const pr = typeof nr.progressivo === 'string' ? nr.progressivo : (typeof nr.progressivo === 'number' ? String(nr.progressivo) : '')
              return pr && pr.replace(/[^0-9]/g,'') === progressivo.replace(/[^0-9]/g,'')
            })
            if (found) return { ok:true, progressivo, endpoint, issuer }
            await sleep(1500)
          }
          return { ok:false, reason:'not_materialized' }
        }
        if (dup>0) return { ok:false, reason:'duplicate' }
      }
    } catch {}
    await sleep(1500)
  }
  return { ok:false, reason:'timeout' }
}

async function runForRegistry(registryId:string, filename:string){
  const issuerVariants = filename==='multyproget.p12'
    ? [undefined as any,'12347770013']
    : [undefined as any,'08934760961']
  const endpoints:'movimenti'|'registrazioni'[] = ['movimenti','registrazioni']
  const payloads:('fromHead'|'minimal')[] = ['fromHead','minimal']
  for (const ep of endpoints){
    for (const pv of payloads){
      for (const iss of issuerVariants){
        const r = await tryCombination(registryId, filename, iss, ep, pv)
        if (r.ok) return { ok:true, result:r }
      }
    }
  }
  return { ok:false }
}

async function main(){
  const g = await runForRegistry('R6QSWHZ6HJV','certificato.p12')
  const m = await runForRegistry('RQEL39R7NS0','multyproget.p12')
  console.log(JSON.stringify({ global: g, multy: m }))
}

main()
