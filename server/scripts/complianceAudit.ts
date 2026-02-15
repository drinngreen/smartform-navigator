import axios from 'axios'
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs'
import { XMLParser } from 'fast-xml-parser'

const BRIDGE = 'http://localhost:8765'
const GLOBAL = { registryId: 'R6QSWHZ6HJV', filename: 'certificato.p12', issuer: '08934760961', xml: 'test/registro Global Reco al 2412.xml' }
const MULTY  = { registryId: 'RQEL39R7NS0', filename: 'multyproget.p12', issuer: '12347770013', xml: 'test/registro Multyproget al2412.xml' }

function ensureOut(){ if (!existsSync('out')) mkdirSync('out') }
function normInt(x:any){ const s = String(x||'').replace(/[^0-9]/g,''); const n = parseInt(s||'0',10); return isNaN(n)?0:n }
function dateOnly(s:string){ const d = String(s||''); return d.includes('T')?d.split('T')[0]:d }
function normEER(s:string){ const t = String(s||'').replace(/[^0-9\\*]/g,''); return t }
function normUM(s:string){ const t = String(s||'').trim().toLowerCase(); return t==='kg'?'kg':(t==='l'||t==='lt'?'l':t) }
function localSignature(m:any){
  try {
    const eer = normEER(m?.codice_eer || m?.codice_cer || m?.codice_cer_formattato || '')
    const q = Number(m?.quantita || 0)
    const um = normUM(m?.unita_misura || 'kg')
    const prov = String(m?.provenienza || 'U')
    const caus = 'RE'
    const dt = dateOnly(m?.data || '')
    return `${dt}|${caus}|${eer}|${q}|${um}|${prov}`
  } catch { return '' }
}
function rentriSignature(el:any){
  try {
    const eer = normEER(el?.rifiuto?.codice_eer || el?.codice_eer)
    const q = Number(el?.rifiuto?.quantita?.valore || el?.quantita?.valore || el?.quantita || 0)
    const um = normUM(el?.rifiuto?.quantita?.unita_misura || el?.quantita?.unita_misura || el?.unita_misura || 'kg')
    const prov = String(el?.rifiuto?.provenienza || el?.provenienza || 'U')
    const caus = String(el?.riferimenti?.causale_operazione || el?.causale_operazione || 'RE')
    const dt = dateOnly(el?.riferimenti?.data_ora_registrazione || el?.data_ora_registrazione || '')
    return `${dt}|${caus}|${eer}|${q}|${um}|${prov}`
  } catch { return '' }
}

const xmlParser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true })
function parseRegistroXml(xmlText:string){
  const obj = xmlParser.parse(xmlText) || {}
  const reg = obj?.RegistroCronologico?.Registrazioni?.Movimento
  const arr = Array.isArray(reg) ? reg : (reg ? [reg] : [])
  return arr.map((m:any)=>({
    anno: normInt(m?.Anno||new Date().getFullYear()),
    progressivo: normInt(m?.Progressivo||''),
    data: String(m?.DataRegistrazione||''),
    codice_eer: String(m?.CodEERMat||''),
    quantita: Number(m?.Quantita||0),
    unita_misura: String(m?.UnitaMisura||'KG'),
    provenienza: 'U'
  }))
}
function parseRegistroAnno(xmlText:string){
  const obj = xmlParser.parse(xmlText) || {}
  const reg = obj?.RegistroCronologico?.Registrazioni
  const annoAttr = reg?.['@_Anno']
  return Number(annoAttr||new Date().getFullYear())
}

async function listRentriMovimenti(registryId:string, filename:string, issuer:string, year:number){
  const from = `${year}-01-01`
  const to = `${year}-12-31`
  const body = { registryId, filename, issuer, limit: 10000, order: 'desc', from, to }
  const res = await axios.post(`${BRIDGE}/list-movimenti`, body)
  const raw = String(res.data?.data || '')
  try { const arr = JSON.parse(raw); return Array.isArray(arr)?arr:[] } catch { return [] }
}

async function auditOne(reg:{ registryId:string; filename:string; issuer:string; xml:string }){
  const xmlText = readFileSync(reg.xml, 'utf-8')
  const year = parseRegistroAnno(xmlText)
  const local = parseRegistroXml(xmlText)
  const rentri = await listRentriMovimenti(reg.registryId, reg.filename, reg.issuer, year)
  const rentriSigs = new Set<string>()
  for (const r of rentri){ const s = rentriSignature(r); if (s) rentriSigs.add(s) }
  const missing = []
  for (const m of local){
    const sig = localSignature(m)
    if (!sig || !rentriSigs.has(sig)) missing.push(m)
  }
  return {
    registryId: reg.registryId,
    year,
    local_count: local.length,
    rentri_count: rentri.length,
    missing_count: missing.length,
    sample_missing: missing.slice(0,5)
  }
}

async function main(){
  ensureOut()
  const out:any = { generated_at: new Date().toISOString(), items: [] as any[] }
  out.items.push(await auditOne(GLOBAL))
  out.items.push(await auditOne(MULTY))
  writeFileSync('out/compliance-audit.json', JSON.stringify(out, null, 2))
  console.log(JSON.stringify(out, null, 2))
}

main()

