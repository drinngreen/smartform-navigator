import { readFileSync, writeFileSync } from 'fs'
import path from 'path'

function loadMovs(p:string){
  const raw = readFileSync(p,'utf-8')
  const obj = JSON.parse(raw)
  return Array.isArray(obj?.movimenti) ? obj.movimenti : []
}

function toCsv(rows: Array<{registry:string, progressivo:string, fir:string}>){
  const header = ['registry','progressivo','fir'].join(',')
  const lines = rows.map(r => [r.registry, r.progressivo, r.fir].join(','))
  return [header, ...lines].join('\n')
}

async function main(){
  const args = process.argv.slice(2)
  const gIdx = args.indexOf('--global')
  const mIdx = args.indexOf('--multy')
  const outIdx = args.indexOf('--out')
  const gPath = gIdx>=0 ? args[gIdx+1] : path.join(process.cwd(),'out','ocr.movimenti.global.json')
  const mPath = mIdx>=0 ? args[mIdx+1] : path.join(process.cwd(),'out','ocr.movimenti.multy.json')
  const out = outIdx>=0 ? args[outIdx+1] : path.join(process.cwd(),'out','ocr.fir.mapping.csv')
  const g = loadMovs(gPath).map((x:any) => ({ registry: 'GLOBAL', progressivo: String(x?.riferimenti?.numero_registrazione?.progressivo||''), fir: String(x?.fir_numero||'') || 'ND' }))
  const m = loadMovs(mPath).map((x:any) => ({ registry: 'MULTY', progressivo: String(x?.riferimenti?.numero_registrazione?.progressivo||''), fir: String(x?.fir_numero||'') || 'ND' }))
  const csv = toCsv([...g, ...m])
  writeFileSync(out, csv, 'utf-8')
  process.stdout.write(out+'\n')
}
main()
