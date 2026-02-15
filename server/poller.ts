import axios from 'axios'
import { db } from './db'
import { fir_files as firFiles, transactions } from '../drizzle/schema'
import { eq } from 'drizzle-orm'
import { submitFir } from './rentriClient'

type Task = { firId:number, transazioneId:string, registryId:string, filename:string, issuer?:string }

class RentriPoller {
  private queue: Task[] = []
  private timer: any = null
  start(){ if (this.timer) return; this.timer = setInterval(()=>this.tick(), 3000) }
  add(t:Task){ this.queue.push(t); this.start() }
  private async tick(){
    if (this.queue.length === 0) return
    const t = this.queue[0]
    try {
      const res = await axios.post('http://localhost:8765/check-status', {
        api: 'dati-registri', transazioneId: t.transazioneId, filename: t.filename, issuer: t.issuer
      })
      if (res.data?.success) {
        const raw = res.data?.data
        let model:any = null
        try { model = JSON.parse(raw) } catch {}
        const isError = !!(model && typeof model === 'object' && model.errore === true)
        const isDup = !!(model && Array.isArray(model.validazione) && model.validazione.some((v:any)=>String(v?.codice_messaggio||'').includes('movimentoDuplicatoDatabase')))
        if (!isError) {
          db.update(firFiles).set({ status: 'completed' }).where(eq(firFiles.id, t.firId)).run()
          db.insert(transactions).values({ firId: t.firId, status: 'completed', rentriResponse: JSON.stringify(res.data), signedXml: 'OK', timestamp: Date.now() }).run()
          this.queue.shift()
        } else if (isDup) {
          const rows = db.select().from(firFiles).where(eq(firFiles.id, t.firId)).all()
          const file = rows[0]
          if (file && file.xmlContent) {
            let sugg:any = null
            try {
              const s = await axios.post('http://localhost:8765/suggest-next', { registryId: t.registryId, filename: t.filename, issuer: t.issuer, limit: 1, order: 'desc' })
              sugg = s.data?.data
            } catch {}
            const regAnnoOverride = sugg?.anno
            const regProgOverride = sugg?.progressivo
            try {
              const r:any = await submitFir(String(file.xmlContent), t.filename, undefined, t.registryId, regAnnoOverride, regProgOverride)
              db.insert(transactions).values({ firId: t.firId, status: 'processing', rentriResponse: JSON.stringify(r), signedXml: 'OK', timestamp: Date.now() }).run()
              if (Number(r?.status) === 202 && r?.transazioneId) {
                db.update(firFiles).set({ status: 'processing' }).where(eq(firFiles.id, t.firId)).run()
                this.queue[0] = { firId: t.firId, transazioneId: r.transazioneId, registryId: r.registryId, filename: t.filename, issuer: t.issuer }
              } else {
                db.update(firFiles).set({ status: 'completed' }).where(eq(firFiles.id, t.firId)).run()
                this.queue.shift()
              }
            } catch {
              db.update(firFiles).set({ status: 'error' }).where(eq(firFiles.id, t.firId)).run()
              this.queue.shift()
            }
          } else {
            db.update(firFiles).set({ status: 'error' }).where(eq(firFiles.id, t.firId)).run()
            this.queue.shift()
          }
        } else {
          db.update(firFiles).set({ status: 'error' }).where(eq(firFiles.id, t.firId)).run()
          db.insert(transactions).values({ firId: t.firId, status: 'error', rentriResponse: JSON.stringify(res.data), signedXml: 'OK', timestamp: Date.now() }).run()
          this.queue.shift()
        }
      }
    } catch {}
  }
}

export const poller = new RentriPoller()