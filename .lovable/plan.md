# RENTRI che funziona come un orologio — Multy e Niyol

Regola che resta valida sopra a tutto: **al RENTRI va solo ciò che è certificato**. Un movimento entra nel registro RENTRI solo quando è effettivo (peso certificato: firma del destinatario nel digitale, conferma manuale nel cartaceo, pesa in impianto per i privati).

**Vincolo sui dati esistenti.** Nessun dato storico già consolidato viene modificato: giacenze pregresse, movimenti storici, formulari già emessi, registro privati, ricevute privati restano come sono. Le modifiche valgono solo per i nuovi formulari e per i nuovi passaggi automatici.

**Regola sulle giacenze.** Le giacenze sono modificabili solo da quattro eventi autorizzati: conferimento privato effettivo, cernita effettiva, chiusura reale del formulario digitale, chiusura manuale del formulario cartaceo. Tutti e quattro passano dallo stesso punto unico di aggiornamento, idempotente e tracciato. Nessun altro evento tocca i saldi: non l'apertura del formulario, non la firma di partenza, non i salvataggi provvisori, non le sincronizzazioni intermedie, non l'import dal RENTRI, non lavorazioni automatiche separate, non percorsi duplicati fra ufficio, app autista e impianto. **Qualunque aggiornamento di giacenza fuori da questo percorso è da considerarsi un bug.**

**Tracciamento obbligatorio.** Ogni aggiornamento di giacenza salva almeno: tipo evento (privato, cernita, fir digitale, fir cartaceo), documento o movimento di origine, azienda, CER, quantità, valore prima, valore dopo, data e ora, utente o processo che ha eseguito l'operazione. Se la traccia non si può scrivere, l'aggiornamento non parte.

## Cosa risulta oggi, letto ora dal database

- Il ponte verso il RENTRI risponde: 1.164 letture dell'elenco formulari Multy, l'ultima stamattina alle 05:14, quasi tutte riuscite.
- **Gli invii di formulari non sono mai riusciti**: 12 tentativi di emissione, 0 andati a buon fine. Il RENTRI ha risposto che numero formulario, codice fiscale del produttore, codice fiscale del destinatario e stato fisico non sono nel formato che si aspetta.
- **Niyol non ha mai parlato con il RENTRI**: tutte le operazioni registrate sono di Multy (più 2 tentativi Global respinti con "cliente non supportato").
- **Nessun invio di registro carico/scarico è mai partito**: l'archivio degli invii registri è vuoto. Esistono solo i 359 invii dei privati fatti da terminale.
- La lista dei movimenti candidati all'invio **non filtra i movimenti effettivi** e non esclude quelli già inviati: così com'è potrebbe mandare al RENTRI cose non certificate o doppie.
- I formulari scaricati dal RENTRI si possono vedere e firmare, ma non vengono importati in archivio; e l'accettazione scrive il movimento solo per Multy, mai per Niyol.
- Nessun controllo automatico ripassa a verificare gli invii rimasti "in attesa", e la coda dei tentativi falliti si svuota solo a mano.
- Il blocco temporaneo del RENTRI (errore 423) non è gestito da nessuna parte: oggi appare come errore generico.
- Esistono ancora percorsi diversi che portano a risultati diversi fra chiusura del formulario, movimento d'impianto, registro e giacenze: vanno ridotti a un solo flusso, stessa azione stesso risultato.

## Cosa sistemo, in ordine

**1. Far passare il primo invio vero (la priorità assoluta).**
Correggo il formato dei dati che il RENTRI ha respinto: numero del formulario con il blocco e le sei cifre, codici fiscali ripuliti e validati, stato fisico preso dai codici ufficiali. Prima dell'invio una verifica a video elenca in italiano cosa manca, così l'invio parte solo quando è completo. Poi provo per davvero un invio e mostro la risposta del RENTRI.

**2. Niyol allo stesso livello di Multy.**
Niyol opera come trasportatore: gli do il suo registro di trasporto, il suo codice fiscale, la sua unità locale e i suoi parametri RENTRI in ogni passaggio in cui è soggetto attivo. Ogni schermata mostra sempre con quale azienda sta operando.

**3. Invio del registro carico/scarico, senza doppioni.**
I movimenti candidati diventano solo quelli effettivi, escludendo automaticamente quelli già inviati. Ogni invio viene archiviato con numero di transazione ed esito, e una verifica ricontrolla poco dopo se il RENTRI lo ha davvero acquisito. Se qualcosa viene scartato, appare il motivo in italiano e il movimento resta in coda, mai perso.

