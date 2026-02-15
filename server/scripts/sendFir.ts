import axios from 'axios'
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'fs'

const BRIDGE = 'http://127.0.0.1:8765'
const STATUS_POLL_ATTEMPTS = 20
const STATUS_POLL_DELAY_MS = 1500

function ensureLogDir(){ if (!existsSync('out')) mkdirSync('out') }
function logLine(obj:any){ try { ensureLogDir(); if (obj?.kind==='SEND' || obj?.kind==='RESULT') appendFileSync('out/invio_massivo.log', JSON.stringify(obj)+'\n') } catch {} }

const GLOBAL = { registryId: 'R6QSWHZ6HJV', filename: 'certificato.p12', issuer: '08934760961' }
const MULTY  = { registryId: 'RQEL39R7NS0', filename: 'multyproget.p12', issuer: '12347770013' }

function loadInput(): any {
  try {
    const p = 'out/fir.input.json'
    if (existsSync(p)) {
      const raw = readFileSync(p, 'utf-8')
      const j = JSON.parse(raw)
      return j
    }
  } catch {}
  return {}
}
const input:any = loadInput()

function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)) }
function normInt(x:any){ const s = String(x||'').replace(/[^0-9]/g,''); const n = parseInt(s||'0',10); return isNaN(n)?0:n }

function buildPayloadFromFir(fir:any, isMulty:boolean){
  const cf = String(fir?.identificativi?.codiceFIR||'')
  const prog = normInt(cf)
  const anno = new Date(String(fir?.identificativi?.dataEmissione||new Date().toISOString().slice(0,10))).getFullYear()
  const dataReg = String(fir?.conferimentoDestinatario?.dataOraArrivo || (String(fir?.identificativi?.dataEmissione||new Date().toISOString().slice(0,10))+'T12:00:00'))
  const quantAcc = Number(fir?.conferimentoDestinatario?.quantitaAccettataKg || 0)
  const quantDecl = Number(fir?.rifiuto?.quantitaDichiarataKg || 0)
  const quantita = Math.max(quantAcc>0?quantAcc:quantDecl, 0.001)
  const um = String(fir?.rifiuto?.unitaMisura||'KG').toLowerCase()==='kg' ? 'kg' : 'l'
  const eerRaw = String(fir?.rifiuto?.codiceEER||'')
  const eer = eerRaw.replace(/[^0-9]/g,'').padStart(6,'0').slice(0,6)
  const provenienza = String(fir?.rifiuto?.provenienza||'U')
  const statoFisico = String(fir?.rifiuto?.statoFisico||'S').toUpperCase()==='S' ? 'S' : 'S'
  const base:any = {
    riferimenti: {
      numero_registrazione: { anno: Number(anno), progressivo: String(prog) },
      data_ora_registrazione: dataReg.endsWith('Z') ? dataReg : (dataReg+'Z'),
      causale_operazione: 'RE'
    },
    rifiuto: {
      codice_eer: eer,
      stato_fisico: statoFisico,
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
  if (status === 202){ try { const d = JSON.parse(dataStr||'{}'); transazioneId = String(d?.transazione_id||'') } catch {} }
  return { status, transazioneId, dataStr }
}

async function checkResult(registryId:string, transazioneId:string, filename:string, issuer:string){
  for(let i=0;i<STATUS_POLL_ATTEMPTS;i++){
    const body = { api: 'dati-registri', transazioneId, filename, issuer }
    const res = await axios.post(`${BRIDGE}/check-status`, body)
    const ok = res.data?.success === true
    const bodyStr = String(res.data?.data || '')
    if (ok && bodyStr.length > 0) return bodyStr
    await sleep(STATUS_POLL_DELAY_MS)
  }
  return ''
}

function countAccepted(bodyStr:string){
  try { const m = JSON.parse(bodyStr); const esito = m?.esito; const arr = Array.isArray(esito?.numero_registrazioni) ? esito.numero_registrazioni : []; return arr.length } catch { return 0 }
}

async function runFor(cfg:{registryId:string; filename:string; issuer:string}, isMulty:boolean){
  const payload = [buildPayloadFromFir(input.fir, isMulty)]
  const sent = await sendOne(cfg.registryId, cfg.filename, cfg.issuer, payload)
  logLine({ kind:'SEND', registryId:cfg.registryId, status: sent.status, transazioneId: sent.transazioneId, key: `${payload[0].riferimenti.numero_registrazione.anno}_${payload[0].riferimenti.numero_registrazione.progressivo}` })
  if (sent.status === 202 && sent.transazioneId){
    const bodyStr = await checkResult(cfg.registryId, sent.transazioneId, cfg.filename, cfg.issuer)
    const acc = countAccepted(bodyStr)
    logLine({ kind:'RESULT', registryId:cfg.registryId, transazioneId: sent.transazioneId, accepted: acc })
  } else if (sent.status === 200) {
    const acc = countAccepted(sent.dataStr)
    logLine({ kind:'RESULT', registryId:cfg.registryId, transazioneId: sent.transazioneId, accepted: acc })
  }
}

async function main(){ await runFor(GLOBAL, false); await runFor(MULTY, true) }
main()
