// @ts-nocheck
import fs from 'fs'
import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'

type Key = { anno:number, progressivo:number }
const BRIDGE = 'http://localhost:8765'

function readXml(path:string){ return fs.readFileSync(path, 'utf-8') }
function onlyDigits(s:string){ return (s||'').replace(/[^0-9]/g,'') }
function toInt(s:string){ const d = onlyDigits(s); return d ? parseInt(d,10) : 0 }

function planKeys(xml:string): Key[] {
  const parser = new XMLParser({ ignoreAttributes: false })
  const obj = parser.parse(xml)
  const out:Key[]=[]
  let regs:any[]=[]
  if (obj?.RegistroCronologico?.Registrazioni?.Registrazione) {
    const r = obj.RegistroCronologico.Registrazioni.Registrazione
    regs = Array.isArray(r) ? r : [r]
  } else if (obj?.RegistroCronologico?.Registrazioni?.Movimento) {
    const m = obj.RegistroCronologico.Registrazioni.Movimento
    regs = Array.isArray(m) ? m : [m]
  }
  let annoDefault = Number(obj?.RegistroCronologico?.Registrazioni?.Anno || new Date().getFullYear())
  for (const r of regs){
    const a = Number(r.Anno || annoDefault)
    const p = toInt(String(r.Progressivo || r.NumProg || ''))
    if (p>0) out.push({ anno:a, progressivo:p })
  }
  return out
}

async function fetchWindow(registryId:string, filename:string, issuer:string, order:'asc'|'desc', limit:number){
  const body = { registryId, filename, issuer, limit, order }
  const res = await axios.post(`${BRIDGE}/list-movimenti`, body)
  const raw = String(res.data?.data || '[]')
  let arr:any[]=[]
  try { const j = JSON.parse(raw); if (Array.isArray(j)) arr = j } catch {}
  const keys:Key[]=[]
  for (const el of arr){
    const nr = el.numero_registrazione || (el.riferimenti && el.riferimenti.numero_registrazione) || {}
    const a = Number(nr.anno || 0)
    const p = toInt(String(nr.progressivo || ''))
    if (a>0 && p>0) keys.push({ anno:a, progressivo:p })
  }
  return keys
}

function intersectCount(a:Key[], b:Key[]): number {
  const set = new Set(b.map(k=>`${k.anno}:${k.progressivo}`))
  let c=0
  for (const k of a){ if (set.has(`${k.anno}:${k.progressivo}`)) c++ }
  return c
}

async function compare(registryId:string, filename:string, issuer:string, xmlPath:string){
  const xml = readXml(xmlPath)
  const plan = planKeys(xml)
  const head = await fetchWindow(registryId, filename, issuer, 'desc', 500)
  const tail = await fetchWindow(registryId, filename, issuer, 'asc', 500)
  const sample = [...head, ...tail]
  const matched = intersectCount(plan, sample)
  return {
    xmlPath,
    totalPlanned: plan.length,
    sampleChecked: sample.length,
    matchedInSample: matched,
    note: 'Confronto approssimato su finestre iniziali/finali. Per totale preciso serve paginazione.'
  }
}

async function main(){
  const global = await compare('R6QSWHZ6HJV','certificato.p12','08934760961','test/global-reco_6000.xml.xml')
  const multy = await compare('RQEL39R7NS0','multyproget.p12','12347770013','test/multy-proget_6000.xml.xml')
  console.log(JSON.stringify({ global, multy }, null, 2))
}

main()

