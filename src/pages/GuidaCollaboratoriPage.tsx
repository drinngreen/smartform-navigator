import { Link } from "react-router-dom";
import { AlertTriangle, Bot, CheckCircle2, Download, RefreshCw, Smartphone, Truck } from "lucide-react";
import logoDragon from "@/assets/logo-dragon.png";
import install1 from "@/assets/guides/istruzioni-autisti-1.png.asset.json";
import install2 from "@/assets/guides/istruzioni-autisti-2.png.asset.json";
import install3 from "@/assets/guides/istruzioni-autisti-3.png.asset.json";
import install4 from "@/assets/guides/istruzioni-autisti-4.png.asset.json";
import refresh5 from "@/assets/guides/istruzioni-autisti-5.png.asset.json";

const installSteps = [
  { title: "Apri il menu del browser", text: "Apri la pagina dell'app. Tocca i tre puntini in alto a destra.", image: install1.url },
  { title: "Scegli Installa e crea scorciatoia", text: "Nel menu, tocca la voce indicata dalla freccia.", image: install2.url },
  { title: "Premi Aggiungi", text: "Quando compare Crea scorciatoia, non cambiare il nome. Tocca Aggiungi.", image: install3.url },
  { title: "Metti l'app nella schermata Home", text: "Tocca Aggiungi a schermata Home. Da ora trovi l'icona insieme alle altre app.", image: install4.url },
  { title: "Aggiorna sempre prima di lavorare", text: "Quando apri l'app, tocca il drago in alto. La pagina si ricarica e mostra gli ultimi aggiornamenti.", image: refresh5.url },
];

const workSteps = [
  ["1", "Apri il FIR", "Tocca FIR in basso e scegli il numero assegnato dall'ufficio. Se non vedi numeri, chiama l'ufficio: non crearne uno a caso."],
  ["2", "Controlla prima di partire", "Controlla produttore, destinatario, codice EER, targa e quantità. Un campo rosso va corretto prima di continuare."],
  ["3", "Emetti e firma la partenza", "Premi il comando di partenza una sola volta. Il viaggio può iniziare soltanto quando RENTRI conferma e compare il QR ufficiale."],
  ["4", "Durante il viaggio", "Tieni disponibile il QR ufficiale. Una lunga fila di lettere e numeri è il contenuto firmato del QR e va letta con strumenti compatibili RENTRI."],
  ["5", "All'arrivo", "Se il destinatario usa il proprio gestionale, premi solo Controlla se il destinatario ha chiuso il FIR. Non compilare una chiusura al posto suo."],
  ["6", "Chiusura", "Il FIR è chiuso solo dopo la conferma positiva RENTRI. Solo allora registro e giacenze possono aggiornarsi secondo il ruolo reale."],
];

export default function GuidaCollaboratoriPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
          <img src={logoDragon} alt="Dragon Rifiuti" className="h-11 w-11" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold">Guida collaboratori</h1>
            <p className="text-sm text-muted-foreground">Istruzioni semplici per usare l'app senza errori</p>
          </div>
          <Link to="/mn" className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted">Apri app</Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-10 px-4 py-8 pb-20">
        <section className="rounded-lg border border-primary/30 bg-primary/5 p-5">
          <div className="flex gap-3"><AlertTriangle className="mt-1 h-6 w-6 shrink-0 text-primary" /><div><h2 className="text-lg font-bold">Le tre regole da ricordare</h2><p className="mt-2 leading-relaxed text-muted-foreground">Non inventare dati. Non premere due volte un invio. Se manca il QR ufficiale o compare un errore, fermati e chiama l'ufficio.</p></div></div>
        </section>

        <section>
          <div className="mb-5 flex items-center gap-3"><Download className="h-7 w-7 text-primary" /><div><h2 className="text-2xl font-bold">Metti l'app sul telefono</h2><p className="text-muted-foreground">Segui le immagini dall'alto verso il basso.</p></div></div>
          <div className="space-y-6">
            {installSteps.map((step, index) => (
              <article key={step.title} className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="flex gap-4 p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">{index + 1}</span><div><h3 className="text-lg font-bold">{step.title}</h3><p className="mt-1 leading-relaxed text-muted-foreground">{step.text}</p></div></div>
                <img src={step.image} alt={`Passaggio ${index + 1}: ${step.title}`} className="mx-auto block max-h-[760px] w-full object-contain bg-muted/20" loading="lazy" />
              </article>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-center gap-3"><Truck className="h-7 w-7 text-primary" /><div><h2 className="text-2xl font-bold">Come fare un viaggio</h2><p className="text-muted-foreground">Un passaggio alla volta, sempre nell'ordine.</p></div></div>
          <div className="grid gap-3 md:grid-cols-2">
            {workSteps.map(([number, title, text]) => <article key={number} className="rounded-lg border border-border bg-card p-4"><span className="text-sm font-bold text-primary">PASSO {number}</span><h3 className="mt-1 text-lg font-bold">{title}</h3><p className="mt-2 leading-relaxed text-muted-foreground">{text}</p></article>)}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-3"><Bot className="h-7 w-7 text-primary" /><h2 className="text-2xl font-bold">Dark Lemon</h2></div>
          <ol className="mt-4 space-y-3 text-muted-foreground">
            <li><strong className="text-foreground">1.</strong> Dal FIR, premi <strong className="text-foreground">Compila con Dark Lemon</strong>: si apre la finestra laterale.</li>
            <li><strong className="text-foreground">2.</strong> Puoi scrivere, dettare oppure premere la fotocamera e fotografare un formulario o un elenco.</li>
            <li><strong className="text-foreground">3.</strong> Dark Lemon legge e mette i dati in ordine. I dati dubbi vengono segnalati, non inventati.</li>
            <li><strong className="text-foreground">4.</strong> Controlla l'anteprima e premi <strong className="text-foreground">Applica</strong> per riportare i dati nel FIR.</li>
            <li><strong className="text-foreground">5.</strong> La voce <strong className="text-foreground">AI</strong> in basso mostra anche le conversazioni iniziate dalla finestra laterale.</li>
          </ol>
          <p className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">Nell'app Dark Lemon può leggere e compilare il formulario aperto. Non può inviare al RENTRI, creare utenti o modificare registri e giacenze.</p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4"><CheckCircle2 className="h-6 w-6 text-primary" /><h2 className="mt-2 font-bold">Se tutto è verde</h2><p className="mt-1 text-sm text-muted-foreground">Puoi continuare seguendo il pulsante mostrato dall'app.</p></div>
          <div className="rounded-lg border border-border bg-card p-4"><RefreshCw className="h-6 w-6 text-primary" /><h2 className="mt-2 font-bold">Se qualcosa non torna</h2><p className="mt-1 text-sm text-muted-foreground">Non ripetere l'invio. Tocca il drago, rileggi lo stato e contatta l'ufficio.</p></div>
        </section>
      </main>
    </div>
  );
}