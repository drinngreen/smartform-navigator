import axios from 'axios'
import { readFileSync } from 'fs'
import { buildMovimentiFromXml } from './rentriClient'

async function main(){
  const args = process.argv.slice(2)
  const xmlPath = args[0] || 'test/fir.xml'
  const dateOverride = args[1] || new Date().toISOString().split('T')[0]
  const registryId = args[2] || 'R6QSWHZ6HJV'
  const p12 = args[3] || 'certificato.p12'
  const startAnno = Number(args[4] || new Date().getFullYear())
  const startProg = String(args[5] || '0000001')
  const limit = Number(args[6] || '10')
  const xml = readFileSync(xmlPath, 'utf-8')
  let movs = buildMovimentiFromXml(xml, dateOverride, startAnno, startProg)
  if (limit > 0) movs = movs.slice(0, limit)
  const pad = startProg.replace(/[^0-9]/g,'').length || 7
  const inc=(p:string)=>{const d=p.replace(/[^0-9]/g,''); const n=(parseInt(d||'0')+1).toString().padStart(pad,'0'); return n}
  let prog = startProg
  for (let i=0;i<movs.length;i++){
    const m = movs[i]
    m.riferimenti.numero_registrazione.anno = startAnno
    m.riferimenti.numero_registrazione.progressivo = prog
    if (p12 === 'multyproget.p12') {
      ;(m as any).intermediario = { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' }
      ;(m as any).intermediari = [ { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' } ]
    }
    const url = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${registryId}/movimenti`
    const payload = JSON.stringify([m])
    const body = { url, payload, filename: p12, issuer: p12==='multyproget.p12'?'12347770013':'08934760961', replyTo: 'https://localhost:443/rentri-callback' }
    try {
      const res = await axios.post('http://localhost:8765/send-rentri', body)
      const status = Number(res.data?.status || 0)
      if (status === 202) {
        let tid = ''
        try { const b = JSON.parse(res.data?.data || '{}'); tid = b?.transazione_id || '' } catch {}
        const chk = await axios.post('http://localhost:8765/check-status', { api: 'dati-registri', transazioneId: tid, filename: p12, issuer: body.issuer })
        const ok = chk.data?.success && Number(chk.data?.status) === 200
        process.stdout.write(`[OK] prog=${prog} status=${status} result=${ok}\n`)
      } else {
        let dd = res.data?.data
        process.stdout.write(`[FAIL] prog=${prog} status=${status} body=${typeof dd==='string'?dd:JSON.stringify(dd)}\n`)
      }
    } catch (e:any){
      process.stdout.write(`[ERROR] prog=${prog} ${e.message}\n`)
    }
    prog = inc(prog)
  }
}

main()
