import axios from 'axios'

async function sendOnce(target:'global'|'multy', issuer:string, mode:'movimenti'|'registrazioni'){
  const filename = target==='multy' ? 'multyproget.p12' : 'certificato.p12'
  const regId = target==='multy' ? 'RQEL39R7NS0' : 'R6QSWHZ6HJV'
  const base = 'https://api.rentri.gov.it'
  const url = `${base}/dati-registri/v1.0/operatore/${regId}/${mode}`
  const nowDate = new Date().toISOString().slice(0,10) + 'T12:00:00Z'
  const minimalMov = [{
    riferimenti: {
      numero_registrazione: { anno: new Date().getFullYear(), progressivo: 1 },
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
  const payload = JSON.stringify(mode==='movimenti' ? minimalMov : [{ riferimenti: { numero_registrazione: { anno: new Date().getFullYear(), progressivo: 1 } } }])
  const body = { payload, filename, url, issuer, replyTo: 'http://localhost:8765/rentri-callback' }
  const res = await axios.post(mode==='movimenti' ? 'http://localhost:8765/send-rentri' : 'http://localhost:8765/send-registrazioni', body)
  console.log(JSON.stringify({ target, mode, send: res.data }))
  let transId = ''
  try { const model = JSON.parse(res.data?.data||'{}'); transId = model?.transazione_id||'' } catch {}
  if (transId) {
    const st = await axios.post('http://localhost:8765/check-status', { api: 'dati-registri', transazioneId: transId, filename, issuer })
    console.log(JSON.stringify({ target, status: st.data }))
  }
}

async function main(){
  await sendOnce('global', 'OP2501RMK022692', 'movimenti')
  await sendOnce('multy', 'OP2501XMQ021914', 'movimenti')
}

main()
