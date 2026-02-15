import { spawnSync } from 'child_process'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import http from 'http'
function run(cmd:string, args:string[], env?:Record<string,string>){ const r = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } }); return r.status===0 }
function sleep(ms:number){ return new Promise(res=>setTimeout(res, ms)) }
function getJson(url:string){ return new Promise<any>((resolve,reject)=>{ const req = http.get(url, res=>{ const chunks:Buffer[]=[]; res.on('data',d=>chunks.push(d)); res.on('end',()=>{ try{ const txt = Buffer.concat(chunks).toString('utf-8'); resolve(JSON.parse(txt)) }catch(e){ reject(e) } }); }); req.on('error',reject) }) }
function parseJsonSafe(s:string){ try { return JSON.parse(s) } catch { return null } }
function summarize(){ const p='out/invio_massivo.log'; if(!existsSync(p)) return { send:0, result:0, accepted:0, lastAcceptedKey:'' }; const objs = readFileSync(p,'utf-8').trim().split(/\r?\n/).map(parseJsonSafe).filter(Boolean); const send = objs.filter((o:any)=>o.kind==='SEND').length; const result = objs.filter((o:any)=>o.kind==='RESULT').length; const accObjs = objs.filter((o:any)=>o.kind==='RESULT' && o.accepted===1); const accepted = accObjs.length; let lastAcceptedKey = ''; const last = accObjs[accObjs.length-1]; if (last){ if (last.key) lastAcceptedKey = String(last.key); else { const b = parseJsonSafe(String(last.body||'')); const arr = Array.isArray(b?.esito?.numero_registrazioni) ? b.esito.numero_registrazioni : []; if (arr.length>0){ lastAcceptedKey = String(arr[0]?.progressivo||'') } } } return { send, result, accepted, lastAcceptedKey }
}
function gatherUsed(registryId:string, anno:number){
  const used = new Set<number>()
  try {
    const rawCsv = readFileSync('out/ocr.accepted.csv','utf-8')
    const lines = rawCsv.trim().split(/\r?\n/).slice(1)
    for (const l of lines){
      const parts = l.split(',')
      if (parts.length>=3){
        const a = Number(parts[0]||0); const p = Number(parts[1]||0); const reg = String(parts[2]||'')
        if (a===anno && reg===registryId && p>0) used.add(p)
      }
    }
  } catch {}
  try {
    const rawLog = readFileSync('out/invio_massivo.log','utf-8')
    const lines = rawLog.trim().split(/\r?\n/)
    for (const l of lines){
      const j = parseJsonSafe(l); if (!j) continue
      if (j.registryId!==registryId) continue
      if (j.kind==='SEND' || j.kind==='RESULT'){
        const m = String(j.key||'').match(/^2025_(\d+)$/)
        if (m) used.add(Number(m[1]))
        if (j.kind==='RESULT' && j.accepted===1 && j.body){
          const b = parseJsonSafe(String(j.body))
          const arr = Array.isArray(b?.esito?.numero_registrazioni) ? b.esito.numero_registrazioni : []
          for (const rec of arr){ const p = Number(rec?.progressivo||0); if (p>0) used.add(p) }
        }
      }
    }
  } catch {}
  return used
}
async function ensureBridge(){ try { const h = await getJson('http://127.0.0.1:8765/health'); if (h && (h.status==='ok' || h.ok===true)) return true } catch {} return false }
async function main(){
  const args = process.argv.slice(2)
  const baseIdx = args.indexOf('--base')
  const batchIdx = args.indexOf('--batch')
  const delayIdx = args.indexOf('--delay')
  const loopsIdx = args.indexOf('--loops')
  let base = baseIdx>=0 ? Number(args[baseIdx+1]) : 900001
  const batch = batchIdx>=0 ? Number(args[batchIdx+1]) : 100
  const delay = delayIdx>=0 ? Number(args[delayIdx+1]) : 200
  const loops = loopsIdx>=0 ? Number(args[loopsIdx+1]) : 100
  if (!(await ensureBridge())) { process.stderr.write('BRIDGE_DOWN\n'); process.exit(1) }
  const used = gatherUsed('R6QSWHZ6HJV', 2025)
  while (used.has(base)) base++
  let growMisses = 0
  for (let i=0; i<loops; i++){
    const before = summarize()
    const okBuild = run('npm', ['run','ocr:build:payload','--','--startGlobal', String(base),'--limit', String(batch)])
    if (!okBuild) break
    const okSend = run('npm', ['run','send:ocr:global','--','--limit', String(batch)], { SEND_DELAY_MS: String(delay) })
    if (!okSend) break
    run('npx',['tsx','server/scripts/exportAccepted.ts','--out','out/ocr.accepted.csv'])
    await sleep(5000)
    const after = summarize()
    writeFileSync('out/ocr.status.txt', `SEND=${after.send}\nRESULT=${after.result}\nACCEPTED=${after.accepted}\nLAST=${after.lastAcceptedKey}\nBASE=${base}\nBATCH=${batch}\n`, 'utf-8')
    if (after.accepted>before.accepted){
      growMisses = 0
      let next = base + batch + 1
      while (used.has(next)) next++
      base = next
    } else {
      growMisses++
      base += batch*10
    }
  }
  process.stdout.write('DONE\n')
}
main()
