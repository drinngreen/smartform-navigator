import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Server, CheckCircle, XCircle } from "lucide-react"

export default function BridgeStatus(){
  return (
    <div className="container py-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <Server className="text-purple-500" /> Stato Bridge
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Connessione</CardTitle>
          <CardDescription>Stato del servizio locale di firma Windows</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-slate-400 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
            <XCircle className="h-5 w-5" /> Bridge non configurato in questa versione.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
