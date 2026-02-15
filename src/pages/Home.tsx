import { useState } from "react"
import { trpc } from "../lib/trpc"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Link } from "wouter"
import { Activity, CheckCircle, Clock, AlertTriangle, Server, ArrowRight, Building2, Zap } from "lucide-react"

export default function Home(){
  const [filterCompany, setFilterCompany] = useState("ALL")
  const { data: stats } = trpc.fir.getStats.useQuery({ company: filterCompany }, { refetchInterval: 3000 })
  const { data: bridge } = trpc.fir.checkBridge.useQuery(undefined, { refetchInterval: 5000 })
  const { data: coverage } = trpc.coverage.live.useQuery(undefined, { refetchInterval: 2000 })
  const { data: stream } = trpc.stream.status.useQuery(undefined, { refetchInterval: 2000 })
  const startGlobal = trpc.stream.start.useMutation()
  const stopGlobal = trpc.stream.stop.useMutation()
  const startMulty = trpc.stream.start.useMutation()
  const stopMulty = trpc.stream.stop.useMutation()

  return (
    <div className="container py-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white">Dashboard RENTRI</h1>
          <p className="text-slate-400 mt-1">Stato invii e monitoraggio</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-[250px]">
            <Select value={filterCompany} onValueChange={setFilterCompany}>
              <SelectTrigger className="bg-slate-900 border-slate-700">
                <Building2 className="w-4 h-4 mr-2 text-purple-400"/>
                <SelectValue placeholder="Filtra per Azienda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tutte le Aziende</SelectItem>
                <SelectItem value="certificato.p12">Global Reco (Default)</SelectItem>
                <SelectItem value="08934760961.p12">Global Reco (P.IVA)</SelectItem>
                <SelectItem value="niyol.p12">Niyol S.r.l.</SelectItem>
                <SelectItem value="multyproget.p12">Multyproget S.r.l.</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className={`px-4 py-2 rounded-md border flex items-center gap-2 ${bridge?.online ? "bg-green-950/40 border-green-500/50 text-green-400" : "bg-red-950/40 border-red-500/50 text-red-400"}`}>
            <Server className="h-4 w-4" />
            <span className="font-bold text-sm whitespace-nowrap">{bridge?.online ? "BRIDGE ATTIVO" : "BRIDGE SPENTO"}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Global Reco — Presenza RENTRI</CardTitle>
            <Zap className={`h-4 w-4 ${stream?.global?.running ? "text-green-500" : "text-slate-500"}`} />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-slate-800 p-2 rounded">Presente {coverage?.global?.present||0}/{coverage?.global?.total||0}</div>
              <div className="bg-slate-800 p-2 rounded">Mancanti {coverage?.global?.missing||0}</div>
              <div className="bg-slate-800 p-2 rounded">Accettati {stream?.global?.accepted||0}</div>
              <div className="bg-slate-800 p-2 rounded">Duplicati {stream?.global?.duplicates||0}</div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button onClick={()=>startGlobal.mutate({ target:'global', batch: 500 })} disabled={!!stream?.global?.running}>Start (500)</Button>
              <Button variant="destructive" onClick={()=>stopGlobal.mutate({ target:'global' })} disabled={!stream?.global?.running}>Stop</Button>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Multy Proget — Presenza RENTRI</CardTitle>
            <Zap className={`h-4 w-4 ${stream?.multy?.running ? "text-green-500" : "text-slate-500"}`} />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-slate-800 p-2 rounded">Presente {coverage?.multy?.present||0}/{coverage?.multy?.total||0}</div>
              <div className="bg-slate-800 p-2 rounded">Mancanti {coverage?.multy?.missing||0}</div>
              <div className="bg-slate-800 p-2 rounded">Accettati {stream?.multy?.accepted||0}</div>
              <div className="bg-slate-800 p-2 rounded">Duplicati {stream?.multy?.duplicates||0}</div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button onClick={()=>startMulty.mutate({ target:'multy', batch: 500 })} disabled={!!stream?.multy?.running}>Start (500)</Button>
              <Button variant="destructive" onClick={()=>stopMulty.mutate({ target:'multy' })} disabled={!stream?.multy?.running}>Stop</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Totale FIR</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats?.total || 0}</div>
            <p className="text-xs text-slate-500 mt-1">Caricati nel DB</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">In Coda</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">{stats?.pending || 0}</div>
            <p className="text-xs text-slate-500 mt-1">Pronti per l'invio</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Completati</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">{stats?.completed || 0}</div>
            <p className="text-xs text-slate-500 mt-1">Inviati con successo</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Errori</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400">{stats?.error || 0}</div>
            <p className="text-xs text-slate-500 mt-1">Da verificare</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-purple-500/30 bg-gradient-to-br from-slate-900 to-purple-900/10">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <h3 className="text-xl font-bold text-white">Import Massivo 3000</h3>
              <p className="text-slate-400">Carica intere cartelle XML e avvia la coda automatica per {filterCompany === 'ALL' ? 'tutte le aziende' : filterCompany}.</p>
            </div>
            <Link href="/massive">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 h-14 px-8 text-lg shadow-lg shadow-purple-900/20">VAI AL CANNONE <ArrowRight className="ml-2 h-5 w-5" /></Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Global Reco</CardTitle>
            <Zap className={`h-4 w-4 ${stream?.global?.running ? "text-green-500" : "text-slate-500"}`} />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-slate-800 p-2 rounded">Presente {coverage?.global?.present||0}/{coverage?.global?.total||0}</div>
              <div className="bg-slate-800 p-2 rounded">Mancanti {coverage?.global?.missing||0}</div>
              <div className="bg-slate-800 p-2 rounded">Accettati {stream?.global?.accepted||0}</div>
              <div className="bg-slate-800 p-2 rounded">Duplicati {stream?.global?.duplicates||0}</div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button onClick={()=>startGlobal.mutate({ target:'global', batch: 500 })} disabled={!!stream?.global?.running}>Start (500)</Button>
              <Button variant="destructive" onClick={()=>stopGlobal.mutate({ target:'global' })} disabled={!stream?.global?.running}>Stop</Button>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Multy Proget</CardTitle>
            <Zap className={`h-4 w-4 ${stream?.multy?.running ? "text-green-500" : "text-slate-500"}`} />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-slate-800 p-2 rounded">Presente {coverage?.multy?.present||0}/{coverage?.multy?.total||0}</div>
              <div className="bg-slate-800 p-2 rounded">Mancanti {coverage?.multy?.missing||0}</div>
              <div className="bg-slate-800 p-2 rounded">Accettati {stream?.multy?.accepted||0}</div>
              <div className="bg-slate-800 p-2 rounded">Duplicati {stream?.multy?.duplicates||0}</div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button onClick={()=>startMulty.mutate({ target:'multy', batch: 500 })} disabled={!!stream?.multy?.running}>Start (500)</Button>
              <Button variant="destructive" onClick={()=>stopMulty.mutate({ target:'multy' })} disabled={!stream?.multy?.running}>Stop</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
