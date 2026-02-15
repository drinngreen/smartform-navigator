import axios from 'axios'

async function probe(ids:string[], filename:string){
  const out:any[]=[]
  for (const id of ids){
    try {
      const urlReg = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${id}/registrazioni?limit=1&order=desc`
      const resReg = await axios.post('http://localhost:8765/list-rentri', { url: urlReg, filename, issuer: '' })
      out.push({ id, type: 'registrazioni', status: resReg.data?.status, ok: !!resReg.data?.success })
    } catch (e:any) {
      out.push({ id, type: 'registrazioni', error: String(e?.message||e) })
    }
    try {
      const resMov = await axios.post('http://localhost:8765/list-movimenti', { registryId: id, filename, issuer: '', limit: 1, order: 'desc' })
      out.push({ id, type: 'movimenti', status: resMov.data?.status, ok: !!resMov.data?.success })
    } catch (e:any) {
      out.push({ id, type: 'movimenti', error: String(e?.message||e) })
    }
  }
  console.log(JSON.stringify(out))
}

async function main(){
  const target = (process.argv[2]||'global').toLowerCase()
  let ids:string[]=[]
  let filename = ''
  if (target==='global'){
    ids = ['OP2501RMK022692','R6QSWHZ6HJV','R1DDEWC3SHU']
    filename = 'certificato.p12'
  } else {
    ids = ['OP2501XMQ021914','RQEL39R7NS0','RQCGT1GPTN0']
    filename = 'multyproget.p12'
  }
  await probe(ids, filename)
}

main()
