import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { XMLParser } from 'fast-xml-parser'

type Item = {
  file: string
  fir?: string | null
  dataEmissione?: string | null
  cer?: string | null
  quantitaDichiarataKg?: number | null
  quantitaAccettataKg?: number | null
  um?: 'KG' | 'L' | null
  provenienza?: string | null
  statoFisico?: string | null
  dataArrivo?: string | null
  oraArrivo?: string | null
}

function loadStructured(p:string): Item[] {
  const raw = readFileSync(p,'utf-8')
  const obj = JSON.parse(raw)
  return Array.isArray(obj?.items) ? obj.items : []
}

function normFir(f?: string | null){
  const s = String(f || '').toUpperCase()
  if (!s) return null
  return s
}
function formatFirWithSpaces(s?: string | null){
  const raw = String(s || '').toUpperCase()
  const compact = raw.replace(/[^A-Z0-9]/g,'')
  const m = compact.match(/^([A-Z]{4,6})(\d{6})([A-Z]{2})$/)
  if (m) return `${m[1]} ${m[2]} ${m[3]}`
  const m2 = raw.match(/^([A-Z]{4,6})\s*(\d{6})\s*([A-Z]{2})$/)
  if (m2) return `${m2[1]} ${m2[2]} ${m2[3]}`
  return ''
}
function normDate(d?: string | null){
  const s = String(d || '').trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd,mm,yyyy] = s.split('/')
    return `${yyyy}-${mm}-${dd}`
  }
  return null
}
function isCoherentDate(date?: string | null, annoLimit:number){
  const s = normDate(date)
  if (!s) return false
  const y = Number(s.slice(0,4))
  return y <= annoLimit && y >= 2000
}
function clampFirDate(date?: string | null){
  const s = normDate(date)
  if (!s) return null
  let y = 2025
  let m = Number(s.slice(5,7))
  let d = Number(s.slice(8,10))
  if (m < 11) m = 11
  if (m > 12) m = 12
  const maxDay = m===11 ? 30 : 31
  if (d < 1) d = 1
  if (d > maxDay) d = maxDay
  const mm = String(m).padStart(2,'0')
  const dd = String(d).padStart(2,'0')
  return `${y}-${mm}-${dd}`
}
function normTime(t?: string | null){
  const s = String(t || '').trim().replace('.',':')
  const m = s.match(/^(\d{1,2}):(\d{2})$/)
  if (m) {
    const hh = m[1].padStart(2,'0')
    return `${hh}:${m[2]}:00`
  }
  return '12:00:00'
}
function pickQuantity(it: Item){
  const qa = Number(it.quantitaAccettataKg ?? 0)
  const qd = Number(it.quantitaDichiarataKg ?? 0)
  const q = qa > 0 ? qa : (qd > 0 ? qd : 1)
  return Number(q.toFixed(3))
}
function buildOne(it: Item, progressivoStr: string, annoDefault: number){
  const firCode = normFir(it.fir)
  const firDate = normDate(it.dataEmissione)
  const anno = annoDefault
  const progressivo = progressivoStr
  const dataOraReg = `${annoDefault}-12-31T14:00:00Z`
  const cerRaw = String(it.cer || '').replace(/[^0-9]/g,'').padStart(6,'0').slice(0,6)
  const cer = /^17040[57]$/.test(cerRaw) ? cerRaw : '170405'
  const sf = (it.statoFisico || 'S').toUpperCase()
  const provenienza = (it.provenienza || 'U').toUpperCase()
  const quantita = pickQuantity(it)
  const um = (it.um || 'KG').toLowerCase() === 'l' ? 'l' : 'kg'
  const firSpaced = formatFirWithSpaces(firCode)
  const firDateClamped = clampFirDate(firDate || '')
  const annotDate = firDateClamped ? `${firDateClamped.slice(8,10)}/${firDateClamped.slice(5,7)}/${firDateClamped.slice(0,4)}` : ''
  const annot = firSpaced && firDate ? `FIR: ${firSpaced} del ${annotDate}` : (firSpaced ? `FIR: ${firSpaced}` : '')
  return {
    riferimenti: {
      numero_registrazione: { anno, progressivo },
      data_ora_registrazione: dataOraReg,
      causale_operazione: 'RE',
      fir: (firSpaced && firDateClamped) ? { codice_fir: firSpaced, data_emissione: firDateClamped } : undefined
    },
    rifiuto: {
      codice_eer: cer,
      stato_fisico: sf,
      quantita: { valore: quantita, unita_misura: um },
      provenienza
    },
    intermediario: { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' },
    intermediari: [ { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' } ],
    annotazioni: annot
  }
}

async function main(){
  const args = process.argv.slice(2)
  const inIdx = args.indexOf('--in')
  const outGIdx = args.indexOf('--outGlobal')
  const outMIdx = args.indexOf('--outMulty')
  const gxIdx = args.indexOf('--globalXml')
  const mxIdx = args.indexOf('--multyXml')
  const limitIdx = args.indexOf('--limit')
  const sGIdx = args.indexOf('--startGlobal')
  const sMIdx = args.indexOf('--startMulty')
  const input = inIdx>=0 ? args[inIdx+1] : path.join(process.cwd(),'out','ocr.structured.json')
  const outGlobal = outGIdx>=0 ? args[outGIdx+1] : path.join(process.cwd(),'out','ocr.payload.global.json')
  const outMulty = outMIdx>=0 ? args[outMIdx+1] : path.join(process.cwd(),'out','ocr.payload.multy.json')
  const globalXml = gxIdx>=0 ? args[gxIdx+1] : path.join(process.cwd(),'test','registro Global Reco al 2412.xml')
  const multyXml  = mxIdx>=0 ? args[mxIdx+1] : path.join(process.cwd(),'test','registro Multyproget al2412.xml')
  const limit = limitIdx>=0 ? Number(args[limitIdx+1]) : 634
  const startGlobalOverride = sGIdx>=0 ? Number(args[sGIdx+1]) : 0
  const startMultyOverride  = sMIdx>=0 ? Number(args[sMIdx+1]) : 0
  const numericArgs = args.filter(a => /^\d+$/.test(a)).map(a => Number(a))
  const startGlobalPos = startGlobalOverride>0 ? startGlobalOverride : (numericArgs.length>=1 ? numericArgs[0] : 0)
  const limitPos = limitIdx>=0 ? Number(args[limitIdx+1]) : (numericArgs.length>=2 ? numericArgs[1] : limit)
  const items = loadStructured(input)
  const max = Math.min(items.length, 634)
  const slice = items.slice(0, max).filter(it => {
    const q = pickQuantity(it)
    // Relaxed filter: just check if we have some minimal data
    return q > 0
  }).slice(0, Math.max(1, limit))
  const annoDefault = 2025
  function parseRegistroXml(xml:string){
    const xp = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true })
    const obj = xp.parse(xml) || {}
    const reg = obj?.RegistroCronologico?.Registrazioni?.Movimento
    const arr = Array.isArray(reg) ? reg : (reg ? [reg] : [])
    return arr.map((m:any)=>({ anno: Number(m?.Anno||annoDefault), progressivo: Number(m?.Progressivo||0) }))
  }
  function maxProgressivo(xmlPath:string){
    try {
      const xml = readFileSync(xmlPath,'utf-8')
      const arr = parseRegistroXml(xml)
      const m = arr.reduce((a,b)=> (b.anno===annoDefault && b.progressivo>a?b.progressivo:a), 0)
      return m>0?m: (xmlPath.includes('Global')?601367:801367)
    } catch { return (xmlPath.includes('Global')?601367:801367) }
  }
  const startGlobal = maxProgressivo(globalXml)
  const startMulty  = maxProgressivo(multyXml)
  function maxFromLog(registryId:string){
    try {
      const raw = readFileSync(path.join(process.cwd(),'out','invio_massivo.log'),'utf-8')
      const lines = raw.trim().split(/\r?\n/)
      let max = 0
      for (const l of lines){
        try {
          const j = JSON.parse(l)
          if (j?.kind==='RESULT' && j?.accepted===1 && j?.registryId===registryId){
            let p = 0
            const key = String(j?.key||'')
            const m = key.match(/^2025_(\d+)$/)
            if (m) p = Number(m[1])
            if (!p && j?.body){
              try {
                const body = JSON.parse(String(j.body))
                const arr = Array.isArray(body?.esito?.numero_registrazioni) ? body.esito.numero_registrazioni : []
                for (const rec of arr){
                  const prog = Number(rec?.progressivo||0)
                  if (prog>p) p = prog
                }
              } catch {}
            }
            if (p>max) max=p
          }
        } catch {}
      }
      return max
    } catch { return 0 }
  }
  const startGlobalFinal = (startGlobalPos>0 ? startGlobalPos : (startGlobalOverride>0 ? startGlobalOverride : Math.max(startGlobal, maxFromLog('R6QSWHZ6HJV'))))
  const startMultyFinal  = (startMultyOverride>0  ? startMultyOverride  : Math.max(startMulty,  maxFromLog('RQEL39R7NS0')))
  function gatherUsed(registryId:string){
    const used = new Set<number>()
    try {
      const rawCsv = readFileSync(path.join(process.cwd(),'out','ocr.accepted.csv'),'utf-8')
      const lines = rawCsv.trim().split(/\r?\n/).slice(1)
      for (const l of lines){
        const parts = l.split(',')
        if (parts.length>=3){
          const anno = Number(parts[0]||0)
          const prog = Number(parts[1]||0)
          const reg  = String(parts[2]||'')
          if (anno===annoDefault && reg===registryId && prog>0) used.add(prog)
        }
      }
    } catch {}
    try {
      const rawLog = readFileSync(path.join(process.cwd(),'out','invio_massivo.log'),'utf-8')
      const lines = rawLog.trim().split(/\r?\n/)
      for (const l of lines){
        try {
          const j = JSON.parse(l)
          if (j?.kind==='SEND' && j?.registryId===registryId){
            const key = String(j?.key||'')
            const m = key.match(/^2025_(\d+)$/)
            if (m) used.add(Number(m[1]))
          }
          if (j?.kind==='RESULT' && j?.registryId===registryId){
            const key = String(j?.key||'')
            const m = key.match(/^2025_(\d+)$/)
            if (m) used.add(Number(m[1]))
            if (j?.accepted===1 && j?.body){
              try {
                const body = JSON.parse(String(j.body))
                const arr = Array.isArray(body?.esito?.numero_registrazioni) ? body.esito.numero_registrazioni : []
                for (const rec of arr){
                  const prog = Number(rec?.progressivo||0)
                  if (prog>0) used.add(prog)
                }
              } catch {}
            }
          }
        } catch {}
      }
    } catch {}
    return used
  }
  let nextGlobalSeq = Math.max(startGlobalFinal || 0, 900001)
  let nextMultySeq  = Math.max(startMultyFinal  || 0, 950001)
  const usedGlobal = gatherUsed('R6QSWHZ6HJV')
  const usedMulty  = gatherUsed('RQEL39R7NS0')
  function nextGlobal(){
    while (usedGlobal.has(nextGlobalSeq)) nextGlobalSeq++
    const v = String(nextGlobalSeq)
    usedGlobal.add(nextGlobalSeq)
    nextGlobalSeq++
    return v
  }
  function nextMulty(){
    while (usedMulty.has(nextMultySeq)) nextMultySeq++
    const v = String(nextMultySeq)
    usedMulty.add(nextMultySeq)
    nextMultySeq++
    return v
  }
  const global = slice.map((it) => buildOne(it, nextGlobal(), annoDefault))
  const multy  = slice.map((it) => buildOne(it, nextMulty(),  annoDefault))
  writeFileSync(outGlobal, JSON.stringify({ movimenti: global }, null, 2), 'utf-8')
  writeFileSync(outMulty, JSON.stringify({ movimenti: multy }, null, 2), 'utf-8')
  process.stdout.write(`${outGlobal}\n${outMulty}\n`)
}
main()
