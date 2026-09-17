# Guide Collaboratori/Ufficio e Dark Lemon operativo

## Obiettivo
Aggiornare le app Multyproget e Niyol, rendere Dark Lemon utilizzabile e coerente in ogni vista, e pubblicare due guide molto chiare con schermate reali e istruzioni passo-passo.

## 1. App collaboratori semplificata
- Rimuovere dalla barra e dai percorsi delle app collaboratori **Telefonate**, **Messaggi** e **Modulo alternativo**.
- Mantenere solo: FIR, Cronologia, GPS, Dark Lemon, Profilo e Guida.
- Sostituire la vecchia pagina AI separata con Dark Lemon e collegare il pulsante **AI** alla cronologia completa delle conversazioni.

## 2. Dark Lemon nelle app
- Fare in modo che il badge Dark Lemon apra davvero una finestra laterale adatta al telefono.
- Limitare Dark Lemon nelle app alla lettura e compilazione del formulario aperto: niente strumenti amministrativi, registri, utenti o altre modifiche aziendali.
- Conservare la lettura di fotografie/OCR e la proposta di compilazione, sempre con conferma prima di scrivere nei campi.
- Mostrare dalla voce **AI** la cronologia completa, comprese le conversazioni iniziate dal badge laterale.

## 3. Dark Lemon in console
- Correggere il comando **Vista schermo intero** della barra superiore perché apra la pagina Dark Lemon del contesto corrente.
- Rendere la cronologia sempre raggiungibile dalla barra, dalla finestra flottante, dal pannello laterale e dalla pagina completa.
- Condividere correttamente le conversazioni tra tutte le viste, con etichetta dell’origine.
- Aggiornare le istruzioni di Dark Lemon con le funzioni introdotte dal 16/09/2026: flussi FIR e RENTRI, chiusura destinatario, ricerca impianto per numero/CER, QR e PDF ufficiali, registri C/S e stati, intermediazione protetta, confronto elenchi, preferiti, app collaboratori e creazione dipendenti.
- In console, farlo rispondere come guida pratica per l’ufficio e usare gli strumenti reali quando autorizzato; nelle app, limitarlo rigorosamente al formulario.

## 4. Pagina `/guidacollaboratori`
- Creare una pagina pubblica, leggibile da telefono, con linguaggio molto semplice, frasi brevi, grandi numeri di passaggio e avvisi visivi.
- Spiegare: accesso, aggiornamento iniziale tramite logo, scelta del FIR, compilazione, controllo dati, emissione/firma partenza, QR ufficiale, viaggio, arrivo e comportamento quando firma il destinatario.
- Spiegare Dark Lemon: apertura dal badge, foto/OCR, controllo dei dati proposti, compilazione del formulario e cronologia.
- Inserire le cinque immagini allegate **nell’ordine ricevuto**: le prime quattro per installare la scorciatoia dal browser, la quinta per aggiornare la pagina toccando il logo.
- Aggiungere schermate aggiornate dell’app reale per le restanti istruzioni.

## 5. Pagina `/guidaufficio`
- Creare una pagina pubblica dettagliata con indice e schermate reali.
- Documentare tutte le novità dal 16/09/2026: stato e recupero FIR dal RENTRI, QR/PDF ufficiali, partenza e chiusura destinatario, ricerca impianto per numero e CER, registri C/S e vista totale, storico trasmessi fino al 31 luglio, intermediazione solo da FIR RENTRI verificati, confronto Excel senza effetti sulle giacenze, pulsantiera preferiti, Centro App & FIR, dipendenti e nuove app, Dark Lemon e OCR.
- Evidenziare chiaramente cosa è sola lettura, cosa richiede conferma e cosa non modifica mai giacenze o cernite.
- Ripetere la procedura app collaboratori con lo stesso livello di chiarezza della guida dedicata.

## 6. Guide e tutorial esistenti
- Aggiornare la guida mobile, la guida Dev Multy, il tutorial interattivo e i relativi testi pubblici.
- Eliminare ogni riferimento operativo a Telefonate, Messaggi e Modulo alternativo nelle app collaboratori.
- Correggere descrizioni obsolete su invii, stato FIR, giacenze, QR, PDF, Intermediazione e Dark Lemon.

## 7. Immagini e verifica
- Caricare le cinque immagini allegate come risorse dell’app, senza alterarne l’ordine.
- Catturare schermate reali aggiornate dei passaggi necessari e usarle nelle guide.
- Verificare `/guidacollaboratori` su telefono e `/guidaufficio` su desktop e telefono.
- Eseguire `node scripts/verify.mjs --smoke`.
- Fare snapshot prima/dopo di giacenze, cernite e movimenti nascosti; questo lavoro non deve modificarli.

## Vincoli
- Nessun invio RENTRI reale durante sviluppo o verifica.
- Nessuna modifica a giacenze, cernite, registro storico o movimenti operativi.
- Gli invii errati nel registro d’intermediazione restano intoccabili; il blocco che accetta solo origine `rentri_intermediario` non viene rimosso.
- La guida descriverà solo funzioni effettivamente presenti e verificate.
