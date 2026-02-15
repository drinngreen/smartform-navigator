import { useState, useRef } from "react"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { trpc } from "../lib/trpc"
import { toast } from "sonner"
import { Loader2, Play, UploadCloud, Rocket } from "lucide-react"
import BulkProgress from "../components/BulkProgress"
import { Zap } from "lucide-react"

export default function MassiveUpload() {
  const [company, setCompany] = useState("certificato.p12")
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [jobId, setJobId] = useState<string>("")

  const utils = trpc.useContext()
  const { data: stats } = trpc.fir.getStats.useQuery(undefined, { refetchInterval: 2000 })
  const { data: heads } = trpc.fir.liveHeads.useQuery(undefined, { refetchInterval: 2000 })
  const { data: txStats } = trpc.fir.getTxStats.useQuery(undefined, { refetchInterval: 2000 })
  const { data: recent } = trpc.fir.getRecentTransactions.useQuery({ limit: 20 }, { refetchInterval: 2000 })
  const { data: totals } = trpc.coverage.totals.useQuery(undefined, { refetchInterval: 5000 })
  const { data: acceptedTotals } = trpc.fir.getAcceptedTotals.useQuery(undefined, { refetchInterval: 5000 })
  const { data: remoteAccepted } = trpc.fir.getRemoteAcceptedTotals.useQuery(undefined, { refetchInterval: 10000 })
  
  const batchMutation = trpc.fir.batchUpload.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} File caricati!`)
      setIsUploading(false)
      utils.fir.getStats.invalidate()
      if (fileInputRef.current) fileInputRef.current.value = ""
    },
    onError: (err) => {
      toast.error("Errore: " + err.message)
      setIsUploading(false)
    }
  })

  const startMutation = trpc.fir.startQueue.useMutation({ onSuccess: () => toast.success("Motore avviato!") })
  const inc = (p?:string) => {
    const s = String(p||'0000001'); const d = s.replace(/[^0-9]/g,''); const w = d.length || 7; const n = (parseInt(d||'0')+1).toString().padStart(w,'0'); return n
  }
  const startBulkXml = async () => {
    try {
      const r = await fetch("/bulk/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batch: 200 }) })
      if (!r.ok) throw new Error("Avvio bulk fallito")
      const j = await r.json()
      setJobId(String(j.jobId||""))
      toast.success("Bulk XML avviato")
    } catch (e:any) { toast.error(e.message||"Errore avvio bulk") }
  }
  const { data: coverage } = trpc.coverage.now.useQuery(undefined, { refetchInterval: 5000 })
  const { data: streamStatus } = trpc.stream.status.useQuery(undefined, { refetchInterval: 2000 })

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    setIsUploading(true)
    const files = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith(".xml"))
    if (files.length === 0) { toast.error("Nessun XML trovato!"); setIsUploading(false); return }
    const batch: { filename: string; xmlContent: string; companyP12: string }[] = []
    for (const f of files) { batch.push({ filename: f.name, xmlContent: await f.text(), companyP12: company }) }
    batchMutation.mutate({ files: batch })
  }

  return (
    <div className="container py-8 max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-purple-500">Cannone RENTRI</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>1. Carica Cartella</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select value={company} onValueChange={setCompany}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="certificato.p12">Global Reco (Default)</SelectItem>
                <SelectItem value="niyol.p12">Niyol S.r.l.</SelectItem>
                <SelectItem value="multyproget.p12">Multyproget S.r.l.</SelectItem>
              </SelectContent>
            </Select>
            <div className="p-8 border-2 border-dashed rounded-lg text-center hover:bg-slate-800/50 cursor-pointer relative">
              <input ref={fileInputRef} type="file" webkitdirectory="" directory="" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFolderSelect} disabled={isUploading} />
              <div className="flex flex-col items-center">
                {isUploading ? <Loader2 className="animate-spin h-8 w-8" /> : <UploadCloud className="h-8 w-8" />}
                <span>{isUploading ? "Caricamento..." : "Trascina Cartella Qui"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>2. Controllo</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-slate-900 p-2 rounded"><div>{txStats?.total||0}</div><div className="text-xs">TX TOT</div></div>
              <div className="bg-green-900/30 p-2 rounded"><div>{txStats?.completed||0}</div><div className="text-xs">TX OK</div></div>
              <div className="bg-red-900/30 p-2 rounded"><div>{txStats?.error||0}</div><div className="text-xs">TX ERR</div></div>
              <div className="bg-blue-900/30 p-2 rounded"><div>{stats?.pending||0}</div><div className="text-xs">CODA (UI)</div></div>
            </div>
           
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 p-3 rounded">
                <div className="flex items-center justify-between"><div className="text-sm text-slate-400">Global</div><Zap className={"h-4 w-4 "+(streamStatus?.global?.running?"text-green-400":"text-slate-500")}/></div>
                <div className="text-xs">Next {streamStatus?.global?.next?.progressivo || heads?.global?.progressivo || '-'}</div>
                <div className="text-xs">Accettati RENTRI {remoteAccepted?.global?.accepted||0}</div>
                <div className="text-xs mt-1">Presente {coverage?.global?.present||0}/{coverage?.global?.total||0} Mancanti {coverage?.global?.missing||0}</div>
                
              </div>
              <div className="bg-slate-900 p-3 rounded">
                <div className="flex items-center justify-between"><div className="text-sm text-slate-400">Multy</div><Zap className={"h-4 w-4 "+(streamStatus?.multy?.running?"text-green-400":"text-slate-500")}/></div>
                <div className="text-xs">Next {streamStatus?.multy?.next?.progressivo || heads?.multy?.progressivo || '-'}</div>
                <div className="text-xs">Accettati RENTRI {remoteAccepted?.multy?.accepted||0}</div>
                <div className="text-xs mt-1">Presente {coverage?.multy?.present||0}/{coverage?.multy?.total||0} Mancanti {coverage?.multy?.missing||0}</div>
                
              </div>
            </div>
            {jobId && (
              <div className="mt-4">
                <BulkProgress jobId={jobId} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 p-3 rounded">
                <div className="text-sm text-slate-400">Global</div>
                <div className="text-xl">{heads?.global?.progressivo || '-'}</div>
                <div className="text-xs text-slate-400">{heads?.global?.data_ora || ''}</div>
                
              </div>
              <div className="bg-slate-900 p-3 rounded">
                <div className="text-sm text-slate-400">Multy</div>
                <div className="text-xl">{heads?.multy?.progressivo || '-'}</div>
                <div className="text-xs text-slate-400">{heads?.multy?.data_ora || ''}</div>
                
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Attività in tempo reale</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-1">
            {(recent||[]).map((r:any)=> (
              <div key={r.id} className="flex items-center justify-between bg-slate-900 p-2 rounded">
                <div className="text-xs text-slate-400">{new Date(r.timestamp||Date.now()).toLocaleTimeString()}</div>
                <div className="text-sm">HTTP {r.httpStatus||'-'}</div>
                <div className="text-xs text-slate-400">{r.transazioneId||''}</div>
                <div className="text-xs">{r.status}{r.errore===true?` (validazione: ${Array.isArray(r.codes)?r.codes.join(', '):''})`:''}</div>
              </div>
            ))}
          </div>
          
        </CardContent>
      </Card>
    </div>
  )
}
