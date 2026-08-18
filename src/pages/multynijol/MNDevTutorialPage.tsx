import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Maximize2,
  X,
  RotateCcw,
  BookOpen,
} from "lucide-react";

type Chapter = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  intro: string;
  steps: string[];
  tip?: string;
  route?: string;
};

const CHAPTERS: Chapter[] = [
  {
    id: "impianto",
    title: "Impianto",
    subtitle: "Movimenti di carico e scarico dell'impianto Multyproget",
    image: "/tutorial/01-impianto.png",
    intro:
      "La tab Impianto mostra esclusivamente i movimenti dell'impianto Multyproget. Ogni formulario in cui Multyproget è Produttore o Destinatario genera qui un movimento di CARICO o SCARICO.",
    steps: [
      "Apri il Centro di Comando e seleziona la tab Impianto.",
      "Filtra per periodo e per CER per isolare i movimenti che ti interessano.",
      "Controlla che ogni riga abbia data, CER, quantità e controparte corrette.",
      "Usa il pulsante Sync giacenze se un saldo non ti torna: ricalcola in modo atomico.",
    ],
    tip: "I dati di Conto Proprio e Intermediazione NON compaiono qui: i contesti sono isolati.",
    route: "/mn/admin/dev-multyproget?tab=impianto",
  },
  {
    id: "niyol",
    title: "Niyol",
    subtitle: "Trasporti Niyol e formulari collegati",
    image: "/tutorial/02-niyol.png",
    intro:
      "Niyol è il trasportatore. Se Niyol trasporta per Multyproget, il formulario è visibile in entrambi i contesti ma le giacenze si muovono solo su Multyproget.",
    steps: [
      "Vai nella tab Niyol per vedere i formulari con Niyol come trasportatore.",
      "Verifica lo stato del FIR (bozza / inviato) e il numero assegnato manualmente.",
      "Apri il formulario per completare partenza, arrivo e pesi.",
    ],
    tip: "Un FIR Niyol non duplica mai il movimento sul magazzino Multyproget.",
    route: "/mn/admin/dev-multyproget?tab=niyol",
  },
  {
    id: "conto-proprio",
    title: "Conto Proprio",
    subtitle: "Trasporti in conto proprio",
    image: "/tutorial/03-conto-proprio.png",
    intro:
      "In Conto Proprio gestisci i formulari dove Multyproget trasporta con mezzi propri. Elenco, modifica in bozza, eliminazione con storno automatico.",
    steps: [
      "Crea un nuovo formulario inserendo manualmente il numero FIR.",
      "Scegli la vista Standard o Alternativa: le due si compilano in sincrono.",
      "Salva in bozza: le giacenze si aggiornano subito.",
      "Cestino = soft delete + storno automatico del movimento.",
    ],
    route: "/mn/admin/dev-multyproget?tab=conto-proprio",
  },
  {
    id: "registri",
    title: "Registri",
    subtitle: "Registro generale, intermediario, invii RENTRI",
    image: "/tutorial/04-registri.png",
    intro:
      "I registri sono cronologici e isolati per company_id. Da qui prepari gli invii verso RENTRI.",
    steps: [
      "Seleziona il sotto-registro (Intermediario, Generale, Invii RENTRI).",
      "Controlla la progressione cronologica delle registrazioni.",
      "Invia al RENTRI e verifica l'esito nella Console RENTRI.",
    ],
    route: "/mn/admin/dev-multyproget?tab=registri",
  },
  {
    id: "privati",
    title: "Privati",
    subtitle: "Conferimenti multi-materiale con garanzia atomica",
    image: "/tutorial/05-privati.png",
    intro:
      "Ogni conferimento privato può contenere più materiali. L'inserimento è atomico: o si registra tutto (conferimento + movimenti + giacenze), o non si registra nulla.",
    steps: [
      "Seleziona il privato dall'anagrafica o creane uno nuovo.",
      "Scegli la data del conferimento (modificabile).",
      "Aggiungi una riga per ogni materiale: CER, descrizione, kg.",
      "Salva: il sistema verifica il limite annuo di 1500 kg e aggiorna le giacenze.",
    ],
    tip: "Se il salvataggio fallisce, nessun dato parziale resta a database.",
    route: "/mn/admin/dev-multyproget?tab=privati",
  },
  {
    id: "ricevute",
    title: "Ricevute",
    subtitle: "Numerazione progressiva annuale e stampa",
    image: "/tutorial/06-ricevute.png",
    intro:
      "Ogni conferimento genera una ricevuta con numero progressivo annuale univoco (es. 258/2026). Data e materiali sono modificabili.",
    steps: [
      "Apri la ricevuta collegata al conferimento.",
      "Modifica la data se necessario: la numerazione resta invariata.",
      "Stampa o invia la ricevuta al privato.",
    ],
    route: "/mn/admin/dev-multyproget?tab=ricevute",
  },
  {
    id: "contatti",
    title: "Contatti",
    subtitle: "Rubrica aziende e preset formulari",
    image: "/tutorial/07-contatti.png",
    intro:
      "La rubrica alimenta i menu a tendina dei formulari. Dati corretti qui = formulari compilati in un click.",
    steps: [
      "Cerca l'azienda per ragione sociale, P.IVA o codice fiscale.",
      "Aggiorna indirizzi e autorizzazioni.",
      "Nel formulario usa il selettore preset per riempire produttore/destinatario.",
    ],
    route: "/mn/admin/dev-multyproget?tab=contatti",
  },
  {
    id: "magazzino",
    title: "Magazzino Dev",
    subtitle: "Giacenze reali per CER",
    image: "/tutorial/08-magazzino-dev.png",
    intro:
      "Le giacenze sono sempre il risultato dei movimenti reali: nessun saldo iniziale manuale.",
    steps: [
      "Consulta i saldi per CER e variante materiale.",
      "Attiva 'Mostra tutti i CER' per vedere anche quelli a zero.",
      "In caso di dubbio lancia Sync giacenze e confronta con i movimenti.",
    ],
    route: "/mn/admin/dev-multyproget?tab=magazzino-dev",
  },
  {
    id: "personale",
    title: "Personale",
    subtitle: "Utenti app autisti Multyproget e Niyol",
    image: "/tutorial/09-personale.png",
    intro:
      "Da qui crei, modifichi ed elimini i login degli autisti, decidendo a quale app assegnarli.",
    steps: [
      "Crea l'utente inserendo il codice fiscale (niente autofill del browser!).",
      "Assegna l'app: Multyproget oppure Niyol.",
      "Modifica password o disattiva l'utente quando serve.",
    ],
    tip: "Il codice fiscale è l'identificativo di login: verificalo carattere per carattere.",
    route: "/mn/admin/dev-multyproget?tab=personale",
  },
  {
    id: "rentri",
    title: "Console RENTRI",
    subtitle: "Bridge, numeri FIR, firme digitali",
    image: "/tutorial/10-rentri-console.png",
    intro:
      "La console mostra lo stato del bridge, i numeri FIR scaricati dal RENTRI e i formulari da firmare.",
    steps: [
      "Controlla il semaforo di stato del bridge.",
      "Scarica i numeri FIR e copiali con l'icona copia.",
      "Firma i formulari in attesa: la campanella mostra il badge arancione.",
    ],
    route: "/mn/admin/dev-multyproget/rentri-console",
  },
  {
    id: "centro-app",
    title: "Centro App & FIR",
    subtitle: "Assegnazione numeri agli autisti o all'ufficio",
    image: "/tutorial/11-centro-app-fir.png",
    intro:
      "Ogni numero FIR va assegnato manualmente: a un autista oppure contrassegnato come 'usato dall'ufficio'.",
    steps: [
      "Seleziona il dipendente e assegna uno o più numeri FIR.",
      "Usa 'Assegna a ufficio' per i numeri gestiti dall'admin.",
      "Copia il numero con l'icona accanto al chip.",
    ],
    tip: "Nessuna assegnazione automatica: il controllo è sempre tuo.",
    route: "/mn/admin/dev-multyproget/centro-app-fir",
  },
  {
    id: "modulo-alternativo",
    title: "Modulo Alternativo",
    subtitle: "Vista formulario su modulo ufficiale",
    image: "/tutorial/12-modulo-alternativo.png",
    intro:
      "Il modulo alternativo riproduce il formulario cartaceo ufficiale. Compilando una vista si compila anche l'altra in tempo reale.",
    steps: [
      "Apri un formulario e passa alla vista Alternativa.",
      "Compila i campi trasparenti sopra il modulo ufficiale.",
      "Torna alla vista Standard: i dati sono già lì.",
      "Stampa il modulo per la copia cartacea.",
    ],
    route: "/mn/admin/dev-multyproget/modulo-alternativo",
  },
];

