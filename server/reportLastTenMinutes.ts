import fs from 'fs'
import Database from 'better-sqlite3'

function now(){ return Date.now() }
function cutoff(ms:number){ return now() - ms }
function parseJson(s:string){ try { return JSON.parse(s) } catch { return null } }

function readLines(p:string){ try { return fs.readFileSync(p,'utf-8').trim().split(/\r?\n/) } catch { return [] } }

function fromTransactions(): any {
  const out:any = { total:0, byStatus:{}, http:{200:0,202:0,other:0}, accepted:0, duplicates:0, items:[] }
  let db: Database.Database | null = null
  try {
    db = new Database('local.db')
    const rows = db.prepare('SELECT id, status, rentri_response, timestamp FROM transactions WHERE timestamp >= ? ORDER BY timestamp DESC').all(cutoff(10*60*1000)) as any[]
    for (const r of rows){
      out.total++
      out.byStatus[r.status] = (out.byStatus[r.status]||0)+1
      let http:number|undefined, transazioneId:string|undefined, codes:string[]=[]
      const payload = typeof r.rentri_response==='string' ? parseJson(r.rentri_response) : r.rentri_response
      if (payload && typeof payload.status === 'number') http = payload.status
      if (payload && payload.send && typeof payload.send.status === 'number') http = payload.send.status
      const dataStr = payload?.send?.data || payload?.data
      const checkStr = payload?.check?.data
      const sendModel = parseJson(String(dataStr||'{}'))
      const checkModel = parseJson(String(checkStr||'{}'))
      transazioneId = sendModel?.transazione_id || undefined
      if (checkModel && Array.isArray(checkModel.validazione)) codes = checkModel.validazione.map((v:any)=>String(v?.codice_messaggio||''))
      const acceptedCount = (()=>{
        const es = checkModel?.esito || {}
        if (Array.isArray(es.numero_registrazioni)) return es.numero_registrazioni.length
        if (typeof es.totale_registrazioni_accettate === 'number') return es.totale_registrazioni_accettate
        if (typeof es.numero_registrazioni_accettate === 'number') return es.numero_registrazioni_accettate
        return 0
      })()
      const duplicatesCount = (()=> {
        const val = Array.isArray(checkModel?.validazione) ? checkModel.validazione : []
        return val.filter((v:any)=>String(v?.codice_messaggio||'').includes('movimentoDuplicatoDatabase') || String(v?.codice_messaggio||'').toUpperCase().includes('DUPLICATO')).length
      })()
      out.accepted += acceptedCount
      out.duplicates += duplicatesCount
      if (http === 200) out.http[200]++
      else if (http === 202) out.http[202]++
      else out.http.other++
      out.items.push({ id:r.id, status:r.status, http, transazioneId, accepted: acceptedCount, duplicates: duplicatesCount, timestamp: r.timestamp, codes })
      if (out.items.length>=50) break
    }
  } catch {
  } finally { if (db) db.close() }
  return out
}

function fromStreamLog(): any {
  const lines = readLines('out/stream-log.jsonl')
  const cut = cutoff(10*60*1000)
  const items = []
  let submitted=0, accepted=0, duplicates=0, errors=0
  for (const l of lines){
    const j = parseJson(l)
    if (!j || typeof j.ts!=='number') continue
    if (j.ts < cut) continue
    submitted += Number(j.count||0)
    accepted += Number(j.accepted||0)
    duplicates += Number(j.duplicates||0)
    if (j.errore) errors++
    items.push(j)
    if (items.length>=50) break
  }
  return { submitted, accepted, duplicates, errors, items }
}

function fromResendLog(): any {
  const lines = readLines('out/resend-log.jsonl')
  const last = lines.slice(-50).map(parseJson).filter(Boolean)
  let submitted=0, accepted=0, duplicates=0
  for (const j of last){ submitted += Number(j?.count||0); accepted += Number(j?.accepted||0); duplicates += Number(j?.duplicates||0) }
  return { submitted, accepted, duplicates, items: last }
}

function fromRemapLog(): any {
  const lines = readLines('out/remap-log.jsonl')
  const last = lines.slice(-50).map(parseJson).filter(Boolean)
  let submitted=0, accepted=0
  for (const j of last){ submitted += Number(j?.count||0); accepted += Number(j?.accepted||0) }
  return { submitted, accepted, items: last }
}

function main(){
  const tx = fromTransactions()
  const stream = fromStreamLog()
  const resend = fromResendLog()
  const remap = fromRemapLog()
  console.log(JSON.stringify({ windowMinutes:10, tx, stream, resend, remap }, null, 2))
}

main()
