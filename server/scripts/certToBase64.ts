
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'

// Path to certificate (found in bridge-service/certificato.p12 based on previous LS)
// Also present in root if copied, but let's check.
const CERT_PATH = path.resolve('bridge-service/certificato.p12')
const OUT_TXT = 'cert_base64.txt'

try {
  console.log(`Reading certificate from: ${CERT_PATH}`)
  const buffer = readFileSync(CERT_PATH)
  const base64 = buffer.toString('base64')
  
  writeFileSync(OUT_TXT, base64, 'utf-8')
  
  console.log(`\nBase64 string successfully generated!`)
  console.log(`Length: ${base64.length} chars`)
  console.log(`Saved to: ${path.resolve(OUT_TXT)}`)
  console.log(`\nPreview (first 50 chars): ${base64.slice(0,50)}...`)
  
} catch (e:any) {
  console.error('Error:', e.message)
}
