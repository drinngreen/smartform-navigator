import { Link } from "react-router-dom";
import { AlertTriangle, BellRing, Bot, ClipboardCheck, FileSpreadsheet, Factory, ListChecks, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import install1 from "@/assets/guides/istruzioni-autisti-1.png.asset.json";
import install2 from "@/assets/guides/istruzioni-autisti-2.png.asset.json";
import install3 from "@/assets/guides/istruzioni-autisti-3.png.asset.json";
import install4 from "@/assets/guides/istruzioni-autisti-4.png.asset.json";
import install5 from "@/assets/guides/istruzioni-autisti-5.png.asset.json";

const appScreenshots = [
  { image: install1, title: "1. Apri il menu del browser" },
  { image: install2, title: "2. Scegli Installa o crea scorciatoia" },
  { image: install3, title: "3. Conferma Aggiungi" },
  { image: install4, title: "4. Aggiungi alla schermata Home" },
  { image: install5, title: "5. Tocca il drago per aggiornare" },
];

const updates = [
  { icon: QrCode, title: "FIR digitali e stato RENTRI", body: "Lo stato viene riletto dal RENTRI. HTTP 202 significa soltanto presa in carico tecnica. Il viaggio resta bloccato finché numero e QR ufficiale non sono presenti. Il PDF ufficiale usa il modello ministeriale compilato e il QR restituito dal RENTRI." },
  { icon: Factory, title: "Impianto destinatario", body: "L'impianto può cercare per numero FIR e, se disponibile, filtrare per EER/CER qualsiasi FIR RENTRI in cui risulta destinatario, anche se non è stato emesso internamente. Registra doppia pesata ed esito totale, parziale o respinto, poi firma e trasmette la chiusura." },
  { icon: ListChecks, title: "Registri C/S e vista totale", body: "La sezione Registri contiene la vista TUTTI, i singoli registri e gli export Excel/PDF. Fino al 31/07/2026 incluso le righe sono classificate INVIATO (storico); da agosto lo stato deriva dal confronto con il registro RENTRI letto al momento." },
  { icon: ShieldCheck, title: "Intermediazione protetta", body: "Nel registro RQEL39R7NS0 compaiono soltanto FIR letti dal RENTRI nei quali Multyproget è davvero intermediario. La fonte deve essere rentri_intermediario." },
  { icon: BellRing, title: "Semaforo notifiche", body: "La luce rossa segnala le notifiche non lette. La luce arancione si accende quando il RENTRI mostra FIR in arrivo nuovi con data di oggi. Chiudendo le voci con la X, quando l'elenco si svuota il colore sparisce e resta la luce verde." },
  { icon: FileSpreadsheet, title: "Confronto elenchi", body: "Nel Centro di Comando si possono confrontare gli Excel con i documenti interni, distinguere presenti, mancanti e bozze e registrare documentalmente soltanto i mancanti. Questa operazione non invia al RENTRI e non modifica giacenze o cernite." },
  { icon: ClipboardCheck, title: "Preferiti e controllo rapido", body: "La pulsantiera porta direttamente a Registri C/S, Invii RENTRI, Movimenti RENTRI, Compila FIR, Giacenze, Cernite, Intermediazione, FIR cartacei, Personale e Privati. I preferiti scelti restano memorizzati nel browser usato." },
  { icon: Bot, title: "Dark Lemon aggiornato", body: "Dalla console può guidare l'ufficio, leggere la pagina, cercare dati, compilare moduli e usare gli strumenti reali previsti. La cronologia è raggiungibile dalla barra, dalla finestra, dal pannello laterale e dalla pagina completa. Nelle app è invece limitato al formulario." },
  { icon: Smartphone, title: "App collaboratori", body: "La barra mobile contiene FIR, Cronologia, GPS, AI, Profilo e Guida. Telefonate, Messaggi e Modulo alternativo sono stati rimossi. Il badge Dark Lemon apre il pannello sul FIR e la pagina AI mostra la cronologia condivisa." },
];

export default function GuidaUfficioPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4">
          <div className="min-w-0 flex-1"><h1 className="text-2xl font-bold">Guida ufficio</h1><p className="text-sm text-muted-foreground">Aggiornamenti operativi verificati · 16–17 settembre 2026</p></div>
          <Link to="/guidacollaboratori" className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted">Guida collaboratori</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 pb-20">
        <section className="mb-8 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4"><strong>LETTURA</strong><p className="mt-1 text-sm text-muted-foreground">Consultazioni e confronti non modificano i dati.</p></div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4"><strong>CONFERMA</strong><p className="mt-1 text-sm text-muted-foreground">Invii, firme e scritture richiedono una decisione umana esplicita.</p></div>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"><strong>MAI AUTOMATICO</strong><p className="mt-1 text-sm text-muted-foreground">Nessun riallineamento nascosto di giacenze, cernite o storico.</p></div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
          <nav className="h-fit rounded-lg border border-border bg-card p-4 lg:sticky lg:top-24"><h2 className="font-bold">Indice</h2><ol className="mt-3 space-y-2 text-sm text-muted-foreground">{updates.map((item, index) => <li key={item.title}><a className="hover:text-primary" href={`#novita-${index + 1}`}>{index + 1}. {item.title}</a></li>)}</ol></nav>
          <div className="space-y-4">
            {updates.map((item, index) => { const Icon = item.icon; return <article id={`novita-${index + 1}`} key={item.title} className="scroll-mt-24 rounded-lg border border-border bg-card p-5"><div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="h-6 w-6" /></span><div><p className="text-xs font-bold text-primary">NOVITÀ {index + 1}</p><h2 className="mt-1 text-xl font-bold">{item.title}</h2><p className="mt-3 leading-relaxed text-muted-foreground">{item.body}</p></div></div></article>; })}

            <article className="rounded-lg border border-border bg-card p-5"><h2 className="text-xl font-bold">Procedura pratica FIR per l'ufficio</h2><ol className="mt-4 space-y-3 text-muted-foreground"><li><strong className="text-foreground">1. Preparazione:</strong> assegna il numero esatto dal Centro App & FIR e controlla anagrafiche, sedi, autorizzazioni e targa.</li><li><strong className="text-foreground">2. Partenza:</strong> prima dell'invio controlla EER, quantità e soggetti. Un errore lascia il FIR in bozza e reinviabile; non creare duplicati.</li><li><strong className="text-foreground">3. Viaggio:</strong> considera la partenza valida solo con conferma RENTRI e QR ufficiale recuperato.</li><li><strong className="text-foreground">4. Destinatario terzo:</strong> usa il controllo in sola lettura finché il destinatario chiude dal proprio gestionale.</li><li><strong className="text-foreground">5. Impianto interno:</strong> doppia pesata, quantità accettata, esito e firma; registro e giacenza si aggiornano solo dopo esito RENTRI positivo.</li></ol></article>

            <article className="rounded-lg border border-destructive/30 bg-destructive/5 p-5"><div className="flex gap-3"><AlertTriangle className="mt-1 h-6 w-6 shrink-0 text-destructive" /><div><h2 className="text-xl font-bold">Controlli obbligatori</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground"><li>Usare sempre dati letti al momento, includendo le rettifiche nascoste nel conteggio.</li><li>Se due prove si contraddicono, fermarsi: non correggere automaticamente.</li><li>Nessun invio RENTRI reale senza conferma esplicita.</li><li>Non modificare storico, giacenze o cernite per far combaciare un elenco.</li><li>Per l'intermediazione usare soltanto FIR RENTRI con Multyproget intermediario verificato.</li></ul></div></div></article>

            <article className="rounded-lg border border-border bg-card p-5"><h2 className="text-xl font-bold">App collaboratori</h2><p className="mt-2 text-muted-foreground">Per installazione, aggiornamento, uso del FIR, Dark Lemon e foto OCR, usa la guida dedicata.</p><Link to="/guidacollaboratori" className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Apri la guida collaboratori</Link></article>

            <article className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-xl font-bold">Screenshot: installare e aggiornare l'app</h2>
              <p className="mt-2 text-muted-foreground">Mostra queste immagini al collaboratore nello stesso ordine. Le prime quattro installano l'app dal browser; l'ultima aggiorna la pagina.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {appScreenshots.map(({ image, title }) => (
                  <figure key={title} className="overflow-hidden rounded-lg border border-border bg-background">
                    <img src={image.url} alt={title} className="aspect-[9/16] w-full object-contain" loading="lazy" />
                    <figcaption className="border-t border-border p-3 text-sm font-semibold">{title}</figcaption>
                  </figure>
                ))}
              </div>
            </article>
          </div>
        </div>
      </main>
    </div>
  );
}