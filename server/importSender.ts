import axios from 'axios'
import { buildMovimentiFromXml } from './rentriClient'

type MassiveOptions = {
  companyP12: string
  registryId: string
  anno: number
  startProgressivo: string
  date: string
  ratePerMinute: number
  batchSize: number
}

export async function sendBatch(xmls: { id:number, xmlContent:string }[], opt: MassiveOptions){
  const arr:any[]=[]
  let prog = opt.startProgressivo
  const inc=(p:string,w:number)=>{const d=p.replace(/[^0-9]/g,''); const n=(parseInt(d||'0')+1).toString().padStart(w,'0'); return n}
  let width = prog.length
  try {
    const sBody = { registryId: opt.registryId, filename: opt.companyP12, issuer: undefined, limit: 1, order: 'desc' }
    const s = await axios.post('http://localhost:8765/suggest-next', sBody)
    const data = s.data?.data
    if (data?.progressivo) { width = String(data.progressivo).length; prog = String(data.progressivo) }
    prog = inc(prog, width)
  } catch {}
  for (const x of xmls){
    const movs = buildMovimentiFromXml(x.xmlContent, opt.date, opt.anno, prog)
    const m = movs[0]
    arr.push(m)
    prog = inc(prog, width)
  }
  const url = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${opt.registryId}/movimenti`
  const payload = JSON.stringify(arr)
  const body = { url, payload, filename: opt.companyP12, issuer: undefined, replyTo: 'https://localhost:443/rentri-callback' }
  const res = await axios.post('http://localhost:8765/send-registrazioni', body)
  let transazioneId = ''
  try { const payload = JSON.parse(res.data?.data || '{}'); transazioneId = payload?.transazione_id || '' } catch {}
  return { response: res.data, lastProgressivo: prog, transazioneId }
}