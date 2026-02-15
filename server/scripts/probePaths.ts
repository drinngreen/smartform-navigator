import axios from 'axios'

type Target = {
  name: string
  filename: string
  postIssuer: string
  getIssuer: string
  transIds: string[]
  registries: string[]
}

async function probeStatus(t: Target) {
  for (const tid of t.transIds) {
    const combos: string[] = []
    combos.push(`https://api.rentri.gov.it/dati-registri/v1.0/transazioni/${tid}`)
    for (const rid of t.registries) {
      combos.push(`https://api.rentri.gov.it/dati-registri/v1.0/operatore/${rid}/transazioni/${tid}`)
      combos.push(`https://api.rentri.gov.it/dati-registri/v1.0/operatore/${rid}/movimenti/transazioni/${tid}`)
    }
    for (const url of combos) {
      const body = { registryId: t.registries[0], transazioneId: tid, filename: t.filename, issuer: t.getIssuer }
      const res = await axios.post('http://localhost:8765/check-transazione', body)
      console.log(JSON.stringify({ target: t.name, transazioneId: tid, url: res.data.url, status: res.data.status, success: res.data.success }))
    }
    const res2 = await axios.post('http://localhost:8765/check-status', { api: 'dati-registri', transazioneId: tid, filename: t.filename, issuer: t.getIssuer })
    console.log(JSON.stringify({ target: t.name, transazioneId: tid, url: res2.data.url, status: res2.data.status, success: res2.data.success }))
  }
}

async function probeLists(t: Target) {
  for (const rid of t.registries) {
    const urlReg = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${rid}/registrazioni?limit=10&order=desc`
    const urlMov = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${rid}/movimenti?limit=10&order=desc`
    const r1 = await axios.post('http://localhost:8765/list-rentri', { url: urlReg, filename: t.filename, issuer: t.getIssuer })
    console.log(JSON.stringify({ target: t.name, list: 'registrazioni', registryId: rid, status: r1.data.status, success: r1.data.success }))
    const r2 = await axios.post('http://localhost:8765/list-movimenti', { registryId: rid, filename: t.filename, issuer: t.getIssuer, limit: 10, order: 'desc' })
    console.log(JSON.stringify({ target: t.name, list: 'movimenti', registryId: rid, status: r2.data.status, success: r2.data.success }))
  }
}

async function main() {
  const global: Target = {
    name: 'global',
    filename: 'certificato.p12',
    postIssuer: '08934760961',
    getIssuer: '08934760961',
    transIds: [
      '84738dcf-f9e0-4427-bcad-7d3db594a83d',
      '6b86120a-5874-4ec9-b56e-9998bf0875e1',
      '65c05325-a6c9-4f9c-908e-f81e80f31315'
    ],
    registries: ['R1DDEWC3SHU', 'R6QSWHZ6HJV', 'RYPHK2M3RKA']
  }
  const multy: Target = {
    name: 'multy',
    filename: 'multyproget.p12',
    postIssuer: '12347770013',
    getIssuer: '12347770013',
    transIds: [
      '5a119f50-c47c-4156-9077-f039a2168b94',
      '6c4d76be-792e-488f-8ae1-bdb88349c82b'
    ],
    registries: ['RQEL39R7NS0', 'RQCGT1GPTN0']
  }
  await probeStatus(global)
  await probeLists(global)
  await probeStatus(multy)
  await probeLists(multy)
}

main()
