import axios from 'axios'
import { readFileSync, existsSync, appendFileSync, mkdirSync } from 'fs'
import path from 'path'

const BRIDGE = 'http://127.0.0.1:8765'
const DELAY_MS = Number(process.env.SEND_DELAY_MS || 250)

function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)) }
function normInt(x:any){ const s = String(x||'').replace(/[^0-9]/g,''); const n = parseInt(s||'0',10); return isNaN(n)?0:n }
function ensureLogDir(){ try { mkdirSync(path.join(process.cwd(),'out')) } catch {} }
function logLine(obj:any){ try { ensureLogDir(); const row = { ts: new Date().toISOString(), ...obj }; appendFileSync(path.join(process.cwd(),'out','invio_massivo.log'), JSON.stringify(row)+'\n') } catch {} }

function buildPayloadFromFir(fir:any, isMulty:boolean, idx:number){
  const cf = String(fir?.identificativi?.codiceFIR||'')
  let prog = normInt(cf)
  const isPlaceholder = /FMGWB/i.test(cf) || prog < 100000
  if (isPlaceholder || !prog || prog===0) prog = ((isMulty?800000:600000) + (idx+1))
  const anno = new Date(String(fir?.identificativi?.dataEmissione||new Date().toISOString().slice(0,10))).getFullYear()
  const dataReg = String(fir?.conferimentoDestinatario?.dataOraArrivo || (String(fir?.identificativi?.dataEmissione||new Date().toISOString().slice(0,10))+'T12:00:00'))
  const quantAcc = Number(fir?.conferimentoDestinatario?.quantitaAccettataKg || 0)
  const quantDecl = Number(fir?.rifiuto?.quantitaDichiarataKg || 0)
  const quantita = Math.max(quantAcc>0?quantAcc:quantDecl, 0.001)
  const um = String(fir?.rifiuto?.unitaMisura||'KG').toLowerCase()==='kg' ? 'kg' : 'l'
  const eerRaw = String(fir?.rifiuto?.codiceEER||'')
  const eer = eerRaw.replace(/[^0-9]/g,'').padStart(6,'0').slice(0,6)
  const provenienza = String(fir?.rifiuto?.provenienza||'U')
  const base:any = {
    riferimenti: {
      numero_registrazione: { anno: Number(anno), progressivo: String(prog) },
      data_ora_registrazione: dataReg.endsWith('Z') ? dataReg : (dataReg+'Z'),
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

async function sendOne(registryId:string, filename:string, issuer:string, payload:any[]){
  const url = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${registryId}/movimenti`
  const body = { url, payload: JSON.stringify(payload), filename, issuer }
  const res = await axios.post(`${BRIDGE}/send-rentri`, body)
  const status = Number(res.data?.status || 0)
  const dataStr = String(res.data?.data || '')
  let transazioneId = ''
  try { const d = JSON.parse(dataStr||'{}'); transazioneId = String(d?.transazione_id||'') } catch {}
  return { status, transazioneId, dataStr }
}
async function checkResult(api:string, transazioneId:string, filename:string, issuer:string){
  try {
    const body = { api, transazioneId, filename, issuer }
    const res = await axios.post(`${BRIDGE}/check-status`, body)
    const ok = res.data?.success === true
    const bodyStr = String(res.data?.data || '')
    return ok ? bodyStr : ''
  } catch { return '' }
}

function loadBatch(inFile:string){
  const raw = readFileSync(inFile,'utf-8')
  const obj = JSON.parse(raw)
  return Array.isArray(obj?.fir) ? obj.fir : []
}

function loadAcceptedKeys(){
  const p = path.join(process.cwd(), 'out', 'invio_massivo.log')
  const accG = new Set<string>()
  const accM = new Set<string>()
  if (existsSync(p)){
    const lines = readFileSync(p,'utf-8').split(/\r?\n/)
    const txToKey = new Map<string,string>()
    for(const l of lines){
      try{
        const j = JSON.parse(l)
        if (j.kind === 'SEND' && j.transazioneId && j.key){
          txToKey.set(String(j.transazioneId), String(j.key))
        }
      }catch{}
    }
    for(const l of lines){
      try{
        const j = JSON.parse(l)
        if (j.kind === 'RESULT' && j.accepted === 1){
          const t = String(j.transazioneId||'')
          const key = txToKey.get(t)||''
          if (!key) continue
          if (j.registryId === 'R6QSWHZ6HJV') accG.add(key)
          else if (j.registryId === 'RQEL39R7NS0') accM.add(key)
        }
      }catch{}
    }
  }
  return { accG, accM }
}

async function main(){
  const args = process.argv.slice(2)
  const inIdx = args.indexOf('--in')
  const inFile = inIdx>=0 ? args[inIdx+1] : path.join(process.cwd(),'out','fir.batch.cleaned.json')
  const batch = loadBatch(inFile)
  const { accG, accM } = loadAcceptedKeys()
  for (let i=0;i<batch.length;i++){
    const fir = batch[i]
    const anno = new Date(String(fir?.identificativi?.dataEmissione||new Date().toISOString().slice(0,10))).getFullYear()
    const progG = 600000+(i+1)
    const progM = 800000+(i+1)
    const keyG = `${anno}_${progG}`
    const keyM = `${anno}_${progM}`
    if (!accG.has(keyG)){
      const payload = [buildPayloadFromFir(fir,false,i)]
      const sent = await sendOne('R6QSWHZ6HJV', 'certificato.p12', '08934760961', payload)
      logLine({ kind:'SEND', registryId:'R6QSWHZ6HJV', status: sent.status, transazioneId: sent.transazioneId, key: `${anno}_${payload[0].riferimenti.numero_registrazione.progressivo}` })
      if (sent.transazioneId){
        const bodyStr = await checkResult('dati-registri', sent.transazioneId, 'certificato.p12', '08934760961')
        try { const m = JSON.parse(bodyStr||'{}'); const esito = m?.esito; const arr = Array.isArray(esito?.numero_registrazioni) ? esito.numero_registrazioni : []; logLine({ kind:'RESULT', registryId:'R6QSWHZ6HJV', transazioneId: sent.transazioneId, accepted: arr.length }) } catch { logLine({ kind:'RESULT_PENDING', registryId:'R6QSWHZ6HJV', transazioneId: sent.transazioneId, accepted: 0 }) }
      }
      await sleep(DELAY_MS)
    }
    if (!accM.has(keyM)){
      const payload2 = [buildPayloadFromFir(fir,true,i)]
      const sent2 = await sendOne('RQEL39R7NS0', 'multyproget.p12', '12347770013', payload2)
      logLine({ kind:'SEND', registryId:'RQEL39R7NS0', status: sent2.status, transazioneId: sent2.transazioneId, key: `${anno}_${payload2[0].riferimenti.numero_registrazione.progressivo}` })
      if (sent2.transazioneId){
        const bodyStr2 = await checkResult('dati-registri', sent2.transazioneId, 'multyproget.p12', '12347770013')
        try { const m2 = JSON.parse(bodyStr2||'{}'); const esito2 = m2?.esito; const arr2 = Array.isArray(esito2?.numero_registrazioni) ? esito2.numero_registrazioni : []; logLine({ kind:'RESULT', registryId:'RQEL39R7NS0', transazioneId: sent2.transazioneId, accepted: arr2.length }) } catch { logLine({ kind:'RESULT_PENDING', registryId:'RQEL39R7NS0', transazioneId: sent2.transazioneId, accepted: 0 }) }
      }
      await sleep(DELAY_MS)
    }
  }
}
main()
