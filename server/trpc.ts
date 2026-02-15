import { initTRPC } from '@trpc/server'
import { z } from 'zod'
import { z } from 'zod'
import { db, lastInsertId } from './db.ts'
import { fir, transactions } from '../drizzle/schema.ts'
import { eq, sql } from 'drizzle-orm'
import { parseFirXml } from './firParser.ts'

const t = initTRPC.create()
export const procedure = t.procedure
export const router = t.router

export const appRouter = t.router({
  fir: t.router({
    create: t.procedure.input(z.object({ xmlContent: z.string(), filename: z.string().optional() })).mutation(async ({ input }) => {
      const parsedFir = parseFirXml(input.xmlContent)
      const numero = parsedFir.firNumber ?? null
      const data = parsedFir.firDate ? parsedFir.firDate.toISOString() : null
      // @ts-ignore drizzle typing simplified
      db.insert(fir).values({ numero, data, xmlContent: input.xmlContent, status: 'in_attesa' }).run()
      const id = lastInsertId()
      return { id, numero, data }
    }),
    list: t.procedure.query(async () => {
      // @ts-ignore drizzle typing simplified
      const rows = db.select().from(fir).all()
      return rows
    }),
    getStats: t.procedure.query(async () => {
      // @ts-ignore drizzle typing simplified
      const rows = db.select({ status: fir.status, count: sql`count(*)` }).from(fir).groupBy(fir.status).all()
      const stats: any = { total: 0, pending: 0, completed: 0, error: 0, processing: 0 }
      for(const r of rows){
        const s = String(r.status || '')
        const c = Number(r.count || 0)
        stats.total += c
        if (s === 'in_attesa' || s === 'pending') stats.pending += c
        else if (s === 'inviato' || s === 'completed') stats.completed += c
        else if (s === 'errore' || s === 'error') stats.error += c
        else if (s === 'processing') stats.processing += c
      }
      return stats
    }),
    startQueue: t.procedure.mutation(async () => {
      return { started: true }
    }),
    upload: t.procedure.input(z.object({ filename: z.string(), xmlContent: z.string(), companyP12: z.string().optional() })).mutation(async ({ input }) => {
      const parsedFir = parseFirXml(input.xmlContent)
      const numero = parsedFir.firNumber ?? null
      const data = parsedFir.firDate ? parsedFir.firDate.toISOString() : null
      // @ts-ignore drizzle typing simplified
      db.insert(fir).values({ numero, data, xmlContent: input.xmlContent, status: 'in_attesa', filename: input.filename, companyP12: input.companyP12 ?? null, uploadDate: Date.now() }).run()
      const id = lastInsertId()
      return { id, numero, data }
    }),
    batchUpload: t.procedure.input(z.object({ files: z.array(z.object({ filename: z.string(), xmlContent: z.string(), companyP12: z.string() })) })).mutation(async ({ input }) => {
      for(const f of input.files){
        const parsedFir = parseFirXml(f.xmlContent)
        const numero = parsedFir.firNumber ?? null
        const data = parsedFir.firDate ? parsedFir.firDate.toISOString() : null
        // @ts-ignore drizzle typing simplified
        db.insert(fir).values({ numero, data, xmlContent: f.xmlContent, status: 'in_attesa', filename: f.filename, companyP12: f.companyP12, uploadDate: Date.now() }).run()
      }
      return { success: true, count: input.files.length }
    }),
    send: t.procedure.input(z.object({ id: z.number(), thumbprint: z.string(), filename: z.string().optional() })).mutation(async ({ input }) => {
      // @ts-ignore drizzle typing simplified
      const item = db.select().from(fir).where(eq(fir.id, input.id)).get()
      if(!item) throw new Error('FIR non trovato')
      const payload: any = { xmlContent: item.xmlContent, thumbprint: input.thumbprint }
      if (input.filename) payload.filename = input.filename
      try {
        const resp = await fetch('http://localhost:8765/sign', {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload)
        })
        const json = await resp.json()
        // @ts-ignore drizzle typing simplified
        db.update(fir).set({ status: resp.ok ? 'inviato' : 'errore' }).where(eq(fir.id, input.id)).run()
        // @ts-ignore drizzle typing simplified
        db.insert(transactions).values({
          firId: input.id,
          status: resp.ok ? 'firmato' : 'errore',
          createdAt: Date.now(),
          signedXml: json.signedXml ?? null
        }).run()
        return { signedXml: json.signedXml }
      } catch (e: any) {
        // @ts-ignore drizzle typing simplified
        db.update(fir).set({ status: 'errore' }).where(eq(fir.id, input.id)).run()
        // @ts-ignore drizzle typing simplified
        db.insert(transactions).values({ firId: input.id, status: 'errore', createdAt: Date.now(), signedXml: null }).run()
        throw new Error(String(e?.message ?? e ?? 'Errore bridge'))
      }
    }),
    batchSend: t.procedure.input(z.object({ ids: z.array(z.number()), thumbprint: z.string().optional(), filename: z.string().optional(), concurrency: z.number().optional() })).mutation(async ({ input }) => {
      const limit = Math.max(1, Math.min(10, input.concurrency ?? 5))
      const queue = [...input.ids]
      let success = 0
      let failure = 0

      const runOne = async (id: number) => {
        // @ts-ignore drizzle typing simplified
        const item = db.select().from(fir).where(eq(fir.id, id)).get()
        if(!item){
          // @ts-ignore drizzle typing simplified
          db.insert(transactions).values({ firId: id, status: 'errore', createdAt: Date.now(), signedXml: null }).run()
          // @ts-ignore drizzle typing simplified
          db.update(fir).set({ status: 'errore' }).where(eq(fir.id, id)).run()
          failure++
          return
        }
        const payload: any = { xmlContent: item.xmlContent }
        if (input.filename) payload.filename = input.filename
        if (input.thumbprint) payload.thumbprint = input.thumbprint
        try{
          const resp = await fetch('http://localhost:8765/sign', { method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify(payload) })
          const json = await resp.json()
          // @ts-ignore drizzle typing simplified
          db.update(fir).set({ status: resp.ok ? 'inviato' : 'errore' }).where(eq(fir.id, id)).run()
          // @ts-ignore drizzle typing simplified
          db.insert(transactions).values({ firId: id, status: resp.ok ? 'firmato' : 'errore', createdAt: Date.now(), signedXml: json.signedXml ?? null }).run()
          if(resp.ok) success++; else failure++
        }catch(e){
          // @ts-ignore drizzle typing simplified
          db.update(fir).set({ status: 'errore' }).where(eq(fir.id, id)).run()
          // @ts-ignore drizzle typing simplified
          db.insert(transactions).values({ firId: id, status: 'errore', createdAt: Date.now(), signedXml: null }).run()
          failure++
        }
      }

      const workers: Promise<void>[] = []
      for(let i=0;i<limit;i++){
        const worker = (async () => {
          while(queue.length){
            const id = queue.shift()!
            await runOne(id)
          }
        })()
        workers.push(worker)
      }
      await Promise.all(workers)
      return { success, failure, processed: input.ids.length }
    })
  })
})

export type AppRouter = typeof appRouter