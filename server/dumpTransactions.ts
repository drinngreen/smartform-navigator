import Database from 'better-sqlite3'

function main(){
  const db = new Database('local.db')
  try {
    const rows = db.prepare('SELECT id, status, rentri_response, timestamp FROM transactions ORDER BY timestamp DESC LIMIT 100').all() as any[]
    const out:any = { total: rows.length, byStatus: {}, http: { 200:0, 202:0, other:0 } }
    for (const r of rows){
      out.byStatus[r.status] = (out.byStatus[r.status]||0)+1
      let http:number|undefined
      try {
        const payload = typeof r.rentri_response==='string' ? JSON.parse(r.rentri_response) : r.rentri_response
        if (payload && typeof payload.status === 'number') http = payload.status
        else if (payload && payload.response && typeof payload.response.status === 'number') http = payload.response.status
      } catch {}
      if (http === 200) out.http[200]++
      else if (http === 202) out.http[202]++
      else out.http.other++
    }
    console.log(JSON.stringify(out, null, 2))
  } catch (e:any) {
    console.error('[ERROR]', e.message)
  } finally { db.close() }
}

main()