import { readFileSync, writeFileSync } from 'fs'
import path from 'path'

function load(p:string){
  const raw = readFileSync(p,'utf-8')
  const obj = JSON.parse(raw)
  return Array.isArray(obj?.items) ? obj.items : []
}

function toCsv(rows:any[]){
  const header = ['file','fir','dataEmissione','cer','quantitaDichiarataKg','quantitaAccettataKg','um','provenienza','targaVeicolo','produttore_cf','destinatario_cf','intermediario_cf'].join(',')
  const lines = rows.map(r => [
    r.file||'',
    r.fir||'ND',
    r.dataEmissione||'',
    r.cer||'',
    r.quantitaDichiarataKg??'',
    r.quantitaAccettataKg??'',
    r.um||'',
    r.provenienza||'',
    r.targaVeicolo||'',
    r.produttore_cf||'',
    r.destinatario_cf||'',
    r.intermediario_cf||''
  ].join(','))
  return [header, ...lines].join('\n')
}

async function main(){
  const args = process.argv.slice(2)
  const inIdx = args.indexOf('--in')
  const outIdx = args.indexOf('--out')
  const input = inIdx>=0 ? args[inIdx+1] : path.join(process.cwd(),'out','ocr.structured.json')
  const output = outIdx>=0 ? args[outIdx+1] : path.join(process.cwd(),'out','ocr.structured.csv')
  const rows = load(input)
  const csv = toCsv(rows)
  writeFileSync(output, csv, 'utf-8')
  process.stdout.write(output+'\n')
}
main()