**4. Pesca dei formulari dal RENTRI.**
Un pulsante scarica i formulari del periodo scelto per Multy e per Niyol e li porta in archivio: quelli già presenti vengono riconosciuti e aggiornati, quelli nuovi entrano come documenti da lavorare. Le differenze tra quello che c'è da noi e quello che c'è sul RENTRI vengono elencate, mai corrette da sole.

**5. Quando il RENTRI non risponde.**
Blocco temporaneo, linea giù, lentezza: messaggi chiari, attesa automatica prima di riprovare, e il lavoro continua in locale. Resta sempre disponibile il cartaceo. Nessun dato si perde e nessun invio parte due volte.

**6. App autisti Multy e Niyol operative.**
L'autista sceglie con quale azienda opera, apre il formulario assegnato, lo compila con tutte le tendine, e firma solo se le parti obbligatorie sono complete. Il destinatario vede il formulario, inserisce il peso riscontrato e l'esito, e con la sua firma il formulario si chiude. Solo attraverso il punto unico giacenze vengono aggiornati movimento, registro e giacenze. I formulari cartacei restano con il pulsante di conferma manuale.

**7. L'ufficio comanda le app degli autisti, in tempo reale.**
Dalla postazione dell'ufficio si vede l'elenco degli autisti in servizio e il formulario che ciascuno ha aperto. L'ufficio può compilare il formulario al posto dell'autista, correggerlo mentre lui lo sta guardando, assegnargliene un altro, bloccarlo o sbloccarlo. Le modifiche compaiono sul telefono dell'autista entro pochi secondi, senza che debba ricaricare nulla, e ogni intervento resta tracciato con nome e ora. Quando l'autista ha già firmato, l'ufficio non può più cambiare il formulario: può solo annullarlo e rifarlo, così la firma resta valida.

**8. Assegnazione libera dei formulari e uso d'ufficio.**
Nessun limite al numero di formulari assegnabili a un autista: si assegnano quanti se ne vuole, in blocco o uno per uno, e si possono togliere e ridare a un altro finché non sono firmati. La segretaria può compilare e usare il formulario direttamente dall'ufficio, anche per una ditta esterna che si presenta a caricare da Multyproget: sceglie il trasportatore, compila i dati, stampa o firma, senza passare da un'app autista. Lo stesso formulario può essere preparato in anticipo e ripreso al momento del carico. Chi ha fatto cosa resta sempre scritto.

**9. Formulari altrui dove Multyproget è produttore.**
Quando arriva qualcuno con un formulario suo, dalla console si cercano sul RENTRI i formulari in cui Multyproget compare come produttore e si vede subito quello giusto, con tutti i dati e lo stato. Sola lettura dal RENTRI: si può importarlo in archivio per lavorarlo, mai modificarlo da noi.

**10. Controllo su strada: QR code reale.**
Sul telefono dell'autista un pulsante ben visibile apre la schermata di controllo con il QR code del formulario in corso. Vigili o polizia lo inquadrano e aprono una pagina pubblica di sola lettura con i dati del formulario: numero, data, produttore, destinatario, trasportatore, targhe, codice CER, descrizione del rifiuto, peso, firme presenti e stato. Nessun dato riservato, nessuna possibilità di modifica. La schermata funziona anche con poco segnale perché mostra comunque i dati già scaricati, e il QR resta leggibile a schermo luminoso.

**11. Una sola schermata di controllo.**
In console RENTRI: stato del collegamento, numeri disponibili, invii in attesa, invii respinti con motivo, formulari da firmare, autisti in viaggio, ultimo aggiornamento. Tutto in un colpo d'occhio, così ci si accorge subito se qualcosa si è fermato.

## Cosa non tocco

Giacenze pregresse, storico già consolidato, archivio dei 359 invii privati già fatti da terminale, ricevute privati, movimenti già chiusi e formulari già emessi. Nessun ricalcolo dello storico.

## Dettagli tecnici

