
import { readFileSync } from 'fs'

const FILE = 'fir dicembre 25/rimanenti dicembre 2025.json'

function main(){
  const raw = readFileSync(FILE, 'utf-8')
  const data = JSON.parse(raw)
  console.log('Total items:', data.length)
  
  const item = data[0]
  console.log('Item 0 keys:', Object.keys(item))
  if(item.fir) console.log('Item 0 has FIR')

  // Simulate build
  const idx = 0
  const base = 6200000
  const anno = 2025
  const fir = item.fir

  // Logic from sendFirBatchFast
  const cf = String(fir?.identificativi?.codiceFIR||'')
  // const prog = normInt(cf) ...
  // prog = base + idx + 1
  const prog = base + idx + 1
  
  const payload = {
    riferimenti: {
      numero_registrazione: { anno: Number(anno), progressivo: String(prog) },
      data_ora_registrazione: "2025-12-31T14:00:00Z",
      causale_operazione: 'RE'
    },
    // ...
  }
  
  console.log('Sample Progressive:', payload.riferimenti.numero_registrazione.progressivo)
  console.log('Type:', typeof payload.riferimenti.numero_registrazione.progressivo)
}

main()
