// @ts-nocheck
import { z } from 'zod'
import { procedure, router } from './trpc.ts'
import { db } from './db.ts'
import { fir_files as firFiles, transactions } from '../drizzle/schema.ts'
import { eq, desc, sql } from 'drizzle-orm'
import { firQueue } from './queue.ts'
import { submitFir } from './rentriClient.ts'
import { poller } from './poller.ts'
import axios from 'axios'
import { startStream, stopStream, getStatus } from './streamer.ts'
import fs from 'fs'
import { buildMovimentiFromXml } from './rentriClient.ts'

export const appRouter = router({
  fir: router({
    list: procedure.input(z.object({ company: z.string().optional() }).optional())
      .query(async ({ input }) => {
        let query = db.select().from(firFiles).orderBy(desc(firFiles.createdAt))
        if (input?.company && input.company !== 'ALL') {
          query = db.select().from(firFiles).where(eq(firFiles.companyP12, input.company)).orderBy(desc(firFiles.createdAt))
        }
        // @ts-ignore drizzle typing simplified
        return query.all()
      }),

    upload: procedure.input(z.object({ filename: z.string(), xmlContent: z.string() })).mutation(async ({ input }) => {
      db.insert(firFiles).values({
        filename: input.filename,
        xmlContent: input.xmlContent,
        status: 'pending',
        uploadDate: Date.now(),
        createdAt: Date.now()
      }).run()
      return { success: true }
    }),

    batchUpload: procedure.input(z.object({
      files: z.array(z.object({ filename: z.string(), xmlContent: z.string(), companyP12: z.string() }))
    })).mutation(async ({ input }) => {
      if (input.files.length === 0) return { count: 0 }
      const values = input.files.map(f => ({
        filename: f.filename,
        xmlContent: f.xmlContent,
        companyP12: f.companyP12,
        status: 'pending',
        uploadDate: Date.now(),
        createdAt: Date.now()
      }))
      for (const v of values) db.insert(firFiles).values(v).run()
      return { success: true, count: input.files.length }
    }),

    getStats: procedure.input(z.object({ company: z.string().optional() }).optional())
      .query(async ({ input }) => {
        try {
          const whereClause = input?.company && input.company !== 'ALL' ? eq(firFiles.companyP12, input.company) : undefined
          const all = whereClause
            ? db.select({ status: firFiles.status, count: sql<number>`count(*)` }).from(firFiles).where(whereClause).groupBy(firFiles.status).all()
            : db.select({ status: firFiles.status, count: sql<number>`count(*)` }).from(firFiles).groupBy(firFiles.status).all()
          const stats: any = { total: 0, pending: 0, completed: 0, error: 0, processing: 0 }
          all.forEach(s => { stats[s.status || 'pending'] = s.count; stats.total += s.count })
          return stats
        } catch { return { total: 0 } }
      }),

    liveHeads: procedure.query(async () => {
      const parseHead = (text:string) => {
        try {
          const arr = JSON.parse(text)
          if (Array.isArray(arr) && arr.length > 0) {
            const el = arr[0]
            const nr = el.numero_registrazione || (el.riferimenti && el.riferimenti.numero_registrazione) || {}
            const pr = typeof nr.progressivo === 'string' ? nr.progressivo : (typeof nr.progressivo === 'number' ? String(nr.progressivo) : '')
            const an = typeof nr.anno === 'number' ? nr.anno : (typeof nr.anno === 'string' ? Number(nr.anno) : undefined)
            const dt = el.data_ora_registrazione || (el.riferimenti && el.riferimenti.data_ora_registrazione) || ''
            const idr = el.identificativo_registro || (el.riferimenti && el.riferimenti.identificativo_registro) || ''
            return { progressivo: pr, anno: an, data_ora: dt, registryId: idr }
          }
        } catch {}
        return { progressivo: '', anno: undefined, data_ora: '', registryId: '' }
      }
      const isSane = (p:string) => { const d = String(p||'').replace(/[^0-9]/g,''); if (!d) return false; const n = parseInt(d); return n > 0 && n < 20000 }
      try {
        const gBody = { registryId: 'R6QSWHZ6HJV', filename: 'certificato.p12', issuer: '', limit: 1, order: 'desc' }
        const mBody = { registryId: 'RQEL39R7NS0', filename: 'multyproget.p12', issuer: '', limit: 1, order: 'desc' }
        let [gr, mr] = await Promise.all([
          axios.post('http://localhost:8765/list-movimenti', gBody),
          axios.post('http://localhost:8765/list-movimenti', mBody)
        ])
        let gHead = parseHead(String(gr.data?.data || '[]'))
        let mHead = parseHead(String(mr.data?.data || '[]'))
        if (!isSane(gHead.progressivo)) {
          try {
            const gr2 = await axios.post('http://localhost:8765/list-registrazioni', gBody)
            gHead = parseHead(String(gr2.data?.data || '[]'))
          } catch {}
        }
        if (!isSane(mHead.progressivo)) {
          try {
            const mr2 = await axios.post('http://localhost:8765/list-registrazioni', mBody)
            mHead = parseHead(String(mr2.data?.data || '[]'))
          } catch {}
        }
        return { global: gHead, multy: mHead }
      } catch { return { global: {}, multy: {} } }
    }),

    getRecentTransactions: procedure.input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const lim = input?.limit && input.limit > 0 ? input.limit : 50
        try {
          // @ts-ignore drizzle typing simplified
          const rows = db.select().from(transactions).orderBy(desc(transactions.timestamp)).limit(lim as any).all() as any[]
          const parse = (t:any) => {
            let http:number|undefined; let transazioneId:string|undefined; let errore:boolean|undefined; let codes:string[]=[]
            try {
              const payload = typeof t.rentriResponse === 'string' ? JSON.parse(t.rentriResponse) : t.rentriResponse
              if (payload?.status && typeof payload.status === 'number') http = payload.status
              if (payload?.send?.status && typeof payload.send.status === 'number') http = payload.send.status
              const dataStr = payload?.send?.data || payload?.data
              try {
                const d = JSON.parse(dataStr || '{}'); transazioneId = d?.transazione_id
                if (payload?.check?.data) {
                  const c = JSON.parse(payload.check.data || '{}')
                  errore = !!c?.errore
                  if (Array.isArray(c?.validazione)) codes = c.validazione.map((v:any)=>String(v?.codice_messaggio||''))
                }
              } catch {}
            } catch {}
            return { id: t.id, status: t.status, httpStatus: http, transazioneId, errore, codes, timestamp: t.timestamp }
          }
          return rows.map(parse)
        } catch { return [] }
      }),

    getTxStats: procedure.query(async () => {
      try {
        // @ts-ignore drizzle typing simplified
        const rows = db.select().from(transactions).all() as any[]
        const stats:any = { total: 0, completed: 0, error: 0, lastAcceptedAt: 0 }
        for (const r of rows) {
          stats.total++
          if (r.status === 'completed') stats.completed++
          if (r.status === 'error') stats.error++
          if (r.status === 'completed') stats.lastAcceptedAt = Math.max(Number(r.timestamp||0), stats.lastAcceptedAt)
        }
        return stats
      } catch { return { total: 0, completed: 0, error: 0 } }
    }),
    getAcceptedTotals: procedure.query(async () => {
      try {
        // @ts-ignore drizzle typing simplified
        const rows = db.select().from(transactions).all() as any[]
        function parseAcceptedFlexible(bodyStr:string){
          try {
            const m = JSON.parse(bodyStr)
            const es = m?.esito || {}
            if (Array.isArray(es.numero_registrazioni)) return es.numero_registrazioni.length
            if (typeof es.numero_registrazioni === 'number') return es.numero_registrazioni
            if (es.numero_registrazioni && typeof es.numero_registrazioni === 'object') {
              const keys = Object.keys(es.numero_registrazioni)
              return keys.length
            }
            if (typeof es.totale_registrazioni_accettate === 'number') return es.totale_registrazioni_accettate
            if (typeof es.numero_registrazioni_accettate === 'number') return es.numero_registrazioni_accettate
            return 0
          } catch { return 0 }
        }
        function parseDuplicates(bodyStr:string){
          try {
            const m = JSON.parse(bodyStr)
            const v = Array.isArray(m?.validazione) ? m.validazione : []
            return v.filter((x:any)=>{ const c = String(x?.codice_messaggio||''); return c.includes('movimentoDuplicatoDatabase') || c.toUpperCase().includes('DUPLICATO') }).length
          } catch { return 0 }
        }
        let gAcc=0, mAcc=0, gDup=0, mDup=0
        for (const r of rows){
          const payload = typeof r.rentriResponse === 'string' ? r.rentriResponse : JSON.stringify(r.rentriResponse||{})
          const acc = parseAcceptedFlexible(payload)
          const dup = parseDuplicates(payload)
          // naive split: use registryId inside payload if present
          let reg = ''
          try { const j = JSON.parse(payload); reg = String(j?.registryId|| j?.send?.registryId || '') } catch {}
          if (reg==='R6QSWHZ6HJV') { gAcc += acc; gDup += dup }
          else if (reg==='RQEL39R7NS0') { mAcc += acc; mDup += dup }
          else { gAcc += acc; gDup += dup } // fallback to global
        }
        return { global: { accepted: gAcc, duplicates: gDup }, multy: { accepted: mAcc, duplicates: mDup } }
      } catch { return { global: { accepted: 0, duplicates: 0 }, multy: { accepted: 0, duplicates: 0 } } }
    }),
    getRemoteAcceptedTotals: procedure.query(async () => {
      const countArr = (text:string) => { try { const arr = JSON.parse(text); return Array.isArray(arr) ? arr.length : 0 } catch { return 0 } }
      try {
        const gBody = { registryId: 'R6QSWHZ6HJV', filename: 'certificato.p12', issuer: '08934760961', limit: 5000, order: 'desc' }
        const mBody = { registryId: 'RQEL39R7NS0', filename: 'multyproget.p12', issuer: '12347770013', limit: 5000, order: 'desc' }
        const [gr, mr] = await Promise.all([
          axios.post('http://localhost:8765/list-registrazioni', gBody),
          axios.post('http://localhost:8765/list-registrazioni', mBody)
        ])
        const g = countArr(String(gr.data?.data||'[]'))
        const m = countArr(String(mr.data?.data||'[]'))
        return { global: { accepted: g }, multy: { accepted: m } }
      } catch { return { global: { accepted: 0 }, multy: { accepted: 0 } } }
    }),
    getRemoteAcceptedList: procedure.input(z.object({ target: z.enum(['global','multy']), limit: z.number().optional() })).query(async ({ input }) => {
      const lim = input.limit && input.limit > 0 ? input.limit : 20
      try {
        const body = input.target==='global'
          ? { registryId: 'R6QSWHZ6HJV', filename: 'certificato.p12', issuer: '08934760961', limit: lim, order: 'desc' }
          : { registryId: 'RQEL39R7NS0', filename: 'multyproget.p12', issuer: '12347770013', limit: lim, order: 'desc' }
        const r = await axios.post('http://localhost:8765/list-registrazioni', body)
        let arr:any[]=[]
        try { arr = JSON.parse(String(r.data?.data||'[]')) } catch {}
        const mapOne = (el:any) => {
          const nr = el.numero_registrazione || el?.riferimenti?.numero_registrazione || {}
          const pr = typeof nr.progressivo === 'string' ? nr.progressivo : (typeof nr.progressivo === 'number' ? String(nr.progressivo) : '')
          const an = typeof nr.anno === 'number' ? nr.anno : (typeof nr.anno === 'string' ? Number(nr.anno) : undefined)
          const dt = el.data_ora_registrazione || el?.riferimenti?.data_ora_registrazione || ''
          return { progressivo: pr, anno: an, data_ora: dt }
        }
        return arr.map(mapOne)
      } catch { return [] }
    }),
    checkHeads: procedure.query(async () => {
      const res:any = await (await axios.get('http://localhost:3001/trpc/fir.liveHeads?input={}')).data
      const data = res?.result?.data || {}
      function sane(p:any){ const d = String(p||'').replace(/[^0-9]/g,''); if (!d) return false; const n = parseInt(d); return n > 0 && n < 20000 }
      return {
        globalReady: sane(data?.global?.progressivo),
        multyReady: sane(data?.multy?.progressivo),
        heads: data
      }
    }),

    checkBridge: procedure.query(async () => {
      try { const res = await axios.get('http://localhost:8765/health', { timeout: 1000 }); return { online: true, mode: res.data.mode } }
      catch { return { online: false, error: 'Unreachable' } }
    }),

    startQueue: procedure.mutation(async () => { firQueue.start(); return { started: true } }),

    startMassive: procedure.input(z.object({
      companyP12: z.string(), registryId: z.string(), anno: z.number(), startProgressivo: z.string(), date: z.string(), ratePerMinute: z.number().optional(), batchSize: z.number().optional()
    })).mutation(async ({ input }) => {
      firQueue.start({
        companyP12: input.companyP12,
        registryId: input.registryId,
        anno: input.anno,
        startProgressivo: input.startProgressivo,
        date: input.date,
        ratePerMinute: input.ratePerMinute ?? 600,
        batchSize: input.batchSize ?? 50
      })
      return { started: true }
    }),
    resumeMassive: procedure.input(z.object({
      companyP12: z.string(), registryId: z.string(), ratePerMinute: z.number().optional(), batchSize: z.number().optional()
    })).mutation(async ({ input }) => {
      try {
        const sBody = { registryId: input.registryId, filename: input.companyP12, issuer: undefined, limit: 1, order: 'desc' }
        const s = await axios.post('http://localhost:8765/suggest-next', sBody)
        const d = s.data?.data || {}
        const anno = Number(d?.anno || new Date().getFullYear())
        const date = String(d?.date || new Date().toISOString().slice(0,10))
        const startProgressivo = String(d?.progressivo || '0000001')
        firQueue.start({
          companyP12: input.companyP12,
          registryId: input.registryId,
          anno,
          startProgressivo,
          date,
          ratePerMinute: input.ratePerMinute ?? 600,
          batchSize: input.batchSize ?? 50
        })
        return { started: true, mode: 'resume', next: { anno, date, startProgressivo } }
      } catch {
        firQueue.start({
          companyP12: input.companyP12,
          registryId: input.registryId,
          anno: new Date().getFullYear(),
          startProgressivo: '0000001',
          date: new Date().toISOString().slice(0,10),
          ratePerMinute: input.ratePerMinute ?? 600,
          batchSize: input.batchSize ?? 50
        })
        return { started: true, mode: 'fallback' }
      }
    }),

    send: procedure.input(z.object({ firId: z.number(), thumbprint: z.string(), dateMovimento: z.string().optional(), registryId: z.string().optional() })).mutation(async ({ input }) => {
      // @ts-ignore drizzle typing simplified
      const file = db.select().from(firFiles).where(eq(firFiles.id, input.firId)).all()[0]
      if (!file) throw new Error('File non trovato')
      db.update(firFiles).set({ status: 'processing' }).where(eq(firFiles.id, input.firId)).run()
      try {
        const r:any = await submitFir(String(file.xmlContent), input.thumbprint, input.dateMovimento, input.registryId)
        if (Number(r?.status) === 202 && r?.transazioneId) {
          db.update(firFiles).set({ status: 'processing' }).where(eq(firFiles.id, input.firId)).run()
          db.insert(transactions).values({ firId: input.firId, status: 'processing', rentriResponse: JSON.stringify(r), signedXml: 'OK', timestamp: Date.now() }).run()
          poller.add({ firId: input.firId, transazioneId: r.transazioneId, registryId: r.registryId, filename: input.thumbprint })
          return { success: true, queued: true, transazioneId: r.transazioneId }
        } else {
          db.update(firFiles).set({ status: 'completed' }).where(eq(firFiles.id, input.firId)).run()
          db.insert(transactions).values({ firId: input.firId, status: 'completed', rentriResponse: JSON.stringify(r), signedXml: 'OK', timestamp: Date.now() }).run()
          return { success: true }
        }
      } catch (e: any) {
        db.update(firFiles).set({ status: 'error', errorMessage: e.message }).where(eq(firFiles.id, input.firId)).run()
        throw e
      }
    }),

    downloadReceipt: procedure.input(z.object({ firId: z.number() })).mutation(async () => {
      return { pdfBase64: '', filename: 'error.pdf' }
    }),

    retryErrors: procedure.input(z.object({ company: z.string().optional() }).optional())
      .mutation(async ({ input }) => {
        if (input?.company && input.company !== 'ALL') {
          const rows = db.select().from(firFiles).where(eq(firFiles.companyP12, input.company)).all()
          let n = 0
          for (const r of rows) {
            if (r.status === 'error') { db.update(firFiles).set({ status: 'pending' }).where(eq(firFiles.id, r.id as number)).run(); n++ }
          }
          firQueue.start()
          return { success: true, requeued: n }
        } else {
          const rows = db.select().from(firFiles).all()
          let n = 0
          for (const r of rows) {
            if (r.status === 'error') { db.update(firFiles).set({ status: 'pending' }).where(eq(firFiles.id, r.id as number)).run(); n++ }
          }
          firQueue.start()
          return { success: true, requeued: n }
        }
      })
  })
  , bulk: router({
    start: procedure.input(z.object({ batch: z.number().optional() }).optional()).mutation(async ({ input }) => {
      const batch = input?.batch && input.batch > 0 ? input.batch : 200
      const id = await (await import('./bulkXml')).startBulkXml(batch)
      return { jobId: id }
    }),
    status: procedure.input(z.object({ jobId: z.string() })).query(async ({ input }) => {
      const st = (await import('./bulkXml')).getBulkStatus(input.jobId)
      if (!st) return { error: 'not_found' }
      return st
    })
  })
  , stream: router({
    start: procedure.input(z.object({ target: z.enum(['global','multy']), batch: z.number().optional() })).mutation(async ({ input }) => { await startStream(input.target, input.batch ?? 200); return { started: true } }),
    stop: procedure.input(z.object({ target: z.enum(['global','multy']) })).mutation(async ({ input }) => { stopStream(input.target); return { stopped: true } }),
    status: procedure.query(async () => getStatus())
  })
  , coverage: router({
    now: procedure.query(async () => {
      const outPath = 'out/resend-log.jsonl'
      let globalDup = 0, multyDup = 0
      if (fs.existsSync(outPath)){
        try {
          const lines = fs.readFileSync(outPath, 'utf-8').trim().split(/\r?\n/)
          for (const l of lines){
            try { const j = JSON.parse(l); const d = Number(j?.duplicates||0); const reg = String(j?.registryId||'')
              if (reg==='R6QSWHZ6HJV') globalDup += d
              else if (reg==='RQEL39R7NS0') multyDup += d
            } catch {}
          }
        } catch {}
      }
      const gTotal = buildMovimentiFromXml(fs.readFileSync('test/global-reco_6000.xml.xml','utf-8')).length
      const mTotal = buildMovimentiFromXml(fs.readFileSync('test/multy-proget_6000.xml.xml','utf-8')).length
      return {
        global: { total: gTotal, present: globalDup, missing: Math.max(0, gTotal - globalDup) },
        multy: { total: mTotal, present: multyDup, missing: Math.max(0, mTotal - multyDup) }
      }
    })
    , live: procedure.query(async () => {
      const outPath = 'out/resend-log.jsonl'
      let globalDup = 0, multyDup = 0
      if (fs.existsSync(outPath)){
        try {
          const lines = fs.readFileSync(outPath, 'utf-8').trim().split(/\r?\n/)
          for (const l of lines){
            try { const j = JSON.parse(l); const d = Number(j?.duplicates||0); const reg = String(j?.registryId||'')
              if (reg==='R6QSWHZ6HJV') globalDup += d
              else if (reg==='RQEL39R7NS0') multyDup += d
            } catch {}
          }
        } catch {}
      }
      const st = getStatus()
      const gAcc = Number(st.global?.accepted||0)
      const mAcc = Number(st.multy?.accepted||0)
      const gTotal = buildMovimentiFromXml(fs.readFileSync('test/global-reco_6000.xml.xml','utf-8')).length
      const mTotal = buildMovimentiFromXml(fs.readFileSync('test/multy-proget_6000.xml.xml','utf-8')).length
      const gPresent = Math.max(0, Math.min(gTotal, globalDup + gAcc))
      const mPresent = Math.max(0, Math.min(mTotal, multyDup + mAcc))
      return {
        global: { total: gTotal, present: gPresent, missing: Math.max(0, gTotal - gPresent) },
        multy: { total: mTotal, present: mPresent, missing: Math.max(0, mTotal - mPresent) }
      }
    })
    , totals: procedure.query(async () => {
      const resendPath = 'out/resend-log.jsonl'
      const streamPath = 'out/stream-log.jsonl'
      let gAcc = 0, gDup = 0, mAcc = 0, mDup = 0
      if (fs.existsSync(resendPath)){
        try {
          const lines = fs.readFileSync(resendPath, 'utf-8').trim().split(/\r?\n/)
          for (const l of lines){
            try { const j = JSON.parse(l); const reg = String(j?.registryId||''); const a = Number(j?.accepted||0); const d = Number(j?.duplicates||0)
              if (reg==='R6QSWHZ6HJV') { gAcc += a; gDup += d }
              else if (reg==='RQEL39R7NS0') { mAcc += a; mDup += d }
            } catch {}
          }
        } catch {}
      }
      if (fs.existsSync(streamPath)){
        try {
          const lines = fs.readFileSync(streamPath, 'utf-8').trim().split(/\r?\n/)
          for (const l of lines){
            try { const j = JSON.parse(l); const reg = String(j?.registryId||''); const a = Number(j?.accepted||0); const d = Number(j?.duplicates||0)
              if (reg==='R6QSWHZ6HJV') { gAcc += a; gDup += d }
              else if (reg==='RQEL39R7NS0') { mAcc += a; mDup += d }
            } catch {}
          }
        } catch {}
      }
      return { global: { accepted: gAcc, duplicates: gDup }, multy: { accepted: mAcc, duplicates: mDup } }
    })
    , autoCounters: procedure.query(async () => {
      const resendPath = 'out/resend-log.jsonl'
      const streamPath = 'out/stream-log.jsonl'
      let gA=0,gD=0,gE=0,mA=0,mD=0,mE=0
      if (fs.existsSync(resendPath)){
        try {
          const lines = fs.readFileSync(resendPath, 'utf-8').trim().split(/\r?\n/)
          for (const l of lines){
            try { const j = JSON.parse(l); const reg = String(j?.registryId||''); const a = Number(j?.accepted||0); const d = Number(j?.duplicates||0)
              if (reg==='R6QSWHZ6HJV') { gA += a; gD += d } else if (reg==='RQEL39R7NS0') { mA += a; mD += d }
            } catch {}
          }
        } catch {}
      }
      if (fs.existsSync(streamPath)){
        try {
          const lines = fs.readFileSync(streamPath, 'utf-8').trim().split(/\r?\n/)
          for (const l of lines){
            try { const j = JSON.parse(l); const reg = String(j?.registryId||''); const a = Number(j?.accepted||0); const d = Number(j?.duplicates||0); const e = j?.errore===true?1:0
              if (reg==='R6QSWHZ6HJV') { gA += a; gD += d; gE += e } else if (reg==='RQEL39R7NS0') { mA += a; mD += d; mE += e }
            } catch {}
          }
        } catch {}
      }
      return { global: { accepted: gA, duplicates: gD, errors: gE }, multy: { accepted: mA, duplicates: mD, errors: mE } }
    })
    , report: procedure.query(async () => {
      try {
        const content = require('fs').readFileSync('out/stream-log.jsonl','utf-8')
        const lines = content.trim().split(/\r?\n/)
        const parsed = lines.map((l:string)=>{ try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
        const last = parsed.slice(-20)
        const totals = parsed.reduce((acc:any, r:any)=>{ acc.submitted += Number(r.count||0); acc.accepted += Number(r.accepted||0); acc.duplicates += Number(r.duplicates||0); acc.errors += r.errore?1:0; return acc }, { submitted:0, accepted:0, duplicates:0, errors:0 })
        return { last, totals }
      } catch { return { last: [], totals: { submitted:0, accepted:0, duplicates:0, errors:0 } } }
    })
  })
})

export type AppRouter = typeof appRouter
