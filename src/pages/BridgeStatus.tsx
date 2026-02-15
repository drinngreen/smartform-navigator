import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Server, CheckCircle, XCircle } from "lucide-react"
import { trpc } from "../lib/trpc"

export default function BridgeStatus(){
  const { data: bridge, isLoading } = trpc.fir.checkBridge.useQuery(undefined, { refetchInterval: 2000 })
  return (
    <div className="container py-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <Server className="text-purple-500" /> Stato Bridge
      </h1>
      <Card>
        <CardHeader>
          <CardTitle><div className="flex justify-between">
            Connessione
            {bridge?.online ? <Badge className="bg-green-600">ONLINE</Badge> : <Badge variant="destructive">OFFLINE</Badge>}
          </div></CardTitle>
          <CardDescription>Stato del servizio locale di firma Windows</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Controllo in corso...</p>
          ) : bridge?.online ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-400 bg-green-950/20 p-4 rounded-lg border border-green-900">
                <CheckCircle /> Il Bridge è attivo e pronto a firmare.
              </div>
              <pre className="bg-black p-4 rounded text-xs text-slate-300 overflow-auto">{JSON.stringify(bridge, null, 2)}</pre>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-red-400 bg-red-950/20 p-4 rounded-lg border border-red-900">
                <XCircle /> Il Bridge non risponde sulla porta 8765.
              </div>
              <p className="text-sm text-slate-400">Assicurati di aver avviato il file <strong>avvia_bridge.bat</strong> e che la finestra nera sia aperta.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}