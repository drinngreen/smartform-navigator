import { useState, useRef } from "react"

const EXCLUDED = ["node_modules", ".git", "dist", ".next", ".cache", "build", ".DS_Store", "Thumbs.db"]

async function getSupabase() {
  const { supabase } = await import("@/integrations/supabase/client")
  return supabase
}

function shouldExclude(path: string) {
  return EXCLUDED.some(ex => path.includes(`/${ex}/`) || path.startsWith(`${ex}/`) || path.endsWith(`/${ex}`) || path === ex)
}

export default function Restore() {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 })
  const [log, setLog] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    const filtered = selected.filter(f => {
      const path = (f as any).webkitRelativePath || f.name
      return !shouldExclude(path)
    })
    setFiles(filtered)
    setLog([`Selezionati ${filtered.length} file (esclusi ${selected.length - filtered.length} non necessari)`])
  }

  const handleUpload = async () => {
    if (files.length === 0) return
    setUploading(true)
    setProgress({ done: 0, total: files.length, errors: 0 })
    setLog(prev => [...prev, `Inizio upload di ${files.length} file...`])

    let done = 0
    let errors = 0

    // Upload in batch di 3 per evitare timeout
    for (let i = 0; i < files.length; i += 3) {
      const batch = files.slice(i, i + 3)
      const results = await Promise.allSettled(
        batch.map(async (file) => {
          const sb = await getSupabase()
          const path = (file as any).webkitRelativePath || file.name
          const parts = path.split("/")
          const storagePath = parts.length > 1 ? parts.slice(1).join("/") : path

          const { error } = await sb.storage
            .from("code-backup")
            .upload(storagePath, file, { upsert: true })

          if (error) throw new Error(`${storagePath}: ${error.message}`)
          return storagePath
        })
      )

      for (const r of results) {
        if (r.status === "fulfilled") {
          done++
        } else {
          errors++
          setLog(prev => [...prev, `❌ ${(r as PromiseRejectedResult).reason?.message || "Errore"}`])
        }
      }
      setProgress({ done, total: files.length, errors })
    }

    setLog(prev => [...prev, `✅ Upload completato: ${done} ok, ${errors} errori`])
    setUploading(false)
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-amber-400">🔄 Ripristino Progetto</h1>
        <p className="text-slate-400 text-sm">
          Seleziona la cartella del progetto recuperato. I file verranno caricati nello storage per il ripristino.
          Vengono esclusi automaticamente: node_modules, .git, dist, build, .cache
        </p>

        <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center">
          <input
            ref={inputRef}
            type="file"
            // @ts-ignore - webkitdirectory is non-standard
            webkitdirectory=""
            multiple
            onChange={handleSelect}
            className="hidden"
          />
          <button
            onClick={() => inputRef.current?.click()}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition"
          >
            📁 Seleziona cartella progetto
          </button>
          {files.length > 0 && (
            <p className="mt-3 text-slate-300 text-sm">{files.length} file pronti per l'upload</p>
          )}
        </div>

        {files.length > 0 && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:brightness-110 disabled:opacity-50 rounded-lg font-medium transition"
          >
            {uploading ? `Caricamento... ${pct}%` : "🚀 Carica tutto"}
          </button>
        )}

        {progress.total > 0 && (
          <div className="space-y-2">
            <div className="w-full bg-slate-800 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>{progress.done}/{progress.total} file</span>
              {progress.errors > 0 && <span className="text-red-400">{progress.errors} errori</span>}
            </div>
          </div>
        )}

        {log.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 max-h-60 overflow-y-auto">
            {log.map((l, i) => (
              <div key={i} className="text-xs text-slate-300 font-mono py-0.5">{l}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
