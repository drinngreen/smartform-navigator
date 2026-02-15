import sharp from 'sharp'
import Tesseract from 'tesseract.js'
import { createWriteStream, writeFileSync } from 'fs'
import path from 'path'

async function preprocess(file:string){
  const buf = await sharp(file).resize({ width: 2000, withoutEnlargement: false }).grayscale().normalize().toBuffer()
  return buf
}

async function cropTopRight(buf:Buffer){
  const img = sharp(buf)
  const meta = await img.metadata()
  const w = meta.width || 2000
  const h = meta.height || 2000
  const cropW = Math.floor(w*0.45)
  const cropH = Math.floor(h*0.25)
  const left = w - cropW
  const top = 0
  return await img.extract({ left, top, width: cropW, height: cropH }).toBuffer()
}

async function cropBottomRight(buf:Buffer){
  const img = sharp(buf)
  const meta = await img.metadata()
  const w = meta.width || 2000
  const h = meta.height || 2000
  const cropW = Math.floor(w*0.50)
  const cropH = Math.floor(h*0.22)
  const left = w - cropW
  const top = h - cropH
  return await img.extract({ left, top, width: cropW, height: cropH }).toBuffer()
}

function isValidFir(s?:string){
  if (!s) return false
  const v = String(s).replace(/[^A-Z0-9]/gi,'').toUpperCase()
  if (v.length < 12 || v.length > 18) return false
  if (v.startsWith('FIR') || v.startsWith('FIRMA') || v.includes('GLOBAL') || v.includes('RECO')) return false
  if (/^FMGWB[A-Z]?\d{6}[A-Z]{2}$/.test(v)) return true
  if (/^[A-Z]{4,6}\d{6}[A-Z]{2}$/.test(v)) return true
  return false
}

async function readFirFromRegion(buf:Buffer){
  const res = await Tesseract.recognize(buf, 'eng', { logger: ()=>{}, tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', psm: 7 as any })
  const text = (res?.data?.text || '').toUpperCase().replace(/[^A-Z0-9]/g,' ')
  const m = text.match(/FMGWB[A-Z]?\d{6}[A-Z]{2}/) || text.match(/[A-Z]{4,6}\d{6}[A-Z]{2}/)
  const fir = m && m[0] ? m[0] : ''
  return isValidFir(fir) ? fir : ''
}

async function main(){
  const args = process.argv.slice(2)
  const fIdx = args.indexOf('--file')
  const outIdx = args.indexOf('--out')
  const file = fIdx>=0 ? args[fIdx+1] : ''
  const out = outIdx>=0 ? args[outIdx+1] : path.join(process.cwd(),'out','ocr.one.result.txt')
  if (!file){
    writeFileSync(out, 'ERR no file', 'utf-8')
    process.stdout.write(out+'\n')
    return
  }
  const pre = await preprocess(file)
  const top = await cropTopRight(pre)
  let fir = await readFirFromRegion(top)
  if (!fir){
    const bottom = await cropBottomRight(pre)
    fir = await readFirFromRegion(bottom)
  }
  const result = fir || 'ND'
  writeFileSync(out, `${path.basename(file)},${result}\n`, 'utf-8')
  process.stdout.write(out+'\n')
}
main()
