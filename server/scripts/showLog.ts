import fs from 'fs'
import path from 'path'

function tail(content:string, lines:number){
  const arr = content.split(/\r?\n/)
  return arr.slice(Math.max(0, arr.length-lines)).join('\n')
}

async function main(){
  const d = new Date()
  const fmt = (dt:Date)=>dt.toISOString().slice(0,10).replace(/-/g,'')
  const dates = [fmt(d), fmt(new Date(d.getTime()-24*3600*1000))]
  const candidates:string[] = []
  for (const date of dates){
    candidates.push(path.resolve(process.cwd(), 'bridge-service', 'logs', `${date}.log`))
    candidates.push(path.resolve(process.cwd(), 'bridge-service', 'bin', 'Debug', 'net8.0', 'logs', `${date}.log`))
  }
  const file = candidates.find(f => fs.existsSync(f))
  if (!file) { console.log(JSON.stringify({ error: 'log file not found', candidates })); return }
  const text = fs.readFileSync(file, 'utf8')
  console.log(tail(text, 200))
}

main()
