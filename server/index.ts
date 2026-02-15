import express from 'express'
import cors from 'cors'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './routers.ts'
import { startBulkXml, getBulkStatus } from './bulkXml.ts'
import { z } from 'zod'
import { db, lastInsertId } from './db.ts'
import { fir } from '../drizzle/schema.ts'
import { parseFirXml } from './firParser.ts'
import { startStream, stopStream, getStatus } from './streamer.ts'
import { rentriRouter } from './rentri/router.ts'

const app = express()
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*'
}))
app.use(express.json({ limit: '5mb' }))

// Mount RENTRI Router
app.use('/', rentriRouter);

app.use('/trpc', createExpressMiddleware({ router: appRouter }))

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'RENTRI Web' }))
// Static raw logs early to avoid being shadowed by SPA catch-all
import path from 'path'
import fs from 'fs'
app.use('/out', express.static(path.join(process.cwd(), 'out')))
app.get('/out/log/tail/:lines?', (_req, res) => {
  try {
    const linesN = Math.max(1, Math.min(1000, Number(_req.params.lines || '200')))
    const p = path.join(process.cwd(), 'out', 'invio_massivo.log')
    if (!fs.existsSync(p)) { res.status(404).send('log not found'); return }
    const raw = fs.readFileSync(p, 'utf-8')
    const lines = raw.trim().split(/\r?\n/).slice(-linesN).join('\n')
    res.setHeader('content-type','text/plain')
    res.send(lines)
  } catch { res.status(500).send('error') }
})
app.get('/bridge/health', async (_req, res) => {
  try {
    const url = 'http://127.0.0.1:8765/attempts'
    const ctl = new AbortController()
    const t = setTimeout(()=>ctl.abort(), 3000)
    const resp = await fetch(url, { signal: ctl.signal })
    clearTimeout(t)
    res.json({ ok: resp.ok })
  } catch {
    res.json({ ok: false })
  }
})
app.get('/attempts.raw', (_req, res) => {
  const target = path.join(process.cwd(), 'bridge-service', 'bin', 'Debug', 'net8.0', 'logs', 'attempts.jsonl')
  if (!target) { res.status(404).send('attempts not found'); return }
  res.sendFile(target)
})
app.get('/metrics/live', async (_req, res) => {
  try {
    const fs = require('fs')
    const path = require('path')
    const massPath = path.join(process.cwd(), 'out', 'invio_massivo.log')
    const attemptsFile = path.join(process.cwd(), 'bridge-service', 'bin', 'Debug', 'net8.0', 'logs', 'attempts.jsonl')
    const REG_GLOBAL = 'R6QSWHZ6HJV'
    const REG_MULTY  = 'RQEL39R7NS0'
    let postsTotal=0, posts202=0, posts400=0, results200=0, lastAttempts=''
    const byRegBridge: Record<string, { postsTotal:number; posts202:number; posts400:number; results200:number }> = {
      [REG_GLOBAL]: { postsTotal:0, posts202:0, posts400:0, results200:0 },
      [REG_MULTY]: { postsTotal:0, posts202:0, posts400:0, results200:0 }
    }
    const recentBridgeGlobal:any[] = []
    const recentBridgeMulty:any[] = []
    let arr:any[] = []
    try {
      if (fs.existsSync(attemptsFile)){
        const raw = fs.readFileSync(attemptsFile, 'utf-8')
        arr = raw.trim().split(/\r?\n/).slice(-1000).map((l:string)=>{ try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
        lastAttempts = fs.statSync(attemptsFile).mtime.toISOString()
      } else {
        const resp = await fetch('http://localhost:8765/attempts')
        const json = await resp.json()
        arr = Array.isArray(json) ? json.slice(-1000) : []
        lastAttempts = new Date().toISOString()
      }
    } catch { arr = [] }
    try {
      const slice = arr.slice(-500)
      for (const j of slice){
        try {
          const kind = String(j.kind||'')
          const url = String(j.url||'')
          const st = Number(j.status||0)
          let regId = ''
          const m = url.match(/\/operatore\/([A-Z0-9]+)\/movimenti/)
          if (m) regId = m[1]
          if (kind==='POST' && url.includes('/operatore/') && url.includes('/movimenti')) {
            postsTotal++
            if (st===202) posts202++
            else if (st===400) posts400++
            if (regId && byRegBridge[regId]) {
              byRegBridge[regId].postsTotal++
              if (st===202) byRegBridge[regId].posts202++
              else if (st===400) byRegBridge[regId].posts400++
              const row:any = { ts: j.ts, kind, status: st, url }
              if (regId===REG_GLOBAL){ recentBridgeGlobal.push(row) } else if (regId===REG_MULTY){ recentBridgeMulty.push(row) }
            }
          }
          if (kind==='GET' && url.includes('/result') && st===200) results200++
          if (kind==='GET' && url.includes('/result') && st===200 && regId && byRegBridge[regId]) byRegBridge[regId].results200++
        } catch {}
      }
      const massData = computeMass(fs, massPath, REG_GLOBAL, REG_MULTY) as any
      res.json({
        bridge: { postsTotal, posts202, posts400, results200, lastAttempts },
        mass: { sendTot: massData.sendTot, resultTot: massData.resultTot, acceptedTot: massData.acceptedTot, lastMass: massData.lastMass },
        global: { bridge: byRegBridge[REG_GLOBAL], mass: massData.byReg[REG_GLOBAL], recent: { bridge: recentBridgeGlobal.slice(-20), mass: massData.recent[REG_GLOBAL] } },
        multy:  { bridge: byRegBridge[REG_MULTY],  mass: massData.byReg[REG_MULTY],  recent: { bridge: recentBridgeMulty.slice(-20),  mass: massData.recent[REG_MULTY]  } }
      })
      return
    } catch {}
    function computeMass(fs:any, massPath:string, REG_GLOBAL:string, REG_MULTY:string){
      let sendTot=0, resultTot=0, acceptedTot=0, lastMass=''
      const byRegMass: Record<string, { sendTot:number; resultTot:number; acceptedTot:number }> = {
        [REG_GLOBAL]: { sendTot:0, resultTot:0, acceptedTot:0 },
        [REG_MULTY]: { sendTot:0, resultTot:0, acceptedTot:0 }
      }
      const recent: Record<string, any[]> = { [REG_GLOBAL]: [], [REG_MULTY]: [] }
      try {
        if (fs.existsSync(massPath)){
          const rawAll = fs.readFileSync(massPath, 'utf-8')
          const lines = rawAll.trim().split(/\r?\n/)
          for (const l of lines){
            try {
              const j = JSON.parse(l)
              const regId = String(j.registryId||'')
              if (j.kind==='SEND') {
                sendTot++
                if (byRegMass[regId]) byRegMass[regId].sendTot++
                const row:any = { ts: j.ts, kind: j.kind, status: j.status, transazioneId: j.transazioneId, key: j.key }
                if (recent[regId]) { recent[regId].push(row); if (recent[regId].length>200) recent[regId].shift() }
              } else if (j.kind==='RESULT') {
                resultTot++
                const acc = typeof j.accepted==='number' ? j.accepted : 0
                acceptedTot += acc
                if (byRegMass[regId]) { byRegMass[regId].resultTot++; byRegMass[regId].acceptedTot += acc }
                const row:any = { ts: j.ts, kind: j.kind, transazioneId: j.transazioneId, accepted: acc }
                if (recent[regId]) { recent[regId].push(row); if (recent[regId].length>200) recent[regId].shift() }
              }
            } catch {}
          }
          if (resultTot===0 && acceptedTot===0){
            try {
              const m = rawAll.match(/\"kind\":\"RESULT\"[\s\S]*?\"accepted\":\s*(\d+)/g) || []
              for (const seg of m){
                const mm = seg.match(/\"accepted\":\s*(\d+)/)
                if (mm){ resultTot++; acceptedTot += Number(mm[1]||0) }
              }
            } catch {}
          }
          try { lastMass = fs.statSync(massPath).mtime.toISOString() } catch {}
        }
      } catch {}
      return { sendTot, resultTot, acceptedTot, lastMass, byReg: byRegMass, recent }
    }
  } catch {
    res.json({
      bridge: { postsTotal:0, posts202:0, posts400:0, results200:0, lastAttempts:'' },
      mass: { sendTot:0, resultTot:0, acceptedTot:0, lastMass:'' },
      global: { bridge: { postsTotal:0, posts202:0, posts400:0, results200:0 }, mass: { sendTot:0, resultTot:0, acceptedTot:0 }, recent: { bridge: [], mass: [] } },
      multy:  { bridge: { postsTotal:0, posts202:0, posts400:0, results200:0 }, mass: { sendTot:0, resultTot:0, acceptedTot:0 }, recent: { bridge: [], mass: [] } }
    })
  }
})
app.get('/live', (_req, res) => {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>RENTRI Live</title><style>body{font-family:sans-serif} .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px} .card{border:1px solid #ccc;padding:12px;border-radius:6px} code{background:#f7f7f7;padding:2px 4px;border-radius:4px} .bar{height:10px;background:#eee;border-radius:4px;overflow:hidden} .fill202{height:100%;background:#4caf50} .fill400{height:100%;background:#f44336} .list{font-size:12px;line-height:1.4}</style></head><body>
  <h3>RENTRI Live Dashboard</h3>
  <div class="grid">
    <div class="card"><h4>Bridge Attempts</h4><div id="bridge"></div></div>
    <div class="card"><h4>Mass Log</h4><div id="mass"></div></div>
    <div class="card"><h4>Global Reco</h4><div id="global"></div></div>
    <div class="card"><h4>Multy Proget</h4><div id="multy"></div></div>
  </div>
  <div class="grid">
    <div class="card"><h4>Ultimi Global (Bridge)</h4><div id="globalBridgeList" class="list"></div></div>
    <div class="card"><h4>Ultimi Global (Mass)</h4><div id="globalMassList" class="list"></div></div>
    <div class="card"><h4>Ultimi Multy (Bridge)</h4><div id="multyBridgeList" class="list"></div></div>
    <div class="card"><h4>Ultimi Multy (Mass)</h4><div id="multyMassList" class="list"></div></div>
  </div>
  <script>
    async function tick(){
      try{
        const data = await (await fetch('/metrics/live')).json();
        document.getElementById('bridge').innerHTML = 'POST totali: '+data.bridge.postsTotal+'<br>POST 202: '+data.bridge.posts202+'<br>POST 400: '+data.bridge.posts400+'<br>RESULT 200: '+data.bridge.results200+'<br>Ultimo: '+data.bridge.lastAttempts;
        document.getElementById('mass').innerHTML = 'Invii: '+data.mass.sendTot+'<br>Ricezioni: '+data.mass.resultTot+'<br>Accettati: '+data.mass.acceptedTot+'<br>Ultimo: '+data.mass.lastMass;
        document.getElementById('global').innerHTML = 'Bridge POST: '+data.global.bridge.postsTotal+' (202 '+data.global.bridge.posts202+', 400 '+data.global.bridge.posts400+')<br>Bridge RESULT 200: '+data.global.bridge.results200+'<br>Mass Invii: '+data.global.mass.sendTot+'<br>Mass Ricezioni: '+data.global.mass.resultTot+'<br>Mass Accettati: '+data.global.mass.acceptedTot;
        document.getElementById('multy').innerHTML = 'Bridge POST: '+data.multy.bridge.postsTotal+' (202 '+data.multy.bridge.posts202+', 400 '+data.multy.bridge.posts400+')<br>Bridge RESULT 200: '+data.multy.bridge.results200+'<br>Mass Invii: '+data.multy.mass.sendTot+'<br>Mass Ricezioni: '+data.multy.mass.resultTot+'<br>Mass Accettati: '+data.multy.mass.acceptedTot;
        const gB = data.global.recent.bridge.map(x=>x.ts+' | '+x.status+' | '+x.url.split('/operatore/')[1]).join('<br>')
        const mB = data.multy.recent.bridge.map(x=>x.ts+' | '+x.status+' | '+x.url.split('/operatore/')[1]).join('<br>')
        const gM = data.global.recent.mass.map(x=>x.ts+' | '+x.kind+' | '+(x.status??'')+' | '+(x.transazioneId??'')+' | acc='+((x.accepted??0))).join('<br>')
        const mM = data.multy.recent.mass.map(x=>x.ts+' | '+x.kind+' | '+(x.status??'')+' | '+(x.transazioneId??'')+' | acc='+((x.accepted??0))).join('<br>')
        document.getElementById('globalBridgeList').innerHTML = gB
        document.getElementById('globalMassList').innerHTML = gM
        document.getElementById('multyBridgeList').innerHTML = mB
        document.getElementById('multyMassList').innerHTML = mM
      } catch { }
    }
    tick(); setInterval(tick, 5000);
  </script></body></html>`
  res.setHeader('content-type','text/html'); res.send(html)
})
app.get('/attempts', async (_req, res) => {
  try {
    const fs = require('fs')
    const path = require('path')
    const p1 = path.join(process.cwd(), 'bridge-service', 'bin', 'Debug', 'net8.0', 'logs', 'attempts.jsonl')
    const p2 = path.join(__dirname, '..', 'bridge-service', 'bin', 'Debug', 'net8.0', 'logs', 'attempts.jsonl')
    const p3 = path.join(__dirname, '..', '..', 'bridge-service', 'bin', 'Debug', 'net8.0', 'logs', 'attempts.jsonl')
    const attemptsPath = [p1,p2,p3].find(p => { try { return fs.existsSync(p) } catch { return false } })
    if (attemptsPath){
      const raw = fs.readFileSync(attemptsPath, 'utf-8')
      const lines = raw.trim().split(/\r?\n/).slice(-400)
      const arr = lines.map((l:string)=>{ try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
      res.json(arr)
      return
    }
    try {
      const resp = await fetch('http://localhost:8765/attempts')
      const json = await resp.json()
      res.json(Array.isArray(json) ? json.slice(-200) : [])
      return
    } catch {
      res.json([])
    }
  } catch {
    res.json([])
  }
})
app.get('/mass', (_req, res) => {
  try {
    const fs = require('fs')
    const path = require('path')
    const massPath = path.join(process.cwd(), 'out', 'invio_massivo.log')
    if (!massPath) { res.json([]); return }
    const raw = fs.readFileSync(massPath, 'utf-8')
    if (!raw || !raw.trim()) { res.json([]); return }
    const lines = raw.trim().split(/\r?\n/).slice(-400)
    const arr = lines.map((l:string)=>{ try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
    res.json(arr)
  } catch { res.json([]) }
})

app.post('/bulk/start', async (req, res) => {
  try { const id = await startBulkXml(Number(req.body?.batch||200)); res.json({ jobId: id }) } catch { res.status(500).json({ error: 'start failed' }) }
})
app.get('/bulk/status/:id', (req, res) => {
  const st = getBulkStatus(req.params.id)
  if (!st) { res.status(404).json({ error: 'not found' }); return }
  res.json(st)
})

app.post('/fir', (req, res) => {
  const schema = z.object({ xmlContent: z.string() })
  const parsed = schema.safeParse(req.body)
  if(!parsed.success){
    res.status(400).json({ error: 'Input non valido' }); return
  }
  const xmlContent = parsed.data.xmlContent
  const parsedFir = parseFirXml(xmlContent)
  const numero = parsedFir.firNumber ?? null
  const data = parsedFir.firDate ? parsedFir.firDate.toISOString() : null
  // @ts-ignore drizzle insert typing simplified
  db.insert(fir).values({ numero, data, xmlContent, status: 'in_attesa' }).run()
  const id = lastInsertId()
  res.json({ id, numero, data })
})

app.post('/stream/start', async (req, res) => {
  const target = String(req.body?.target||'')
  if (target !== 'global' && target !== 'multy') { res.status(400).json({ error: 'target non valido' }); return }
  try { await startStream(target as 'global'|'multy'); res.json({ started: true }) } catch { res.status(500).json({ error: 'start failed' }) }
})
app.post('/stream/stop', (req, res) => {
  const target = String(req.body?.target||'')
  if (target !== 'global' && target !== 'multy') { res.status(400).json({ error: 'target non valido' }); return }
  try { stopStream(target as 'global'|'multy'); res.json({ stopped: true }) } catch { res.status(500).json({ error: 'stop failed' }) }
})
app.get('/stream/status', (_req, res) => { try { res.json(getStatus()) } catch { res.status(500).json({ error: 'status failed' }) } })
app.get('/stream/start/:target/:batch?', async (req, res) => {
  const target = String(req.params.target||'')
  const batch = Number(req.params.batch||'200')
  if (target !== 'global' && target !== 'multy') { res.status(400).json({ error: 'target non valido' }); return }
  try { await startStream(target as 'global'|'multy', batch); res.json({ started: true, batch }) } catch { res.status(500).json({ error: 'start failed' }) }
})
app.get('/stream/stop/:target', (req, res) => {
  const target = String(req.params.target||'')
  if (target !== 'global' && target !== 'multy') { res.status(400).json({ error: 'target non valido' }); return }
  try { stopStream(target as 'global'|'multy'); res.json({ stopped: true }) } catch { res.status(500).json({ error: 'stop failed' }) }
})

const PORT = process.env.PORT || 10000;
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
})
// Serve frontend build when available
const distPath = path.join(process.cwd(), 'dist')
if (fs.existsSync(distPath)){
  app.use(express.static(distPath))
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')))
}

