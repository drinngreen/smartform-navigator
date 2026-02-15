import { readFileSync, writeFileSync } from 'fs'
import path from 'path'

function main(){
  const args = process.argv.slice(2)
  const inIdx = args.indexOf('--in')
  const outIdx = args.indexOf('--out')
  const inFile = inIdx>=0 ? args[inIdx+1] : path.join(process.cwd(),'out','fir.batch.cleaned.json')
  const outFile = outIdx>=0 ? args[outIdx+1] : path.join(process.cwd(),'out','fir.batch.final.json')
  const raw = readFileSync(inFile,'utf-8')
  const obj = JSON.parse(raw)
  const arr = Array.isArray(obj?.fir) ? obj.fir : []
  const seen = new Set<string>()
  const outArr:any[] = []
  for (const fir of arr){
    const code = String(fir?.identificativi?.codiceFIR||'').trim()
    if (!code) { outArr.push(fir); continue }
    if (seen.has(code)) continue
    seen.add(code)
    outArr.push(fir)
  }
  const final = { fir: outArr }
  writeFileSync(outFile, JSON.stringify(final, null, 2), 'utf-8')
  process.stdout.write(outFile+'\n')
}
main()
