import React, { useEffect, useState } from 'react'

type Item = { registryId:string, transazioneId?:string, accepted:number, duplicates:number }
type Status = { id:string, totals:{ accepted:number, duplicates:number }, items: Item[] }

export default function BulkProgress({ jobId }: { jobId: string }){
  const [st, setSt] = useState<Status | null>(null)
  useEffect(()=>{
    let t:any
    const tick = async () => {
      try {
        const r = await fetch(`/bulk/status/${jobId}`)
        if (r.ok) setSt(await r.json())
      } catch {}
      t = setTimeout(tick, 2000)
    }
    tick(); return ()=>{ if (t) clearTimeout(t) }
  },[jobId])
  if (!st || (st as any).error) return <div>Avanzamento non disponibile</div>
  const total = st.items.reduce((a,b)=>a+b.accepted+b.duplicates,0)
  return (
    <div>
      <div>Job: {st.id}</div>
      <div>Totali accettati: {st.totals.accepted} | Duplicati: {st.totals.duplicates}</div>
      <ul>
        {st.items.map((it,idx)=>(
          <li key={idx}>
            <span>{it.registryId}</span>
            <span> accettati {it.accepted}</span>
            <span> duplicati {it.duplicates}</span>
          </li>
        ))}
      </ul>
      <div>Processati: {total}</div>
    </div>
  )
}
