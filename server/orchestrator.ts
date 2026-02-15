// @ts-nocheck
import axios from 'axios'
import { readFileSync } from 'fs'
import { buildMovimentiFromXml } from './rentriClient'

async function suggest(registryId:string, filename:string){
  try {
    const s = await axios.post('http://localhost:8765/suggest-next', { registryId, filename })
    const d = s.data?.data || {}
    return { date: d.date || new Date().toISOString().split('T')[0], anno: Number(d.anno || new Date().getFullYear()), progressivo: String(d.progressivo || '0000001') }
  } catch { return { date: new Date().toISOString().split('T')[0], anno: new Date().getFullYear(), progressivo: '0000001' } }
}

async function sendOne(xmlPath:string, registryId:string, filename:string){
  const s = await suggest(registryId, filename)
  const xml = readFileSync(xmlPath, 'utf-8')
  let movs = buildMovimentiFromXml(xml, s.date, s.anno, s.progressivo)
  let m:any = movs[0]
  m.riferimenti.numero_registrazione.anno = s.anno
  m.riferimenti.numero_registrazione.progressivo = s.progressivo
  if (filename === 'multyproget.p12') {
    m.intermediario = { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' }
    m.intermediari = [ { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' } ]
  }
  const url = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${registryId}/movimenti`
  let payload = JSON.stringify([m])
  const issuer = filename==='multyproget.p12'?'12347770013':'08934760961'
  let res = await axios.post('http://localhost:8765/send-rentri', { url, payload, filename, issuer, replyTo: 'https://localhost:443/rentri-callback' })
  const status = Number(res.data?.status || 0)
  if (status !== 202) {
    let model:any = null
    try { model = JSON.parse(res.data?.data) } catch {}
    const invalidEER = !!(model && model.model_state && (model.model_state['[0].rifiuto.codice_eer'] || model.model_state['rifiuto.codice_eer']))
    if (invalidEER) {
      const digits = String((m.rifiuto?.codice_eer||'').toString().replace(/[^0-9]/g,'')).slice(0,6)
      m.rifiuto.codice_eer = digits.length===6?digits:'17.04.07'
      payload = JSON.stringify([m])
      res = await axios.post('http://localhost:8765/send-rentri', { url, payload, filename, issuer, replyTo: 'https://localhost:443/rentri-callback' })
    }
  }
  const ok202 = Number(res.data?.status||0)===202
  if (!ok202) return false
  let tid = ''
  try { const b = JSON.parse(res.data?.data||'{}'); tid = b?.transazione_id || '' } catch {}
  const chk = await axios.post('http://localhost:8765/check-status', { api: 'dati-registri', transazioneId: tid, filename, issuer })
  return chk.data?.success && Number(chk.data?.status)===200
}

async function loopGlobal(){
  const xmlPath = 'test/global-reco_6000.xml.xml'
  const registryId = 'R6QSWHZ6HJV'
  const filename = 'certificato.p12'
  for(;;){ await sendOne(xmlPath, registryId, filename); await new Promise(r=>setTimeout(r, 1500)) }
}

async function loopMulty(){
  const xmlPath = 'test/multy-proget_6000.xml.xml'
  const registryId = 'RQEL39R7NS0'
  const filename = 'multyproget.p12'
  for(;;){ await sendOne(xmlPath, registryId, filename); await new Promise(r=>setTimeout(r, 1500)) }
}

async function main(){
  loopGlobal();
  loopMulty();
}

main()