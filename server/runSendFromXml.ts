import { readFileSync } from 'fs'
import { submitFir } from './rentriClient'

async function main(){
  const args = process.argv.slice(2)
  const xmlPath = args[0] || 'test/fir.xml'
  const dateOverride = args[1]
  const registryOverride = args[2]
  const p12 = args[3] || 'certificato.p12'
  const regAnnoOverride = args[4]
  const regProgOverride = args[5]
  const omitNR = args[6] === 'omit-nr'

  const xml = readFileSync(xmlPath, 'utf-8')
  try {
    const res = await submitFir(xml, p12, dateOverride, registryOverride, regAnnoOverride, regProgOverride, omitNR)
    console.log('[SEND RESULT]', res)
  } catch (e:any){
    console.error('[SEND ERROR]', e.message)
  }
}

main()