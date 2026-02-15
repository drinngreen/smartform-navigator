import axios from 'axios'
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'

type Head = any

function sleep(ms:number){ return new Promise(res=>setTimeout(res, ms)) }

async function suggest(registryId:string, filename:string){
  try { const s = await axios.post('http://localhost:8765/suggest-next', { registryId, filename }) ; return s.data?.data || {} } catch { return {} }
}
async function listMovimenti(registryId:string, filename:string, issuer?:string, limit=200){
  const body = { registryId, filename, issuer, limit, order: 'desc' }
  const res = await axios.post('http://localhost:8765/list-movimenti', body)
  let arr:Head[]=[]
  try { arr = JSON.parse(String(res.data?.data||'[]')) } catch {}
  return arr
}
function computeNextFromList(list:Head[], year:number){
  let max = 0
  for (const h of (list||[])){
    const nr = h?.riferimenti?.numero_registrazione || h?.numero_registrazione || {}
    const a = typeof nr.anno === 'number' ? nr.anno : parseInt(String(nr.anno||''),10)
    const p = parseInt(String(nr?.progressivo||'0').replace(/[^0-9]/g,''),10)
    if (!isNaN(a) && !isNaN(p) && a===year) max = Math.max(max, p)
  }
  return (max+1).toString()
}
function padLike(s:string, n:number){
  const digits = String(s||'').replace(/[^0-9]/g,'')
  const pad = Math.max(digits.length, 7)
  return String(n).padStart(pad, '0')
}
function buildFromHead(h:Head, sugg:any, filename:string, progressivo:string){
  const caus = String(h?.riferimenti?.causale_operazione||'RE')
  const isMulty = filename==='multyproget.p12'
  const m:any = {
    riferimenti: {
      numero_registrazione: { anno: Number(sugg?.anno||new Date().getFullYear()), progressivo },
      data_ora_registrazione: String(sugg?.date||new Date().toISOString().slice(0,10)+'T00:00:00Z'),
      causale_operazione: caus
    },
    rifiuto: {
      codice_eer: String(h?.rifiuto?.codice_eer||'170405').replace(/\s+/g,''),
      stato_fisico: String(h?.rifiuto?.stato_fisico||'S'),
      quantita: { valore: Number(h?.rifiuto?.quantita?.valore??1), unita_misura: String(h?.rifiuto?.quantita?.unita_misura||'kg') },
      ...(caus==='RE' ? { provenienza: String(h?.rifiuto?.provenienza||'U') } : { destinato_attivita: String(h?.rifiuto?.destinato_attivita||'R13') })
    },
    annotazioni: 'Canary'
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

async function sendAndCheckOnce(registryId:string, filename:string){
  const issuer = filename==='multyproget.p12'?'12347770013':'08934760961'
  const sugg = await suggest(registryId, filename)
  const list = await listMovimenti(registryId, filename, issuer, 500)
  let head = list[0]
  if (!head) {
    try {
      const r = await axios.post('http://localhost:8765/list-registrazioni', { registryId, filename, issuer, limit: 50, order: 'desc' })
      const arr:any[] = JSON.parse(String(r.data?.data||'[]'))
      head = arr[0]
    } catch {}
  }
  if (!head) throw new Error('no_head')
  const year = Number(sugg?.anno||new Date().getFullYear())
  const next = computeNextFromList(list, year)
  const progressivo = padLike(String(head?.riferimenti?.numero_registrazione?.progressivo||'0000000'), parseInt(next||'1',10))
  const payload = JSON.stringify([buildFromHead(head, sugg, filename, progressivo)])
  const url = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${registryId}/movimenti`
  const res = await axios.post('http://localhost:8765/send-rentri', { url, payload, filename, issuer, replyTo: 'https://localhost:443/rentri-callback' })
  const status = Number(res.data?.status||0)
  if (status !== 202) return { ok:false, status, progressivo }
  let tid = ''
  try { const b = JSON.parse(res.data?.data || '{}'); tid = b?.transazione_id || '' } catch {}
  for (let i=0;i<30;i++){
    const chk = await axios.post('http://localhost:8765/check-status', { api: 'dati-registri', transazioneId: tid, filename, issuer })
    try {
      if (chk.data?.success && Number(chk.data?.status)===200) {
        const body = JSON.parse(String(chk.data?.data||'{}'))
        const es = body?.esito
        let acc = 0, dup = 0
        if (es && Array.isArray(es.numero_registrazioni)) acc = es.numero_registrazioni.length
        if (Array.isArray(body?.validazione)) dup = body.validazione.filter((v:any)=>String(v?.codice_messaggio||'').includes('movimentoDuplicatoDatabase')).length
        if (!existsSync('out')) mkdirSync('out')
        const proofPath = `out/proof-${registryId}-${Date.now()}.json`
        writeFileSync(proofPath, JSON.stringify({ registryId, filename, issuer, transazioneId: tid, progressivo, status: chk.data?.status, body }, null, 2))
        if (acc>0) return { ok:true, progressivo, transazioneId: tid, proofPath }
        if (dup>0) return { ok:false, progressivo, duplicate:true }
      }
    } catch {}
    await sleep(2000)
  }
  return { ok:false, progressivo }
}

async function main(){
  const target = (process.argv[2]||'global').toLowerCase()
  const [registryId, filename] = target==='multy' ? ['RQEL39R7NS0','multyproget.p12'] : ['R6QSWHZ6HJV','certificato.p12']
  let attempt = 0
  while (true){
    attempt++
    const r = await sendAndCheckOnce(registryId, filename)
    if (r.ok){
      console.log(JSON.stringify({ attempt, status:'accepted', progressivo: r.progressivo }))
      break
    } else if ((r as any).duplicate){
      console.log(JSON.stringify({ attempt, status:'duplicate', progressivo: r.progressivo }))
    } else {
      console.log(JSON.stringify({ attempt, status:'retry', progressivo: r.progressivo, http: (r as any).status||0 }))
    }
    await sleep(5000)
  }
}

main()
