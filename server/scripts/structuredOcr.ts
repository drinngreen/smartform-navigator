import { readdirSync, statSync, writeFileSync } from 'fs'
import path from 'path'
import sharp from 'sharp'
import Tesseract from 'tesseract.js'

type Structured = {
  file: string
  fir?: string | null
  dataEmissione?: string | null
  cer?: string | null
  quantitaDichiarataKg?: number | null
  quantitaAccettataKg?: number | null
  um?: 'KG' | 'L' | null
  provenienza?: string | null
  targaVeicolo?: string | null
  produttore_cf?: string | null
  destinatario_cf?: string | null
  intermediario_cf?: string | null
}

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

async function preprocess(file:string){
  const buf = await sharp(file)
    .resize({ width: 2000, withoutEnlargement: false })
    .grayscale()
    .normalize()
    .toBuffer()
  return buf
}

async function cropTopRight(buf: Buffer){
  const img = sharp(buf)
  const meta = await img.metadata()
  const w = meta.width || 2000
  const h = meta.height || 2000
  const cropW = Math.floor(w * 0.45)
  const cropH = Math.floor(h * 0.25)
  const left = w - cropW
  const top = 0
  return await img.extract({ left, top, width: cropW, height: cropH }).toBuffer()
}

async function cropBottomRight(buf: Buffer){
  const img = sharp(buf)
  const meta = await img.metadata()
  const w = meta.width || 2000
  const h = meta.height || 2000
  const cropW = Math.floor(w * 0.50)
  const cropH = Math.floor(h * 0.22)
  const left = w - cropW
  const top = h - cropH
  return await img.extract({ left, top, width: cropW, height: cropH }).toBuffer()
}

function normText(s:string){
  return s.replace(/\s+/g,' ').replace(/[‐–—]/g,'-')
}

function parseDate(s:string){
  const mIso = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (mIso) return `${mIso[1]}-${mIso[2]}-${mIso[3]}`
  const mIt = s.match(/\b(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})\b/)
  if (mIt) return `${mIt[3]}-${mIt[2]}-${mIt[1]}`
  return null
}

function isValidFir(v?:string){
  if (!v) return false
  const s = v.replace(/[^A-Z0-9]/gi,'').toUpperCase()
  if (s.length < 12 || s.length > 18) return false
  if (s.startsWith('FIR') || s.startsWith('FIRMA') || s.includes('GLOBAL') || s.includes('RECO')) return false
  if (/^FMGWB[A-Z]?\d{6}[A-Z]{2}$/.test(s)) return true
  if (/^[A-Z]{4,6}\d{6}[A-Z]{2}$/.test(s)) return true
  return false
}

function extractAll(text:string): Structured {
  const out: Structured = { file: '', fir: null, dataEmissione: null, cer: null, quantitaDichiarataKg: null, quantitaAccettataKg: null, um: null, provenienza: null, targaVeicolo: null, produttore_cf: null, destinatario_cf: null, intermediario_cf: null }
  const t = normText(text).toUpperCase()
  // FIR
  const firCandidates = []
  const rFirs = [
    /FMGWB[A-Z]?\d{6}[A-Z]{2}/g,
    /[A-Z]{4,6}\d{6}[A-Z]{2}/g
  ]
  for (const r of rFirs){
    const m = t.match(r); if (m) firCandidates.push(...m)
  }
  const fir = (firCandidates.find(isValidFir) || null)
  out.fir = fir
  // Data emissione
  const de = parseDate(t) ; out.dataEmissione = de
  // CER (6 cifre, con possibili separatori)
  const cerMatch = t.match(/\b(\d[\d\.\s]{3,8}\d)\b/)
  if (cerMatch){
    const cerRaw = cerMatch[1].replace(/[^0-9]/g,'')
    if (cerRaw.length >= 4 && cerRaw.length <= 6){
      out.cer = cerRaw.padStart(6,'0').slice(0,6)
    }
  }
  // Quantità
  const qdMatch = t.match(/QUANTITA\s+DICHIARATA\s*[:\-]?\s*([0-9]+[,\.\s]?[0-9]*)\s*(KG|L)?/)
  if (qdMatch){
    const num = parseFloat(qdMatch[1].replace(',','.'))
    out.quantitaDichiarataKg = isFinite(num) ? num : null
    out.um = (qdMatch[2] === 'L' ? 'L' : 'KG')
  }
  const qaMatch = t.match(/QUANTITA\s+ACCETTATA\s*[:\-]?\s*([0-9]+[,\.\s]?[0-9]*)\s*(KG|L)?/)
  if (qaMatch){
    const num = parseFloat(qaMatch[1].replace(',','.'))
    out.quantitaAccettataKg = isFinite(num) ? num : null
    out.um = (qaMatch[2] === 'L' ? 'L' : 'KG')
  }
  // Provenienza
  const provMatch = t.match(/PROVENIENZA\s*[:\-]?\s*([A-Z])/)
  if (provMatch) out.provenienza = provMatch[1]
  // Targa (es. AP081VA)
  const targaMatch = t.match(/\b([A-Z]{2}\d{3}[A-Z]{2})\b/)
  if (targaMatch) out.targaVeicolo = targaMatch[1]
  // CF produttore/destinatario/intermediario
  const cfMatches = t.match(/\b(\d{11})\b/g) || []
  // Heuristics: first CF as produttore, second as destinatario, third as intermediario
  if (cfMatches.length > 0) out.produttore_cf = cfMatches[0]
  if (cfMatches.length > 1) out.destinatario_cf = cfMatches[1]
  if (cfMatches.length > 2) out.intermediario_cf = cfMatches[2]
  return out
}

