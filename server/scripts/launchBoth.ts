import axios from 'axios'

async function waitHeads(){
  for(let i=0;i<30;i++){
    try {
      const r = await axios.get('http://localhost:3001/trpc/fir.checkHeads?input=%7B%7D')
      const d = r.data?.result?.data || {}
      if (d.globalReady && d.multyReady) return d.heads
    } catch {}
    await new Promise(r=>setTimeout(r,1000))
  }
  return null
}

async function main(){
  const heads = await waitHeads()
  if (!heads) { console.log('heads not ready'); process.exit(1) }
  await axios.post('http://localhost:3001/trpc/stream.start', { input: { target:'global', batch:500 }})
  await axios.post('http://localhost:3001/trpc/stream.start', { input: { target:'multy', batch:500 }})
  console.log('started both')
  setInterval(()=>{}, 60000)
}

main()
