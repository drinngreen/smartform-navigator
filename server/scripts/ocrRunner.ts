import { spawnSync } from 'child_process'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import http from 'http'
function run(cmd:string, args:string[], env?:Record<string,string>){ const r = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } }); return r.status===0 }
function getJson(url:string){ return new Promise<any>((resolve,reject)=>{ const req = http.get(url, res=>{ const chunks:Buffer[]=[]; res.on('data',d=>chunks.push(d)); res.on('end',()=>{ try{ const txt = Buffer.concat(chunks).toString('utf-8'); resolve(JSON.parse(txt)) }catch(e){ reject(e) } }); }); req.on('error',reject) }) }
function parseJsonSafe(s:string){ try { return JSON.parse(s) } catch { return null } }
function getNextProgressivo(registryId:string){ const p='out/invio_massivo.log'; let next = 0; if (existsSync(p)){ const raw = readFileSync(p,'utf-8'); const lines = raw.trim().split(/\r?\n/); for(const l of lines){ const j = parseJsonSafe(l); if(!j) continue; if (j.kind==='RESULT' && j.accepted===1 && j.registryId===registryId){ let prog = 0; const m = String(j.key||'').match(/^2025_(\d+)$/); if (m) prog = Number(m[1]); if (!prog && j.body){ const b = parseJsonSafe(String(j.body)); const arr = Array.isArray(b?.esito?.numero_registrazioni) ? b.esito.numero_registrazioni : []; if (arr.length>0) prog = Number(arr[0]?.progressivo||0) } if (prog>next) next = prog } } } if (next<900000) next = 900000; return next+1 }
async function ensureBridge(){ try { const h = await getJson('http://127.0.0.1:8765/health'); if (h && (h.status==='ok' || h.ok===true)) return true } catch {} return false }
function summarize(){ const p='out/invio_massivo.log'; if(!existsSync(p)) return { send:0, result:0, accepted:0 }; const objs = readFileSync(p,'utf-8').trim().split(/\r?\n/).map(parseJsonSafe).filter(Boolean); const send = objs.filter((o:any)=>o.kind==='SEND').length; const result = objs.filter((o:any)=>o.kind==='RESULT').length; const accepted = objs.filter((o:any)=>o.kind==='RESULT' && o.accepted===1).length; return { send, result, accepted }
}
async function main(){
  const args = process.argv.slice(2)
  const baseIdx = args.indexOf('--base')
  const batchIdx = args.indexOf('--batch')
  const delayIdx = args.indexOf('--delay')
  const loopsIdx = args.indexOf('--loops')
  let base = baseIdx>=0 ? Number(args[baseIdx+1]) : getNextProgressivo('R6QSWHZ6HJV')
  const batch = batchIdx>=0 ? Number(args[batchIdx+1]) : 100
  const delay = delayIdx>=0 ? Number(args[delayIdx+1]) : 200
  const loops = loopsIdx>=0 ? Number(args[loopsIdx+1]) : 50
  if (!(await ensureBridge())) { process.stderr.write('BRIDGE_DOWN\n'); process.exit(1) }
  let doneLoops = 0
  while (doneLoops < loops){
    const start = base
    const okBuild = run('npm', ['run','ocr:build:payload','--','--startGlobal', String(start),'--limit', String(batch)])
    if (!okBuild) break
    const okSend = run('npm', ['run','send:ocr:global','--','--limit', String(batch)], { SEND_DELAY_MS: String(delay) })
    if (!okSend) break
    run('npx',['tsx','server/scripts/exportAccepted.ts','--out','out/ocr.accepted.csv'])
    const sum = summarize()
    writeFileSync('out/ocr.status.txt', `SEND=${sum.send}\nRESULT=${sum.result}\nACCEPTED=${sum.accepted}\nBASE=${base}\nBATCH=${batch}\n`, 'utf-8')
    base = getNextProgressivo('R6QSWHZ6HJV')
    doneLoops++
  }
  process.stdout.write('DONE\n')
}
main()
