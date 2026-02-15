
import { readFileSync } from 'fs'
const file = "fir dicembre 25/registro_rentri_20251231_135125.json"
try {
  const raw = readFileSync(file, 'utf-8')
  console.log('File length:', raw.length)
  const obj = JSON.parse(raw)
  console.log('Is Array?', Array.isArray(obj))
  if (Array.isArray(obj)) {
    console.log('Length:', obj.length)
    console.log('First item keys:', Object.keys(obj[0]))
    console.log('First item has fir?', !!obj[0].fir)
  } else {
    console.log('Keys:', Object.keys(obj))
    console.log('Has fir?', !!obj.fir)
  }
} catch (e) {
  console.error(e)
}
