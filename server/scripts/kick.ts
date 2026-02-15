import axios from 'axios'

async function main(){
  await axios.post('http://localhost:3001/trpc/stream.start', { input: JSON.stringify({ target:'global', batch:500 })})
  await axios.post('http://localhost:3001/trpc/stream.start', { input: JSON.stringify({ target:'multy', batch:500 })})
  await axios.post('http://localhost:3001/trpc/fir.resumeMassive', { input: JSON.stringify({ companyP12:'certificato.p12', registryId:'R6QSWHZ6HJV', ratePerMinute:600, batchSize:50 })})
  await axios.post('http://localhost:3001/trpc/fir.resumeMassive', { input: JSON.stringify({ companyP12:'multyproget.p12', registryId:'RQEL39R7NS0', ratePerMinute:600, batchSize:50 })})
  console.log('kick done')
}

main()
