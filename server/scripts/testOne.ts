import axios from 'axios'

async function main(){
  const target = (process.argv[2]||'global').toLowerCase()
  const env = (process.argv[3]||'demo').toLowerCase()
  const issuerArg = process.argv[4] || ''
  const regId = target==='multy' ? 'RQEL39R7NS0' : 'R6QSWHZ6HJV'
  const opId = target==='multy' ? 'OP2501XMQ021914' : 'OP2501RMK022692'
  const filename = target==='multy' ? 'multyproget.p12' : 'certificato.p12'
  const base = env==='demo' ? 'https://demoapi.rentri.gov.it' : 'https://api.rentri.gov.it'
  const mode = (process.argv[5]||'registrazioni').toLowerCase()
  const url = `${base}/dati-registri/v1.0/operatore/${regId}/${mode==='movimenti'?'movimenti':'registrazioni'}`
  const nowDate = new Date().toISOString().slice(0,10) + 'T00:00:00Z'
  const year = new Date().getFullYear()
  let nextProg = 1
  try {
    const lm = await axios.post('http://localhost:8765/list-movimenti', { registryId: regId, filename, issuer, limit: 10000, order: 'desc' })
    let arr:any[]=[]
    try { arr = JSON.parse(String(lm.data?.data||'[]')) } catch {}
    for (const h of arr) {
      const nr = h?.riferimenti?.numero_registrazione || h?.numero_registrazione || {}
      const a = typeof nr.anno === 'number' ? nr.anno : parseInt(String(nr.anno||''),10)
      const p = typeof nr.progressivo === 'number' ? nr.progressivo : parseInt(String(nr.progressivo||'').replace(/[^0-9]/g,''),10)
      if (!isNaN(a) && !isNaN(p) && a===year) nextProg = Math.max(nextProg, p+1)
    }
  } catch {}
  const minimalReg = [{ riferimenti: { numero_registrazione: { anno: year, progressivo: String(nextProg) } } }]
  const minimalMov = [{
    riferimenti: {
      numero_registrazione: { anno: year, progressivo: String(nextProg) },
      data_ora_registrazione: nowDate,
      causale_operazione: 'RE'
    },
    rifiuto: {
      codice_eer: '170407',
      stato_fisico: 'S',
      quantita: { valore: 1, unita_misura: 'kg' },
      provenienza: 'U'
    }
  }]
  const payload = JSON.stringify(mode==='movimenti' ? minimalMov : minimalReg)
  let issuer = issuerArg
  let who:any = {}
  if (!issuer) {
    try { const resp = await axios.get(`http://localhost:8765/whoami?filename=${encodeURIComponent(filename)}`); who = resp.data || {} } catch {}
    issuer = who?.dnQualifier || who?.mappedIssuer || ''
  }
  const variants = Array.from(new Set([
    issuer,
    who?.dnQualifier || '',
    who?.mappedIssuer || '',
    (who?.organizationIdentifier || '').trim(),
    (who?.organizationIdentifier || '').replace(/^CF:/i,'').trim(),
    (who?.organizationIdentifier || '').replace(/^CF:/i,'').replace(/^IT-/i,'').trim()
  ].filter(Boolean)))
  let success = false
  for (const iss of variants){
    const body = { payload, filename, url, issuer: iss, replyTo: 'http://localhost:8765/rentri-callback' }
    const send = await axios.post(mode==='movimenti' ? 'http://localhost:8765/send-rentri' : 'http://localhost:8765/send-registrazioni', body)
    console.log(JSON.stringify({ tryIssuer: iss, send: send.data }))
    let transId = ''
    let jtiAuth = ''
    try { const model = JSON.parse(send.data?.data||'{}'); transId = model?.transazione_id||'' } catch {}
    try { jtiAuth = String(send.data?.jti||'') } catch {}
    if (transId) {
      const chk = await axios.post('http://localhost:8765/check-transazione', { registryId: regId, transazioneId: transId, filename, issuer: iss })
      console.log(JSON.stringify({ tryIssuer: iss, check: chk.data }))
      const st = await axios.post('http://localhost:8765/check-status', { api: 'dati-registri', transazioneId: transId, filename, issuer: iss, jti: jtiAuth })
      console.log(JSON.stringify({ tryIssuer: iss, status: st.data }))
      success = true
      break
    }
  }
  const list = await axios.post('http://localhost:8765/list-rentri', { url: `${base}/dati-registri/v1.0/operatore/${regId}/registrazioni?limit=10&order=desc`, filename, issuer })
  console.log(JSON.stringify({ list: list.data, success }))
}

main()
