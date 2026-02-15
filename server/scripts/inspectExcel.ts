
import XLSX from 'xlsx'
import { join } from 'path'

const DIR = 'formulari solo Multy'
const FILES = [
  'EXPORT FORMULARI TRASPORTO IN CONTO PROPRIO - MULTY PROGET DICEMBRE.xls',
  'EXPORT FORMULARI PRODUTTORE DESTINATARIO - MULTY PROGET DICEMBRE.xls'
]

function main(){
  for(const f of FILES){
    const path = join(process.cwd(), DIR, f)
    console.log(`\nReading: ${f}`)
    try {
      const wb = XLSX.readFile(path)
      const sheetName = wb.SheetNames[0]
      const ws = wb.Sheets[sheetName]
      
      // Get headers (first row)
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 })
      if(data.length > 0){
        console.log('Headers:', data[0])
        console.log('First Row Data:', data[1])
      } else {
        console.log('Empty sheet')
      }
    } catch(e){
      console.error('Error:', e)
    }
  }
}

main()
