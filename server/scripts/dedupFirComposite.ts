import { readFileSync, writeFileSync } from 'fs'
import path from 'path'

function keyOf(fir:any): string {
  const code = String(fir?.identificativi?.codiceFIR||'').trim()
  // treat placeholder codes as "missing"
  const isPlaceholder = code.toUpperCase()==='FMGWB000001AA'
  if (code && !isPlaceholder) return `CODE|${code}`
  const date = String(fir?.identificativi?.dataEmissione||'')
  const dest = String(fir?.destinatario?.denominazione||'')
  const eer = String(fir?.rifiuto?.codiceEER||'')
  const qty = String(fir?.rifiuto?.quantitaDichiarataKg||'')
  const targa = String(fir?.trasporto?.targaVeicolo||'')
  return `COMPOSITE|${date}|${dest}|${eer}|${qty}|${targa}`.toUpperCase()
}

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
    const k = keyOf(fir)
    if (seen.has(k)) continue
    seen.add(k)
    outArr.push(fir)
  }
  const final = { fir: outArr }
  writeFileSync(outFile, JSON.stringify(final, null, 2), 'utf-8')
  process.stdout.write(outFile+'\n')
}
main()
