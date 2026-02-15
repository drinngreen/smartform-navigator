import { trpc } from "../lib/trpc"
import { Card } from "../components/ui/Card"

export default function AutoSend(){
  const { data: counters } = trpc.coverage.autoCounters.useQuery(undefined, { refetchInterval: 2000 })
  const { data: remote } = trpc.fir.getRemoteAcceptedTotals.useQuery(undefined, { refetchInterval: 10000 })
  const { data: report } = trpc.coverage.report.useQuery(undefined, { refetchInterval: 2000 })
  const { data: listG } = trpc.fir.getRemoteAcceptedList.useQuery({ target:'global', limit: 10 }, { refetchInterval: 10000 })
  const { data: listM } = trpc.fir.getRemoteAcceptedList.useQuery({ target:'multy', limit: 10 }, { refetchInterval: 10000 })
  return (
    <div className="container mx-auto px-4 py-6 grid gap-6">
      <section>
        <h1 className="text-3xl font-bold">Invii automatici</h1>
        <p className="text-slate-400">Contatori progressivi e riscontro remoto</p>
      </section>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="font-semibold mb-2">Global</div>
          <div className="text-xs text-slate-400 mb-2">Accettati RENTRI</div>
          <div className="text-5xl font-bold mb-4">{remote?.global?.accepted||0}</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><div className="text-3xl font-bold">{counters?.global?.accepted||0}</div><div className="text-xs text-slate-400">Check OK</div></div>
            <div><div className="text-3xl font-bold">{counters?.global?.duplicates||0}</div><div className="text-xs text-slate-400">Duplicati</div></div>
            <div><div className="text-3xl font-bold">{counters?.global?.errors||0}</div><div className="text-xs text-slate-400">Errori</div></div>
          </div>
          <div className="mt-4 text-sm text-slate-400">Ultimi accettati RENTRI</div>
          <div className="grid gap-1 mt-2">
            {(listG||[]).map((r:any, idx:number)=>(
              <div key={idx} className="flex justify-between text-xs text-slate-300">
                <span>{r.progressivo||'-'}/{r.anno||''}</span>
                <span>{r.data_ora||''}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="font-semibold mb-2">Multy</div>
          <div className="text-xs text-slate-400 mb-2">Accettati RENTRI</div>
          <div className="text-5xl font-bold mb-4">{remote?.multy?.accepted||0}</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><div className="text-3xl font-bold">{counters?.multy?.accepted||0}</div><div className="text-xs text-slate-400">Check OK</div></div>
            <div><div className="text-3xl font-bold">{counters?.multy?.duplicates||0}</div><div className="text-xs text-slate-400">Duplicati</div></div>
            <div><div className="text-3xl font-bold">{counters?.multy?.errors||0}</div><div className="text-xs text-slate-400">Errori</div></div>
          </div>
          <div className="mt-4 text-sm text-slate-400">Ultimi accettati RENTRI</div>
          <div className="grid gap-1 mt-2">
            {(listM||[]).map((r:any, idx:number)=>(
              <div key={idx} className="flex justify-between text-xs text-slate-300">
                <span>{r.progressivo||'-'}/{r.anno||''}</span>
                <span>{r.data_ora||''}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="p-4">
        <div className="font-semibold mb-2">Ultimi esiti</div>
        <div className="text-xs text-slate-400 mb-2">Totali recenti: Entrati {report?.totals?.accepted||0}, Duplicati {report?.totals?.duplicates||0}, Errori {report?.totals?.errors||0}</div>
        <div className="grid gap-2">
          {(report?.last||[]).map((r:any, idx:number)=>(
            <div key={idx} className="flex justify-between text-sm">
              <div className="text-slate-300">{new Date(r.ts||Date.now()).toLocaleTimeString()}</div>
              <div className="flex gap-4">
                <span>{r.registryId}</span>
                <span className="text-green-400">Entrati {r.accepted||0}</span>
                <span className="text-yellow-400">Duplicati {r.duplicates||0}</span>
                <span className="text-red-400">Errori {r.errore?1:0}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
