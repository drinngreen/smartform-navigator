import axios from 'axios'

type Head = any

async function suggest(registryId:string, filename:string){
  try { const s = await axios.post('http://localhost:8765/suggest-next', { registryId, filename }) ; return s.data?.data || {} } catch { return {} }
}
async function listMovimenti(registryId:string, filename:string, issuer?:string, limit=50){
  const body = { registryId, filename, issuer, limit, order: 'desc' }
  const res = await axios.post('http://localhost:8765/list-movimenti', body)
  let arr:Head[]=[]
  try { arr = JSON.parse(String(res.data?.data||'[]')) } catch {}
  return arr
}
function computeNextFromList(list:Head[]){
  let max = 0
  for (const h of (list||[])){
    const p = parseInt(String(h?.riferimenti?.numero_registrazione?.progressivo||'0').replace(/[^0-9]/g,''),10)
    if (!isNaN(p)) max = Math.max(max, p)
  }
  return (max+1).toString()
}
function padLike(s:string, n:number){
  const digits = s.replace(/[^0-9]/g,'')
  const pad = Math.max(digits.length, n)
  return (parseInt(digits||'0',10)).toString().padStart(pad, '0')
}
function buildFromHead(h:Head, sugg:any, filename:string, progressivo:string){
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
function sleep(ms:number){ return new Promise(res=>setTimeout(res, ms)) }

async function sendAndCheck(registryId:string, filename:string){
  const issuer = filename==='multyproget.p12'?'12347770013':'08934760961'
  const sugg = await suggest(registryId, filename)
  const list = await listMovimenti(registryId, filename, issuer, 50)
  let head = list[0]
  if (!head) {
    try {
      const r = await axios.post('http://localhost:8765/list-registrazioni', { registryId, filename, issuer, limit: 50, order: 'desc' })
      const arr:any[] = JSON.parse(String(r.data?.data||'[]'))
      head = arr[0]
    } catch {}
  }
  if (!head) throw new Error('no_head')
  const next = computeNextFromList(list)
  const progressivo = padLike(String(head?.riferimenti?.numero_registrazione?.progressivo||'0000000'), parseInt(next||'1',10))
  const payload = JSON.stringify([buildFromHead(head, sugg, filename, progressivo)])
  const url = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${registryId}/movimenti`
  const res = await axios.post('http://localhost:8765/send-rentri', { url, payload, filename, issuer, replyTo: 'https://localhost:443/rentri-callback' })
  const status = Number(res.data?.status||0)
  if (status !== 202) return { ok:false, status, progressivo }
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
        if (acc>0) return { ok:true, progressivo, transazioneId: tid }
        if (dup>0) return { ok:false, progressivo, duplicate:true }
      }
    } catch {}
    await sleep(1500)
  }
  return { ok:false, progressivo }
}

async function confirmOnRegistrazioni(registryId:string, filename:string, progressivo:string){
  const issuer = filename==='multyproget.p12'?'12347770013':'08934760961'
  for (let i=0;i<30;i++){
    try {
      const r = await axios.post('http://localhost:8765/list-registrazioni', { registryId, filename, issuer, limit: 50, order: 'desc' })
      const arr:any[] = JSON.parse(String(r.data?.data||'[]'))
      const found = arr.find(el=>{
        const nr = el.numero_registrazione || el?.riferimenti?.numero_registrazione || {}
        const pr = typeof nr.progressivo === 'string' ? nr.progressivo : (typeof nr.progressivo === 'number' ? String(nr.progressivo) : '')
        return pr && pr.replace(/[^0-9]/g,'') === progressivo.replace(/[^0-9]/g,'')
      })
      if (found) return true
    } catch {}
    await sleep(2000)
  }
  return false
}

async function main(){
  const target = (process.argv[2]||'global').toLowerCase()
  const [registryId, filename] = target==='multy' ? ['RQEL39R7NS0','multyproget.p12'] : ['R6QSWHZ6HJV','certificato.p12']
  for (let attempt=1; attempt<=10; attempt++){
    const r = await sendAndCheck(registryId, filename)
    if (r.ok) {
      const ok = await confirmOnRegistrazioni(registryId, filename, r.progressivo)
      console.log(JSON.stringify({ attempt, status:'accepted', progressivo: r.progressivo, confirmed: ok }))
      return
    }
    if (r.duplicate) {
      console.log(JSON.stringify({ attempt, status:'duplicate', progressivo: r.progressivo }))
    } else {
      console.log(JSON.stringify({ attempt, status:'retry', progressivo: r.progressivo }))
    }
    await sleep(3000)
  }
  console.log(JSON.stringify({ status:'failed' }))
}

main()
