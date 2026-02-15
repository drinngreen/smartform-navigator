
import XLSX from 'xlsx'
import { join } from 'path'
import { writeFileSync } from 'fs'

const DIR = 'formulari solo Multy'
const FILES = [
  'EXPORT FORMULARI TRASPORTO IN CONTO PROPRIO - MULTY PROGET DICEMBRE.xls',
  'EXPORT FORMULARI PRODUTTORE DESTINATARIO - MULTY PROGET DICEMBRE.xls'
]
const OUT_FILE = 'out/formulari_multy_excel.json'

function excelDateToISO(serial: number): string {
  if (!serial) return new Date().toISOString().split('T')[0]
  const utc_days  = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;                                        
  const date_info = new Date(utc_value * 1000);
  return date_info.toISOString().split('T')[0];
}

function excelDateToDateTimeISO(serialDate: number, serialTime: number): string {
  if (!serialDate) return new Date().toISOString()
  const datePart = excelDateToISO(serialDate)
  
  // Time is a fraction of a day
  if (serialTime != null) {
    const totalSeconds = Math.floor(serialTime * 86400)
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    // const s = totalSeconds % 60
    const hh = String(h).padStart(2, '0')
    const mm = String(m).padStart(2, '0')
    return `${datePart}T${hh}:${mm}:00`
  }
  
  return `${datePart}T00:00:00`
}

function mapRowToFir(row: any): any {
  const emissione = excelDateToISO(row.Data)
  const inizio = excelDateToDateTimeISO(row.DataInizio, row.OraInizio)
  
  // Clean up FIR code
  let codFir = row.rif_form || ''
  // If format is like "FRVKM 000246 VH", it's fine.
  
  return {
    fir: {
      identificativi: {
        codiceFIR: codFir,
        dataEmissione: emissione,
        numeroFormulario: String(row.Cod_Form || '')
      },
      produttore: {
        codice_fiscale: String(row.CodiceFiscaleProd || ''),
        denominazione: row.RagioneProd || '',
        unita_locale: {
          indirizzo: row.IndirizzoUL || row.ProduttoreIndirizzo || '',
          civico: '', // Often merged in address
          comune: row.ProduttoreComIstat_UL ? String(row.ProduttoreComIstat_UL) : '', // Assuming ISTAT code or name? Row shows "194" which is likely a code, but CSV shows "VIA RIVALTA 40". Wait, header "ProduttoreComIstat" has "194".
          // Actually RENTRI usually expects string names or specific structures. 
          // Our sender script might expect specific fields. 
          // Let's populate generic fields.
        }
      },
      destinatario: {
        codice_fiscale: String(row.CodiceFiscaleDest || ''),
        denominazione: row.RagioneDest || '',
        unita_locale: {
          indirizzo: row.IndirizzoDest || '',
        }
      },
      trasportatore: {
        codice_fiscale: String(row.CodiceFiscaleVett || ''),
        denominazione: row.RagioneVett || '',
        targa: row.TargaAutomezzo || '',
        conducente: `${row.NomeCond || ''} ${row.CognomeCon || ''}`.trim(),
        data_ora_inizio: inizio
      },
      rifiuto: {
        codiceEER: String(row.RifCod || ''),
        descrizione: '', // Not in excel explicitly?
        quantitaDichiarataKg: Number(row.Quantita || 0),
        unitaMisura: String(row.Codice_UM || 'kg'),
        stato_fisico: '', // Not seen
        pericoloso: false, // Infer from CER?
        destinazione: row.DestRifiuto || 'R',
        operazione: row.Cod_Rec || row.Cod_Smalt || ''
      },
      intermediario: {
        codice_fiscale: String(row.CodiceFiscaleIntermed || ''),
        denominazione: row.RagioneIntermed || ''
      },
      annotazioni: row.Annotazioni || ''
    }
  }
}

function main(){
  let allRows: any[] = []

  for(const f of FILES){
    const path = join(process.cwd(), DIR, f)
    console.log(`Processing: ${f}`)
    try {
      const wb = XLSX.readFile(path)
      const sheetName = wb.SheetNames[0]
      const ws = wb.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json(ws)
      console.log(`  Found ${data.length} rows`)
      allRows = allRows.concat(data)
    } catch(e){
      console.error('Error:', e)
    }
  }

  const payload = allRows.map(mapRowToFir)
  console.log(`Total mapped: ${payload.length}`)
  
  writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2))
  console.log(`Saved to ${OUT_FILE}`)
}

main()
