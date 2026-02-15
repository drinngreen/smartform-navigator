import { readFileSync } from 'fs'
import axios from 'axios'
import { buildMovimentiFromXml } from './rentriClient.ts'

type Item = { registryId:string, filename:string, issuer:string, url:string, payload:string, transazioneId?:string, accepted?:number, duplicates?:number }
type Job = { id:string, items:Item[], startedAt:number }

const JOBS:Record<string,Job>={}
function chunk<T>(arr:T[], size:number){ const out:T[][]=[]; for(let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size)); return out }

export async function startBulkXml(batch:number=200){
  const build=(xmlPath:string, registryId:string, filename:string, issuer:string)=>{
    const xml = readFileSync(xmlPath,'utf-8')
    const list = buildMovimentiFromXml(xml)
    const url = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${registryId}/movimenti`
    return chunk(list, batch).map(c=>({ registryId, filename, issuer, url, payload: JSON.stringify(c) }))
  }
  const items=[
    ...build('test/global-reco_6000.xml.xml','R6QSWHZ6HJV','certificato.p12','08934760961'),
    ...build('test/multy-proget_6000.xml.xml','RQEL39R7NS0','multyproget.p12','12347770013')
  ]
  const id = Math.random().toString(36).slice(2)
  JOBS[id] = { id, items, startedAt: Date.now() }
  ;(async()=>{
    for (const it of items){
      try {
        const r = await axios.post('http://localhost:8765/send-registrazioni', { url: it.url, payload: it.payload, filename: it.filename, issuer: it.issuer })
        let tid=''; try { const d = JSON.parse(String(r.data?.data||'{}')); tid = String(d.transazione_id||'') } catch {}
        it.transazioneId = tid
        if (tid){
          try {
            const c = await axios.post('http://localhost:8765/check-transazione', { registryId: it.registryId, transazioneId: tid, filename: it.filename, issuer: it.issuer })
            const body = String(c.data?.data||'')
            let acc=0, dup=0
            try {
              const m = JSON.parse(body)
              const esito = m?.esito
              if (Array.isArray(esito?.numero_registrazioni)) acc = esito.numero_registrazioni.length
              if (Array.isArray(m?.validazione)) dup = m.validazione.filter((v:any)=>String(v?.codice_messaggio||'').includes('movimentoDuplicatoDatabase')).length
            } catch {}
            it.accepted = acc; it.duplicates = dup
          } catch {}
        }
      } catch {}
    }
  })()
  return id
}

export function getBulkStatus(id:string){
  const j = JOBS[id]
  if (!j) return null
  const items = j.items
  const totalAccepted = items.reduce((a,b)=>a+(b.accepted||0),0)
  const totalDuplicates = items.reduce((a,b)=>a+(b.duplicates||0),0)
  return { id, totals: { accepted: totalAccepted, duplicates: totalDuplicates }, items: items.map(it=>({ registryId: it.registryId, transazioneId: it.transazioneId, accepted: it.accepted||0, duplicates: it.duplicates||0 })) }
}

