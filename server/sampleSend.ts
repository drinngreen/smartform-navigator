// @ts-nocheck
import axios from 'axios'
import { readFileSync } from 'fs'
import { buildMovimentiFromXml } from './rentriClient'

async function sendOneFrom(xmlPath:string, registryId:string, filename:string, progressivo:string){
  const issuer = filename==='multyproget.p12'?'12347770013':'08934760961'
  const s = await axios.post('http://localhost:8765/suggest-next', { registryId, filename })
  const d = s.data?.data || {}
  const date = d.date || new Date().toISOString().slice(0,10)
  const anno = Number(d.anno || new Date().getFullYear())
  const targetProg = String(d.progressivo || '0000001')
  const xml = readFileSync(xmlPath,'utf-8')
  const arr = buildMovimentiFromXml(xml, date, anno, progressivo)
  let m:any = arr.find(x => String(x?.riferimenti?.numero_registrazione?.progressivo||'')===String(progressivo)) || arr[0]
  m.riferimenti.numero_registrazione.anno = anno
  m.riferimenti.numero_registrazione.progressivo = targetProg
  if (filename==='multyproget.p12') {
    m.intermediario = { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' }
    m.intermediari = [ { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' } ]
  }
  if (!m.rifiuto) m.rifiuto = {}
  if (!m.rifiuto.stato_fisico) m.rifiuto.stato_fisico = 'S'
  if (!m.rifiuto.quantita) m.rifiuto.quantita = { valore: 1.0, unita_misura: 'kg' }
  const isCarico = String((m.riferimenti?.causale_operazione||'')).toUpperCase()==='RE'
  if (isCarico) { if (!m.rifiuto.provenienza) m.rifiuto.provenienza = 'U' } else { if (!m.rifiuto.destinato_attivita) m.rifiuto.destinato_attivita = 'R13' }
  const url = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${registryId}/movimenti`
  let res = await axios.post('http://localhost:8765/send-rentri', { url, payload: JSON.stringify([m]), filename, issuer, replyTo: 'https://localhost:443/rentri-callback' })
  const status = Number(res.data?.status||0)
  if (status === 202) {
    let tid = ''
    try { const b = JSON.parse(res.data?.data || '{}'); tid = b?.transazione_id || '' } catch {}
    const chk = await axios.post('http://localhost:8765/check-status', { api: 'dati-registri', transazioneId: tid, filename, issuer })
    const ok = (()=>{ try { if (chk.data?.success && Number(chk.data?.status)===200) { const body = JSON.parse(String(chk.data?.data||'{}')); return body && body.errore===false } } catch {} return false })()
    console.log(JSON.stringify({ registryId, progressivo: targetProg, ok }))
  } else {
    console.log(JSON.stringify({ registryId, progressivo: targetProg, status }))
  }
}

async function main(){
  const gCsv = readFileSync('out/global-validation.csv','utf-8').trim().split(/\r?\n/).slice(1)
  const mCsv = readFileSync('out/multy-validation.csv','utf-8').trim().split(/\r?\n/).slice(1)
  const pick = (rows:string[], n:number)=>{ const out:string[]=[]; for (const r of rows){ const cols=r.split(','); const esito=cols[5]?.replace(/"/g,'').trim(); const prog=cols[0]?.replace(/"/g,'').trim(); if (esito==='OK'){ out.push(prog); if (out.length>=n) break } } return out }
  const gProgs = pick(gCsv, 5)
  const mProgs = pick(mCsv, 5)
  for (const p of gProgs){ await sendOneFrom('test/global-reco_6000.xml.xml', 'R6QSWHZ6HJV', 'certificato.p12', p) }
  for (const p of mProgs){ await sendOneFrom('test/multy-proget_6000.xml.xml', 'RQEL39R7NS0', 'multyproget.p12', p) }
}

main()
