import { readFileSync, writeFileSync } from 'fs'
import path from 'path'

function normInt(x:any){ const s = String(x||'').replace(/[^0-9]/g,''); const n = parseInt(s||'0',10); return isNaN(n)?0:n }

function isValidFir(s?:string){
  if (!s) return false
  const v = String(s).replace(/[^A-Z0-9]/gi,'').toUpperCase()
  if (!v || v.length < 12 || v.length > 18) return false
  if (v.startsWith('FIR') || v.startsWith('FIRMA') || v.includes('GLOBAL') || v.includes('RECO')) return false
  if (v === 'F' || v === 'FCLOBALRECO') return false
  if (/^FMGWB[A-Z]?\d{6}[A-Z]{2}$/.test(v)) return true
  if (/^[A-Z]{4,6}\d{6}[A-Z]{2}$/.test(v)) return true
  return false
}

function buildPayloadFromFir(fir:any, isMulty:boolean, idx:number, overrideFir?:string){
  const cf = String(fir?.identificativi?.codiceFIR||'')
  let prog = normInt(cf)
  const isPlaceholder = /FMGWB/i.test(cf) || prog < 100000
  if (isPlaceholder || !prog || prog===0) prog = ((isMulty?800000:600000) + (idx+1))
  const anno = new Date(String(fir?.identificativi?.dataEmissione||new Date().toISOString().slice(0,10))).getFullYear()
  const dataReg = String(fir?.conferimentoDestinatario?.dataOraArrivo || (String(fir?.identificativi?.dataEmissione||new Date().toISOString().slice(0,10))+'T12:00:00'))
  const quantAcc = Number(fir?.conferimentoDestinatario?.quantitaAccettataKg || 0)
  const quantDecl = Number(fir?.rifiuto?.quantitaDichiarataKg || 0)
  const quantita = Math.max(quantAcc>0?quantAcc:quantDecl, 0.001)
  const um = String(fir?.rifiuto?.unitaMisura||'KG').toLowerCase()==='kg' ? 'kg' : 'l'
  const eerRaw = String(fir?.rifiuto?.codiceEER||'')
  const eer = eerRaw.replace(/[^0-9]/g,'').padStart(6,'0').slice(0,6)
  const provenienza = String(fir?.rifiuto?.provenienza||'U')
  const base:any = {
    riferimenti: {
      numero_registrazione: { anno: Number(anno), progressivo: String(prog) },
      data_ora_registrazione: dataReg.endsWith('Z') ? dataReg : (dataReg+'Z'),
      causale_operazione: 'RE'
    },
    rifiuto: {
      codice_eer: eer,
      stato_fisico: 'S',
      quantita: { valore: Number(quantita.toFixed(3)), unita_misura: um },
      provenienza
    },
    fir_numero: (isValidFir(overrideFir) ? String(overrideFir).toUpperCase().replace(/[^A-Z0-9]/g,'') : '')
  }
  if (isMulty){
    base.intermediario = { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' }
    base.intermediari = [ { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' } ]
  }
  return base
}

function loadBatch(inFile:string){
  const raw = readFileSync(inFile,'utf-8')
  const obj = JSON.parse(raw)
  return Array.isArray(obj?.fir) ? obj.fir : []
}

function loadFirSource(p?:string){
  try {
    if (!p) return []
    const raw = readFileSync(p,'utf-8')
    const obj = JSON.parse(raw)
    const arr = Array.isArray(obj?.items) ? obj.items : []
    return arr.map((x:any) => String(x?.fir||''))
  } catch { return [] }
}

async function main(){
  const args = process.argv.slice(2)
  const inIdx = args.indexOf('--in')
  const countIdx = args.indexOf('--count')
  const outIdx = args.indexOf('--out')
  const firIdx = args.indexOf('--firSource')
  const inFile = inIdx>=0 ? args[inIdx+1] : path.join(process.cwd(),'out','fir.batch.cleaned.json')
  const count = countIdx>=0 ? Number(args[countIdx+1]) : 634
  const outDir = outIdx>=0 ? args[outIdx+1] : path.join(process.cwd(),'out')
  const firSourcePath = firIdx>=0 ? args[firIdx+1] : undefined
  const all = loadBatch(inFile)
  const ocrFirs = loadFirSource(firSourcePath)
  const ocr = all.slice(0, Math.max(1, count))
  const globalPayload = ocr.map((fir, i) => buildPayloadFromFir(fir, false, i, ocrFirs[i]))
  const multyPayload  = ocr.map((fir, i) => buildPayloadFromFir(fir, true, i, ocrFirs[i]))
  const gOut = path.join(outDir, 'ocr.movimenti.global.json')
  const mOut = path.join(outDir, 'ocr.movimenti.multy.json')
  writeFileSync(gOut, JSON.stringify({ movimenti: globalPayload }, null, 2), 'utf-8')
  writeFileSync(mOut, JSON.stringify({ movimenti: multyPayload }, null, 2), 'utf-8')
  process.stdout.write(`${gOut}\n${mOut}\n`)
}
main()
