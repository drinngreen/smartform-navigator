import { readdirSync, statSync, writeFileSync } from 'fs'
import path from 'path'
import sharp from 'sharp'
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
  } catch { return [] }
}

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

async function preprocess(file:string){
  const buf = await sharp(file)
    .resize({ width: 1800, withoutEnlargement: false })
    .grayscale()
    .threshold(180)
    .toBuffer()
  return buf
}

function wordsToFir(words: Array<{ text:string, bbox:any }>) {
  const res: string[] = []
  for (let i = 0; i < words.length; i++){
    const w = words[i]
    const t = (w.text || '').trim().toUpperCase()
    if (t === 'FIR'){
      // concat next 1-3 words on the right
      let cand = ''
      for (let j = i+1; j < Math.min(words.length, i+4); j++){
        cand += (words[j].text || '').trim().toUpperCase()
      }
      cand = cand.replace(/[^A-Z0-9]/g,'')
      if (isValidFir(cand)) res.push(cand)
    }
  }
  return res[0] || ''
}

async function ocrOne(file:string){
  const img = await preprocess(file)
  const res = await Tesseract.recognize(img, 'eng', { logger: ()=>{}, tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', psm: 6 as any })
  const text = (res?.data?.text || '').replace(/\s+/g,' ')
  // collect words
  const words = (res?.data?.words || []).map((w:any) => ({ text: String(w?.text||''), bbox: w?.bbox }))
  let fir = wordsToFir(words)
  if (!fir){
    const patterns = [
      /FMGWB[A-Z]?\d{6}[A-Z]{2}/gi,
      /[A-Z]{4,6}\d{6}[A-Z]{2}/gi
    ]
    const candidates:string[] = []
    for (const r of patterns){
      const m = text.match(r)
      if (m) candidates.push(...m)
    }
    const unique = Array.from(new Set(candidates.map(s => s.replace(/[^A-Z0-9]/g,'').toUpperCase())))
    const filtered = unique.filter(v => isValidFir(v))
    fir = filtered[0] || ''
  }
  return { file, fir, text }
}

async function main(){
  const args = process.argv.slice(2)
  const dirIdx = args.indexOf('--dir')
  const outIdx = args.indexOf('--out')
  const dir = dirIdx>=0 ? args[dirIdx+1] : path.join(process.cwd(), 'fir dicembre 25')
  const out = outIdx>=0 ? args[outIdx+1] : path.join(process.cwd(), 'out', 'formulari.json')
  const files = listImages(dir)
  if (files.length === 0){
    writeFileSync(out, JSON.stringify({ error: 'no_images_found', dir }, null, 2), 'utf-8')
    process.stdout.write(`no images in ${dir}\n`)
    return
  }
  const results:any[] = []
  const concurrency = 10
  
  async function worker(queue: string[]) {
    while (queue.length > 0) {
      const f = queue.shift()
      if (!f) break
      try {
        const r = await ocrOne(f)
        results.push(r)
        process.stdout.write(`OCR ${results.length}/${files.length} ${path.basename(f)} -> ${r.fir || 'ND'}\n`)
      } catch (e:any) {
        results.push({ file: f, fir: '', text: '', error: String(e?.message||e) })
      }
    }
  }

  const queue = [...files]
  const workers = []
  for (let i=0; i<concurrency; i++) {
    workers.push(worker(queue))
  }
  await Promise.all(workers)

  writeFileSync(out, JSON.stringify({ items: results }, null, 2), 'utf-8')
  process.stdout.write(`${out}\n`)
}
main()
