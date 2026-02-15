import { execSync } from 'child_process'
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'

function walk(dir:string, exts:string[]): string[] {
  const out: string[] = []
  const list = readdirSync(dir)
  for (const f of list) {
    const p = path.join(dir, f)
    const st = statSync(p)
    if (st.isDirectory()) out.push(...walk(p, exts))
    else {
      const ext = path.extname(f).toLowerCase().replace('.','')
      if (exts.includes(ext)) out.push(p)
    }
  }
  return out
}
function ocrImage(imgPath:string): string {
  try {
    const cmd = `tesseract "${imgPath}" stdout -l ita+eng --psm 6`
    const out = execSync(cmd, { stdio: ['ignore','pipe','ignore'], maxBuffer: 10_000_000 }).toString()
    return out
  } catch {
    return ''
  }
}
function pick(txt:string, re:RegExp, def:string=''): string {
  const m = txt.match(re)
  return m ? m[1] || m[0] : def
}
function normCode(s:string): string {
  return s.replace(/[^A-Z0-9]/gi,'').toUpperCase()
}
function normDate(s:string): string {
  const m = s.match(/(\d{4})[-\/](\d{2})[-\/](\d{2})/) || s.match(/(\d{2})[-\/](\d{2})[-\/](\d{4})/)
  if (!m) return new Date().toISOString().slice(0,10)
  if (m[1].length===4) return `${m[1]}-${m[2]}-${m[3]}`
  return `${m[3]}-${m[2]}-${m[1]}`
}
function normCap(s:string): string {
  const m = s.match(/\b(\d{5})\b/)
  return m ? m[1] : ''
}
function normProv(s:string): string {
  const m = s.match(/\b([A-Z]{2})\b/)
  return m ? m[1] : ''
}
function normCfPiva(s:string): string {
  const m = s.match(/\b\d{11}\b/)
  return m ? m[0] : ''
}
function normEer(s:string): string {
  const m = s.match(/\b\d{6}\b/)
  return m ? m[0] : ''
}
function normQtyKg(s:string): number {
  const m = s.match(/(\d+[.,]?\d*)\s*(kg|kilogrammi)/i)
  if (!m) return 0
  return Number(String(m[1]).replace(',','.'))
}
function buildFirFromText(txt:string) {
  const codiceFIR = normCode(pick(txt, /\b([A-Z]{5}\s*\d{6}\s*[A-Z]{2})\b/i, ''))
  const dataEmissione = normDate(pick(txt, /Data\s*Emissione[:\s]+([0-9\/\-]+)/i, ''))
  const prodDen = pick(txt, /Produttore[:\s]+([^\n]+)/i, '').trim() || 'GLOBAL RECO S.R.L.'
  const prodAddr = pick(txt, /Sede\s*Legale[:\s]+([^\n]+)/i, '').trim()
  const prodCap = normCap(prodAddr)
  const prodProv = normProv(prodAddr)
  const prodComune = pick(txt, /Sede\s*Legale[:\s]+.*\b([A-ZÀ-Ù][A-Za-zÀ-ù'\s]+)\b/i, '').trim() || 'MILANO'
  const ulAddr = pick(txt, /Unit[aà]\s*Locale[:\s]+([^\n]+)/i, '').trim()
  const ulCap = normCap(ulAddr)
  const ulComune = pick(txt, /Unit[aà]\s*Locale[:\s]+.*\b([A-ZÀ-Ù][A-Za-zÀ-ù'\s]+)\b/i, '').trim()
  const ulProv = normProv(ulAddr)
  const cfPiva = normCfPiva(txt) || '08934760961'
  const destDen = pick(txt, /Destinatario[:\s]+([^\n]+)/i, '').trim()
  const destAddr = pick(txt, /Sede\s*Impianto[:\s]+([^\n]+)/i, '').trim()
  const destCap = normCap(destAddr)
  const destComune = pick(txt, /Sede\s*Impianto[:\s]+.*\b([A-ZÀ-Ù][A-Za-zÀ-ù'\s]+)\b/i, '').trim()
  const destProv = normProv(destAddr)
  const traspDen = pick(txt, /Trasportatore[:\s]+([^\n]+)/i, '').trim() || prodDen
  const interDen = pick(txt, /Intermediario[:\s]+([^\n]+)/i, '').trim()
  const interAddr = pick(txt, /Intermediario[:\s]+.*\b([^\n]+)\b/i, '').trim()
  const interCf = normCfPiva(interAddr) || normCfPiva(txt)
  const eer = normEer(txt)
  const rifiutoDesc = pick(txt, /Descrizione[:\s]+([^\n]+)/i, '').trim() || 'Ferro e acciaio'
  const qty = normQtyKg(txt)
  const targa = pick(txt, /\b([A-Z]{2}\d{3}[A-Z]{2})\b/, '').toUpperCase()
  const dataInizio = pick(txt, /Inizio\s*Trasporto[:\s]+([0-9\/: \-]+)/i, '')
  const dataArrivo = pick(txt, /Arrivo[:\s]+([0-9\/: \-]+)/i, '')
  const out = {
    fir: {
      identificativi: {
        codiceFIR: codiceFIR || 'FMGWB000001AA',
        dataEmissione,
        numeroRegistroProduttore: null
      },
      produttore: {
        denominazione: prodDen,
        sedeLegale: {
          indirizzo: prodAddr || 'PIAZZA IV NOVEMBRE 4',
          cap: prodCap || '20124',
          comune: prodComune || 'MILANO',
          provincia: prodProv || 'MI',
          stato: 'IT'
        },
        unitaLocale: {
          indirizzo: ulAddr || 'VIA SOMMARIVA 35',
          cap: ulCap || '10022',
          comune: ulComune || 'CARMAGNOLA',
          provincia: ulProv || 'TO',
          stato: 'IT'
        },
        codiceFiscalePIVA: cfPiva || '08934760961',
        estremiAutorizzazione: null
      },
      detentore: {
        tipoDetentore: 'PRODUTTORE',
        denominazione: prodDen
      },
      destinatario: {
        denominazione: destDen || 'DESTINATARIO SRL',
        sedeImpianto: {
          indirizzo: destAddr || 'VIA ESEMPIO 1',
          cap: destCap || '00000',
          comune: destComune || 'COMUNE ESEMPIO',
          provincia: destProv || 'AA',
          stato: 'IT'
        },
        codiceFiscalePIVA: normCfPiva(destAddr) || '00000000000',
        alboGestori: { numeroIscrizione: null, dataIscrizione: null, sezione: null, categoria: null },
        tipoOperazione: null
      },
      trasportatore: {
        denominazione: traspDen || 'GLOBAL RECO S.R.L.',
        sedeLegale: { indirizzo: 'PIAZZA IV NOVEMBRE 4', comune: 'MILANO', provincia: 'MI', stato: 'IT' },
        codiceFiscalePIVA: cfPiva || '08934760961',
        alboGestori: { numeroIscrizione: null, dataIscrizione: null, sezione: null, categoria: null }
      },
      intermediario: {
        denominazione: interDen || 'MULTYPROGET S.R.L.',
        indirizzo: interAddr || 'VIA RIVAROSSA 18/20, 10060 PISCINA (TO)',
        codiceFiscalePIVA: interCf || '08486880019',
        alboGestori: { numeroIscrizione: null, provinciaIscrizione: null, dataIscrizione: null }
      },
      rifiuto: {
        codiceEER: eer || '170405',
        descrizione: rifiutoDesc,
        statoFisico: 'S',
        quantitaDichiarataKg: qty || 1,
        unitaMisura: 'KG',
        pericoloso: false,
        caratteristichePericolo: [],
        provenienza: 'U'
      },
      trasporto: {
        targaVeicolo: targa || 'AA000AA',
        tipoTrasporto: 'TRATTA_UNICA',
        microraccolta: true,
        intermodale: false,
        trasportoADR: false,
        dataOraInizioTrasporto: dataInizio || `${dataEmissione}T08:00:00`,
        conducente: { nome: '', cognome: '' }
      },
      conferimentoDestinatario: {
        quantitaRicevutaKg: qty || 1,
        quantitaAccettataKg: qty || 1,
        accettatoPerIntero: true,
        dataOraArrivo: dataArrivo || `${dataEmissione}T14:00:00`,
        firmaDestinatario: destDen || 'DESTINATARIO SRL',
        note: null
      },
      annotazioni: null
    }
  }
  return out
}
function transformJsonInput(obj:any): any[] {
  const arr: any[] = []
  const list = Array.isArray(obj?.fir) ? obj.fir : (Array.isArray(obj) ? obj : [])
  for (const item of list) {
    const fir = {
      identificativi: {
        codiceFIR: String(item?.identificativi?.codiceFIR || item?.codiceFIR || 'FMGWB000001AA'),
        dataEmissione: String(item?.identificativi?.dataEmissione || item?.dataEmissione || new Date().toISOString().slice(0,10)),
        numeroRegistroProduttore: item?.identificativi?.numeroRegistroProduttore ?? null
      },
      produttore: item?.produttore ?? {},
      detentore: item?.detentore ?? {},
      destinatario: item?.destinatario ?? {},
      trasportatore: item?.trasportatore ?? {},
      intermediario: item?.intermediario ?? {},
      rifiuto: item?.rifiuto ?? {},
      trasporto: item?.trasporto ?? {},
      conferimentoDestinatario: item?.conferimentoDestinatario ?? {},
      annotazioni: item?.annotazioni ?? null
    }
    arr.push({ fir })
  }
  return arr
}
function main() {
  const args = process.argv.slice(2)
  const dirIdx = args.indexOf('--dir')
  const jsonIdx = args.indexOf('--json')
  const outIdx = args.indexOf('--out')
  const srcDir = dirIdx >= 0 ? args[dirIdx+1] : ''
  const srcJson = jsonIdx >= 0 ? args[jsonIdx+1] : ''
  const outFile = outIdx >= 0 ? args[outIdx+1] : path.join(process.cwd(), 'out', 'fir.batch.json')
  if (!existsSync(path.dirname(outFile))) mkdirSync(path.dirname(outFile), { recursive: true })
  const results: any[] = []
  if (srcDir && existsSync(srcDir)) {
    const imgs = walk(srcDir, ['png','jpg','jpeg','tif','tiff'])
    for (const img of imgs) {
      const txt = ocrImage(img)
      const fir = buildFirFromText(txt)
      results.push(fir)
    }
  }
  if (srcJson && existsSync(srcJson)) {
    const raw = readFileSync(srcJson, 'utf-8')
    const obj = JSON.parse(raw)
    const transformed = transformJsonInput(obj)
    results.push(...transformed)
  }
  const final = { fir: results.map(x=>x.fir) }
  writeFileSync(outFile, JSON.stringify(final, null, 2), 'utf-8')
  process.stdout.write(outFile + '\n')
}
main()
