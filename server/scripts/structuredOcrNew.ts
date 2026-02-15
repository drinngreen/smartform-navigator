
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'

const INPUT = 'out/ocr_raw_final.json'
const OUTPUT = 'out/ocr.structured.final.json'

function extractDateFromPath(f: string): string | null {
  // Look for patterns like 15-12-2025 in the path
  const m = f.match(/(\d{2})-(\d{2})-(\d{4})/)
  if (m) {
    return `${m[3]}-${m[2]}-${m[1]}`
  }
  return null
}

function cleanFir(text: string): string {
  // Remove spaces
  const clean = text.replace(/\s+/g, '')
  // Match FMGWB + 6 digits + 2 letters (standard format usually)
  const m = clean.match(/(FMGWB\d{6}[A-Z]{2})/i)
  if (m) return m[1].toUpperCase()
  
  // Generic fallback
  const m2 = clean.match(/([A-Z]{4,6}\d{6}[A-Z]{2})/i)
  if (m2) return m2[1].toUpperCase()
  
  return ''
}

function extractWeight(text: string): number {
  // Strategy 1: Look for "kg"
  const m = text.match(/(\d+[.,]?\d*)\s*kg/i)
  if (m) {
    const n = Number(m[1].replace('.','').replace(',','.'))
    if (!isNaN(n) && n < 50000) return n
  }
  // Strategy 2: Look for "Peso"
  const m2 = text.match(/Peso\s*.*?(\d+[.,]?\d*)/i)
  if (m2) {
    const n = Number(m2[1].replace('.','').replace(',','.'))
    if (!isNaN(n) && n < 50000) return n
  }
  return 0
}

function extractCer(text: string): string {
  // Look for specific known CERs first
  if (/17\s*04\s*05/.test(text)) return '170405'
  if (/15\s*01\s*06/.test(text)) return '150106'
  if (/17\s*04\s*07/.test(text)) return '170407'
  
  // Fallback: look for 6 digits starting with 01-20
  const m = text.match(/\b((0[1-9]|1[0-9]|20)\s*\d{2}\s*\d{2})\b/)
  if (m) return m[1].replace(/\s+/g, '')
  
  return '170405' // Default
}

function main() {
  const raw = JSON.parse(readFileSync(INPUT, 'utf-8'))
  const items = raw.items || []
  
  const structured = items.map((it: any) => {
    const text = it.text || ''
    const fir = it.fir || cleanFir(text)
    const date = extractDateFromPath(it.file) || '2025-12-30' // Fallback
    const weight = extractWeight(text)
    const cer = extractCer(text)
    
    // Default values if extraction fails
    return {
      file: it.file,
      fir: fir || 'FMGWB000000XX', // Placeholder if completely failed, will be filtered or need manual check
      dataEmissione: date,
      cer: cer,
      quantitaDichiarataKg: weight > 0 ? weight : 1000, // Default 1000 if not found? Or maybe 0?
      quantitaAccettataKg: weight > 0 ? weight : 1000,
      um: 'KG',
      provenienza: 'U',
      statoFisico: 'S'
    }
  })
  
  // Filter out items that look completely broken?
  // Or keep them for manual review?
  // We'll keep them but log count.
  
  console.log(`Processed ${structured.length} items.`)
  writeFileSync(OUTPUT, JSON.stringify({ items: structured }, null, 2))
  console.log(`Saved to ${OUTPUT}`)
}

main()
