import axios from 'axios'
import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'fs'
const BRIDGE = 'http://127.0.0.1:8765'
const DELAY_MS = Number(process.env.SEND_DELAY_MS || 100)
function ensureLogDir(){ if (!existsSync('out')) mkdirSync('out') }
function logLine(obj:any){ try { ensureLogDir(); const row = { ts: new Date().toISOString(), ...obj }; appendFileSync('out/invio_massivo.log', JSON.stringify(row)+'\n') } catch {} }
function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)) }
function normInt(x:any){ const s = String(x||'').replace(/[^0-9]/g,''); const n = parseInt(s||'0',10); return isNaN(n)?0:n }
function buildPayloadFromFir(item:any, isMulty:boolean, idx:number, base:number, anno:number){
  // Check if item is already a Rentri payload (has riferimenti & rifiuto)
  if (item?.riferimenti && item?.rifiuto) {
     const p = JSON.parse(JSON.stringify(item)) // Clone
     // Override progressive if needed or just trust it?
     // The user might want to re-base it.
     if (p.riferimenti.numero_registrazione) {
        p.riferimenti.numero_registrazione.progressivo = String(base + (idx + 1))
        p.riferimenti.numero_registrazione.anno = Number(anno)
     }
     if (isMulty) {
       p.intermediario = { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' }
       p.intermediari = [ { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' } ]
     }
     return p
  }

  if (item?.prebuilt) {
    const p = item.prebuilt
    // We MUST override the progressive to ensure uniqueness in this mass run
    // Otherwise we might get duplicates if the prebuilt payload has an old progressive
    if (p.riferimenti && p.riferimenti.numero_registrazione) {
      p.riferimenti.numero_registrazione.progressivo = String(base + (idx + 1))
      p.riferimenti.numero_registrazione.anno = Number(anno)
    }
    // Ensure intermediary if requested
    if (isMulty) {
      p.intermediario = { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' }
      p.intermediari = [ { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' } ]
    }
    return p
  }
  const fir = item?.fir || item
  const cf = String(fir?.identificativi?.codiceFIR||'')
  // ALWAYS force progressive generation based on base + idx to ensure uniqueness and validity
  // ignoring any number found in the FIR code itself (which might be a local progressive or random)
  let prog = (base + (idx+1))
  
  const dataReg = String(fir?.conferimentoDestinatario?.dataOraArrivo || (String(fir?.identificativi?.dataEmissione||new Date().toISOString().slice(0,10))+'T12:00:00'))
  const quantAcc = Number(fir?.conferimentoDestinatario?.quantitaAccettataKg || 0)
  const quantDecl = Number(fir?.rifiuto?.quantitaDichiarataKg || 0)
  const quantita = Math.max(quantAcc>0?quantAcc:quantDecl, 0.001)
  const um = String(fir?.rifiuto?.unitaMisura||'KG').toLowerCase()==='kg' ? 'kg' : 'l'
  const eerRaw = String(fir?.rifiuto?.codiceEER || fir?.cer || (fir?.rifiuto?.cer||''))
  const eer = eerRaw.replace(/[^0-9]/g,'').padStart(6,'0').slice(0,6)
  const provenienza = String(fir?.rifiuto?.provenienza||'U')

  // Proactive Annotation Logic
  let firCode = cf
  const firDate = String(fir?.identificativi?.dataEmissione||'').split('T')[0]
  if (firCode) firCode = firCode.toUpperCase()
  
  let annot = ''
  if (firCode && firCode !== 'ND') {
    annot = `FIR: ${firCode}`
    if (firDate) {
        // Assume YYYY-MM-DD
        const parts = firDate.split('-')
        if (parts.length === 3) annot += ` del ${parts[2]}/${parts[1]}/${parts[0]}`
    }
  }

  const payload:any = {
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
  if (annot) payload.annotazioni = annot

  if (eer === '000000') return null // Skip invalid EER
  if (isMulty){
    payload.intermediario = { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' }
    payload.intermediari = [ { denominazione: 'MULTY PROGET S.R.L.', codice_fiscale: '12347770013' } ]
  }
  return payload
}
function loadBatch(file:string){
  try {
    if (!existsSync(file)) { console.error(`File not found: ${file}`); return [] }
    const raw = readFileSync(file,'utf-8')
    const obj = JSON.parse(raw)
    if (Array.isArray(obj)) return obj.map((x:any) => x.fir || x)
    if (Array.isArray(obj?.fir)) return obj.fir
    if (Array.isArray(obj?.movimenti)) return obj.movimenti
    return []
  } catch (e) { console.error('Error loading batch:', e); return [] }
}
async function sendBatch(registryId:string, filename:string, issuer:string, payload:any[]): Promise<{status:number, transazioneId:string, subTids?:string[]}> {
  const url = `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${registryId}/movimenti`
  const body = { url, payload: JSON.stringify(payload), filename, issuer }
  const res = await axios.post(`${BRIDGE}/send-rentri`, body)
  const status = Number(res.data?.status || 0)
  
  if (status >= 400) {
    console.log(`Error ${status} for batch size ${payload.length}:`, JSON.stringify(res.data))
    // Recursive retry strategy
    if (payload.length > 1) {
      console.log('Splitting batch and retrying...')
      const mid = Math.floor(payload.length / 2)
      const left = payload.slice(0, mid)
      const right = payload.slice(mid)
      
      const r1 = await sendBatch(registryId, filename, issuer, left)
      const r2 = await sendBatch(registryId, filename, issuer, right)
      
      // If at least one succeeded or partial, we return a "success-like" status to keep going, 
      // but we lose the single transazioneId. We can't track it easily in the current loop structure.
      // So we return a special status or just log it.
      // To fit into the existing loop, we pretend it's a 202 if ANY part worked, 
      // but we can't push to 'pending' because we have multiple TIDs.
      // We will handle polling internally here for the sub-batches?
      // No, that complicates things.
      // We will return a special "207" (Multi-Status) or just 202 and put the last valid TID?
      // Actually, if we split, we might produce multiple TIDs.
      // Let's just return 202 and push ALL TIDs to a global list? 
      // The caller expects ONE object.
      // Hack: we won't return TID here, but push directly to a global 'pending' queue?
      // But 'pending' is local to main().
      
      // Simpler approach: If we split, we don't return a single TID. 
      // We return status 202 to indicate "processed" (some might have failed).
      // We need to capture the TIDs of successful sub-batches.
      // Let's modify the return type to include `subTids: string[]`.
      
      const subTids = [...(r1.subTids || []), ...(r2.subTids || [])]
      if (r1.transazioneId) subTids.push(r1.transazioneId)
      if (r2.transazioneId) subTids.push(r2.transazioneId)
      
      return { status: 202, transazioneId: '', subTids }
    } else {
      console.error('Single item failed:', JSON.stringify(payload[0]))
      return { status, transazioneId: '' }
    }
  }

  let transazioneId = ''
  try { const d = JSON.parse(String(res.data?.data||'{}')); transazioneId = String(d?.transazione_id||'') } catch {}
  return { status, transazioneId }
}
async function pollTransazione(registryId:string, transazioneId:string, filename:string, issuer:string){
  for(let i=0;i<30;i++){
    const body = { api:'dati-registri', transazioneId, filename, issuer }
    const res = await axios.post(`${BRIDGE}/check-status`, body)
    const ok = res.data?.success === true
    const bodyStr = String(res.data?.data || '')
    if (ok && bodyStr.length > 0) return bodyStr
    await sleep(500)
  }
  return ''
}
function countAccepted(bodyStr:string){
  try { const m = JSON.parse(bodyStr); const esito = m?.esito; const arr = Array.isArray(esito?.numero_registrazioni) ? esito.numero_registrazioni : []; return arr.length } catch { return 0 }
}
async function main(){
  try {
    const args = process.argv.slice(2)
    console.log('Args:', args)
  const inIdx = args.indexOf('--in')
  const baseIdx = args.indexOf('--base')
  const annoIdx = args.indexOf('--anno')
  const limitIdx = args.indexOf('--limit')
  const skipIdx = args.indexOf('--skip')
  const batchIdx = args.indexOf('--batch')
  const concIdx = args.indexOf('--concurrency')
  const onlyGlobal = args.includes('--onlyGlobal')
  const regIdx = args.indexOf('--registry')
  const certIdx = args.indexOf('--cert')
  const issIdx = args.indexOf('--issuer')

  const inFile = inIdx>=0 ? args[inIdx+1] : ''
  const base = baseIdx>=0 ? Number(args[baseIdx+1]) : 960001
  const anno = annoIdx>=0 ? Number(args[annoIdx+1]) : 2025
  const limit = limitIdx>=0 ? Number(args[limitIdx+1]) : 100
  const skip = skipIdx>=0 ? Number(args[skipIdx+1]) : 0
  const batchSize = batchIdx>=0 ? Math.max(1, Number(args[batchIdx+1])) : 100
  const concurrency = concIdx>=0 ? Math.max(1, Number(args[concIdx+1])) : 5
  
  const targetReg = regIdx>=0 ? args[regIdx+1] : 'R6QSWHZ6HJV'
  const targetCert = certIdx>=0 ? args[certIdx+1] : 'certificato.p12'
  const targetIss = issIdx>=0 ? args[issIdx+1] : '08934760961'
  
  const all = loadBatch(inFile)
  console.log('Loaded items:', all.length)
  const subset = all.slice(skip, Math.min(skip + limit, all.length))
  console.log('Subset size:', subset.length)
  let idx = 0
  const pending:{ tid:string, reg:string, fn:string, iss:string }[] = []
  while (idx < subset.length){
    console.log('Processing batch starting at', skip + idx)
    const slice = subset.slice(idx, Math.min(idx + batchSize, subset.length))
    const withIntermediary = args.includes('--withIntermediary')
    const payloadG = slice.map((fir, i)=>buildPayloadFromFir(fir, withIntermediary, skip + idx + i, base, anno)).filter(x => x !== null)
    idx += slice.length
    if (payloadG.length === 0) { console.log('Skipping empty batch (all invalid)'); continue }
    const sentG = await sendBatch(targetReg, targetCert, targetIss, payloadG)
    const lastG = payloadG[payloadG.length-1]
    const keyG = `${lastG?.riferimenti?.numero_registrazione?.anno}_${lastG?.riferimenti?.numero_registrazione?.progressivo}`
    logLine({ kind:'SEND', registryId:targetReg, status: sentG.status, transazioneId: sentG.transazioneId, key: keyG, count: payloadG.length })
    if (sentG.status===202 && sentG.transazioneId) pending.push({ tid: sentG.transazioneId, reg:targetReg, fn:targetCert, iss:targetIss })
    if (sentG.subTids) {
      for(const t of sentG.subTids) pending.push({ tid: t, reg:targetReg, fn:targetCert, iss:targetIss })
    }
    if (!onlyGlobal){
      // For "multy only" tasks, we want to respect the target registry passed in arguments if it is Multy
      // But the original code hardcoded Multy here.
      // If the user wants to send ONLY to Multy, they should use --onlyGlobal and set --registry RQEL39R7NS0.
      // If the user wants to send to BOTH, they should omit --onlyGlobal.
      // The current logic is:
      // - Main loop sends to targetReg (which defaults to Global R6...)
      // - This block sends to Multy RQ... (Hardcoded)
      
      // If we are in a scenario where we want to send "Multy Only" using specific parameters, 
      // we should just use the main loop with the correct registry.
      
      // So, if the user already targeted Multy in the main loop, we shouldn't duplicate it here.
      if (targetReg !== 'RQEL39R7NS0') {
         const payloadM = slice.map((fir, i)=>buildPayloadFromFir(fir, true, skip + idx + i, base, anno)).filter(x => x !== null)
         if (payloadM.length > 0) {
           const sentM = await sendBatch('RQEL39R7NS0', 'multyproget.p12', '12347770013', payloadM)
           const lastM = payloadM[payloadM.length-1]
           const keyM = `${lastM?.riferimenti?.numero_registrazione?.anno}_${lastM?.riferimenti?.numero_registrazione?.progressivo}`
           logLine({ kind:'SEND', registryId:'RQEL39R7NS0', status: sentM.status, transazioneId: sentM.transazioneId, key: keyM, count: payloadM.length })
           if (sentM.status===202 && sentM.transazioneId) pending.push({ tid: sentM.transazioneId, reg:'RQEL39R7NS0', fn:'multyproget.p12', iss:'12347770013' })
            if (sentM.subTids) {
               for(const t of sentM.subTids) pending.push({ tid: t, reg:'RQEL39R7NS0', fn:'multyproget.p12', iss:'12347770013' })
            }
          }
       }
    }
    await sleep(DELAY_MS)
    while (pending.length > 0){
      const group = pending.splice(0, concurrency)
      const results = await Promise.all(group.map(async q=>{
        const bodyStr = await pollTransazione(q.reg, q.tid, q.fn, q.iss)
        const acc = countAccepted(bodyStr)
        logLine({ kind:'RESULT', registryId:q.reg, transazioneId: q.tid, accepted: acc, body: bodyStr })
        return acc
      }))
      await sleep(DELAY_MS)
    }
  }
  } catch (e) { console.error(e) }
}
main().catch(console.error)
