import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'

function now(){ return new Date().toISOString() }
function ensurePause(on:boolean){
  const p = 'out/guard.pause'
  try {
    if (on && !existsSync(p)) writeFileSync(p, JSON.stringify({ ts: Date.now(), reason: 'low_acceptance' }, null, 2))
    if (!on && existsSync(p)) unlinkSync(p)
  } catch {}
}
function readLines(p:string){ try { return readFileSync(p,'utf-8').trim().split(/\r?\n/)} catch { return [] } }
function parseJson(s:string){ try { return JSON.parse(s) } catch { return null } }

function summarize(){
  const lines = readLines('out/invio_massivo.log')
  const last = lines.slice(-1000).map(parseJson).filter(Boolean)
  const results = last.filter((j:any)=>j.kind==='RESULT')
  const accepted = results.reduce((acc:number, j:any)=>acc + (typeof j?.accepted==='number'?j.accepted:0), 0)
  const since = results.length>0 ? 'RESULTS:'+results.length : 'RESULTS:0'
  return { results: results.length, accepted, since }
}

async function main(){
  const s = summarize()
  const pause = s.results >= 100 && s.accepted === 0
  ensurePause(pause)
  const out = { ts: now(), pause, windowResults: s.results, windowAccepted: s.accepted }
  console.log(JSON.stringify(out))
}

main()
