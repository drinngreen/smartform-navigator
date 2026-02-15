
import { readFileSync } from 'fs'

const SOURCE_JSON = 'out/formulari_multy_excel.json'
const REPORT_CSV = 'out/report_multy_final.csv'
const BASE_PROGRESSIVE = 8000000

function main() {
  // 1. Load Source
  console.log('Loading source JSON...')
  const sourceRaw = readFileSync(SOURCE_JSON, 'utf-8')
  const sourceItems = JSON.parse(sourceRaw)
  const totalSource = sourceItems.length
  console.log(`Source items: ${totalSource}`)

  // 2. Load Report CSV
  console.log('Loading Report CSV...')
  const csvRaw = readFileSync(REPORT_CSV, 'utf-8')
  const csvLines = csvRaw.split('\n').filter(l => l.trim().length > 0)
  
  // Map progressive -> RentriID
  const sentMap = new Map<number, string>()
  
  // Skip header
  for (let i = 1; i < csvLines.length; i++) {
    const line = csvLines[i]
    const parts = line.split(';')
    // Timestamp;TransazioneID;Anno;Progressivo;ID_Movimento_RENTRI
    if (parts.length >= 5) {
      const prog = Number(parts[3])
      const rentriId = parts[4]
      if (!isNaN(prog) && rentriId && rentriId.startsWith('M1')) {
        sentMap.set(prog, rentriId)
      }
    }
  }
  console.log(`Found ${sentMap.size} confirmed movements in CSV.`)

  // 3. Verify exact coverage
  const missing: number[] = []
  const verified: number[] = []

  // Expect progressives: Base + 1 ... Base + Total
  for (let i = 0; i < totalSource; i++) {
    const expectedProg = BASE_PROGRESSIVE + (i + 1)
    if (sentMap.has(expectedProg)) {
      verified.push(expectedProg)
    } else {
      missing.push(expectedProg)
    }
  }

  console.log('\n--- VERIFICATION RESULT ---')
  console.log(`Expected Range: ${BASE_PROGRESSIVE + 1} to ${BASE_PROGRESSIVE + totalSource}`)
  console.log(`Verified: ${verified.length} / ${totalSource}`)
  
  if (missing.length === 0) {
    console.log('✅ MATHEMATICAL CERTAINTY: ALL 107 ITEMS HAVE A CONFIRMED RENTRI ID.')
  } else {
    console.log(`❌ MISSING ${missing.length} ITEMS!`)
    console.log('Missing Progressives:', missing.slice(0, 10), '...')
    
    // Check if we have them with a different progressive offset? 
    // Maybe the user ran it multiple times and indices shifted?
    // But logically, if we used idx 0..106, they should be there.
  }

  // Bonus: Print first and last verification
  if (verified.length > 0) {
    const first = verified[0]
    const last = verified[verified.length - 1]
    console.log(`First Verified: ${first} -> ID: ${sentMap.get(first)}`)
    console.log(`Last Verified : ${last} -> ID: ${sentMap.get(last)}`)
  }
}

main()
