import { db } from './db'
import { fir_files as firFiles, transactions } from '../drizzle/schema'
import { eq } from 'drizzle-orm'
import { submitFir } from './rentriClient'
import axios from 'axios'

class FirQueue {
  private isRunning = false
  private options: any = null
  private lastSend = 0

  async start(options?: any) {
    if (this.isRunning) return
    this.isRunning = true
    this.options = options || this.options
    console.log('[QUEUE] Start')
    this.processNext()
  }

  async pause() { this.isRunning = false }

  private async processNext() {
    if (!this.isRunning) return
    try {
      const rate = Math.max(1, Number(this.options?.ratePerMinute || 60))
      const intervalMs = Math.floor(60000 / rate)
      const now = Date.now()
      const wait = Math.max(0, intervalMs - (now - this.lastSend))
      if (wait > 0) { setTimeout(() => this.processNext(), wait); return }
      const batchSize = Math.max(1, Number(this.options?.batchSize || 10))
      let rows = db.select().from(firFiles).where(eq(firFiles.status, 'pending')).limit(batchSize).all()
      if (rows.length === 0) rows = db.select().from(firFiles).where(eq(firFiles.status, 'error')).limit(batchSize).all()
      if (rows.length === 0) { setTimeout(() => this.processNext(), 1000); return }

      const filename = this.options?.companyP12 || 'certificato.p12'
      const registryId = this.options?.registryId || 'R6QSWHZ6HJV'
      const anno = Number(this.options?.anno || new Date().getFullYear())
      const date = String(this.options?.date || new Date().toISOString().split('T')[0])
      const inc=(p:string,w:number)=>{const d=p.replace(/[^0-9]/g,''); const n=(parseInt(d||'0')+1).toString().padStart(w,'0'); return n}
      let prog = String(this.options?.startProgressivo || '0000001')
      let width = prog.replace(/[^0-9]/g,'').length || 7
      try {
        const sBody = { registryId, filename, issuer: undefined, limit: 1, order: 'desc' }
        const s = await axios.post('http://localhost:8765/suggest-next', sBody)
        const data = s.data?.data
        if (data?.progressivo) { width = String(data.progressivo).replace(/[^0-9]/g,'').length || width; prog = String(data.progressivo) }
        prog = inc(prog, width)
      } catch {}

      for (const r of rows) {
        db.update(firFiles).set({ status: 'processing' }).where(eq(firFiles.id, r.id)).run()
        try {
          const res:any = await submitFir(String(r.xmlContent), filename, date, registryId, anno, prog)
          this.lastSend = Date.now()
          if (Number(res?.status) === 202 && res?.transazioneId) {
            db.insert(transactions).values({ firId: r.id as number, status: 'processing', rentriResponse: JSON.stringify(res), signedXml: 'OK', timestamp: Date.now() }).run()
            const { poller } = await import('./poller')
            poller.add({ firId: r.id as number, transazioneId: String(res.transazioneId), registryId, filename })
          } else {
            db.update(firFiles).set({ status: 'completed' }).where(eq(firFiles.id, r.id)).run()
            db.insert(transactions).values({ firId: r.id as number, status: 'completed', rentriResponse: JSON.stringify(res), signedXml: 'OK', timestamp: Date.now() }).run()
          }
        } catch (err:any) {
          db.update(firFiles).set({ status: 'error' }).where(eq(firFiles.id, r.id)).run()
          db.insert(transactions).values({ firId: r.id as number, status: 'error', rentriResponse: String(err?.message||'error'), signedXml: 'KO', timestamp: Date.now() }).run()
        }
        prog = inc(prog, width)
      }
    } catch (err: any) {
      const processing = db.select().from(firFiles).where(eq(firFiles.status, 'processing')).all()
      if (processing.length > 0) {
        db.update(firFiles).set({ status: 'error', errorMessage: err.message }).where(eq(firFiles.id, processing[0].id)).run()
        db.insert(transactions).values({ firId: processing[0].id, status: 'error', rentriResponse: err.message, signedXml: 'KO', timestamp: Date.now() }).run()
      }
    }
    setTimeout(() => this.processNext(), 50)
  }
}

export const firQueue = new FirQueue()