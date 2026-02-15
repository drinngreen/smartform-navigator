import { startStream, getStatus } from './streamer'

async function main(){
  await startStream('global')
  await startStream('multy')
  const st = getStatus()
  console.log(JSON.stringify({ started: true, status: st }, null, 2))
}

main()
