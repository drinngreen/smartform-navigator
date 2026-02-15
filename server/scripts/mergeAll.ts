
import { readFileSync, writeFileSync } from 'fs'

const OUT_FILE = 'out/all_movements.json'

const FILES = [
  'out/payload_global_xml.json',
  'out/payload_multy_xml.json',
  'fir dicembre 25/registro_rentri_20251231_135125.json',
  'out/ocr.payload.global.json',
  'out/ocr.payload.multy.json'
]

function main(){
  let all: any[] = []

  for(const f of FILES){
    try {
      const raw = readFileSync(f, 'utf-8')
      const obj = JSON.parse(raw)
      
      let items: any[] = []
      if (Array.isArray(obj)) {
        items = obj
      } else if (Array.isArray(obj?.fir)) {
        items = obj.fir
      } else if (Array.isArray(obj?.movimenti)) {
        // OCR format: { movimenti: [...] }
        items = obj.movimenti
      } else {
        items = [obj]
      }

      // Normalize to {fir: ...} structure expected by sender
      items = items.map(x => {
        // If it's already {fir: ...}, keep it
        if (x.fir) return x
        // If it's a movement payload (OCR/XML mapped), wrap it in a structure 
        // that buildPayloadFromFir can consume or use directly if it matches.
        // Actually sendFirBatchFast expects {fir: ...} OR a pre-built payload?
        // Let's check sendFirBatchFast.ts: buildPayloadFromFir takes "fir".
        // But our XML converter produced {fir: ...}.
        // The OCR payloads are ALREADY Rentri payloads (riferimenti, rifiuto...).
        // We need to wrap them so they look like "fir" or modify sender to handle pre-built.
        // Hack: store them as { payload: x } and handle in sender? 
        // Or reconstruct a fake "fir" from the payload?
        
        if (x.riferimenti && x.rifiuto) {
          // This is a pre-built payload.
          // Let's wrap it in a special way: { prebuilt: x }
          return { prebuilt: x }
        }
        
        return {fir: x}
      })
      
      console.log(`Loaded ${items.length} from ${f}`)
      all = all.concat(items)
    } catch(e){
      console.error(`Error loading ${f}:`, e)
    }
  }

  console.log(`Total merged items: ${all.length}`)
  writeFileSync(OUT_FILE, JSON.stringify(all, null, 2))
}

main()
