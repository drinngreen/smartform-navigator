// @ts-nocheck
import { runOnce } from './goldenReplicator'

function sleep(ms:number){ return new Promise(res=>setTimeout(res, ms)) }

async function main(){
  const rounds = parseInt(process.argv[2]||'10',10)
  const delayMs = parseInt(process.argv[3]||'12000',10)
  for (let i=0; i<rounds; i++){
    await runOnce()
    await sleep(delayMs)
  }
  console.log(JSON.stringify({ done: true, rounds, delayMs }))
}

main()
