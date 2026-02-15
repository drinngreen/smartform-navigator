import { createWriteStream, readFileSync } from 'fs'
import path from 'path'
import PDFDocument from 'pdfkit'

function loadJson(p:string){
  const raw = readFileSync(p,'utf-8')
  try { return JSON.parse(raw) } catch { return {} }
}

function ensureArray(obj:any){
  if (Array.isArray(obj)) return obj
  if (Array.isArray(obj?.movimenti)) return obj.movimenti
  if (Array.isArray(obj?.fir)) return obj.fir
  return []
}

function text(doc:PDFDocument, s:string, x:number, y:number, opts?:PDFKit.Mixins.TextOptions){
  doc.text(s, x, y, opts)
}

function drawHeader(doc:PDFDocument, title:string){
  doc.fontSize(16).fillColor('#000')
  text(doc, title, 50, 50)
  doc.moveTo(50, 70).lineTo(545, 70).stroke()
}

function drawTableHeader(doc:PDFDocument, y:number){
  doc.fontSize(10).fillColor('#333')
  text(doc, 'Anno', 50, y)
  text(doc, 'Progressivo', 85, y)
  text(doc, 'FIR', 145, y)
  text(doc, 'Data', 265, y)
  text(doc, 'CER', 375, y)
  text(doc, 'Q.ta', 425, y)
  text(doc, 'UM', 455, y)
  text(doc, 'Prov.', 485, y)
  text(doc, 'Interm.', 520, y)
  doc.moveTo(50, y+12).lineTo(555, y+12).stroke()
}

function valueOf(obj:any, pathArr:string[], def:string=''){
  try {
    let cur = obj
    for (const p of pathArr){ cur = cur?.[p] }
    const s = String(cur ?? def)
    return s
  } catch { return def }
}

function toRow(obj:any){
  const anno = Number(valueOf(obj, ['riferimenti','numero_registrazione','anno'], ''))
  const prog = valueOf(obj, ['riferimenti','numero_registrazione','progressivo'], '')
  const data = valueOf(obj, ['riferimenti','data_ora_registrazione'], '')
  const fir  = valueOf(obj, ['fir_numero'], '') || 'N/D'
  const cer  = valueOf(obj, ['rifiuto','codice_eer'], '')
  const qv   = valueOf(obj, ['rifiuto','quantita','valore'], '')
  const um   = valueOf(obj, ['rifiuto','quantita','unita_misura'], '')
  const prov = valueOf(obj, ['rifiuto','provenienza'], '')
  const intCf = valueOf(obj, ['intermediario','codice_fiscale'], '')
  const row = { anno, prog, fir, data, cer, qv, um, prov, intermediario: intCf }
  return row
}

function render(doc:PDFDocument, items:any[]){
  drawHeader(doc, 'RENTRI Movimenti OCR')
  let y = 80
  drawTableHeader(doc, y)
  y += 18
  doc.font('Courier').fontSize(9).fillColor('#000')
  for (const it of items){
    const r = toRow(it)
    if (y > 760){
      doc.addPage()
      y = 50
      drawTableHeader(doc, y)
      y += 18
    }
    text(doc, String(r.anno), 50, y, { width: 30, lineBreak: false, ellipsis: true })
    text(doc, String(r.prog), 85, y, { width: 55, lineBreak: false, ellipsis: true })
    text(doc, String(r.fir), 145, y, { width: 115, lineBreak: false, ellipsis: true })
    text(doc, String(r.data), 265, y, { width: 105, lineBreak: false, ellipsis: true })
    text(doc, String(r.cer), 375, y, { width: 40, lineBreak: false, ellipsis: true })
    text(doc, String(r.qv), 425, y, { width: 25, lineBreak: false, ellipsis: true })
    text(doc, String(r.um), 455, y, { width: 25, lineBreak: false, ellipsis: true })
    text(doc, String(r.prov), 485, y, { width: 30, lineBreak: false, ellipsis: true })
    text(doc, String(r.intermediario), 520, y, { width: 35, lineBreak: false, ellipsis: true })
    y += 14
  }
}

async function main(){
  const args = process.argv.slice(2)
  const inIdx = args.indexOf('--in')
  const outIdx = args.indexOf('--out')
  const inFile = inIdx>=0 ? args[inIdx+1] : path.join(process.cwd(),'out','ocr.movimenti.global.json')
  const outFile = outIdx>=0 ? args[outIdx+1] : path.join(process.cwd(),'out','ocr.movimenti.global.pdf')
  const data = loadJson(inFile)
  const items = ensureArray(data)
  const doc = new PDFDocument({ size: 'A4', margins: { top: 40, left: 40, right: 40, bottom: 40 } })
  const stream = createWriteStream(outFile)
  doc.pipe(stream)
  render(doc, items)
  doc.end()
}
main()
