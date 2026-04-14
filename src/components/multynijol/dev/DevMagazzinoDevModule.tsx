import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDragonStock } from "@/hooks/dragon/useDragonStock";
import { useDragonRegister } from "@/hooks/dragon/useDragonRegister";
import {
  BookOpen, Package, Scissors, History, Warehouse,
  FileText, ClipboardList, ArrowRight, RotateCcw,
  TrendingUp, TrendingDown, Scale, LogIn
} from "lucide-react";

const PREFIX = "/mn/admin/dev-multyproget/dragon";

export function DevMagazzinoDevModule() {
  const navigate = useNavigate();
  const { balances, isLoading: loadingStock } = useDragonStock();
  const { movements, isLoading: loadingReg } = useDragonRegister();

  const totalWaste = balances.filter(b => b.warehouse_scope === "WASTE").reduce((s, b) => s + b.balance, 0);
  const totalMps = balances.filter(b => b.warehouse_scope === "MPS").reduce((s, b) => s + b.balance, 0);
  const bozze = movements.filter(m => m.status === "BOZZA").length;

  const sections = [
    {
      title: "Registri",
      desc: "Registro cronologico carico/scarico rifiuti",
      items: [
        { label: "Registro Generale", desc: "Tutti i movimenti di carico e scarico", icon: BookOpen, path: `${PREFIX}/registro` },
        { label: "Ingresso FIR (Destinatario)", desc: "Accettazione rifiuti in ingresso con formulario", icon: LogIn, path: `${PREFIX}/registro/ingresso` },
        { label: "Carico / Scarico Guidato", desc: "Wizard per ingresso/uscita con FIR", icon: ClipboardList, path: `${PREFIX}/registro/carico-scarico` },
        { label: "Scarico Cumulativo", desc: "Scarico FIFO multiplo per codice CER", icon: TrendingDown, path: `${PREFIX}/registro/scarico-cumulativo` },
      ],
    },
    {
      title: "Magazzino",
      desc: "Giacenze fisiche, movimenti e rettifiche",
      items: [
        { label: "Giacenze & Movimenti", desc: "Saldi in tempo reale, ledger, rettifiche", icon: Package, path: `${PREFIX}/magazzino` },
        { label: "Archivio Magazzini", desc: "Aree di stoccaggio e limiti", icon: Warehouse, path: `${PREFIX}/magazzini` },
      ],
    },
    {
      title: "Lavorazioni",
      desc: "Cernite e trasformazioni materiali",
      items: [
        { label: "Cernite", desc: "Smonta un lotto in componenti (CER → materiali)", icon: Scissors, path: `${PREFIX}/cernite/batch` },
      ],
    },
    {
      title: "Anagrafica & Tracciabilità",
      desc: "Configurazione e storico",
      items: [
        { label: "Articoli CER / MPS", desc: "Catalogo codici rifiuto e materiali", icon: FileText, path: `${PREFIX}/articoli` },
        { label: "Audit Trail", desc: "Storico completo di ogni operazione", icon: History, path: `${PREFIX}/audit` },
      ],
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-emerald-300">🐉 Dragon — Magazzino & Registro</h3>
        <p className="text-xs text-muted-foreground">
          Gestione integrata rifiuti: registro, magazzino, cernite e tracciabilità
        </p>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Giacenza Rifiuti"
          value={loadingStock ? "..." : `${Math.round(totalWaste).toLocaleString("it-IT")} kg`}
          icon={<Scale className="h-4 w-4 text-amber-400" />}
          color="amber"
        />
        <StatCard
          label="Giacenza MPS"
          value={loadingStock ? "..." : `${Math.round(totalMps).toLocaleString("it-IT")} kg`}
          icon={<TrendingUp className="h-4 w-4 text-blue-400" />}
          color="blue"
        />
        <StatCard
          label="Movimenti Registro"
          value={loadingReg ? "..." : String(movements.length)}
          icon={<BookOpen className="h-4 w-4 text-emerald-400" />}
          color="emerald"
        />
        <StatCard
          label="Bozze da Consolidare"
          value={loadingReg ? "..." : String(bozze)}
          icon={<RotateCcw className="h-4 w-4 text-rose-400" />}
          color={bozze > 0 ? "rose" : "emerald"}
          alert={bozze > 0}
        />
      </div>

      {/* Sections */}
      {sections.map((section) => (
        <div key={section.title} className="space-y-2">
          <div>
            <h4 className="text-sm font-semibold text-foreground">{section.title}</h4>
            <p className="text-xs text-muted-foreground">{section.desc}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {section.items.map((item) => (
              <button
                key={item.label}
                className="group text-left rounded-lg border border-border/30 hover:border-emerald-500/40 bg-card/60 hover:bg-emerald-500/5 p-3 transition-all flex items-start gap-3"
                onClick={() => navigate(item.path)}
              >
                <div className="mt-0.5 p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-emerald-300 transition-colors">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-emerald-400 mt-1 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, icon, color, alert }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  alert?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${alert ? "border-rose-500/40 bg-rose-500/5" : "border-border/30 bg-card/60"}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-xl font-bold ${alert ? "text-rose-400" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
