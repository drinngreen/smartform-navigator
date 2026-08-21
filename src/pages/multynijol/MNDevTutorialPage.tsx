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
  AlertTriangle,
  HelpCircle,
  ListChecks,
} from "lucide-react";

type Field = { label: string; desc: string };
type Faq = { q: string; a: string };

type Chapter = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  level: "Base" | "Intermedio" | "Avanzato";
  minutes: number;
  intro: string;
  /** Paragrafi discorsivi: spiegano il "perché", non solo il "come" */
  explain: string[];
  steps: string[];
  fields?: Field[];
  warnings?: string[];
  faq?: Faq[];
  tip?: string;
  route?: string;
};

const CHAPTERS: Chapter[] = [
  {
    id: "orientamento",
    title: "Come è fatto il gestionale",
    subtitle: "Mappa generale prima di toccare qualsiasi cosa",
    image: "/tutorial/01-impianto.png",
    level: "Base",
    minutes: 3,
    intro:
      "Il Centro di Comando Dev Multy è un'unica pagina con tante tab. Ogni tab è un contesto isolato: quello che vedi in una tab non contamina le altre. Prima di imparare i singoli moduli conviene capire come è organizzato il lavoro.",
    explain: [
      "Il gestionale ruota attorno a tre oggetti: il FORMULARIO (FIR), che è il documento di trasporto rifiuti; il MOVIMENTO, che è la conseguenza contabile del formulario (carico o scarico di magazzino); la GIACENZA, che è la somma dei movimenti per ogni codice CER.",
      "Regola che spiega il 90% dei dubbi: le giacenze dell'impianto Multyproget si muovono SOLO quando Multyproget è Produttore (scarico) o Destinatario (carico). Se Multyproget o Niyol fanno solo i trasportatori, il formulario esiste, il registro si aggiorna, ma il magazzino non cambia. Non è un errore.",
      "Ogni tab salva la sua posizione nell'indirizzo (?tab=...): se ricarichi o mandi il link a un collega, si riapre esattamente dove eri.",
      "I colori aiutano a orientarsi: verde = Multyproget, ciano = Niyol, rosso = Magazzino Dev, ambra = allerte e MUD, viola = firma e invii RENTRI, giallo = personale.",
    ],
    steps: [
      "Apri /mn/admin/dev-multyproget e scorri tutte le tab una volta, senza cliccare nulla dentro.",
      "Individua le tre famiglie: documenti (Impianto, Niyol, Conto Proprio, Contatti), contabilità rifiuti (Registri, Giacenze, Privati, Ricevute), servizi (Personale, RENTRI, Fatturazione).",
      "Ricarica la pagina su una tab qualsiasi e verifica che ci resti: è la conferma che l'URL memorizza il contesto.",
    ],
    warnings: [
      "Nessun formulario viene creato in automatico dal sistema: il numero FIR lo digiti sempre tu, a mano.",
    ],
    tip: "Se ti perdi, il pulsante rosso in alto a sinistra riporta sempre al Centro di Comando.",
    faq: [
      { q: "Da dove comincio se non ho mai usato il gestionale?", a: "Dalle tab documenti (Impianto, Niyol, Conto Proprio): sono quelle che userai ogni giorno. Registri e Giacenze si popolano da sole con quello che registri lì." },
      { q: "Perché ci sono contesti diversi (Multyproget, Niyol, Conto Proprio)?", a: "Perché sono soggetti e attività diverse: la legge impone registri separati. Mescolarli renderebbe i registri non validi in caso di controllo." },
      { q: "Ho cambiato tab e ho perso quello che stavo facendo.", a: "I dialoghi aperti vengono ripristinati, ma i dati non salvati no: salva sempre in bozza prima di cambiare sezione." },
    ],
    route: "/mn/admin/dev-multyproget",
  },
  {
    id: "formulario-standard",
    title: "Il Formulario Standard",
    subtitle: "Come si compila un FIR, campo per campo",
    image: "/tutorial/15-formulario-standard.png",
    level: "Base",
    minutes: 6,
    intro:
      "Il Modulo Standard è la vista 'a schede' del formulario: gli stessi dati del modulo cartaceo, ma organizzati in sezioni ordinate. È il punto in cui si crea la maggior parte del lavoro quotidiano.",
    explain: [
      "Si parte SEMPRE dal numero: digiti il numero FIR (quello stampato sul blocco o scaricato dal RENTRI) e premi 'Crea formulario'. La bozza si apre immediatamente e da quel momento è tua, modificabile.",
      "Il formulario ha due viste — Standard e Alternativo — che sono lo stesso documento. Se scrivi il peso nella vista Standard, lo ritrovi nella vista Alternativa mentre stai ancora digitando. Non esistono due formulari: esiste un formulario con due facce.",
      "Salva bozza = il documento resta modificabile. Salva definitivo = il documento entra nei registri e aggiorna le giacenze secondo il ruolo di Multyproget.",
      "Ogni sezione ha un pulsante gomma che azzera SOLO quella sezione. Il cestino in alto, invece, elimina l'intero formulario e storna in automatico registro e giacenze: nessuna riga resta orfana.",
    ],
    steps: [
      "Digita il numero FIR nel campo dedicato e premi 'Crea formulario'.",
      "Compila la sezione Produttore: usa la tendina dei preset per riempire Multyproget in un click, oppure cerca l'azienda in rubrica.",
      "Compila Destinatario e Trasportatore con lo stesso metodo.",
      "Inserisci il rifiuto: codice CER, descrizione, stato fisico, caratteristiche di pericolo, destinazione (R o D).",
      "Inserisci la quantità di partenza; la quantità di arrivo si compila quando il carico è pesato a destino.",
      "Controlla data e ora di partenza, targa e conducente.",
      "Passa alla vista Alternativa per verificare che il modulo ufficiale sia leggibile e completo.",
      "Salva in bozza per continuare dopo, oppure Salva definitivo per scrivere su registri e giacenze.",
    ],
    fields: [
      { label: "Numero FIR", desc: "Sempre manuale. È l'identificativo univoco: se sbagli, elimina il formulario e ricrealo col numero giusto." },
      { label: "Produttore", desc: "Chi genera il rifiuto. Se è Multyproget, alla chiusura genera uno SCARICO di magazzino." },
      { label: "Destinatario", desc: "Chi riceve il rifiuto. Se è Multyproget, genera un CARICO di magazzino." },
      { label: "Trasportatore", desc: "Multyproget, Niyol o terzi. Da solo NON muove le giacenze." },
      { label: "Codice CER", desc: "Determina su quale riga di giacenza finisce la quantità. Catalogo completo disponibile in tendina." },
      { label: "Q.tà partenza / arrivo", desc: "Partenza è obbligatoria per chiudere; l'arrivo può arrivare dopo. Finché manca, la riga resta ambra." },
      { label: "Operazione R/D", desc: "Recupero (R1–R13) o smaltimento (D1–D15). Serve per registri e MUD." },
    ],
    warnings: [
      "Non usare il cestino per 'ripulire' un campo: cancella tutto il formulario e storna i movimenti. Per una sezione usa la gomma.",
      "Se il formulario è già definitivo, modificare i pesi cambia le giacenze: verifica sempre il saldo dopo la modifica.",
    ],
    faq: [
      { q: "Ho creato un formulario col numero sbagliato.", a: "Eliminalo con il cestino: il sistema storna in automatico registro e giacenze. Poi ricrealo con il numero corretto." },
      { q: "Ho compilato in Standard ma in Alternativo non vedo nulla.", a: "Chiudi e riapri il formulario: le due viste si sincronizzano in tempo reale, un mancato aggiornamento indica solo una vista rimasta aperta da prima." },
    ],
    tip: "La tendina dei preset Multyproget riempie produttore o destinatario con dati anagrafici già verificati: usala sempre, riduce gli errori di battitura.",
    route: "/mn/admin/dev-multyproget?tab=conto-proprio",
  },
  {
    id: "modulo-alternativo",
    title: "Modulo Alternativo",
    subtitle: "La stessa scheda sul modulo ufficiale stampabile",
    image: "/tutorial/12-modulo-alternativo.png",
    level: "Base",
    minutes: 3,
    intro:
      "Il Modulo Alternativo riproduce fedelmente il formulario ufficiale in formato stampabile, con i campi trasparenti sovrapposti al modulo.",
    explain: [
      "Serve a due cose: controllare che il documento stampato risulti allineato e leggibile, e consegnare la copia cartacea al trasportatore o al cliente.",
      "Essendo la stessa scheda del Modulo Standard, puoi passare da una vista all'altra anche a metà compilazione senza perdere niente.",
      "La dimensione dei caratteri si adatta in automatico ai campi lunghi, così il testo non esce dai riquadri in stampa.",
    ],
    steps: [
      "Apri un formulario esistente e passa alla vista Alternativa.",
      "Verifica che ogni campo cada dentro il riquadro corretto del modulo.",
      "Correggi eventuali testi troppo lunghi (ragioni sociali, indirizzi) accorciandoli.",
      "Stampa o esporta in PDF per la copia cartacea.",
    ],
    tip: "Se il formulario è stato compilato in app dall'autista, qui vedi esattamente ciò che verrà stampato in ufficio.",
    faq: [
      { q: "Se modifico nella vista Alternativa perdo la vista Standard?", a: "No: le due viste sono lo stesso documento. Quello che scrivi in una compare subito nell'altra." },
      { q: "Il testo esce dai riquadri in stampa.", a: "Il carattere si riduce da solo, ma con ragioni sociali o indirizzi molto lunghi conviene abbreviare (es. 'S.r.l.' invece di 'Società a responsabilità limitata')." },
      { q: "Quando uso il modulo alternativo?", a: "Quando devi produrre la copia cartacea sul modulo prestampato, o quando vuoi vedere l'anteprima esatta di ciò che verrà stampato." },
    ],
    route: "/mn/admin/dev-multyproget/modulo-alternativo",
  },
  {
    id: "app-autisti",
    title: "App dei dipendenti",
    subtitle: "Cosa vedono e cosa possono fare gli autisti",
    image: "/tutorial/13-app-autisti.png",
    level: "Base",
    minutes: 5,
    intro:
      "Gli autisti Multyproget e Niyol usano un'app mobile dedicata, con lo stesso database del gestionale ma un'interfaccia ridotta all'essenziale: compilare il formulario, tracciare il viaggio, comunicare con l'ufficio.",
    explain: [
      "L'app si apre su un ELENCO di formulari disponibili, mai su una bozza già assegnata: l'autista sceglie il numero su cui lavorare. I numeri FIR glieli assegni tu dal Centro App & FIR.",
      "In alto ci sono i tre stati del viaggio: Bozza, In viaggio, Arrivo. Servono all'ufficio per sapere a che punto è il mezzo senza telefonare.",
      "Le tre schede Principale / Trasbordo / Intermodale corrispondono alle tipologie di trasporto previste dal formulario RENTRI.",
      "In fondo alla barra: Cronologia (i formulari già compilati), GPS, Telefono, Messaggi, AI, Profilo, Modulo Alternativo e Guida.",
      "Nell'app NON compare la sezione fatturazione: è riservata all'ufficio. L'autista compila il documento di trasporto, l'ufficio fattura.",
    ],
    steps: [
      "Dal Centro App & FIR assegna uno o più numeri FIR al dipendente (oppure marcali 'usati dall'ufficio').",
      "L'autista apre l'app, tocca il numero nell'elenco 'Formulari disponibili' e compila i campi del trasporto.",
      "Durante il viaggio aggiorna lo stato: In viaggio all'uscita, Arrivo alla consegna.",
      "A destino inserisce la quantità di arrivo e salva.",
      "In ufficio ritrovi il formulario nella tab corretta (Impianto, Conto Proprio o Niyol) già compilato.",
      "Se serve la copia cartacea, l'autista apre Mod. Alt. e stampa il modulo ufficiale.",
    ],
    fields: [
      { label: "Bozza / In viaggio / Arrivo", desc: "Stato del viaggio, visibile all'ufficio in tempo reale." },
      { label: "Cronologia", desc: "Storico dei formulari dell'autista, diviso in Bozze e Inviati." },
      { label: "GPS", desc: "Posizione del mezzo (l'autista può disattivarla dal profilo)." },
      { label: "Mod. Alt.", desc: "Vista modulo ufficiale per la stampa in mobilità." },
    ],
    warnings: [
      "Se l'autista non vede numeri disponibili, significa che non gli è stato assegnato alcun FIR: l'assegnazione è sempre manuale.",
      "Un formulario aperto dall'autista resta modificabile finché è in bozza: dopo il salvataggio definitivo va corretto dall'ufficio.",
    ],
    faq: [
      { q: "L'autista ha sbagliato formulario.", a: "Dall'ufficio elimina la bozza col cestino (storno automatico) e riassegna il numero corretto." },
      { q: "Come creo un nuovo login autista?", a: "Dal capitolo Personale: crei l'utente con il codice fiscale e scegli se assegnarlo all'app Multyproget o Niyol." },
    ],
    tip: "Fai provare l'app a ogni nuovo autista con un numero FIR di prova prima di mandarlo in strada.",
    route: "/mn/admin/dev-multyproget/centro-app-fir",
  },
  {
    id: "app-cronologia",
    title: "Cronologia app e controllo ufficio",
    subtitle: "Verificare cosa hanno compilato gli autisti",
    image: "/tutorial/14-app-cronologia.png",
    level: "Intermedio",
    minutes: 3,
    intro:
      "La Cronologia dell'app è lo specchio del lavoro dell'autista: bozze aperte da completare e formulari già inviati.",
    explain: [
      "Le Bozze sono formulari iniziati ma non chiusi: tipicamente manca il peso a destino o la firma.",
      "Gli Inviati sono documenti definitivi: hanno già scritto nel registro generale e, quando previsto, mosso le giacenze.",
      "Dall'ufficio puoi vedere gli stessi documenti nelle tab del Centro di Comando: è la stessa base dati, non una copia.",
    ],
    steps: [
      "Apri Cronologia nell'app (o la tab corrispondente in ufficio).",
      "Filtra per Bozze e chiudi quelle rimaste in sospeso da più giorni.",
      "Controlla che tra gli Inviati non ci siano righe ambra (peso destino mancante).",
    ],
    tip: "Un controllo settimanale della cronologia evita di arrivare a fine mese con decine di bozze incomplete.",
    faq: [
      { q: "L'autista dice di aver compilato ma in ufficio non vedo nulla.", a: "Controlla la cronologia filtrata su Bozze: se il documento non è stato inviato resta come bozza sul suo profilo." },
      { q: "Posso correggere io un formulario inviato dall'autista?", a: "Gli inviati non si modificano dall'app; dall'ufficio si interviene sul documento e, se necessario, si annulla e si rifà." },
      { q: "Cosa significano le righe evidenziate in ambra?", a: "Manca la quantità in arrivo a destino: finché non la inserisci il ciclo del documento non è completo." },
    ],
    route: "/mn/admin/dev-multyproget?tab=impianto",
  },
  {
    id: "impianto",
    title: "Impianto",
    subtitle: "Movimenti di carico e scarico dell'impianto Multyproget",
    image: "/tutorial/01-impianto.png",
    level: "Intermedio",
    minutes: 4,
    intro:
      "La tab Impianto mostra esclusivamente i movimenti dell'impianto Multyproget di via Rivarossa. Ogni formulario in cui Multyproget è Produttore o Destinatario genera qui un movimento di CARICO o SCARICO.",
    explain: [
      "Un CARICO entra in magazzino (Multyproget è destinatario), uno SCARICO esce (Multyproget è produttore/mittente). La giacenza per CER è semplicemente la somma algebrica di queste righe.",
      "L'elenco formulari mostra CER, produttore, destinatario, trasportatore e le quantità di partenza e di arrivo: serve per il colpo d'occhio, prima di aprire il documento.",
      "Le righe ambra segnalano formulari chiusi ma senza peso a destino: vanno completate, altrimenti i saldi restano approssimati.",
      "Il pulsante 'Sync giacenze' ricalcola i saldi partendo dai movimenti reali ed è una verifica indipendente: se dopo il sync il numero non cambia, il dato è corretto.",
    ],
    steps: [
      "Seleziona la tab Impianto.",
      "Filtra per periodo, CER, tipo (carico/scarico) e ruolo per isolare i movimenti che ti interessano.",
      "Controlla che ogni riga abbia data, CER, quantità e controparte corrette.",
      "Apri le righe ambra e inserisci la quantità di arrivo.",
      "Lancia 'Sync giacenze' e confronta con la tab Magazzino Dev.",
    ],
    warnings: ["I dati di Conto Proprio e Intermediazione NON compaiono qui: i contesti sono isolati per legge e per chiarezza."],
    tip: "Se un saldo non torna, non correggerlo a mano: cerca il movimento mancante o duplicato e sistema quello.",
    faq: [
      { q: "Perché qui non vedo i movimenti di Conto Proprio?", a: "I contesti sono isolati: la tab Impianto mostra solo l'attività dell'impianto, come richiesto dalla normativa e per evitare confusione nei registri." },
      { q: "Una riga è ambra: cosa manca?", a: "Manca la quantità in arrivo a destino. Finché non la inserisci il movimento non è completo e il saldo non è definitivo." },
      { q: "Ho lanciato Sync giacenze e il saldo è cambiato.", a: "Significa che c'era un disallineamento: il valore giusto è quello ricalcolato dai movimenti. Se il salto è grosso, controlla i movimenti del periodo." },
      { q: "Come distinguo carico e scarico?", a: "Il carico è il rifiuto che entra in impianto, lo scarico è quello che esce verso il destinatario finale. Il filtro tipo ti permette di vedere solo una delle due famiglie." },
    ],
    route: "/mn/admin/dev-multyproget?tab=impianto",
  },
  {
    id: "niyol",
    title: "Niyol",
    subtitle: "Trasporti Niyol e formulari collegati",
    image: "/tutorial/02-niyol.png",
    level: "Intermedio",
    minutes: 3,
    intro:
      "Niyol è la società di trasporto. Se Niyol trasporta per Multyproget, il formulario è visibile in entrambi i contesti, ma le giacenze si muovono solo su Multyproget.",
    explain: [
      "Niyol non ha impianto: le sue giacenze restano a zero per definizione. Il registro generale però viene aggiornato, anche quando Niyol è solo trasportatore.",
      "Questo evita il doppio conteggio: uno stesso rifiuto non può essere caricato due volte solo perché due società nostre compaiono sul documento.",
    ],
    steps: [
      "Apri la tab Niyol per vedere i formulari con Niyol coinvolta.",
      "Verifica stato del FIR (bozza / inviato) e numero assegnato manualmente.",
      "Apri il formulario per completare partenza, arrivo e pesi.",
      "Controlla nel Registro Generale che la registrazione Niyol sia presente.",
    ],
    tip: "Un FIR Niyol non duplica mai il movimento sul magazzino Multyproget: se lo vedi doppio, segnalalo subito.",
    faq: [
      { q: "Un formulario Niyol deve comparire anche in Multyproget?", a: "Solo se Multyproget è coinvolta come produttore o destinatario: in quel caso vedi il documento in entrambi i contesti, ma il movimento di magazzino resta uno solo." },
      { q: "Vedo lo stesso movimento due volte.", a: "È un'anomalia da segnalare subito: il sistema è progettato per non duplicare. Lancia un controllo giacenze e verifica i movimenti collegati al FIR." },
      { q: "Posso creare un FIR Niyol dall'area Multyproget?", a: "Sì, ma solo dalla tab Niyol: così la registrazione finisce nel registro corretto." },
    ],
    route: "/mn/admin/dev-multyproget?tab=niyol",
  },
  {
    id: "conto-proprio",
    title: "Conto Proprio",
    subtitle: "Trasporti in categoria 2-bis",
    image: "/tutorial/03-conto-proprio.png",
    level: "Intermedio",
    minutes: 3,
    intro:
      "In Conto Proprio gestisci i formulari dove Multyproget trasporta i propri rifiuti con mezzi propri (categoria 2-bis).",
    explain: [
      "Stesse regole di ovunque: numero FIR manuale, due viste sincronizzate, bozza modificabile, cestino con storno automatico.",
      "Le intermediazioni (categoria 8) NON stanno qui: hanno una sezione dedicata dentro Registri.",
    ],
    steps: [
      "Crea un nuovo formulario inserendo manualmente il numero FIR.",
      "Scegli la vista Standard o Alternativa: si compilano in sincrono.",
      "Salva in bozza: le giacenze si aggiornano coerentemente al ruolo di Multyproget.",
      "Usa il cestino per eliminare: soft delete + storno automatico del movimento.",
    ],
    faq: [
      { q: "Perché in Conto Proprio non vedo i formulari dell'impianto?", a: "Sono contesti separati: il Conto Proprio riguarda i trasporti fatti in proprio, l'Impianto l'attività di gestione rifiuti." },
      { q: "Il formulario aggiorna le giacenze?", a: "Solo se Multyproget è produttore o destinatario del rifiuto: se è solo trasportatore, il magazzino non si muove." },
      { q: "Ho cancellato un formulario per sbaglio.", a: "L'eliminazione è un soft delete con storno automatico del movimento: i dati restano tracciati e il saldo torna al valore precedente." },
    ],
    route: "/mn/admin/dev-multyproget?tab=conto-proprio",
  },
  {
    id: "registri",
    title: "Registri",
    subtitle: "Registro generale, intermediario, invii RENTRI",
    image: "/tutorial/04-registri.png",
    level: "Avanzato",
    minutes: 5,
    intro:
      "I registri sono cronologici e isolati per società. Da qui prepari gli invii verso RENTRI e gestisci i casi particolari (formulari cartacei, lavorazioni R13).",
    explain: [
      "Intermediario raccoglie i movimenti di sola intermediazione (categoria 8), senza detenzione del rifiuto.",
      "Registro Generale è la cronologia completa: filtri per giorno, società, CER, tipo o testo libero; col tasto destro su una riga esporti la selezione in Excel.",
      "'Conto Terzi Manuale' serve quando un cliente porta fisicamente un formulario cartaceo: lo registri e viene trattato come un formulario digitale, registro e giacenze compresi.",
      "'Scarico Lavorazione R13' sposta il materiale dai CER dei privati al CER aziendale generando in un colpo solo lo scarico e il carico corrispondente.",
      "Negli Invii al RENTRI scegli registro e data limite e consolidi l'invio; sotto trovi lo storico con identificativo transazione ed esito.",
    ],
    steps: [
      "Seleziona il sotto-registro (Intermediario, Generale, Invii RENTRI).",
      "Filtra per data e controlla la progressione cronologica.",
      "Esporta in Excel con il tasto destro se ti serve per il commercialista.",
      "Registra eventuali formulari cartacei con Conto Terzi Manuale.",
      "Invia al RENTRI e verifica l'esito nello storico e nella Console RENTRI.",
    ],
    warnings: ["Un invio RENTRI consolidato non si annulla dal gestionale: controlla il periodo prima di confermare."],
    faq: [
      { q: "Devo scrivere io le righe del registro?", a: "No: le registrazioni nascono dai formulari e dai conferimenti. Qui si consulta, si esporta e si invia." },
      { q: "Come registro un formulario cartaceo ricevuto da terzi?", a: "Usa la funzione Conto Terzi Manuale: entra nel registro come gli altri documenti." },
      { q: "Ho inviato al RENTRI un periodo sbagliato.", a: "Un invio consolidato non si annulla dal gestionale: va gestito come rettifica. Per questo conviene controllare sempre il periodo prima di confermare." },
      { q: "Serve l'esportazione per il commercialista?", a: "Sì: l'export in Excel del periodo è il formato più comodo da consegnare." },
    ],
    route: "/mn/admin/dev-multyproget?tab=registri",
  },
  {
    id: "privati",
    title: "Privati (registro DBT)",
    subtitle: "Conferimenti multi-materiale con garanzia atomica",
    image: "/tutorial/05-privati.png",
    level: "Base",
    minutes: 5,
    intro:
      "Il registro Privati gestisce i conferimenti dei cittadini. Ogni conferimento può contenere più materiali e l'inserimento è atomico: o si registra tutto (conferimento + movimenti + giacenze), o non si registra nulla.",
    explain: [
      "Si parte cercando il privato per codice fiscale, nome o targa; se non esiste lo crei al volo.",
      "La data del conferimento la scegli tu al momento della creazione e resta modificabile anche dopo.",
      "Se il privato porta ferro, rame e cavi, inserisci tre righe nello stesso conferimento: la ricevuta li elencherà tutti.",
      "Il sistema controlla il limite annuo di 1500 kg complessivi per privato e blocca il superamento.",
      "Ogni riga genera un movimento di carico sul CER indicato: le giacenze si aggiornano nello stesso istante del salvataggio.",
    ],
    steps: [
      "Cerca il privato per codice fiscale, nome o targa; creane uno nuovo se serve.",
      "Scegli la data del conferimento.",
      "Aggiungi una riga per ogni materiale: CER, descrizione/variante, kg.",
      "Salva: il sistema verifica il limite annuo e aggiorna le giacenze.",
      "Controlla in Magazzino Dev che i CER interessati siano cresciuti degli stessi kg.",
    ],
    warnings: [
      "Se il salvataggio fallisce, nessun dato parziale resta a database: ripeti l'inserimento senza paura di duplicare.",
      "Eliminando un conferimento vengono stornati sia la ricevuta sia i movimenti collegati.",
    ],
    faq: [
      { q: "Il CER che mi serve non è in elenco.", a: "La tendina contiene il catalogo CER completo: scrivi il codice per filtrarlo. I CER 'abituali' sono solo i primi suggerimenti." },
      { q: "Ho superato i 1500 kg.", a: "Il sistema blocca il salvataggio: il privato deve rivolgersi a un conferimento professionale con formulario." },
    ],
    tip: "Dopo ogni conferimento importante, un colpo d'occhio su Magazzino Dev conferma che tutto è filato liscio.",
    route: "/mn/admin/dev-multyproget?tab=privati",
  },
  {
    id: "ricevute",
    title: "Ricevute",
    subtitle: "Numerazione progressiva annuale e stampa",
    image: "/tutorial/06-ricevute.png",
    level: "Base",
    minutes: 3,
    intro:
      "Ogni conferimento genera una ricevuta con numero progressivo annuale univoco (es. 258/2026), con tutti i materiali conferiti.",
    explain: [
      "La numerazione è automatica e non si può forzare: garantisce la sequenza richiesta in caso di controllo.",
      "Data e materiali restano modificabili; il numero resta invariato anche se cambi la data.",
      "La ricevuta multi-materiale elenca una riga per ogni CER conferito con i relativi kg.",
    ],
    steps: [
      "Apri la ricevuta collegata al conferimento.",
      "Modifica la data se necessario.",
      "Verifica l'elenco materiali e i kg totali.",
      "Stampa il PDF o invialo al privato.",
    ],
    faq: [
      { q: "Ho sbagliato la data della ricevuta.", a: "La data è modificabile dalla ricevuta stessa: correggila e ristampa. Il numero progressivo non cambia." },
      { q: "Il privato ha portato tre materiali diversi: devo fare tre ricevute?", a: "No: una sola ricevuta con una riga per ogni CER e i relativi kg." },
      { q: "Posso saltare un numero di ricevuta?", a: "No: la numerazione è progressiva annuale e senza buchi. Se una ricevuta è errata si annulla, non si cancella il numero." },
    ],
    route: "/mn/admin/dev-multyproget?tab=ricevute",
  },
  {
    id: "contatti",
    title: "Contatti",
    subtitle: "Rubrica aziende, unità locali, autorizzazioni",
    image: "/tutorial/07-contatti.png",
    level: "Intermedio",
    minutes: 4,
    intro:
      "La rubrica alimenta i menu a tendina dei formulari. Dati corretti qui significano formulari compilati in un click.",
    explain: [
      "Ogni azienda ha quattro schede: unità locali, targhe dei mezzi, cantieri e autorizzazioni con numero, data di inizio e scadenza.",
      "Puoi allegare i documenti scansionati, archiviati in un'area privata non pubblica.",
      "Dalla scheda azienda puoi creare direttamente un formulario, con le stesse regole viste nel capitolo del Formulario Standard.",
    ],
    steps: [
      "Cerca l'azienda per ragione sociale, P.IVA o codice fiscale.",
      "Apri il Dettaglio e aggiorna indirizzi, unità locali e targhe.",
      "Controlla le scadenze delle autorizzazioni.",
      "Allega i documenti scansionati.",
      "Nel formulario usa il selettore preset per riempire produttore/destinatario.",
    ],
    tip: "Un'autorizzazione scaduta sul destinatario è un problema in caso di controllo: controllale a inizio mese.",
    faq: [
      { q: "Non trovo un'azienda che ho sicuramente inserito.", a: "Prova a cercarla per P.IVA invece che per nome: le ragioni sociali spesso sono scritte in modo diverso (S.r.l., SRL, Srl)." },
      { q: "Il preset non compila tutti i campi del formulario.", a: "Il preset riempie i dati presenti in anagrafica: se mancano unità locale o autorizzazione, vanno completati nella scheda azienda." },
      { q: "Come gestisco un'autorizzazione scaduta?", a: "Aggiorna la scheda con il nuovo documento e la nuova scadenza: il sistema segnala le scadenze, ma la verifica resta responsabilità dell'ufficio." },
    ],
    route: "/mn/admin/dev-multyproget?tab=contatti",
  },
  {
    id: "magazzino",
    title: "Magazzino Dev (giacenze)",
    subtitle: "Come leggere i saldi per CER",
    image: "/tutorial/08-magazzino-dev.png",
    level: "Intermedio",
    minutes: 4,
    intro:
      "Le giacenze sono sempre il risultato dei movimenti reali: non esiste un saldo iniziale digitato a mano.",
    explain: [
      "Ogni riga è la coppia CER + variante materiale (es. 200140 rame, 200140 cavi): sono saldi separati perché separata è la lavorazione.",
      "Di default vedi solo i CER con giacenza; attiva 'Mostra tutti i CER' per vedere anche quelli a zero, utile prima di un conferimento su un materiale nuovo.",
      "Se un saldo ti sembra sbagliato, lancia Sync giacenze: ricalcola dai movimenti in modo atomico e ti dice il valore reale.",
    ],
    steps: [
      "Consulta i saldi per CER e variante.",
      "Attiva 'Mostra tutti i CER' per includere quelli a zero.",
      "Lancia Sync giacenze e confronta con i movimenti della tab Impianto.",
      "Se il saldo cambia dopo il sync, cerca il movimento che mancava.",
    ],
    warnings: ["Non esiste una casella per 'scrivere' una giacenza: si corregge solo aggiungendo o correggendo movimenti."],
    faq: [
      { q: "Un CER che carico spesso non compare in giacenze.", a: "Compare solo se ha movimenti. Attiva 'Mostra tutti i CER' per vedere anche quelli a zero." },
      { q: "La giacenza è diversa da quella che ho contato in piazzale.", a: "La differenza è sempre un movimento mancante o duplicato: confronta i movimenti del periodo nella tab Impianto e correggi lì." },
      { q: "Posso scrivere io il saldo corretto?", a: "No, e non è un limite ma una garanzia: il saldo deriva dai movimenti, così il registro resta difendibile in caso di controllo." },
      { q: "Cosa fa esattamente 'Sync giacenze'?", a: "Ricalcola i saldi partendo da tutti i movimenti registrati e verifica che il risultato coincida: se cambia qualcosa, significa che c'era un disallineamento." },
    ],
    route: "/mn/admin/dev-multyproget?tab=magazzino-dev",
  },
  {
    id: "lavorazioni-interne",
    title: "Lavorazioni interne e cernite",
    subtitle: "Doppio binario: movimenti con documento e movimenti interni",
    image: "/tutorial/08-magazzino-dev.png",
    level: "Intermedio",
    minutes: 5,
    intro:
      "Non tutti i movimenti nascono da un formulario: quando il rifiuto resta dentro l'impianto e viene lavorato, il documento non serve.",
    explain: [
      "Movimenti esterni: il rifiuto entra o esce dall'impianto e serve sempre un FIR o un DDT.",
      "Movimenti interni (cernite, selezioni, trasformazioni): nessun FIR, si tracciano con il legame padre → figli.",
      "Nelle lavorazioni il calo peso è normale e viene registrato in automatico: input meno somma degli output.",
      "Gli output MPS vanno nel magazzino MPS, separato da quello dei rifiuti: il CER padre scende, i figli salgono.",
      "L'annullamento non cancella niente: crea movimenti compensativi inversi che riportano i saldi come prima.",
    ],
    steps: [
      "Apri Magazzino Dev → Cernita e scegli il CER padre: vedi subito la giacenza disponibile.",
      "Inserisci la quantità da lavorare e gli output (rifiuti e/o MPS), con eventuale codice lotto.",
      "Controlla il riquadro 'Calo peso': se il valore non ti torna, correggi le quantità di output.",
      "Conferma: registro, giacenze e lotti si aggiornano in un'unica operazione atomica.",
      "Per correggere, usa l'annullamento della lavorazione e ripeti: i saldi tornano automaticamente.",
    ],
    warnings: ["Non creare formulari fittizi per giustificare una cernita: la lavorazione è un movimento interno e non deve consumare numeri FIR."],
    faq: [
      { q: "Perché il totale degli output è minore dell'ingresso?", a: "È il calo di lavorazione (polveri, umidità, scarti dispersi): viene registrato come 'Calo peso' ed è previsto." },
      { q: "Devo caricare un FIR per la cernita?", a: "No. Il FIR serve solo quando il rifiuto entra o esce fisicamente dall'impianto." },
      { q: "Ho sbagliato le quantità, cancello la lavorazione?", a: "Non si cancella: si annulla. L'annullamento genera movimenti inversi e ripristina le giacenze, lasciando traccia." },
      { q: "Dove finisce il piombo ottenuto dalla cernita?", a: "Se è classificato MPS finisce nel magazzino MPS; se resta rifiuto va nel magazzino rifiuti con il suo CER." },
    ],
    route: "/mn/admin/dev-multyproget?tab=magazzino-dev",
  },
  {
    id: "test-sistema",
    title: "Test di Sistema",
    subtitle: "Verifiche reali con pulizia automatica dei dati",
    image: "/tutorial/08-magazzino-dev.png",
    level: "Avanzato",
    minutes: 4,
    intro:
      "Il pannello Test di Sistema non simula niente: esegue davvero carichi, cernite e formulari, controlla i risultati e poi cancella tutto quello che ha creato.",
    explain: [
      "Scenario 'cernite': carica 1000 kg, esegue una lavorazione 600 + 300 con calo 100 kg, crea i lotti, annulla e verifica il ripristino dei saldi.",
      "Scenario 'giacenze': carico, scarico, blocco di una lavorazione oltre la giacenza disponibile e coerenza registro/magazzino.",
      "Scenario 'fir': crea una bozza di test, verifica il blocco dei numeri duplicati e che nessun numero FIR reale venga consumato.",
      "Al termine ogni dato di test viene rimosso e i saldi prima/dopo vengono confrontati: se resta una differenza, il test è fallito.",
      "Puoi chiedere gli stessi test a Dark Lemon in chat, ad esempio 'testa le cernite'.",
    ],
    steps: [
      "Apri Magazzino Dev → Test di Sistema.",
      "Scegli lo scenario e avvia il test.",
      "Leggi il report passo-passo: ogni riga mostra il valore atteso e quello reale.",
      "Controlla l'ultima riga 'Sistema integro dopo il test': deve indicare nessuna differenza di giacenza.",
    ],
    warnings: ["I dati di test sono marcati (test_session, numeri FIR ZTEST…) e vengono eliminati in automatico: non vanno mai creati a mano in produzione."],
    faq: [
      { q: "I test sporcano le giacenze reali?", a: "No: alla fine tutti i movimenti creati vengono rimossi e il sistema confronta i saldi prima e dopo." },
      { q: "Il test è fallito, cosa faccio?", a: "Guarda la prima riga rossa del report: indica atteso e ottenuto, così si individua subito l'operazione che non ha funzionato." },
      { q: "Posso eseguirlo durante il lavoro?", a: "Sì, dura pochi secondi e non consuma numeri FIR, ma è preferibile in un momento di calma." },
    ],
    route: "/mn/admin/dev-multyproget?tab=magazzino-dev",
  },
  {
    id: "fatturazione",
    title: "Fatturazione (Mini-ERP)",
    subtitle: "Fatture di vendita, FatturaPA, noleggi",
    image: "/tutorial/16-fatturazione.png",
    level: "Avanzato",
    minutes: 6,
    intro:
      "Il modulo Fatturazione è un mini-ERP contabile isolato dal resto: gestisce fatture di vendita, anagrafiche clienti, piano dei conti, tabelle fiscali e prima nota.",
    explain: [
      "Le fatture si creano da zero con 'Nuova Fattura' oppure partendo dai formulari già chiusi: in questo caso righe, quantità e cliente vengono precompilati dal documento di trasporto.",
      "Il ciclo di stato è: Bozza → Cortesia → Inviata/Consegnata. La bozza è modificabile, la cortesia è il PDF da mandare al cliente in attesa dell'esito SDI.",
      "L'invio allo SDI avviene in formato FatturaPA (XML) tramite il provider collegato; l'esito torna in automatico e aggiorna lo stato.",
      "Le schede Piano dei Conti, Tabelle Fiscali e Prima Nota servono alla parte contabile: aliquote IVA, causali, registrazioni in partita doppia.",
      "I noleggi (es. cassoni) hanno una gestione dedicata e possono confluire come righe in fattura.",
      "Nell'app degli autisti la fatturazione non compare: è un'area riservata all'ufficio.",
    ],
    steps: [
      "Apri la tab Fatture Vendita e controlla i contatori in alto (totale, bozze, consegnate, importo).",
      "Verifica che il cliente esista in Anagrafiche, con P.IVA/CF e codice destinatario SDI corretti.",
      "Crea la fattura con 'Nuova Fattura' oppure generala dai formulari del periodo.",
      "Controlla righe, aliquote IVA e totali.",
      "Salva in bozza, genera il PDF di cortesia e invialo al cliente se serve.",
      "Invia allo SDI e segui l'esito nello stato della fattura.",
      "Registra l'incasso in Prima Nota quando arriva il pagamento.",
    ],
    fields: [
      { label: "Numero e data", desc: "Progressivo per anno; la data determina il periodo IVA." },
      { label: "Cliente", desc: "Preso dalle Anagrafiche: P.IVA, CF, PEC o codice destinatario SDI sono obbligatori per l'invio." },
      { label: "Righe", desc: "Descrizione, quantità, prezzo, aliquota IVA. Da formulario vengono compilate con CER e kg." },
      { label: "Stato", desc: "Bozza (modificabile), Cortesia (PDF inviato al cliente), Inviata/Consegnata (esito SDI)." },
    ],
    warnings: [
      "Una fattura inviata allo SDI non si modifica: serve nota di credito.",
      "Controlla sempre il codice destinatario prima dell'invio: è la causa più frequente di scarto.",
    ],
    faq: [
      { q: "Non trovo nessuna fattura.", a: "Il modulo parte vuoto per ogni società: verifica di essere nel contesto giusto (Multyproget o Niyol) in alto a sinistra." },
      { q: "Posso fatturare più formulari insieme?", a: "Sì: seleziona i formulari del periodo per lo stesso cliente e genera un'unica fattura con più righe." },
    ],
    route: "/mn/admin/dev-multyproget/fatturazione",
  },
  {
    id: "sibill",
    title: "Sibill: invio allo SDI",
    subtitle: "Il provider che porta le fatture all'Agenzia delle Entrate",
    image: "/tutorial/16-fatturazione.png",
    level: "Avanzato",
    minutes: 6,
    intro:
      "Sibill è il provider di fatturazione elettronica collegato al gestionale: prende la fattura creata qui dentro, la trasforma in XML FatturaPA e la trasmette allo SDI, riportando indietro gli esiti.",
    explain: [
      "Il flusso è: crei la fattura nel modulo Fatturazione → premi 'Invia a Sibill' → il gestionale genera l'XML FatturaPA → Sibill lo consegna allo SDI → gli esiti tornano automaticamente e aggiornano lo stato della fattura.",
      "Gli stati che vedrai sono: Bozza (solo nel gestionale), Inviata (presa in carico da Sibill), Consegnata (recapitata al cliente tramite SDI), Scartata (rifiutata: l'errore viene mostrato nel dettaglio fattura), Non recapitata (messa a disposizione nel cassetto fiscale del cliente).",
      "Gli esiti arrivano da soli tramite un canale di ritorno (webhook): non devi stare a ricaricare la pagina, ma un refresh dell'elenco aggiorna subito la situazione.",
      "Esiste una MODALITÀ SANDBOX (test): serve per provare l'intero ciclo senza inviare nulla di reale all'Agenzia delle Entrate. In sandbox le fatture non hanno valore fiscale e vanno usate solo per formazione o verifica.",
      "Prima del primo invio reale servono i dati del cedente completi: ragione sociale, P.IVA, regime fiscale, indirizzo, e per il cliente il codice destinatario a 7 caratteri oppure la PEC.",
      "Se una fattura viene scartata, non si 'ripara' allo SDI: si corregge nel gestionale e si reinvia. Se invece è già stata consegnata, l'unico rimedio è la nota di credito.",
      "La connessione a Sibill è configurata a livello di sistema con credenziali riservate: non vanno inserite nelle schermate operative né condivise con gli autisti.",
    ],
    steps: [
      "Controlla lo stato del collegamento a Sibill nel modulo Fatturazione (indicatore di connessione / modalità sandbox o produzione).",
      "Verifica l'anagrafica del cliente: P.IVA o CF, indirizzo completo, codice destinatario SDI (7 caratteri) oppure PEC.",
      "Apri la fattura in bozza e controlla righe, aliquote IVA, natura esenzione se prevista, e totali.",
      "Se è la prima volta, prova il ciclo in Sandbox: invia, osserva il cambio di stato, poi torna in produzione.",
      "Premi 'Invia a Sibill': la fattura passa a 'Inviata' e non è più modificabile.",
      "Attendi l'esito: 'Consegnata' o 'Non recapitata' significano trasmissione riuscita; 'Scartata' richiede correzione.",
      "In caso di scarto leggi il codice errore nel dettaglio, correggi il dato indicato (di solito codice destinatario o P.IVA) e reinvia.",
      "Scarica l'XML o il PDF di cortesia dalla fattura per conservazione o per inviarlo al cliente.",
    ],
    fields: [
      { label: "Modalità (Sandbox / Produzione)", desc: "Sandbox = prova senza valore fiscale. Produzione = invio reale allo SDI." },
      { label: "Codice destinatario", desc: "7 caratteri forniti dal cliente. Se il cliente non ne ha, si usa la PEC oppure il codice generico previsto per i privati." },
      { label: "Regime fiscale / Natura IVA", desc: "Obbligatori nell'XML: se l'operazione è esente o non imponibile va indicata la natura, altrimenti lo SDI scarta." },
      { label: "Stato SDI", desc: "Inviata, Consegnata, Non recapitata, Scartata. È l'esito che torna da Sibill, non uno stato scelto a mano." },
      { label: "Identificativo SDI", desc: "Numero di trasmissione che identifica la fattura presso l'Agenzia: serve per qualsiasi verifica." },
    ],
    warnings: [
      "Non inviare in produzione fatture di prova: sono documenti fiscali reali a tutti gli effetti.",
      "Una fattura inviata non è più modificabile: controlla importi e cliente PRIMA di premere invio.",
      "Se lo stato resta 'Inviata' a lungo, non reinviare a raffica: crei doppioni. Verifica prima l'esito nel dettaglio.",
      "Le credenziali del provider non vanno mai digitate nelle schermate operative né passate agli autisti.",
    ],
    faq: [
      { q: "Ho premuto invia ma lo stato non cambia.", a: "Aggiorna l'elenco fatture: gli esiti arrivano in automatico ma la schermata li mostra al refresh. Se dopo qualche minuto resta 'Inviata', apri il dettaglio e controlla l'identificativo di trasmissione." },
      { q: "La fattura è stata scartata: cosa faccio?", a: "Apri il dettaglio, leggi il codice errore, correggi il dato segnalato (quasi sempre codice destinatario, P.IVA o natura IVA) e reinvia. Lo scarto non genera un documento fiscale, quindi non serve nota di credito." },
      { q: "Come faccio le prove senza rischiare?", a: "Usa la modalità Sandbox: il ciclo è identico ma non viene trasmesso nulla di reale. È il modo corretto per formare una persona nuova." },
      { q: "Il cliente dice di non aver ricevuto la fattura.", a: "Se lo stato è 'Non recapitata' il documento è comunque valido ed è disponibile nel suo cassetto fiscale: inviagli il PDF di cortesia." },
    ],
    tip: "Regola pratica: la prima fattura del mese falla in sandbox se hai cambiato qualcosa nelle anagrafiche. Trenta secondi di prova evitano uno scarto.",
    route: "/mn/admin/dev-multyproget/fatturazione",
  },

  {
    id: "cernite-dragon",
    title: "Cernite Dragon",
    subtitle: "Trasformare un CER padre in più materiali tracciati",
    image: "/tutorial/08-magazzino-dev.png",
    level: "Avanzato",
    minutes: 6,
    intro:
      "La cernita è una lavorazione interna all'impianto: scarica i kg dal CER in ingresso e li distribuisce su uno o più CER o materiali in uscita, senza creare un nuovo FIR.",
    explain: [
      "La cernita usa il saldo del magazzino Dragon. Dopo aver scelto il CER padre, la finestra mostra chiaramente i kg Disponibili per cernita: è esattamente il valore controllato quando confermi.",
      "Ingresso e uscita usano lo stesso catalogo CER del nuovo conferimento. Puoi cercare per codice o descrizione e attivare l'intero catalogo europeo.",
      "Il salvataggio è atomico: scarico del padre, carichi dei figli, lotti e legami di rintracciabilità riescono tutti insieme oppure non viene scritto nulla.",
      "La somma degli output può essere minore dell'ingresso: la differenza è il calo peso. Non può mai superare i kg lavorati.",
      "Annullare non cancella lo storico: crea movimenti compensativi inversi e riporta le giacenze alla situazione precedente.",
    ],
    steps: [
      "Apri Magazzino Dev, scegli Cernita e premi Apri Cernita.",
      "Premi Nuova Cernita e seleziona il CER in ingresso.",
      "Leggi Disponibili per cernita e inserisci una quantità non superiore.",
      "Aggiungi gli articoli/CER in uscita e distribuisci i kg.",
      "Controlla il riepilogo e l'eventuale calo peso.",
      "Conferma e verifica che il CER padre diminuisca e i figli aumentino nelle Giacenze Dragon.",
      "Usa Lotti & Rintraccia per vedere il collegamento padre-figli.",
    ],
    fields: [
      { label: "Disponibili per cernita", desc: "Saldo WASTE Dragon realmente usato dal controllo di disponibilità." },
      { label: "Materiale in ingresso", desc: "CER padre che viene scaricato dal magazzino rifiuti." },
      { label: "Componenti in uscita", desc: "CER o materiali figli che vengono caricati nei rispettivi magazzini." },
      { label: "Calo peso", desc: "Differenza ammessa tra kg in ingresso e somma degli output." },
      { label: "Lotto", desc: "Codice facoltativo che permette di seguire la genealogia del materiale." },
    ],
    warnings: [
      "Non confermare se la disponibilità mostrata non coincide con la giacenza attesa: prima va allineato il movimento di origine.",
      "Gli output non possono superare l'ingresso e devono appartenere alla stessa azienda attiva.",
    ],
    faq: [
      { q: "Vedo migliaia di kg ma ricevo giacenza insufficiente.", a: "Guarda il badge Disponibili per cernita nella finestra: quello è il saldo Dragon validato. Se differisce dalla giacenza attesa, esegui il test Giacenze o chiedi a Dark Lemon di controllare e allineare i movimenti Dragon." },
      { q: "Serve un FIR per la cernita?", a: "No. È un movimento interno senza trasporto esterno; la tracciabilità è garantita dai movimenti e dal legame padre-figli." },
      { q: "Posso avere meno kg in uscita?", a: "Sì. La differenza viene registrata come calo peso; gli output non possono invece superare l'ingresso." },
      { q: "Come verifico che funzioni davvero?", a: "Nella tab Test di Sistema esegui Testa Cernite: crea una filiera reale, verifica saldi e lotti, annulla e ripulisce tutti i dati di test." },
    ],
    tip: "Prima di lavorare un lotto grande, prova 1 kg e verifica padre, figli e rintracciabilità; poi annulla la prova.",
    route: "/mn/admin/dev-multyproget/dragon/cernite/batch",
  },
  {
    id: "personale",
    title: "Personale e login app",
    subtitle: "Creare, modificare ed eliminare gli utenti autisti",
    image: "/tutorial/09-personale.png",
    level: "Intermedio",
    minutes: 4,
    intro:
      "Da qui crei, modifichi ed elimini i login degli autisti, decidendo a quale app assegnarli: Multyproget oppure Niyol.",
    explain: [
      "L'identificativo di login è il CODICE FISCALE: non serve un indirizzo email reale, il sistema ne gestisce uno interno.",
      "Disattiva l'autocompletamento del browser quando digiti il codice fiscale: Chrome tende a inserire dati di altri campi e l'utente viene creato sbagliato.",
      "Puoi cambiare la password, disattivare l'utente o spostarlo dall'app Multyproget a quella Niyol senza ricreare l'account.",
      "Ogni utente ha il proprio storico FIR, diviso tra bozze e inviati.",
    ],
    steps: [
      "Premi 'Nuovo utente' e inserisci nome, cognome e codice fiscale (senza autofill).",
      "Scegli l'app di destinazione: Multyproget o Niyol.",
      "Imposta la password iniziale e comunicala all'autista.",
      "Dal Centro App & FIR assegna i numeri FIR all'utente appena creato.",
      "Modifica password o disattiva l'utente quando serve.",
    ],
    warnings: ["Il codice fiscale è l'identificativo di login: verificalo carattere per carattere prima di salvare."],
    faq: [
      { q: "Errore quando creo un nuovo utente.", a: "Quasi sempre è il codice fiscale sbagliato inserito dall'autocompletamento del browser: cancella il campo, disattiva l'autofill e riscrivilo a mano." },
      { q: "L'autista ha dimenticato la password.", a: "Aprilo dall'elenco personale e imposta una nuova password: non serve ricreare l'account." },
      { q: "Devo spostare un autista da Multyproget a Niyol.", a: "Modifica l'app assegnata nella scheda utente: mantiene lo stesso login e il suo storico." },
      { q: "Se elimino un utente perdo i suoi formulari?", a: "No: i documenti restano nei registri. L'utente viene disattivato, i dati restano tracciati." },
    ],
    route: "/mn/admin/dev-multyproget?tab=personale",
  },
  {
    id: "centro-app",
    title: "Centro App & FIR",
    subtitle: "Assegnazione dei numeri agli autisti o all'ufficio",
    image: "/tutorial/11-centro-app-fir.png",
    level: "Intermedio",
    minutes: 3,
    intro:
      "Ogni numero FIR va assegnato manualmente: a un autista oppure contrassegnato come 'usato dall'ufficio'.",
    explain: [
      "Nessuna assegnazione automatica: il controllo di quale numero finisce a chi resta sempre tuo.",
      "Un dipendente può avere più numeri assegnati contemporaneamente: compaiono come chip, ognuno copiabile con un click.",
      "I numeri marcati 'ufficio' restano gestiti dall'admin e non compaiono nelle app.",
    ],
    steps: [
      "Seleziona il dipendente e assegna uno o più numeri FIR.",
      "Usa 'Assegna a ufficio' per i numeri gestiti dall'admin.",
      "Copia il numero con l'icona accanto al chip quando devi comunicarlo.",
      "Verifica nella Console RENTRI quali numeri risultano già assegnati.",
    ],
    faq: [
      { q: "Posso assegnare più numeri allo stesso autista?", a: "Sì: compaiono come chip separati sul suo profilo e li consuma uno alla volta." },
      { q: "A cosa serve 'Assegna a ufficio'?", a: "Serve per i numeri che usa direttamente l'admin: restano fuori dalle app degli autisti ma risultano comunque impegnati." },
      { q: "Ho assegnato un numero per sbaglio.", a: "Rimuovi l'assegnazione dal dipendente e riassegnalo: finché il formulario non è stato compilato il numero torna disponibile." },
      { q: "Perché non c'è un'assegnazione automatica?", a: "È stata disattivata di proposito: il numero FIR è un dato ufficiale e deve essere sempre una scelta consapevole dell'ufficio." },
    ],
    route: "/mn/admin/dev-multyproget/centro-app-fir",
  },
  {
    id: "rentri",
    title: "Console RENTRI",
    subtitle: "Bridge, numeri FIR, firme digitali",
    image: "/tutorial/10-rentri-console.png",
    level: "Avanzato",
    minutes: 5,
    intro:
      "La console mostra lo stato del ponte verso il RENTRI, i numeri FIR scaricati e i formulari in attesa di firma digitale.",
    explain: [
      "Il semaforo di stato indica se il bridge è raggiungibile: se è rosso, gli invii vanno in coda e vanno ripetuti dopo.",
      "I numeri FIR si scaricano dal RENTRI e poi si distribuiscono dal Centro App & FIR.",
      "I formulari in attesa di firma generano un badge arancione sulla campanella delle notifiche: è l'alert da controllare ogni mattina.",
      "La firma può richiedere una doppia sottoscrizione (partenza e accettazione a destino) a seconda del ruolo delle società coinvolte.",
    ],
    steps: [
      "Controlla il semaforo di stato del bridge.",
      "Scarica i numeri FIR e copiali con l'icona copia.",
      "Firma i formulari in attesa quando la campanella mostra il badge arancione.",
      "Verifica lo storico invii per identificativo transazione ed esito.",
    ],
    warnings: ["In caso di blocco temporaneo del RENTRI attendi prima di riprovare: i tentativi ravvicinati allungano il blocco."],
    faq: [
      { q: "Il semaforo del bridge è rosso: cosa faccio?", a: "Non insistere con gli invii: attendi qualche minuto e riprova. I tentativi ravvicinati possono allungare il blocco lato RENTRI." },
      { q: "Ho scaricato i numeri FIR ma gli autisti non li vedono.", a: "Scaricare non basta: i numeri vanno distribuiti dal Centro App & FIR, oppure marcati come 'ufficio' se li usa l'admin." },
      { q: "La campanella mostra il badge arancione ma non trovo i documenti.", a: "Il badge conta i formulari in attesa di firma: aprilo dalla campanella, ti porta direttamente all'elenco nella Console." },
      { q: "Un invio risulta fallito.", a: "Controlla lo storico invii: c'è l'identificativo transazione e l'esito. Correggi il dato segnalato e ripeti l'invio." },
    ],
    route: "/mn/admin/dev-multyproget/rentri-console",
  },
  {
    id: "dark-lemon",
    title: "Dark Lemon AI",
    subtitle: "L'assistente operativo che vede, controlla e corregge",
    image: "/tutorial/17-dark-lemon.png",
    level: "Avanzato",
    minutes: 8,
    intro:
      "Dark Lemon è l'assistente intelligente integrato nel gestionale: non è una semplice chat, è un agente che legge davvero i dati dell'azienda, controlla la coerenza di giacenze, formulari e conferimenti, e può eseguire azioni operative al posto tuo.",
    explain: [
      "Dove si trova: puoi aprirlo in tre modi. Il pulsante limone in alto a destra apre il widget fluttuante; l'icona a pannello apre la vista laterale affiancata al lavoro; nella Console RENTRI c'è una vista dedicata alle pratiche. È sempre lo stesso assistente, cambia solo la finestra.",
      "Cosa sa: Dark Lemon legge il database aziendale — giacenze, movimenti di magazzino, formulari, registri, conferimenti privati, ricevute, anagrafiche, fatture e stato RENTRI. Può quindi rispondere a domande come «quanti kg di 200140 ho oggi?» oppure «quali conferimenti di luglio non hanno movimento collegato?».",
      "Cosa vede: con il pulsante 📸 fa uno screenshot della schermata su cui stai lavorando e la analizza. Serve quando non sai spiegare a parole cosa non torna: gli mostri lo schermo e lui legge i campi.",
      "Cosa controlla: ha una diagnostica interna che verifica la coerenza del magazzino (saldi contro movimenti), le anomalie sui formulari e sui conferimenti privati, e ti segnala i casi sospetti prima che diventino un problema in ispezione.",
      "Cosa può fare: assegnare o cercare numeri FIR, interrogare l'anagrafica, ricalcolare e sincronizzare le giacenze, preparare correzioni sui dati, interagire con le pratiche RENTRI e compilare campi nei moduli. Ha anche l'autonomia di creare i dati mancanti (per esempio un CER o un'anagrafica assente) quando servono a sbloccare un'operazione che gli hai chiesto.",
      "Le operazioni delicate — in particolare le firme digitali RENTRI — richiedono che tu scriva esplicitamente CONFERMO: senza quella parola l'agente si ferma.",
      "Supervisione e Autopilot: la barra sotto la chat mostra in tempo reale cosa sta facendo. Con l'Autopilot spento l'agente procede a piccoli passi; acceso, può concatenare molte operazioni di fila per completare un compito lungo. Ogni azione resta tracciata in un registro di audit.",
      "Cronologia: tutte le conversazioni si conservano e sono divise per vista di origine (laterale, fluttuante, console RENTRI, pagina). Puoi cancellare le conversazioni una per una dal pulsante Cronologia.",
      "Limite invalicabile: Dark Lemon NON modifica il codice sorgente dell'applicazione. Se serve una funzione nuova, registra la richiesta come segnalazione allo sviluppo invece di improvvisare.",
    ],
    steps: [
      "Apri Dark Lemon con il pulsante limone in alto a destra (widget) oppure con l'icona pannello (vista laterale).",
      "Fai una domanda concreta sui dati, ad esempio: «Dammi la giacenza attuale di tutti i CER 200140».",
      "Se il problema è a schermo, premi 📸 per fargli analizzare la pagina che stai guardando.",
      "Chiedi un controllo di salute: «Verifica se le giacenze sono coerenti con i movimenti e segnalami le anomalie».",
      "Se propone una correzione, leggi cosa sta per fare e approva solo se sei d'accordo.",
      "Per le firme RENTRI scrivi CONFERMO quando te lo chiede: è la conferma obbligatoria.",
      "Attiva l'Autopilot solo per compiti lunghi e sorveglia la barra di supervisione.",
      "Apri Cronologia per rileggere una conversazione o eliminarla.",
    ],
    fields: [
      { label: "Pulsante 🍋 (widget)", desc: "Apre la chat fluttuante sopra la schermata di lavoro, spostabile." },
      { label: "Icona pannello", desc: "Apre Dark Lemon come colonna laterale, utile mentre compili un formulario." },
      { label: "📸 Screenshot", desc: "Cattura e invia all'assistente la schermata corrente per farla analizzare." },
      { label: "Cronologia", desc: "Elenco delle conversazioni con indicazione della vista di origine ed eliminazione singola." },
      { label: "Barra di supervisione", desc: "Mostra l'azione in corso e lo stato dell'agente: se è ferma, non sta facendo nulla." },
      { label: "Autopilot ON/OFF", desc: "Acceso permette catene lunghe di operazioni autonome; spento l'agente si ferma più spesso a chiedere." },
    ],
    warnings: [
      "Dark Lemon opera sui dati REALI dell'azienda: leggi sempre cosa propone prima di approvare una correzione.",
      "Le firme RENTRI non partono senza la parola CONFERMO: non scriverla se non sei sicuro del documento.",
      "Non chiedergli di modificare l'applicazione: non può farlo, registra solo la richiesta per lo sviluppo.",
      "Non incollargli password o credenziali: non servono e non vanno messe in chat.",
    ],
    faq: [
      { q: "Non risponde o resta in caricamento.", a: "Chiudi e riapri il widget e riprova con una domanda più corta. Se avevi allegato uno screenshot molto grande, riprova senza immagine: le catture vengono compresse ma una pagina enorme può rallentare la risposta." },
      { q: "Mi ha dato un numero di giacenza diverso da quello che vedo.", a: "Chiedigli di ricalcolare e sincronizzare le giacenze e di mostrarti i movimenti su cui si basa: il valore corretto è sempre quello che deriva dai movimenti." },
      { q: "Può inserire un conferimento al posto mio?", a: "Sì, può eseguire operazioni sui dati, ma la responsabilità della verifica resta tua: controlla sempre il risultato nella schermata corrispondente." },
      { q: "Le conversazioni restano salvate?", a: "Sì, con l'indicazione della vista da cui sono partite. Puoi eliminarle singolarmente dalla Cronologia." },
      { q: "Perché a volte chiede conferma e a volte no?", a: "Le operazioni di sola lettura e quelle reversibili procedono da sole; quelle irreversibili — firme, invii ufficiali — richiedono conferma esplicita." },
    ],
    tip: "Usalo come un collega esperto: più la domanda è precisa (CER, data, società), più la risposta è utile. «Controlla il 200140 CAVI dal 1 al 18 agosto» funziona molto meglio di «controlla il magazzino».",
    route: "/mn/admin/dev-multyproget?tab=impianto",
  },
];


