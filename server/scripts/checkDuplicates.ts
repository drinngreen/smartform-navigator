
import { readFileSync } from 'fs'

const F1 = 'out/payload_global_xml.json'
const F2 = 'out/payload_multy_xml.json'

function getKey(item:any){
  const f = item.fir
  return `${f.identificativi.codiceFIR}_${f.identificativi.dataEmissione}_${f.rifiuto.codiceEER}`
}

function main(){
  const list1 = JSON.parse(readFileSync(F1, 'utf-8'))
  const list2 = JSON.parse(readFileSync(F2, 'utf-8'))

  const set1 = new Set(list1.map(getKey))
  let dups = 0
  for(const item of list2){
    if(set1.has(getKey(item))) dups++
  }

  console.log(`Global Items: ${list1.length}`)
  console.log(`Multy Items: ${list2.length}`)
  console.log(`Identical Keys found: ${dups}`)
}

main()
