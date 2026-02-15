import { useEffect, useState } from 'react'
import axios from 'axios'

export default function ImportMassivo(){
  const [files, setFiles] = useState<File[]>([])
  const [companyP12, setCompanyP12] = useState('certificato.p12')
  const [registryId, setRegistryId] = useState('R6QSWHZ6HJV')
  const multyRegistri = [
    { id: 'RQEL39R7NS0', label: 'Intermediazione' },
    { id: 'RAH20NP7O40', label: 'Produttore-Destinatario' },
    { id: 'RQCTG1TP7NT0', label: 'Trasporto Conto Proprio' }
  ]
  useEffect(()=>{
    if (companyP12 === 'multyproget.p12') setRegistryId('RQEL39R7NS0')
  },[companyP12])
  const [anno, setAnno] = useState(new Date().getFullYear())
  const [startProgressivo, setStartProgressivo] = useState('0000001')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [batchSize, setBatchSize] = useState(50)
  const [ratePerMinute, setRatePerMinute] = useState(600)
  const [count, setCount] = useState(0)
  const onDrop = (e:any)=>{ const fs:File[] = Array.from(e.target.files||[]); setFiles(fs); setCount(fs.length) }
  const upload = async ()=>{
    if (files.length===0) return
    const arr:any[]=[]
    for (const f of files){ const txt = await f.text(); arr.push({ filename: f.name, xmlContent: txt, companyP12 }) }
    await axios.post('/api/fir.batchUpload', { files: arr })
  }
  const start = async ()=>{
    await axios.post('/api/fir.startMassive', { companyP12, registryId, anno, startProgressivo, date, ratePerMinute, batchSize })
  }
  return (
    <div style={{ padding: 16 }}>
      <h2>Import Massivo XML</h2>
      <div>
        <label>Operatore</label>
        <select value={companyP12} onChange={e=>setCompanyP12(e.target.value)}>
          <option value="certificato.p12">Global Reco</option>
          <option value="multyproget.p12">Multy Proget</option>
        </select>
      </div>
      {companyP12 === 'multyproget.p12' ? (
        <div>
          <label>Registro</label>
          <select value={registryId} onChange={e=>setRegistryId(e.target.value)}>
            {multyRegistri.map(r => (<option key={r.id} value={r.id}>{r.id} - {r.label}</option>))}
          </select>
        </div>
      ) : (
        <div>
          <label>Registro</label>
          <input value={registryId} onChange={e=>setRegistryId(e.target.value)} />
        </div>
      )}
      <div>
        <label>Anno</label>
        <input type="number" value={anno} onChange={e=>setAnno(parseInt(e.target.value||`${new Date().getFullYear()}`))} />
      </div>
      <div>
        <label>Progressivo iniziale</label>
        <input value={startProgressivo} onChange={e=>setStartProgressivo(e.target.value)} />
      </div>
      <div>
        <label>Data registrazione</label>
        <input value={date} onChange={e=>setDate(e.target.value)} />
      </div>
      <div>
        <label>Batch size</label>
        <input type="number" value={batchSize} onChange={e=>setBatchSize(parseInt(e.target.value||'50'))} />
      </div>
      <div>
        <label>Rate per minuto</label>
        <input type="number" value={ratePerMinute} onChange={e=>setRatePerMinute(parseInt(e.target.value||'600'))} />
      </div>
      <div>
        <input type="file" multiple onChange={onDrop} />
        <div>File: {count}</div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={upload}>Carica</button>
        <button onClick={start}>Avvia invio</button>
      </div>
    </div>
  )
}