const STORAGE_KEY = "mn-dev-tutorial-progress";

const LEVEL_STYLE: Record<Chapter["level"], string> = {
  Base: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  Intermedio: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
  Avanzato: "border-violet-500/40 bg-violet-500/10 text-violet-300",
};

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
  const totalMinutes = useMemo(() => CHAPTERS.reduce((a, c) => a + c.minutes, 0), []);

  const toggleStep = (i: number) =>
    setDone((d) => ({ ...d, [`${chapter.id}:${i}`]: !d[`${chapter.id}:${i}`] }));

  const goTo = (i: number) => {
    setIndex(i);
    setZoom(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
          <span>Avanzamento tutorial · percorso completo ~{totalMinutes} min</span>
          <span>{completed}/{CHAPTERS.length} capitoli · {progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
        {/* Sidebar capitoli */}
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {CHAPTERS.map((c, i) => {
            const cDone = c.steps.every((_, s) => done[`${c.id}:${s}`]);
            return (
              <button
                key={c.id}
                onClick={() => goTo(i)}
                className={`flex min-w-[190px] items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all lg:min-w-0 ${
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
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                Capitolo {index + 1} di {CHAPTERS.length}
              </p>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${LEVEL_STYLE[chapter.level]}`}>
                {chapter.level}
              </span>
              <span className="rounded-full border border-border/40 bg-secondary/30 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                ~{chapter.minutes} min
              </span>
            </div>
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

          {/* Spiegazione discorsiva */}
          <div className="rounded-xl border border-border/40 bg-card/60 p-5 backdrop-blur-xl">
            <h3 className="mb-3 text-sm font-display font-bold uppercase tracking-wider text-foreground">Come funziona</h3>
            <div className="space-y-3">
              {chapter.explain.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-foreground/85">{p}</p>
              ))}
            </div>
          </div>

          {/* Campi */}
          {chapter.fields && (
            <div className="rounded-xl border border-border/40 bg-card/60 p-5 backdrop-blur-xl">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-display font-bold uppercase tracking-wider text-foreground">
                <ListChecks size={15} className="text-cyan-400" /> I campi, uno per uno
              </h3>
              <dl className="grid gap-2 sm:grid-cols-2">
                {chapter.fields.map((f) => (
                  <div key={f.label} className="rounded-lg border border-border/40 bg-secondary/20 p-3">
                    <dt className="text-xs font-mono uppercase tracking-wider text-cyan-300">{f.label}</dt>
                    <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.desc}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Passi */}
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
                      <span><span className="mr-2 font-mono text-xs opacity-60">{i + 1}.</span>{s}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {chapter.warnings?.length ? (
              <div className="mt-4 space-y-2">
                {chapter.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-xs leading-relaxed text-red-300">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" /> <span>{w}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {chapter.tip && (
              <div className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-300">
                💡 {chapter.tip}
              </div>
            )}
            {chapter.route && (
              <Button className="mt-4 gap-2" onClick={() => navigate(chapter.route!)}>
                Provalo ora nel gestionale <ChevronRight size={15} />
              </Button>
            )}
          </div>

          {/* FAQ */}
          {chapter.faq && (
            <div className="rounded-xl border border-border/40 bg-card/60 p-5 backdrop-blur-xl">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-display font-bold uppercase tracking-wider text-foreground">
                <HelpCircle size={15} className="text-amber-400" /> Domande frequenti
              </h3>
              <div className="space-y-2">
                {chapter.faq.map((f) => (
                  <details key={f.q} className="rounded-lg border border-border/40 bg-secondary/20 p-3">
                    <summary className="cursor-pointer text-sm text-foreground">{f.q}</summary>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pb-6">
            <Button variant="ghost" disabled={index === 0} onClick={() => goTo(index - 1)} className="gap-1">
              <ChevronLeft size={16} /> Precedente
            </Button>
            {index < CHAPTERS.length - 1 ? (
              <Button onClick={() => goTo(index + 1)} className="gap-1">
                Prossimo capitolo <ChevronRight size={16} />
              </Button>
            ) : (
              <Button variant="outline" onClick={() => goTo(0)}>Ricomincia da capo</Button>
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
