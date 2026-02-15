import axios from 'axios'
import { existsSync, mkdirSync, writeFileSync, createReadStream } from 'fs'
import { join } from 'path'
import readline from 'readline'

const BRIDGE = 'http://localhost:8765'
const REG_CERT: Record<string, { filename:string; issuer:string }> = {
  'R6QSWHZ6HJV': { filename: 'certificato.p12', issuer: '08934760961' },
  'RQEL39R7NS0': { filename: 'multyproget.p12', issuer: '12347770013' }
}
function ensureOut(){ if (!existsSync('out')) mkdirSync('out') }
function parseJsonSafe(s:string){ try { return JSON.parse(s) } catch { return null } }

async function fetchResultKey(registryId:string, tid:string){
  const cert = REG_CERT[registryId]
  if (!cert) return ''
  const body = { api:'dati-registri', transazioneId: tid, filename: cert.filename, issuer: cert.issuer }
  const res = await axios.post(`${BRIDGE}/check-status`, body)
  const ok = res.data?.success === true && Number(res.data?.status) === 200
  if (!ok) return ''
  const model = parseJsonSafe(String(res.data?.data||'')) || {}
  const arr = Array.isArray(model?.esito?.numero_registrazioni) ? model.esito.numero_registrazioni : []
  if (arr.length === 0) return ''
  const n = arr[0]
  const anno = Number(n?.anno||0)
  const prog = String(n?.progressivo||'').replace(/[^0-9]/g,'')
  if (!anno || !prog) return ''
  return `${anno}_${prog}`
}

async function main(){
  const attemptsPath = join(process.cwd(), 'bridge-service', 'bin', 'Debug', 'net8.0', 'logs', 'attempts.jsonl')
  if (!existsSync(attemptsPath)) { console.error('attempts.jsonl non trovato'); process.exit(1) }
  const rl = readline.createInterface({ input: createReadStream(attemptsPath, { encoding:'utf-8' }), crlfDelay: Infinity })
  const tids: Array<{ reg:string; tid:string }> = []
  for await (const l of rl){
    if (!l || !l.trim()) continue
    let at:any
    try { at = JSON.parse(l) } catch { continue }
    if (String(at.kind||'')!=='POST') continue
    const url = String(at.url||'')
    if (!url.includes('/operatore/') || !url.includes('/movimenti')) continue
    const st = Number(at.status||0); if (st !== 202) continue
    const m = url.match(/\/operatore\/([A-Z0-9]+)\/movimenti/)
    const reg = m ? m[1] : ''
    let tid = ''
    try { const d = parseJsonSafe(String(at.data||'')) || {}; tid = String(d?.transazione_id||'') } catch {}
    if (reg && tid) tids.push({ reg, tid })
    if (tids.length >= 3000) break
  }
  const uniq = new Map<string, string>()
  for (const t of tids){ uniq.set(`${t.reg}|${t.tid}`, t.tid) }
  const pairs = Array.from(uniq.keys()).map(k=>({ reg:k.split('|')[0], tid: uniq.get(k)! }))
  const keys = new Set<string>()
  let processed = 0
  for (const p of pairs){
    try {
      const k = await fetchResultKey(p.reg, p.tid)
      if (k) keys.add(k)
    } catch {}
    processed++
    if (processed % 50 === 0) console.log(`Blacklist remote: processed ${processed}, keys ${keys.size}`)
    if (processed >= 500) break
  }
  ensureOut()
  writeFileSync(join('out','blacklist.remote.json'), JSON.stringify({ count: keys.size, keys: Array.from(keys) }, null, 2))
  console.log(JSON.stringify({ status:'ok', processed, count: keys.size }))
}

main()

