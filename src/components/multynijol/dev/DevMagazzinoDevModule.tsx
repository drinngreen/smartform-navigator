import {
  BookOpen, Package, Scissors, History, Warehouse,
  FileText, ClipboardList, ArrowRight, RotateCcw,
  TrendingUp, TrendingDown, Scale, LogIn, Construction, Lock,
} from "lucide-react";

export function DevMagazzinoDevModule() {
  // 🚧 MODULO IN SVILUPPO — voci visibili ma inattive, statistiche azzerate
  const sections = [
    {
      title: "Registri",
      desc: "Registro cronologico carico/scarico rifiuti",
      items: [
        { label: "Registro Generale", desc: "Tutti i movimenti di carico e scarico", icon: BookOpen },
        { label: "Ingresso FIR (Destinatario)", desc: "Accettazione rifiuti in ingresso con formulario", icon: LogIn },
        { label: "Carico / Scarico Guidato", desc: "Wizard per ingresso/uscita con FIR", icon: ClipboardList },
        { label: "Scarico Uscita con FIR", desc: "Emissione formulario e abbinamento FIFO", icon: TrendingDown },
        { label: "Scarico Cumulativo", desc: "Scarico FIFO multiplo per codice CER", icon: TrendingDown },
      ],
    },
    {
      title: "Magazzino",
      desc: "Giacenze fisiche, movimenti e rettifiche",
      items: [
        { label: "Giacenze & Movimenti", desc: "Saldi in tempo reale, ledger, rettifiche", icon: Package },
        { label: "Archivio Magazzini", desc: "Aree di stoccaggio e limiti", icon: Warehouse },
      ],
    },
    {
      title: "Lavorazioni",
      desc: "Cernite e trasformazioni materiali",
      items: [
        { label: "Cernite", desc: "Smonta un lotto in componenti (CER → materiali)", icon: Scissors },
      ],
    },
    {
      title: "Anagrafica & Tracciabilità",
      desc: "Configurazione e storico",
      items: [
        { label: "Articoli CER / MPS", desc: "Catalogo codici rifiuto e materiali", icon: FileText },
        { label: "Audit Trail", desc: "Storico completo di ogni operazione", icon: History },
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

      {/* Banner: in sviluppo */}
      <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-amber-500/5 p-4 flex items-start gap-3">
        <Construction className="h-6 w-6 text-amber-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-300">Sezione in sviluppo</p>
          <p className="text-xs text-amber-200/70 mt-1">
            Il modulo Magazzino è in fase di sviluppo. Le voci sotto sono visibili in anteprima ma non sono
            ancora attive. Nessun dato di esempio viene mostrato.
          </p>
        </div>
      </div>

      {/* Live Stats — azzerate */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Giacenza Rifiuti" value="0 kg" icon={<Scale className="h-4 w-4 text-muted-foreground" />} />
        <StatCard label="Giacenza MPS" value="0 kg" icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} />
        <StatCard label="Movimenti Registro" value="0" icon={<BookOpen className="h-4 w-4 text-muted-foreground" />} />
        <StatCard label="Bozze da Consolidare" value="0" icon={<RotateCcw className="h-4 w-4 text-muted-foreground" />} />
      </div>

      {/* Sections — disabled */}
      {sections.map((section) => (
        <div key={section.title} className="space-y-2">
          <div>
            <h4 className="text-sm font-semibold text-foreground">{section.title}</h4>
            <p className="text-xs text-muted-foreground">{section.desc}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {section.items.map((item) => (
              <div
                key={item.label}
                aria-disabled="true"
                title="Sezione in sviluppo"
                className="text-left rounded-lg border border-border/20 bg-card/30 p-3 flex items-start gap-3 opacity-60 cursor-not-allowed select-none"
              >
                <div className="mt-0.5 p-1.5 rounded-md bg-muted/20 text-muted-foreground">
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground/70">{item.desc}</p>
                </div>
                <Lock className="h-3.5 w-3.5 text-muted-foreground/50 mt-1" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, icon }: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/20 bg-card/30 p-3 opacity-70">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold text-muted-foreground">{value}</p>
    </div>
  );
}
