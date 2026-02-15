
import { readFileSync } from 'fs'

const LOG_FILE = 'out/invio_massivo.log'

function main(){
  try {
    const content = readFileSync(LOG_FILE, 'utf-8')
    const lines = content.split('\n').filter(x => x.trim())
    
    const stats = {
      GLOBAL: { sent: 0, accepted: 0, batches: 0 },
      MULTY: { sent: 0, accepted: 0, batches: 0 }
    }

    for(const line of lines){
      try {
        const j = JSON.parse(line)
        const reg = j.registryId
        const isGlobal = reg === 'R6QSWHZ6HJV'
        const target = isGlobal ? stats.GLOBAL : stats.MULTY

        if (j.kind === 'SEND') {
          target.sent += (j.count || 0)
          target.batches++
        } else if (j.kind === 'RESULT') {
          target.accepted += (j.accepted || 0)
        }
      } catch {}
    }

    console.log('--- REPORT TOTALE INVIO MASSIVO ---')
    console.log('\n1. GLOBAL RECO (Produttore)')
    console.log('   Registro: R6QSWHZ6HJV')
    console.log(`   Movimenti Processati: ${stats.GLOBAL.sent}`)
    console.log(`   Nuovi Inserimenti (Accepted): ${stats.GLOBAL.accepted}`)
    console.log(`   Duplicati/Già Presenti: ${stats.GLOBAL.sent - stats.GLOBAL.accepted}`)

    console.log('\n2. MULTYPROGET (Intermediario)')
    console.log('   Registro: RQEL39R7NS0')
    console.log(`   Movimenti Processati: ${stats.MULTY.sent}`)
    console.log(`   Nuovi Inserimenti (Accepted): ${stats.MULTY.accepted}`)
    console.log(`   Duplicati/Già Presenti: ${stats.MULTY.sent - stats.MULTY.accepted}`)

    console.log('\n-----------------------------------')
    console.log(`TOTALE MOVIMENTI GESTITI: ${stats.GLOBAL.sent + stats.MULTY.sent}`)
    console.log(`TOTALE ACCETTATI (Somma): ${stats.GLOBAL.accepted + stats.MULTY.accepted}`)

  } catch(e) {
    console.error('Error reading log:', e)
  }
}

main()