async function ocrOne(file:string){
  const img = await preprocess(file)
  // prima leggi FIR dall'angolo in alto a destra
  let fir: string | null = null
  try {
    const topRight = await cropTopRight(img)
    const resFir = await Tesseract.recognize(topRight, 'eng', { logger: ()=>{}, tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', psm: 7 as any })
    const topTextRaw = (resFir?.data?.text || '').toUpperCase()
    const topText = topTextRaw.replace(/[^A-Z0-9]/g,' ')
    const mFirSpaced = topText.match(/([A-Z]{4,6})\s*([0-9]{6})\s*([A-Z]{2})/)
    const mFir = topText.match(/FMGWB[A-Z]?\d{6}[A-Z]{2}/) || topText.match(/[A-Z]{4,6}\d{6}[A-Z]{2}/)
    if (mFirSpaced && mFirSpaced[1] && mFirSpaced[2] && mFirSpaced[3]) {
      fir = `${mFirSpaced[1]}${mFirSpaced[2]}${mFirSpaced[3]}`
    } else if (mFir && mFir[0]) {
      fir = mFir[0]
    }
  } catch {}
  if (!fir){
    try {
      const bottomRight = await cropBottomRight(img)
      const resFir2 = await Tesseract.recognize(bottomRight, 'eng', { logger: ()=>{}, tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', psm: 7 as any })
      const brTextRaw = (resFir2?.data?.text || '').toUpperCase()
      const brText = brTextRaw.replace(/[^A-Z0-9]/g,' ')
      const mFirSpaced2 = brText.match(/([A-Z]{4,6})\s*([0-9]{6})\s*([A-Z]{2})/)
      const mFir2 = brText.match(/FMGWB[A-Z]?\d{6}[A-Z]{2}/) || brText.match(/[A-Z]{4,6}\d{6}[A-Z]{2}/)
      if (mFirSpaced2 && mFirSpaced2[1] && mFirSpaced2[2] && mFirSpaced2[3]) {
        fir = `${mFirSpaced2[1]}${mFirSpaced2[2]}${mFirSpaced2[3]}`
      } else if (mFir2 && mFir2[0]) {
        fir = mFir2[0]
      }
    } catch {}
  }
  const res = await Tesseract.recognize(img, 'eng', { logger: ()=>{}, tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', psm: 6 as any })
  const text = (res?.data?.text || '')
  const info = extractAll(text)
  info.file = path.basename(file)
  info.fir = isValidFir(fir || undefined) ? fir : (info.fir ?? null)
  // forzature richieste: produttore e intermediario
  info.produttore_cf = '08934760961'
  info.intermediario_cf = '08486880019'
  return info
}

async function main(){
  const args = process.argv.slice(2)
  const dirIdx = args.indexOf('--dir')
  const outIdx = args.indexOf('--out')
  const dir = dirIdx>=0 ? args[dirIdx+1] : path.join(process.cwd(), 'fir dicembre 25')
  const out = outIdx>=0 ? args[outIdx+1] : path.join(process.cwd(), 'out', 'ocr.structured.json')
  const files = listImages(dir)
  if (files.length === 0){
    writeFileSync(out, JSON.stringify({ error: 'no_images_found', dir }, null, 2), 'utf-8')
    process.stdout.write(`no images in ${dir}\n`)
    return
  }
  const results: Structured[] = []
  for (let i=0;i<files.length;i++){
    const f = files[i]
    try {
      const r = await ocrOne(f)
      results.push(r)
      process.stdout.write(`OCR ${i+1}/${files.length} ${path.basename(f)} -> FIR=${r.fir || 'ND'} CER=${r.cer || 'ND'} QA=${r.quantitaAccettataKg ?? r.quantitaDichiarataKg ?? 'ND'}\n`)
    } catch (e:any){
      results.push({ file: path.basename(f), fir: null, dataEmissione: null, cer: null, quantitaDichiarataKg: null, quantitaAccettataKg: null, um: null, provenienza: null, targaVeicolo: null, produttore_cf: null, destinatario_cf: null, intermediario_cf: null })
    }
  }
  writeFileSync(out, JSON.stringify({ items: results }, null, 2), 'utf-8')
  process.stdout.write(`${out}\n`)
}
main()
