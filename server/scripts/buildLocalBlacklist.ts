import { writeFileSync, existsSync, mkdirSync, createReadStream } from 'fs'
import { join } from 'path'
import readline from 'readline'

type Attempt = {
  kind?: string
  url?: string
  status?: number
  payload?: any
  body?: any
  data?: any
}

function ensureOut(){ if (!existsSync('out')) mkdirSync('out') }
function parseJsonSafe(s:string){ try { return JSON.parse(s) } catch { return null } }
function isMovimentiPost(a:Attempt){ return String(a.kind||'')==='POST' && String(a.url||'').includes('/operatore/') && String(a.url||'').includes('/movimenti') }
function isAccepted(s?:number){ const n = Number(s||0); return n===202 || n===200 }
function keyFromPayload(el:any){
  try {
    const nr = el?.riferimenti?.numero_registrazione || el?.numero_registrazione
    const anno = Number(nr?.anno||0)
    const prog = String(nr?.progressivo||'').replace(/[^0-9]/g,'')
    if (!anno || !prog) return ''
    return `${anno}_${prog}`
  } catch { return '' }
}

async function collectKeysFromAttempts(path:string){
  const keys = new Set<string>()
  const rl = readline.createInterface({ input: createReadStream(path, { encoding:'utf-8' }), crlfDelay: Infinity })
  for await (const l of rl){
    if (!l || !l.trim()) continue
    let at:Attempt
    try { at = JSON.parse(l) } catch { continue }
    if (!isMovimentiPost(at) || !isAccepted(at.status)) continue
    let payloadAny:any = undefined
    if (at.payload) payloadAny = typeof at.payload === 'string' ? parseJsonSafe(String(at.payload)) : at.payload
    if (!payloadAny && at.body) payloadAny = typeof at.body === 'string' ? parseJsonSafe(String(at.body)) : at.body
    if (!payloadAny && at.data){
      const d = typeof at.data === 'string' ? parseJsonSafe(String(at.data)) : at.data
      if (d && d?.request && d?.request?.payload) payloadAny = d.request.payload
    }
    if (Array.isArray(payloadAny)){
      for (const el of payloadAny){
        const k = keyFromPayload(el)
        if (k) keys.add(k)
      }
    }
  }
  return keys
}

async function main(){
  const attemptsPath = join(process.cwd(), 'bridge-service', 'bin', 'Debug', 'net8.0', 'logs', 'attempts.jsonl')
  if (!existsSync(attemptsPath)) { console.error('attempts.jsonl non trovato'); process.exit(1) }
  const keys = await collectKeysFromAttempts(attemptsPath)
  ensureOut()
  const outPath = join('out', 'blacklist.sent.json')
  writeFileSync(outPath, JSON.stringify({ count: keys.size, keys: Array.from(keys) }, null, 2))
  console.log(JSON.stringify({ status: 'ok', outPath, count: keys.size }))
}

main()
