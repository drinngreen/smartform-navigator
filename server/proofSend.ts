import axios from 'axios'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { buildMovimentiFromXml } from './rentriClient'

async function suggest(registryId:string, filename:string){
  const res = await axios.post('http://localhost:8765/suggest-next', { registryId, filename, limit: 1, order: 'desc' })
  const d = res.data?.data || {}
  const date = String(d.date || new Date().toISOString().slice(0,10))
  const anno = Number(d.anno || new Date().getFullYear())
  const progressivo = String(d.progressivo || '0000001')
  return { date, anno, progressivo }
}

function ensureOut(){ if (!existsSync('out')) mkdirSync('out') }

function minimalize(m:any, filename:string){
  const issuer = filename==='multyproget.p12'?'12347770013':'08934760961'
  const out:any = { ...m }
  out.rifiuto = out.rifiuto || {}
  out.rifiuto.stato_fisico = out.rifiuto.stato_fisico || 'S'
  out.rifiuto.quantita = out.rifiuto.quantita || { valore: 1.0, unita_misura: 'kg' }
  const isCarico = String((out.riferimenti?.causale_operazione||'')).toUpperCase()==='RE'
  if (isCarico) { out.rifiuto.provenienza = out.rifiuto.provenienza || 'U' } else { out.rifiuto.destinato_attivita = out.rifiuto.destinato_attivita || 'R13' }
  out.produttore = {
    denominazione: String(out.produttore?.denominazione || 'ND'),
    codice_fiscale: String(out.produttore?.codice_fiscale || issuer),
    indirizzo: String(out.produttore?.indirizzo || 'ND')
  }
  out.trasportatore = {
    denominazione: String(out.trasportatore?.denominazione || 'ND'),
    codice_fiscale: String(out.trasportatore?.codice_fiscale || '00000000000'),
    num_iscrizione_albo: String(out.trasportatore?.num_iscrizione_albo || 'ND')
  }
  out.destinatario = {
    denominazione: String(out.destinatario?.denominazione || 'ND'),
    codice_fiscale: String(out.destinatario?.codice_fiscale || '00000000000'),
    num_autorizzazione: String(out.destinatario?.num_autorizzazione || 'ND')
  }
  if (filename==='multyproget.p12') {
    out.intermediario = { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' }
    out.intermediari = [ { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' } ]
  }
  return out
}

async function sendProof(xmlPath:string, registryId:string, filename:string){
  const sugg = await suggest(registryId, filename)
  const xml = readFileSync(xmlPath,'utf-8')
  const arr = buildMovimentiFromXml(xml, sugg.date, sugg.anno, sugg.progressivo)
  let m:any = arr[0]
  m.riferimenti.numero_registrazione.anno = sugg.anno
  m.riferimenti.numero_registrazione.progressivo = sugg.progressivo
  m = minimalize(m, filename)
  const issuer = filename==='multyproget.p12'?'12347770013':'08934760961'
  const url = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${registryId}/movimenti`
  const send = await axios.post('http://localhost:8765/send-registrazioni', { url, payload: JSON.stringify([m]), filename, issuer })
  const status = Number(send.data?.status || 0)
  let tid = ''
  try { const b = JSON.parse(String(send.data?.data||'{}')); tid = String(b?.transazione_id||'') } catch {}
  let check:any = null
  if (tid){
    const c = await axios.post('http://localhost:8765/check-status', { api: 'dati-registri', transazioneId: tid, filename, issuer })
    check = { status: Number(c.data?.status||0), ok: !!(c.data?.success===true), data: String(c.data?.data||'') }
  }
  ensureOut()
  const outObj = { registryId, filename, progressivo: sugg.progressivo, status, transazioneId: tid, check: check?.status, ok: !!(check && check.ok), length: (check && check.data ? check.data.length : 0) }
  const proofPath = `out/proof-${registryId}-${Date.now()}.json`
  writeFileSync(proofPath, JSON.stringify(outObj, null, 2))
  console.log(JSON.stringify(outObj))
  return outObj
}

async function main(){
  const [target] = process.argv.slice(2)
  if (target==='global'){ await sendProof('test/global-reco_6000.xml.xml','R6QSWHZ6HJV','certificato.p12') }
  else if (target==='multy'){ await sendProof('test/multy-proget_6000.xml.xml','RQEL39R7NS0','multyproget.p12') }
  else { await sendProof('test/global-reco_6000.xml.xml','R6QSWHZ6HJV','certificato.p12') }
}

main()
