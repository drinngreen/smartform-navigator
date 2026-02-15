import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Link } from 'react-router-dom'
import { trpc } from '../lib/trpc'

export function Dashboard(){
  const { data: coverage } = trpc.coverage.live.useQuery(undefined, { refetchInterval: 2000 })
  const { data: heads } = trpc.fir.liveHeads.useQuery(undefined, { refetchInterval: 2000 })
  const { data: auto } = trpc.coverage.autoCounters.useQuery(undefined, { refetchInterval: 2000 })
  return (
    <div className="grid gap-6">
      <section>
        <h1 className="text-3xl font-bold zoli-title">RENTRI FIR Sender</h1>
        <p className="text-slate-400">Controlla lo stato e invia i formulari</p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4"></div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="font-semibold mb-2">Certificato Digitale</div>
          <p className="text-slate-400 mb-4">Mostra stato bridge e certificati</p>
          <Link to="/bridge"><Button>Apri Bridge</Button></Link>
        </Card>
        <Card className="p-4">
          <div className="font-semibold mb-2">Carica FIR</div>
          <p className="text-slate-400 mb-4">Carica file XML e salva</p>
          <Link to="/carica-fir"><Button>Carica FIR</Button></Link>
        </Card>
        <Card className="p-4">
          <div className="font-semibold mb-2">Transazioni</div>
          <p className="text-slate-400 mb-4">Monitoraggio degli invii</p>
          <Link to="/transazioni"><Button variant="ghost">Apri Transazioni</Button></Link>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="font-semibold mb-2">Global Reco</div>
          <div className="text-sm text-slate-400">Presente: {coverage?.global?.present||0} / {coverage?.global?.total||0}</div>
          <div className="text-sm text-slate-400">Mancanti: {coverage?.global?.missing||0}</div>
          <div className="text-xl mt-2">Progressivo: {heads?.global?.progressivo || '-'}</div>
          <div className="text-xs text-slate-400">Data: {heads?.global?.data_ora || ''}</div>
        </Card>
        <Card className="p-4">
          <div className="font-semibold mb-2">Multy Proget</div>
          <div className="text-sm text-slate-400">Presente: {coverage?.multy?.present||0} / {coverage?.multy?.total||0}</div>
          <div className="text-sm text-slate-400">Mancanti: {coverage?.multy?.missing||0}</div>
          <div className="text-xl mt-2">Progressivo: {heads?.multy?.progressivo || '-'}</div>
          <div className="text-xs text-slate-400">Data: {heads?.multy?.data_ora || ''}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="font-semibold mb-2">Invii automatici — Global</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><div className="text-2xl font-bold">{auto?.global?.accepted||0}</div><div className="text-xs text-slate-400">Entrati</div></div>
            <div><div className="text-2xl font-bold">{auto?.global?.duplicates||0}</div><div className="text-xs text-slate-400">Duplicati</div></div>
            <div><div className="text-2xl font-bold">{auto?.global?.errors||0}</div><div className="text-xs text-slate-400">Errori</div></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="font-semibold mb-2">Invii automatici — Multy</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><div className="text-2xl font-bold">{auto?.multy?.accepted||0}</div><div className="text-xs text-slate-400">Entrati</div></div>
            <div><div className="text-2xl font-bold">{auto?.multy?.duplicates||0}</div><div className="text-xs text-slate-400">Duplicati</div></div>
            <div><div className="text-2xl font-bold">{auto?.multy?.errors||0}</div><div className="text-xs text-slate-400">Errori</div></div>
          </div>
        </Card>
      </div>
    </div>
  )
}
