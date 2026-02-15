import axios from 'axios'
import { writeFileSync } from 'fs'

const BRIDGE = 'http://127.0.0.1:8765'

function parseArgs(){
  const args = process.argv.slice(2)
  const fromIdx = args.indexOf('--from')
  const toIdx = args.indexOf('--to')
  const outIdx = args.indexOf('--out')
  const from = fromIdx>=0 ? args[fromIdx+1] : '2025-12-01'
  const to = toIdx>=0 ? args[toIdx+1] : '2025-12-31'
  const out = outIdx>=0 ? args[outIdx+1] : 'out/reconcile_dicembre.csv'
  return { from, to, out }
}

function rangeDays(from:string, to:string){
  const days:string[] = []
  const start = new Date(from+'T00:00:00Z')
  const end = new Date(to+'T00:00:00Z')
  for(let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate()+1)){
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth()+1).padStart(2,'0')
    const dd = String(d.getUTCDate()).padStart(2,'0')
    days.push(`${y}-${m}-${dd}`)
  }
  return days
}

async function fetchDay(registryId:string, filename:string, issuer:string, day:string){
  const body = { registryId, filename, issuer, limit: 1000, order: 'asc', from: day, to: day }
  const res = await axios.post(`${BRIDGE}/list-movimenti`, body)
  const dataStr = String(res.data?.data || '[]')
  try { return JSON.parse(dataStr) } catch { return [] }
}

function toCsv(rows: Array<{registry:string, progressivo:number, data:string, cer:string, quantita:number, unita:string, provenienza:string}>){
  const header = ['registry','progressivo','data_ora_registrazione','cer','quantita','unita','provenienza'].join(',')
  const lines = rows.map(r => [
    r.registry,
    r.progressivo,
    r.data,
    r.cer,
    r.quantita,
    r.unita,
    r.provenienza
  ].join(','))
  return [header, ...lines].join('\n')
}

async function main(){
  const { from, to, out } = parseArgs()
  const days = rangeDays(from, to)
  const rows: Array<{registry:string, progressivo:number, data:string, cer:string, quantita:number, unita:string, provenienza:string}> = []
  const regs = [
    { key:'GLOBAL', id:'R6QSWHZ6HJV', file:'certificato.p12', iss:'08934760961' },
    { key:'MULTY',  id:'RQEL39R7NS0', file:'multyproget.p12', iss:'12347770013' }
  ]
  for (const day of days){
    for (const r of regs){
      const arr = await fetchDay(r.id, r.file, r.iss, day)
      for (const x of arr){
        const prog = Number(x?.riferimenti?.numero_registrazione?.progressivo || 0)
        const data = String(x?.riferimenti?.numero_registrazione?.data_ora_registrazione || x?.riferimenti?.data_ora_registrazione || '')
        const cer  = String(x?.rifiuto?.codice_eer || '')
        const qv   = Number(x?.rifiuto?.quantita?.valore || 0)
        const um   = String(x?.rifiuto?.quantita?.unita_misura || '')
        const prov = String(x?.rifiuto?.provenienza || '')
        rows.push({ registry: r.key, progressivo: prog, data, cer, quantita: qv, unita: um, provenienza: prov })
      }
    }
  }
  const csv = toCsv(rows)
  writeFileSync(out, csv, 'utf-8')
  process.stdout.write(out+'\n')
}
main()