- **Payload FIR**: correzione in `src/lib/rentriFormMapper.ts` e `src/lib/rentriFirPayloadFromStore.ts` — `numero_fir` normalizzato (blocco + 6 cifre), CF normalizzati/validati (11 o 16 caratteri), `stato_fisico` mappato sui codici della codifica RENTRI. Validazione pre-invio riusabile con messaggi in italiano su `model_state`.
- **Niyol**: `RENTRI_REGISTRI.niyol = RTR31497PX0`, CF `09879800010`, unità `OP2501SXW021767-TO0001` già presenti in `rentriVpsApi.ts` e `handler.ts`; estendere `IMPIANTO_DESTINO` in `RentriFirDaFirmarePanel.tsx` e i punti dove `cliente` è forzato a `multy`.
- **Registro**: `caricaMovimentiCandidati` in `src/lib/rentriRegistroSync.ts` filtra `coalesce(stato_movimento,'effettivo')='effettivo'` ed esclude gli id già presenti in `rentri_invii_registri.movimenti`; `aggiornaStatoInvio` usa la stessa logica di verifica di `inviaMovimentiRegistroVerificato` (polling transazione + riconoscimento esiti) invece dell'esito binario attuale.
- **Pesca FIR**: nuova funzione di import su `elencoFormulariRentri` + `dettaglioFormularioRentri`, upsert idempotente in `fir_forms` per `numero_fir` + tenant, differenze elencate in sola lettura. Nessuna scrittura su `movimenti_impianto` se non alla firma del destinatario.
- **423 / offline**: gestione esplicita in `supabase/functions/rentri-vps-proxy/handler.ts` (`errorCodeForStatus` + backoff con `retry_after_ms`) e messaggio dedicato in `src/lib/rentriErrorMessages.ts`; la coda `RentriRetryQueue` riprova automaticamente allo scadere dell'attesa.
- **Ufficio ↔ app in tempo reale**: `fir_forms` già condiviso; canale Realtime per `fir_forms` filtrato su tenant/autista, con sottoscrizione montata e smontata nel ciclo di vita del componente in `MNFIRFormComplete.tsx` e nella vista ufficio; scrittura lato ufficio bloccata quando `stato` è firmato/inviato; ogni intervento registrato con autore e ora nel diario del formulario.
- **QR code di controllo**: pagina pubblica in sola lettura `/fir/controllo/:token` con token opaco per formulario (non indovinabile, revocabile alla chiusura), lettura via RPC `SECURITY DEFINER` che restituisce solo i campi da esibire; QR generato lato app dal token, senza dati personali dentro il codice.
- **Assegnazione e uso d'ufficio**: `fir_number_pool` + `fir_forms` già supportano assegnazione e riassegnazione (`admin_set_fir_number`, `reassign_fir_number`, `release_fir_number`); estendere con assegnazione multipla a un autista e riassegnazione consentita solo su `status='bozza'`. La compilazione d'ufficio riusa `MNFIRFormComplete` senza vincolo di `user_id` autista, con trasportatore selezionabile anche fuori Multy/Niyol.
- **Formulari di terzi con Multyproget produttore**: ricerca RENTRI su `elencoFormulariRentri` con `identificativo_soggetto` del produttore Multy, dettaglio in sola lettura e import facoltativo nello stesso percorso idempotente della pesca FIR.
- **Punto unico giacenze**: conferimenti privati, cernite, chiusura digitale e pulsante cartaceo passano tutti da `applica_movimento_giacenza`, idempotente su documento+CER+segno, che scrive il movimento effettivo e lascia traccia in `giacenze_audit_log` (tipo evento, documento, azienda, CER, quantità, prima, dopo, ora, attore). Se il log non si scrive, la transazione non va a buon fine. Nessun backfill, nessun ricalcolo dello storico.
- **Tracciamento**: ogni operazione continua ad andare in `rentri_operazioni`; gli invii registro in `rentri_invii_registri`, i privati in `rentri_invii_privati` (invariati), tenuti distinti fra formulari, registri e privati.
- **Verifica a ogni passo**: `node scripts/verify.mjs --smoke`, conteggio e totale giacenze letti prima e dopo (incluse le righe nascoste), screenshot reale della console RENTRI e della schermata Giacenze, e per gli invii la risposta del RENTRI mostrata integralmente — nessuna affermazione senza prova appena letta.

## Criterio finale di accettazione

Il lavoro è concluso solo dopo una prova reale completa su un formulario nuovo: apertura, compilazione, firma di partenza, arrivo a destino, peso reale inserito, firma del destinatario, chiusura, creazione del movimento, aggiornamento del registro, aggiornamento delle giacenze, verifica finale coerente. Con prove lette al momento: risposta integrale del RENTRI, stato finale del formulario, conteggio e totale giacenze prima e dopo, screenshot reale della console e della schermata Giacenze.
