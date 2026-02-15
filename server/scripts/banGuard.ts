import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'

type Attempt = { ts:string, kind:string, status:number, url:string, filename:string, data?:string }

function now(){ return Date.now() }
function parseJsonLines(path:string, maxLines=500):Attempt[]{
  try {
    const raw = readFileSync(path, 'utf-8').trim().split(/\r?\n/).slice(-maxLines)
    return raw.map(l=>{ try { return JSON.parse(l) } catch { return null } }).filter(Boolean) as Attempt[]
  } catch { return [] }
}
function isBanRisk(a:Attempt){
  const st = Number(a?.status||0)
  if (st===429) return true
  if (st===401||st===403) return true
  if (st>=500) return true
  const s = String(a?.data||'')
  return /agIDInterop\.|notUniqueJwtId|invalidSignedHeaderContentType|invalidDigest/i.test(s)
}
function withinMinutes(tsIso:string, minutes:number){
  try { const t = new Date(tsIso).getTime(); return now() - t <= minutes*60*1000 } catch { return false }
}

async function main(){
  const attemptsPath = join(process.cwd(), 'bridge-service','bin','Debug','net8.0','logs','attempts.jsonl')
  const guardPath = join(process.cwd(), 'out','guard.pause')
  for(;;){
    const list = parseJsonLines(attemptsPath, 800).filter(a=>a.kind==='GET' || a.kind==='POST')
    const recent = list.filter(a=>withinMinutes(a.ts, 2))
    const riskCount = recent.filter(isBanRisk).length
    const hasRisk = riskCount >= 10
    try {
      if (hasRisk && !existsSync(guardPath)) {
        writeFileSync(guardPath, JSON.stringify({ ts: now(), riskCount }, null, 2))
        console.log(`[GUARD] pausa attivata, risk=${riskCount}`)
      } else if (!hasRisk && existsSync(guardPath)) {
        unlinkSync(guardPath)
        console.log(`[GUARD] pausa rimossa, risk=${riskCount}`)
      }
    } catch {}
    await new Promise(r=>setTimeout(r, 10000))
  }
}

main()
