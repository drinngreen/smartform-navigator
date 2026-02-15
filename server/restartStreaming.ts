// @ts-nocheck
import { restartStream, getStatus } from './streamer'

async function main(){
  await restartStream('global', 500)
  await restartStream('multy', 500)
  const st = getStatus()
  console.log(JSON.stringify({ restarted: true, status: st }, null, 2))
}

main()
