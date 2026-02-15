// @ts-nocheck
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const docsDir = path.join(root, 'docs')
const summaryPath = path.join(docsDir, 'summary.md')
const convoPath = path.join(docsDir, 'conversations.md')

function ensureDocs() {
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir)
  if (!fs.existsSync(convoPath)) fs.writeFileSync(convoPath, '# Conversazioni\n')
}

function readJson<T = any>(p: string): T | null {
  try {
    const s = fs.readFileSync(p, 'utf-8')
    return JSON.parse(s)
  } catch {
    return null
  }
}

function listDirItems(dir: string): string[] {
  try {
    return fs.readdirSync(dir)
  } catch {
    return []
  }
}

function countFiles(dir: string): number {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    let count = 0
    for (const e of entries) {
      const p = path.join(dir, e.name)
      if (e.isFile()) count++
      if (e.isDirectory()) count += countFiles(p)
    }
    return count
  } catch {
    return 0
  }
}

function topFiles(dir: string, ext: string[], limit = 10): string[] {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    const files = entries
      .filter(e => e.isFile() && ext.some(x => e.name.toLowerCase().endsWith(x)))
      .map(e => e.name)
      .slice(0, limit)
    return files
  } catch {
    return []
  }
}

function listTsFiles(dir: string, limit = 20): string[] {
  return topFiles(dir, ['.ts', '.tsx'], limit)
}

function section(title: string, lines: string[]): string {
  const b = [`**${title}**`, ...lines.map(l => `- ${l}`)]
  return b.join('\n')
}

function nowIso(): string {
  return new Date().toISOString()
}

function generateSummary() {
  ensureDocs()
  const pkg = readJson<any>(path.join(root, 'package.json'))
  const tsconfig = readJson<any>(path.join(root, 'tsconfig.json'))
  const convo = (() => {
    try {
      return fs.readFileSync(convoPath, 'utf-8').trim()
    } catch {
      return ''
    }
  })()

  const srcDir = path.join(root, 'src')
  const serverDir = path.join(root, 'server')
  const bridgeDir = path.join(root, 'bridge-service')

  const srcPages = listDirItems(path.join(srcDir, 'pages'))
  const srcComponents = listDirItems(path.join(srcDir, 'components'))
  const serverFiles = listTsFiles(serverDir)
  const bridgeHas = fs.existsSync(bridgeDir)

  const projectOverview: string[] = []
  if (pkg) {
    projectOverview.push(`Nome: ${pkg.name}`)
    projectOverview.push(`Versione: ${pkg.version}`)
    projectOverview.push(`Module: ${pkg.type}`)
    const scripts = Object.keys(pkg.scripts || {})
    projectOverview.push(`Script: ${scripts.join(', ') || 'nessuno'}`)
    const deps = Object.keys(pkg.dependencies || {})
    const devDeps = Object.keys(pkg.devDependencies || {})
    projectOverview.push(`Dipendenze: ${deps.length}, Dev: ${devDeps.length}`)
    const keyDeps = deps.filter(d => ['react', 'vite', 'express', 'drizzle-orm', '@trpc/server', '@tanstack/react-query'].includes(d))
    if (keyDeps.length) projectOverview.push(`Librerie principali: ${keyDeps.join(', ')}`)
  }
  if (tsconfig) {
    projectOverview.push(`Target TS: ${tsconfig.compilerOptions?.target}`)
    projectOverview.push(`Module TS: ${tsconfig.compilerOptions?.module}`)
    projectOverview.push(`Strict: ${tsconfig.compilerOptions?.strict ? 'sì' : 'no'}`)
  }

  const structure: string[] = []
  structure.push(`Dir src: ${fs.existsSync(srcDir) ? 'presente' : 'assente'} (${countFiles(srcDir)} files)`) 
  if (srcPages?.length) structure.push(`Pagine: ${srcPages.join(', ')}`)
  if (srcComponents?.length) structure.push(`Componenti: ${srcComponents.join(', ')}`)
  structure.push(`Dir server: ${fs.existsSync(serverDir) ? 'presente' : 'assente'} (${countFiles(serverDir)} files)`) 
  if (serverFiles?.length) structure.push(`Endpoint/Script server: ${serverFiles.join(', ')}`)
  structure.push(`Bridge .NET: ${bridgeHas ? 'presente' : 'assente'}`)

  const operations: string[] = []
  operations.push('Dev: vite + tsx watch server/index.ts')
  operations.push('Build: vite build, Preview: vite preview')
  operations.push('DB: drizzle-kit push')

  const convoSection = convo ? convo : '# Conversazioni\n- Nessuna conversazione registrata'

  const content = [
    `Aggiornato: ${nowIso()}`,
    section('Riepilogo Progetto', projectOverview),
    section('Struttura', structure),
    section('Operatività', operations),
    convoSection
  ].join('\n\n')

  fs.writeFileSync(summaryPath, content)
}

function debounce(fn: () => void, ms: number) {
  let t: NodeJS.Timeout | null = null
  return () => {
    if (t) clearTimeout(t)
    t = setTimeout(() => fn(), ms)
  }
}

function setupWatch() {
  const trigger = debounce(generateSummary, 500)
  const watchPaths = [path.join(root, 'src'), path.join(root, 'server'), path.join(root, 'package.json'), docsDir]
  for (const p of watchPaths) {
    try {
      const stat = fs.statSync(p)
      if (stat.isDirectory()) {
        fs.watch(p, { recursive: true }, trigger)
      } else {
        fs.watch(path.dirname(p), trigger)
      }
    } catch {}
  }
}

ensureDocs()
generateSummary()
setupWatch()
setInterval(generateSummary, 5 * 60 * 1000)
