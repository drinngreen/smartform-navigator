
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { XMLParser } from 'fast-xml-parser'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_"
})

const OUT_GLOBAL = 'out/payload_global_xml.json'
const OUT_MULTY = 'out/payload_multy_xml.json'
const TEST_DIR = 'test'

function parseFile(f: string): any[] {
  const content = readFileSync(join(TEST_DIR, f), 'utf-8')
  const xml = parser.parse(content)
  const registrazioni = xml?.RegistroCronologico?.Registrazioni?.Movimento
  if (Array.isArray(registrazioni)) return registrazioni
  if (registrazioni) return [registrazioni]
  return []
}

function mapToFir(items: any[]){
  return items.map((m: any, idx: number) => {
    const cer = m.CodEERMat || m.rifiuto?.codiceEER || 'MANCANTE'
    const qty = m.Quantita || 0
    const date = m.DataRegistrazione || new Date().toISOString().slice(0,10)
    
    return {
      fir: {
        identificativi: {
          codiceFIR: String(idx + 1), 
          dataEmissione: date
        },
        rifiuto: {
          codiceEER: cer,
          quantitaDichiarataKg: qty,
          unitaMisura: m.UnitaMisura || 'KG'
        },
        conferimentoDestinatario: {
          quantitaAccettataKg: qty,
          dataOraArrivo: date
        }
      }
    }
  })
}

function main(){
  // 1. Global Reco
  const globalRaw = parseFile('registro Global Reco al 2412.xml')
  const globalMapped = mapToFir(globalRaw)
  writeFileSync(OUT_GLOBAL, JSON.stringify(globalMapped, null, 2))
  console.log(`Global: ${globalMapped.length} items -> ${OUT_GLOBAL}`)

  // 2. Multyproget
  const multyRaw = parseFile('registro Multyproget al2412.xml')
  const multyMapped = mapToFir(multyRaw)
  writeFileSync(OUT_MULTY, JSON.stringify(multyMapped, null, 2))
  console.log(`Multy: ${multyMapped.length} items -> ${OUT_MULTY}`)
}

main()
