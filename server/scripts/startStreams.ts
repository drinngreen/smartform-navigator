import { startStream } from '../streamer'

async function main(){
  await startStream('global', 500)
  await startStream('multy', 500)
  setInterval(()=>{}, 60000)
}

main()
