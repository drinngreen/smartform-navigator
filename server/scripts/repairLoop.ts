import { execSync } from 'child_process'

function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)) }

async function waitBridgeReady(){
  for(let i=0;i<30;i++){
    try {
      const out = execSync('powershell -NoProfile -Command "Invoke-RestMethod -Method Get -Uri \\"http://localhost:8765/attempts\\" -TimeoutSec 2 | ConvertTo-Json -Depth 1"', { stdio: ['ignore','pipe','ignore'] }).toString().trim()
      if (out && out.length > 0){ return true }
    } catch { await sleep(1000) }
  }
  return false
}

async function main(){
  const ok = await waitBridgeReady()
  if (!ok){
    process.stderr.write('Bridge non pronto su http://localhost:8765\n')
    process.exit(1)
    return
  }
  for (let i=0; i<1000; i++){
    try {
      execSync('npm run repair:one', { stdio: 'inherit' })
      await sleep(1500)
    } catch {
      await sleep(2000)
    }
  }
}
main()
