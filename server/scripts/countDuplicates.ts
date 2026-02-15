
import { readFileSync } from 'fs'

const LOG_FILE = 'out/invio_massivo.log'

function main(){
  try {
    const content = readFileSync(LOG_FILE, 'utf-8')
    const lines = content.split('\n').filter(x => x.trim())
    
    let dupGlobal = 0
    let dupMulty = 0

    for(const line of lines){
      try {
        const j = JSON.parse(line)
        const isGlobal = j.registryId === 'R6QSWHZ6HJV'
        const isMulty = j.registryId === 'RQEL39R7NS0'
        
        // Check in 'data' field (from Error 400 logs)
        let rawBody = j.data
        // Check in 'body' field (from RESULT logs)
        if (!rawBody && j.body) rawBody = j.body

        if (rawBody && typeof rawBody === 'string') {
           // Simple regex count of the error string
           const matches = (rawBody.match(/movimentoDuplicatoDatabase/g) || []).length
           if (isGlobal) dupGlobal += matches
           if (isMulty) dupMulty += matches
        }
      } catch {}
    }

    console.log(`Duplicati rilevati per GLOBAL: ${dupGlobal}`)
    console.log(`Duplicati rilevati per MULTY: ${dupMulty}`)

  } catch(e) {
    console.error(e)
  }
}

main()
