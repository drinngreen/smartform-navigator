import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import { buildMovimentiFromXml } from './rentriClient'

function digits6(v:string){ const d=String(v||'').replace(/[^0-9]/g,''); return d.length>=6 }
function csvEscape(s:any){ const t=String(s??''); return '"'+t.replace(/"/g,'""')+'"' }

function validateGlobal(m:any){
  const caus = String(m?.riferimenti?.causale_operazione||'')
  const eer = String(m?.rifiuto?.codice_eer||'')
  const stato = String(m?.rifiuto?.stato_fisico||'')
  const prov = String(m?.rifiuto?.provenienza||'')
  const reasons:string[]=[]
  if (caus !== 'RE') reasons.push('CAUSALE')
  if (!digits6(eer)) reasons.push('EER')
  if (stato !== 'S') reasons.push('STATO')
  if (prov !== 'U') reasons.push('PROVENIENZA')
  return { ok: reasons.length===0, reasons }
}

function validateMulty(m:any){
  const caus = String(m?.riferimenti?.causale_operazione||'')
  const eer = String(m?.rifiuto?.codice_eer||'')
  const stato = String(m?.rifiuto?.stato_fisico||'')
  const dest = String(m?.rifiuto?.destinato_attivita||'')
  const prod = m?.produttore
  const tras = m?.trasportatore
  const desti = m?.destinatario
  const fir = (m as any)?.integrazione_fir
  const reasons:string[]=[]
  if (caus !== 'TR') reasons.push('CAUSALE')
  if (!digits6(eer)) reasons.push('EER')
  if (stato !== 'S') reasons.push('STATO')
  if (dest !== 'R13') reasons.push('DESTINATO')
  if (!prod || !prod?.codice_fiscale) reasons.push('RUOLI_PROD')
  if (!tras || !tras?.codice_fiscale) reasons.push('RUOLI_TRAS')
  if (!desti || !desti?.codice_fiscale) reasons.push('RUOLI_DEST')
  if (!fir || !fir?.numero_fir || !fir?.data_inizio_trasporto) reasons.push('FIR')
  return { ok: reasons.length===0, reasons }
}

function writeCsv(path:string, rows:any[]){
  mkdirSync('out', { recursive: true })
  const header = ['progressivo','data','causale','eer','stato','esito_locale','motivi']
  const lines = [header.join(',')]
  for (const r of rows){
    lines.push([csvEscape(r.progressivo), csvEscape(r.data), csvEscape(r.causale), csvEscape(r.eer), csvEscape(r.stato), csvEscape(r.esito), csvEscape(r.motivi.join('|'))].join(','))
  }
  writeFileSync(path, lines.join('\n'), 'utf-8')
}

async function main(){
  const gXml = readFileSync('test/global-reco_6000.xml.xml','utf-8')
  const mXml = readFileSync('test/multy-proget_6000.xml.xml','utf-8')
  const date = new Date().toISOString().slice(0,10)
  const gMovs = buildMovimentiFromXml(gXml, date)
  const mMovs = buildMovimentiFromXml(mXml, date)
  const gRows:any[]=[]
  const mRows:any[]=[]
  for (const mv of gMovs){
    const v = validateGlobal(mv)
    gRows.push({ progressivo: mv?.riferimenti?.numero_registrazione?.progressivo||'', data: mv?.riferimenti?.data_ora_registrazione||'', causale: mv?.riferimenti?.causale_operazione||'', eer: mv?.rifiuto?.codice_eer||'', stato: mv?.rifiuto?.stato_fisico||'', esito: v.ok?'OK':'NON_INVIABILE', motivi: v.reasons })
  }
  for (const mv of mMovs){
    const v = validateMulty(mv)
    mRows.push({ progressivo: mv?.riferimenti?.numero_registrazione?.progressivo||'', data: mv?.riferimenti?.data_ora_registrazione||'', causale: mv?.riferimenti?.causale_operazione||'', eer: mv?.rifiuto?.codice_eer||'', stato: mv?.rifiuto?.stato_fisico||'', esito: v.ok?'OK':'NON_INVIABILE', motivi: v.reasons })
  }
  writeCsv('out/global-validation.csv', gRows)
  writeCsv('out/multy-validation.csv', mRows)
  console.log('CSV generati in out/: global-validation.csv, multy-validation.csv')
}

main()
