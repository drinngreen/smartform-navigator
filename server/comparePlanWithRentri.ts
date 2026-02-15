// @ts-nocheck
import fs from 'fs'
import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'

type PlanInfo = { count:number, minProg:number, maxProg:number, anno:number }

function loadXml(path:string){ return fs.readFileSync(path, 'utf-8') }
function onlyDigits(s:string){ return (s||'').replace(/[^0-9]/g,'') }
function toInt(s:string){ const d = onlyDigits(s); return d ? parseInt(d,10) : 0 }

function parseRegistro(xml:string): PlanInfo {
  const parser = new XMLParser({ ignoreAttributes: false })
  const obj = parser.parse(xml)
  let regs:any[]=[]
  if (obj?.RegistroCronologico?.Registrazioni?.Registrazione) {
    const r = obj.RegistroCronologico.Registrazioni.Registrazione
    regs = Array.isArray(r) ? r : [r]
  } else if (obj?.RegistroCronologico?.Registrazioni?.Movimento) {
    const m = obj.RegistroCronologico.Registrazioni.Movimento
    regs = Array.isArray(m) ? m : [m]
  } else if (obj?.registro_carico_scarico?.movimenti?.movimento) {
    const m = obj.registro_carico_scarico.movimenti.movimento
    regs = Array.isArray(m) ? m : [m]
  }
  let minProg = Number.MAX_SAFE_INTEGER
  let maxProg = 0
  let anno = new Date().getFullYear()
  for (const r of regs){
    const p = String(r.Progressivo || r.NumProg || r.numero_registrazione?.progressivo || '')
    const a = Number(r.Anno || obj?.RegistroCronologico?.Registrazioni?.Anno || r.numero_registrazione?.anno || anno)
    const iv = toInt(p)
    if (iv>0){ minProg = Math.min(minProg, iv); maxProg = Math.max(maxProg, iv) }
    anno = a
  }
  if (minProg === Number.MAX_SAFE_INTEGER) minProg = 1
  return { count: regs.length, minProg, maxProg, anno }
}

async function getRentriHead(registryId:string, filename:string, issuer?:string){
  const body = { registryId, filename, issuer: issuer||undefined, limit: 1, order: 'desc' }
  const res = await axios.post('http://localhost:8765/list-movimenti', body)
  const raw = String(res.data?.data || '[]')
  let lastAnno = new Date().getFullYear()
  let lastProgInt = 0
  try {
    const arr = JSON.parse(raw)
    if (Array.isArray(arr) && arr.length > 0){
      const el = arr[0]
      const nr = el.numero_registrazione || (el.riferimenti && el.riferimenti.numero_registrazione) || {}
      lastProgInt = toInt(String(nr.progressivo || ''))
      lastAnno = Number(nr.anno || lastAnno)
    }
  } catch {}
  return { lastProgInt, lastAnno }
}

async function compareOne(name:string, registryId:string, filename:string, issuer:string, xmlPath:string){
  const xml = loadXml(xmlPath)
  const plan = parseRegistro(xml)
  const head = await getRentriHead(registryId, filename, issuer)
  const sentEstimate = head.lastProgInt >= plan.minProg ? (head.lastProgInt - plan.minProg + 1) : 0
  const remaining = Math.max(0, plan.count - sentEstimate)
  return { name, plan, head, sentEstimate, remaining }
}

async function main(){
  const global = await compareOne('GlobalReco', 'R6QSWHZ6HJV', 'certificato.p12', '08934760961', 'test/global-reco_6000.xml.xml')
  const multy = await compareOne('MultyProget', 'RQEL39R7NS0', 'multyproget.p12', '12347770013', 'test/multy-proget_6000.xml.xml')
  console.log(JSON.stringify({ global, multy }, null, 2))
}

main()
