import { readdirSync, statSync, writeFileSync } from 'fs'
import path from 'path'
import Tesseract from 'tesseract.js'

function listImages(dir:string){
  const exts = new Set(['.png','.jpg','.jpeg','.tif','.tiff','.bmp'])
  try {
    const names = readdirSync(dir)
    const files = names
      .map(n => path.join(dir, n))
      .filter(p => {
        try { const s = statSync(p); return s.isFile() && exts.has(path.extname(p).toLowerCase()) } catch { return false }
      })
    return files
  } catch {
    return []
  }
}

function extractFir(text:string){
  const candidates:string[] = []
  const patterns = [
    /FMGWB[A-Z]?\d{6}[A-Z]{2}/gi,
    /[A-Z]{4,6}\d{6}[A-Z]{2}/gi
  ]
  for (const r of patterns){
    const m = text.match(r)
    if (m) candidates.push(...m)
  }
  // normalizza e scegli il più credibile
  const unique = Array.from(new Set(candidates.map(s => s.replace(/[^A-Z0-9]/g,'').toUpperCase())))
  const filtered = unique.filter(v => v.length >= 12 && v.length <= 18 && !v.startsWith('FIR') && !v.startsWith('FIRMA') && !v.includes('GLOBAL') && !v.includes('RECO'))
  const fm = filtered.filter(s => /^FMGWB[A-Z]?\d{6}[A-Z]{2}$/.test(s))
  if (fm.length > 0) return fm[0]
  const generic = filtered.filter(s => /^[A-Z]{4,6}\d{6}[A-Z]{2}$/.test(s))
  if (generic.length > 0) return generic[0]
  return ''
}

async function ocrOne(file:string){
  const res = await Tesseract.recognize(file, 'eng', { logger: ()=>{} })
  const text = (res?.data?.text || '').replace(/\s+/g,' ')
  const fir = extractFir(text)
  return { file, fir, text }
}

async function main(){
  const args = process.argv.slice(2)
  const dirIdx = args.indexOf('--dir')
  const outIdx = args.indexOf('--out')
  const dir = dirIdx>=0 ? args[dirIdx+1] : path.join(process.cwd(), 'fir dicembre 2025')
  const out = outIdx>=0 ? args[outIdx+1] : path.join(process.cwd(), 'out', 'formulari.json')
  const files = listImages(dir)
  if (files.length === 0){
    writeFileSync(out, JSON.stringify({ error: 'no_images_found', dir }, null, 2), 'utf-8')
    process.stdout.write(`no images in ${dir}\n`)
    return
  }
  const results:any[] = []
  for (let i=0;i<files.length;i++){
    const f = files[i]
    try {
      const r = await ocrOne(f)
      results.push(r)
      process.stdout.write(`OCR ${i+1}/${files.length} ${path.basename(f)} -> ${r.fir}\n`)
    } catch (e:any){
      results.push({ file: f, fir: '', text: '', error: String(e?.message||e) })
    }
  }
  writeFileSync(out, JSON.stringify({ items: results }, null, 2), 'utf-8')
  process.stdout.write(`${out}\n`)
}
main()
