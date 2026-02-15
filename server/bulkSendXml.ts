import axios from 'axios'
import { readFileSync } from 'fs'
import { buildMovimentiFromXml } from './rentriClient'

function chunk<T>(arr:T[], size:number){ const out:T[][]=[]; for(let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size)); return out }

async function main(){
  const jobs:any[]=[]
  const add=(xmlPath:string, registryId:string, filename:string, issuer:string, batch:number)=>{
    const xml = readFileSync(xmlPath,'utf-8')
    const list = buildMovimentiFromXml(xml)
    const url = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${registryId}/movimenti`
    const chunks = chunk(list, batch)
    for (const c of chunks){ jobs.push({ registryId, filename, url, payload: JSON.stringify(c), issuer }) }
  }
  add('test/global-reco_6000.xml.xml','R6QSWHZ6HJV','certificato.p12','08934760961',200)
  add('test/multy-proget_6000.xml.xml','RQEL39R7NS0','multyproget.p12','12347770013',200)
  const res = await axios.post('http://localhost:8765/bulk-send', { jobs })
  const jobId = res.data?.jobId || ''
  console.log(JSON.stringify({ jobId, count: jobs.length }, null, 2))
}

main()

