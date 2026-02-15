import { readFileSync } from 'fs'

function normInt(x:any){ const s = String(x||'').replace(/[^0-9]/g,''); const n = parseInt(s||'0',10); return isNaN(n)?0:n }
function buildPayloadFromFir(fir:any, isMulty:boolean, idx:number){
  const cf = String(fir?.identificativi?.codiceFIR||'')
  let prog = normInt(cf)
  const isPlaceholder = /FMGWB/i.test(cf) || prog < 100000
  if (isPlaceholder || !prog || prog===0) prog = ((isMulty?800000:600000) + (idx+1))
  const anno = new Date(String(fir?.identificativi?.dataEmissione||new Date().toISOString().slice(0,10))).getFullYear()
  let dataReg = String(fir?.conferimentoDestinatario?.dataOraArrivo || (String(fir?.identificativi?.dataEmissione||new Date().toISOString().slice(0,10))+'T12:00:00'))
  if (!dataReg.endsWith('Z')) dataReg = dataReg + 'Z'
  const quantAcc = Number(fir?.conferimentoDestinatario?.quantitaAccettataKg || 0)
  const quantDecl = Number(fir?.rifiuto?.quantitaDichiarataKg || 0)
  const quantita = Math.max(quantAcc>0?quantAcc:0, quantDecl>0?quantDecl:0) || 1
  const um = String(fir?.rifiuto?.unitaMisura||'KG').toLowerCase()==='kg' ? 'kg' : 'l'
  const eerRaw = String(fir?.rifiuto?.codiceEER||'')
  const eer = eerRaw.replace(/[^0-9]/g,'').padStart(6,'0').slice(0,6)
  const provenienza = String(fir?.rifiuto?.provenienza||'U') || 'U'
  const base:any = {
    riferimenti: {
      numero_registrazione: { anno: Number(anno), progressivo: String(prog) },
      data_ora_registrazione: dataReg,
      causale_operazione: 'RE'
    },
    rifiuto: {
      codice_eer: eer,
      stato_fisico: 'S',
      quantita: { valore: Number(quantita.toFixed(3)), unita_misura: um },
      provenienza
    }
  }
  if (isMulty){
    base.intermediario = { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' }
    base.intermediari = [ { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' } ]
  }
  return base
}

const firs = JSON.parse(readFileSync('out/fir.batch.cleaned.json','utf-8')).fir || []
const fir = firs[0]
const plG = [buildPayloadFromFir(fir, false, 0)]
const plM = [buildPayloadFromFir(fir, true, 0)]
const bodyG = { url: 'https://api.rentri.gov.it/dati-registri/v1.0/operatore/R6QSWHZ6HJV/movimenti', payload: JSON.stringify(plG), filename: 'certificato.p12', issuer: '08934760961' }
const bodyM = { url: 'https://api.rentri.gov.it/dati-registri/v1.0/operatore/RQEL39R7NS0/movimenti', payload: JSON.stringify(plM), filename: 'multyproget.p12', issuer: '12347770013' }
console.log(JSON.stringify({ global: bodyG, multy: bodyM }, null, 2))
