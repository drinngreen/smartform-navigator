import { readFileSync, writeFileSync, existsSync } from 'fs'
function parseJsonSafe(s:string){ try { return JSON.parse(s) } catch { return null } }
function toKey(obj:any){
  const k = String(obj?.key||'')
  if (k && /^(\d{4})_(\d+)$/.test(k)) return { anno: parseInt(k.split('_')[0],10), progressivo: String(k.split('_')[1]) }
  const body = parseJsonSafe(String(obj?.body||''))
  const arr = Array.isArray(body?.esito?.numero_registrazioni) ? body.esito.numero_registrazioni : []
  if (arr.length>0) return { anno: Number(arr[0]?.anno||0), progressivo: String(arr[0]?.progressivo||'') }
  return { anno: 0, progressivo: '' }
}
function toIdent(obj:any){
  const body = parseJsonSafe(String(obj?.body||''))
  const arr = Array.isArray(body?.esito?.numero_registrazioni) ? body.esito.numero_registrazioni : []
  if (arr.length>0) return String(arr[0]?.identificativo||'')
  return ''
}
function exportCsv(logPath:string, outPath:string){
  if (!existsSync(logPath)) { writeFileSync(outPath, 'anno,progressivo,registryId,transazioneId,identificativo\n', 'utf-8'); return }
  const raw = readFileSync(logPath,'utf-8')
  const lines = raw.trim().split(/\r?\n/)
  const rows: string[] = []
  const seen = new Set<string>()
  for (const l of lines){
    const j = parseJsonSafe(l)
    if (!j) continue
    if (j.kind==='RESULT' && Number(j.accepted)===1){
      const k = toKey(j)
      const id = toIdent(j)
      const rk = `${j.registryId}|${k.anno}|${k.progressivo}`
      if (!seen.has(rk)){
        seen.add(rk)
        rows.push([k.anno, k.progressivo, String(j.registryId||''), String(j.transazioneId||''), id].join(','))
      }
    }
  }
  const header = 'anno,progressivo,registryId,transazioneId,identificativo\n'
  writeFileSync(outPath, header + rows.join('\n') + (rows.length>0?'\n':''), 'utf-8')
}
function main(){
  const args = process.argv.slice(2)
  const outIdx = args.indexOf('--out')
  const outPath = outIdx>=0 ? args[outIdx+1] : 'out/ocr.accepted.csv'
  exportCsv('out/invio_massivo.log', outPath)
  process.stdout.write(outPath+'\n')
}
main()