const STORAGE_KEY = "mn-dev-tutorial-progress";

export default function MNDevTutorialPage() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDone(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(done));
    } catch { /* ignore */ }
  }, [done]);

  const chapter = CHAPTERS[index];
  const completed = useMemo(
    () => CHAPTERS.filter((c) => c.steps.every((_, i) => done[`${c.id}:${i}`])).length,
    [done]
  );
  const progress = Math.round((completed / CHAPTERS.length) * 100);

  const toggleStep = (i: number) =>
    setDone((d) => ({ ...d, [`${chapter.id}:${i}`]: !d[`${chapter.id}:${i}`] }));

  return (
    <MNAdminLayout title="🎬 Tutorial Interattivo" subtitle="Multyproget · Impara il gestionale passo dopo passo">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => navigate("/mn/admin/dev-multyproget")} className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Torna al Centro di Comando
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => setDone({})}>
            <RotateCcw size={14} /> Azzera progressi
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/mn/admin/dev-multyproget/guida")}>
            <BookOpen size={14} /> Guida testuale
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-5 rounded-xl border border-border/40 bg-card/60 p-4 backdrop-blur-xl">
        <div className="mb-2 flex items-center justify-between text-xs font-mono uppercase tracking-wider text-muted-foreground">
          <span>Avanzamento tutorial</span>
          <span>{completed}/{CHAPTERS.length} capitoli · {progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        {/* Sidebar capitoli */}
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {CHAPTERS.map((c, i) => {
            const cDone = c.steps.every((_, s) => done[`${c.id}:${s}`]);
            return (
              <button
                key={c.id}
                onClick={() => { setIndex(i); setZoom(false); }}
                className={`flex min-w-[180px] items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all lg:min-w-0 ${
                  i === index
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                    : "border-border/40 bg-card/40 text-muted-foreground hover:bg-secondary/50"
                }`}
              >
                {cDone ? <CheckCircle2 size={15} className="shrink-0 text-emerald-400" /> : <Circle size={15} className="shrink-0 opacity-50" />}
                <span className="truncate">{i + 1}. {c.title}</span>
              </button>
            );
          })}
        </nav>

        {/* Contenuto capitolo */}
        <section className="space-y-4">
          <div className="rounded-xl border border-border/40 bg-card/60 p-5 backdrop-blur-xl">
            <p className="text-xs font-mono uppercase tracking-wider text-emerald-400">
              Capitolo {index + 1} di {CHAPTERS.length}
            </p>
            <h2 className="mt-1 text-2xl font-display font-bold text-foreground">{chapter.title}</h2>
            <p className="text-sm text-muted-foreground">{chapter.subtitle}</p>
            <p className="mt-3 text-sm leading-relaxed text-foreground/90">{chapter.intro}</p>
          </div>

          <div className="group relative overflow-hidden rounded-xl border border-border/40 bg-black/30">
            <img src={chapter.image} alt={`Schermata ${chapter.title}`} loading="lazy" className="w-full object-cover" />
            <button
              onClick={() => setZoom(true)}
              className="absolute right-3 top-3 rounded-lg border border-border/60 bg-background/80 p-2 text-foreground backdrop-blur transition-all hover:bg-background"
              aria-label="Ingrandisci schermata"
            >
              <Maximize2 size={16} />
            </button>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/60 p-5 backdrop-blur-xl">
            <h3 className="mb-3 text-sm font-display font-bold uppercase tracking-wider text-foreground">Passi da seguire</h3>
            <ul className="space-y-2">
              {chapter.steps.map((s, i) => {
                const checked = !!done[`${chapter.id}:${i}`];
                return (
                  <li key={i}>
                    <button
                      onClick={() => toggleStep(i)}
                      className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm transition-all ${
                        checked
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                          : "border-border/40 bg-secondary/20 text-foreground hover:bg-secondary/40"
                      }`}
                    >
                      {checked ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-400" /> : <Circle size={17} className="mt-0.5 shrink-0 opacity-50" />}
                      <span>{s}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {chapter.tip && (
              <div className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-300">
                💡 {chapter.tip}
              </div>
            )}
            {chapter.route && (
              <Button className="mt-4 gap-2" onClick={() => navigate(chapter.route!)}>
                Provalo ora nel gestionale <ChevronRight size={15} />
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between pb-6">
            <Button variant="ghost" disabled={index === 0} onClick={() => { setIndex(index - 1); setZoom(false); }} className="gap-1">
              <ChevronLeft size={16} /> Precedente
            </Button>
            {index < CHAPTERS.length - 1 ? (
              <Button onClick={() => { setIndex(index + 1); setZoom(false); }} className="gap-1">
                Prossimo capitolo <ChevronRight size={16} />
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setIndex(0)}>Ricomincia da capo</Button>
            )}
          </div>
        </section>
      </div>

      {zoom && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoom(false)}
        >
          <button className="absolute right-4 top-4 rounded-lg border border-border/50 bg-background/80 p-2" aria-label="Chiudi">
            <X size={18} />
          </button>
          <img src={chapter.image} alt={`Schermata ingrandita ${chapter.title}`} className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </MNAdminLayout>
  );
}
