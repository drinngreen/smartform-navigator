// @ts-nocheck
import { useEffect, useMemo, useState } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
// @ts-ignore

type FirRow = { id:number; numero:string|null; data:string|null; xmlContent:string; status:string }

export default function Transactions(){
  const [rows, setRows] = useState<FirRow[]>([])
  const [status, setStatus] = useState<string>('tutti')
  const [thumbprint, setThumbprint] = useState<string>('')
  const [filename, setFilename] = useState<string>('')
  const [selected, setSelected] = useState<Record<number, boolean>>({})
  const [concurrency, setConcurrency] = useState<number>(5)
  const selectedIds = useMemo(()=> Object.keys(selected).filter(k=>selected[Number(k)]).map(Number), [selected])

  useEffect(() => {
    const tick = async () => {
      try{
        const res = await fetch('/trpc/fir.list', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({}) })
        const data = await res.json()
        const list: FirRow[] = data?.result?.data ?? data
        setRows(Array.isArray(list)? list : [])
      }catch{}
    }
    tick()
    const id = setInterval(tick, 5000)
    return () => clearInterval(id)
  }, [])

  const filt = useMemo(() => rows.filter(r => status==='tutti' ? true : r.status===status), [rows, status])
  const counts = useMemo(() => ({
    totale: rows.length,
    in_attesa: rows.filter(r=>r.status==='in_attesa').length,
    inviato: rows.filter(r=>r.status==='inviato').length,
  }), [rows])

  const send = async (id:number) => {
    if(!thumbprint && !filename){ alert('Inserisci thumbprint o filename'); return }
    const res = await fetch('/trpc/fir.send', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input: { id, thumbprint, filename: filename || undefined } })
    })
    const json = await res.json()
    alert('Risposta Bridge: ' + JSON.stringify(json))
  }

  const batchSend = async () => {
    if(selectedIds.length===0){ alert('Seleziona almeno un FIR'); return }
    if(!thumbprint && !filename){ alert('Inserisci thumbprint o filename'); return }
    const res = await fetch('/trpc/fir.batchSend', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input: { ids: selectedIds, thumbprint: thumbprint || undefined, filename: filename || undefined, concurrency } })
    })
    const json = await res.json()
    alert('Batch Bridge: ' + JSON.stringify(json))
  }

  return (
    <div className="grid gap-6">
      <h2 className="text-2xl font-bold zoli-title">Transazioni</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4"><div className="text-slate-400 text-sm">Totale</div><div className="text-3xl font-bold">{counts.totale}</div></Card>
        <Card className="p-4"><div className="text-slate-400 text-sm">In attesa</div><div className="text-3xl font-bold">{counts.in_attesa}</div></Card>
        <Card className="p-4"><div className="text-slate-400 text-sm">Inviati</div><div className="text-3xl font-bold">{counts.inviato}</div></Card>
        <Card className="p-4">
          <div className="text-slate-400 text-sm">Bridge</div>
          <div className="text-sm mt-1">Thumbprint:<input className="ml-2 px-2 py-1 rounded-md bg-slate-900/60 border border-slate-800" value={thumbprint} onChange={e=>setThumbprint(e.target.value)} /></div>
          <div className="text-sm mt-2">Filename:<input placeholder="es. certificato.p12" className="ml-2 px-2 py-1 rounded-md bg-slate-900/60 border border-slate-800" value={filename} onChange={e=>setFilename(e.target.value)} /></div>
          <div className="text-sm mt-2">Concorrenza:<input type="number" min={1} max={10} className="ml-2 w-16 px-2 py-1 rounded-md bg-slate-900/60 border border-slate-800" value={concurrency} onChange={e=>setConcurrency(Number(e.target.value))} /></div>
          <div className="mt-3"><Button onClick={batchSend}>Invia selezionati</Button></div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Storico Transazioni</div>
          <select value={status} onChange={e=>setStatus(e.target.value)} className="px-3 py-2 rounded-md bg-slate-900/60 border border-slate-800">
            <option value="tutti">Tutti</option>
            <option value="in_attesa">In attesa</option>
            <option value="inviato">Inviato</option>
          </select>
        </div>
        <div className="grid gap-2">
          {filt.length===0 && <div className="text-slate-400">Nessuna transazione trovata</div>}
          {filt.map(r => (
            <div key={r.id} className="flex items-center justify-between border border-slate-800 rounded-lg p-3 bg-slate-900/30">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={!!selected[r.id]} onChange={e=>setSelected(s=>({ ...s, [r.id]: e.target.checked }))} />
                <div className="text-sm">FIR #{r.id} · Numero {r.numero ?? '-'} · Data {r.data ?? '-'}</div>
                <div className="text-xs text-slate-400">Stato: {r.status}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={()=>send(r.id)}>Invia</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}