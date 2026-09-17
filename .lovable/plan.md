# Affidabilità operativa: sistema fail-closed

## Obiettivo

Dark Lemon e le funzioni operative non devono più dipendere dalla memoria della conversazione o dall'interpretazione dell'AI. In caso di contesto mancante, dati discordanti, prova non aggiornata o stato non verificato, il sistema si ferma senza scrivere e senza dichiarare successo.

Durante tutto il lavoro: nessuna modifica a giacenze, cernite, FIR, registri o dati storici; nessun invio RENTRI reale.

## Problemi strutturali già individuati

- La memoria di Dark Lemon carica solo gli ultimi 10 ricordi, senza versione, priorità, tenant, validità o controllo delle contraddizioni.
- Se il contesto tenant è assente o errato esiste un ripiego automatico: comportamento incompatibile con l'isolamento richiesto.
- Il prompt contiene istruzioni contraddittorie: da una parte chiede conferma, dall'altra autorizza dati inventati, esecuzione forzata e prosecuzione senza fermarsi.
- Autopilot è attivabile dal browser e può concatenare strumenti operativi.
- Esistono strumenti generici di scrittura e percorsi diretti che aggirano le regole specifiche.
- Un tool senza errore viene considerato “successo”, anche se non è stata verificata la conseguenza reale sul sistema ufficiale.
- Le attività recenti sono conservate solo nella memoria temporanea del browser e si perdono.
- Documenti e prompt storici contengono regole superate e incompatibili con le decisioni più recenti.

## Fase 0 — Blocco immediato e non aggirabile

- Impostare Dark Lemon in **sola lettura operativa** lato funzione, non solo nell'interfaccia.
- Bloccare server-side tutti gli strumenti che creano, aggiornano, consolidano, annullano o inviano dati operativi.
- Disattivare Autopilot operativo e rimuovere qualunque modalità “inventa/procedi comunque”.
- Eliminare il tenant di ripiego: senza tenant esplicito, valido e coerente con la sessione la richiesta termina con STOP.
- Mantenere disponibili solo letture, diagnosi e preparazione di bozze locali non salvate.

## Fase 1 — Registro canonico delle regole

Creare un manifesto versionato, letto a ogni richiesta, con:

- tenant e area a cui si applica;
- fonte autorevole per ogni dato;
- operazioni consentite e vietate;
- conferme richieste;
- precondizioni e verifiche finali;
- data di validità, versione e motivo della modifica;
- precedenza esplicita tra regole e rilevamento automatico dei conflitti.

Le conversazioni e i ricordi restano consultabili, ma non possono autorizzare operazioni. Una regola contraddittoria o non versionata produce STOP.

## Fase 2 — Pacchetto di contesto obbligatorio

Ogni richiesta operativa deve portare un pacchetto verificato con:

- utente autenticato e ruolo letto dal sistema;
- tenant esatto, senza fallback;
- pagina e funzione corrente;
- oggetto coinvolto e identificativo ufficiale;
- fonte dei dati e istante della lettura fresca;
- versione del manifesto applicato;
- intenzione esplicita: leggere, preparare oppure eseguire.

Se manca un campo o non coincide con la sessione, nessuno strumento operativo viene esposto all'AI.

## Fase 3 — Contratto unico per ogni operazione

Ogni azione sensibile passa da un solo esecutore centrale e segue obbligatoriamente:

1. snapshot prima;
2. validazione tenant, permessi e regola applicabile;
3. controllo conflitti e idempotenza;
4. anteprima esatta dell'effetto;
5. conferma umana riferita a quella specifica anteprima;
6. esecuzione atomica;
7. rilettura dalla fonte autorevole;
8. confronto prima/dopo con invarianti;
9. esito `VERIFICATO`, `FALLITO` oppure `IN VERIFICA` — mai successo presunto.

La conferma scade se cambia qualsiasi dato dello snapshot. HTTP 202, presenza del FIR, QR, log locale o risposta senza errore non sono prove finali.

## Fase 4 — Invarianti non negoziabili

- **FIR RENTRI:** “partito” solo se la rilettura RENTRI restituisce lo stato ufficiale previsto e la data di emissione; “chiuso” solo con accettazione ufficiale verificata.
- **Cernite:** registro, scarico input e carichi output devono nascere nella stessa transazione; effetto giacenza dalla data/ora reale di registrazione, mentre la data lavorazione resta documentale.
- **Giacenze:** nessun ricalcolo retroattivo e nessun riallineamento automatico; il saldo cambia solo per il movimento successivo realmente registrato.
- **Intermediazione:** solo dati letti dal RENTRI con ruolo intermediario verificato e origine autorizzata.
- **Tenant:** ogni lettura e scrittura deve avere tenant esplicito e coerente; nessuna unione implicita Multy/Niyol.
- **Storico:** nessun aggiornamento o cancellazione fisica; solo operazioni compensative autorizzate e tracciate.

## Fase 5 — Registro prove persistente

Per ogni tentativo, anche bloccato, conservare:

- chi ha chiesto cosa e su quale tenant;
- versione delle regole;
- snapshot prima e dopo;
- fonte e ora delle letture;
- conferma associata;
- strumenti eseguiti;
- risultato delle invarianti;
- motivazione dello STOP o prova dell'esito.

Dark Lemon deve rispondere citando queste prove. Se non esiste una prova fresca, deve dire “non verificato” e fermarsi.

## Fase 6 — Bonifica e riapertura controllata

- Censire tutti i percorsi che scrivono FIR, RENTRI, registri, cernite e giacenze, inclusi percorsi duplicati e funzioni storiche.
- Eliminare o bloccare i bypass generici.
- Segnalare regole obsolete e contraddittorie senza modificare dati operativi.
- Aggiungere test di contratto che provano soprattutto i rifiuti: tenant mancante, memoria discordante, snapshot scaduto, doppio invio, 202, stato RENTRI non finale, cernita parziale, retrodatazione.
- Riaprire una sola area alla volta, esclusivamente dopo referto, prove prima/dopo e autorizzazione esplicita dell'utente.

## Criteri di accettazione

- Con contesto assente o contraddittorio, ogni scrittura è tecnicamente impossibile.
- Dark Lemon non può inventare dati operativi, scegliere un tenant o superare una conferma.
- Nessun messaggio può dire “eseguito”, “partito”, “chiuso” o “aggiornato” senza prova post-operazione dalla fonte autorevole.
- Una cernita retrodatata non modifica saldi storici precedenti alla sua registrazione reale.
- Un errore a metà non lascia alcun effetto operativo.
- Ogni risultato è riproducibile da un referto con fonte, orario, snapshot e regola applicata.

## Ordine di esecuzione

1. Applicare il blocco totale di Fase 0.
2. Produrre il censimento completo e il referto delle contraddizioni.
3. Implementare manifesto, contesto obbligatorio e registro prove.
4. Centralizzare un'area alla volta iniziando da giacenze/cernite, poi FIR/RENTRI.
5. Verificare in sola lettura e con test isolati; nessun test su dati reali.
6. Chiedere autorizzazione separata prima di riaprire ciascuna area operativa.
