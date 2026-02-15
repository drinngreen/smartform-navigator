
import axios from 'axios'

const BRIDGE = 'http://127.0.0.1:8765'
const REGID = 'R6QSWHZ6HJV'
const ENDPOINT = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${REGID}/movimenti`

async function main() {
  console.log('Testing Bridge PUT capability...')
  
  // Try PUT to Collection
  const testUrl = `${ENDPOINT}`
  
  // Real-ish payload but with a random progressive to avoid collision if it acts as create
  const payload = {
    riferimenti: {
      numero_registrazione: { anno: 2025, progressivo: "9999999" },
      data_ora_registrazione: new Date().toISOString(),
      causale_operazione: 'RT'
    },
    rifiuto: {
       codice_eer: "170405",
       stato_fisico: "S",
       quantita: { valore: 10, unita_misura: "kg" },
       provenienza: "U"
    },
    annotazioni: "TEST RECTIFICATION POST"
  }

  const body = {
    url: testUrl,
    method: 'POST',
    payload: JSON.stringify(payload),
    filename: 'certificato.p12',
    issuer: '08934760961'
  }

  try {
    const res = await axios.post(`${BRIDGE}/send-rentri`, body)
    console.log('Bridge Response Status:', res.status)
    console.log('Bridge Response Data:', JSON.stringify(res.data, null, 2))
  } catch (e:any) {
    console.error('Bridge Request Failed:', e.message)
    if (e.response) {
      console.error('Status:', e.response.status)
      console.error('Data:', e.response.data)
    }
  }
}

main()
