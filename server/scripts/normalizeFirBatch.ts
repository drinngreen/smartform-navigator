import { readFileSync, writeFileSync } from 'fs'
import path from 'path'

function normEer(s:any): string {
  const raw = String(s||'').replace(/[^0-9]/g,'')
  if (!raw) return '170405'
  return raw.padStart(6,'0').slice(0,6)
}
function normQty(a:any,b:any): number {
  const q1 = Number(a||0)
  const q2 = Number(b||0)
  const q = q1>0?q1:(q2>0?q2:1)
  return q
}
function main(){
  const args = process.argv.slice(2)
  const inIdx = args.indexOf('--in')
  const outIdx = args.indexOf('--out')
  const inFile = inIdx>=0 ? args[inIdx+1] : path.join(process.cwd(),'out','fir.batch.json')
  const outFile = outIdx>=0 ? args[outIdx+1] : path.join(process.cwd(),'out','fir.batch.cleaned.json')
  const raw = readFileSync(inFile,'utf-8')
  const obj = JSON.parse(raw)
  const arr = Array.isArray(obj?.fir) ? obj.fir : []
  const fixed = arr.map((fir:any)=>{
    const eer = normEer(fir?.rifiuto?.codiceEER)
    const qty = normQty(fir?.rifiuto?.quantitaDichiarataKg, fir?.conferimentoDestinatario?.quantitaAccettataKg ?? fir?.conferimentoDestinatario?.quantitaRicevutaKg)
    const out = JSON.parse(JSON.stringify(fir))
    out.rifiuto = out.rifiuto || {}
    out.rifiuto.codiceEER = eer
    out.rifiuto.unitaMisura = 'KG'
    out.rifiuto.statoFisico = 'S'
    out.rifiuto.quantitaDichiarataKg = qty
    out.conferimentoDestinatario = out.conferimentoDestinatario || {}
    if (!(out.conferimentoDestinatario.quantitaAccettataKg>0)) out.conferimentoDestinatario.quantitaAccettataKg = qty
    if (!(out.conferimentoDestinatario.quantitaRicevutaKg>0)) out.conferimentoDestinatario.quantitaRicevutaKg = qty
    return out
  })
  const final = { fir: fixed }
  writeFileSync(outFile, JSON.stringify(final, null, 2), 'utf-8')
  process.stdout.write(outFile+'\n')
}
main()
