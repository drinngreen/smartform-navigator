# App autisti operative: formulario completo, firma, chiusura a destino, giacenze

Nessun dato esistente viene modificato: non si toccano giacenze, cernite, registro privati, ricevute privati, movimenti o formulari già emessi. Si interviene solo sul funzionamento delle schermate e sui passaggi automatici dei formulari nuovi.

## Stato attuale verificato (letto ora nel codice)

- Le due app autista (Multyproget e Niyol) sono due pagine separate, identiche tranne il tenant fisso: l'autista non può scegliere per chi sta lavorando, decide l'indirizzo con cui apre l'app.
- Il formulario usato è quello standard completo; il "modulo alternativo" è un componente separato e non è collegato alle app autista. Il selettore digitale/cartaceo è già forzato su digitale nelle app autista.
- I controlli prima della firma verificano oggi: targa, codice rifiuto, produttore, destinatario, trasportatore, conducente, stato fisico, unità di misura, quantità > 0.
- La firma di partenza porta il formulario in stato "inviato" e lo manda a RENTRI.
- La chiusura a destino fatta dall'autista mette il formulario su "completato" ma **non** aggiorna registro e giacenze.
- La schermata "Impianto — Destinatario" chiude il formulario e crea il movimento d'impianto, ma **non** aggiorna il registro generale in modo coerente.
- L'aggiornamento di registro e giacenze avviene solo da un pulsante amministrativo ("salvataggio definitivo"), quindi oggi i due percorsi danno risultati diversi.
- Tendine presenti oggi: operazione R/D, stato fisico, provenienza, aspetto esteriore, accettazione, codice CER, caratteristiche di pericolo, più i selettori anagrafica. Restano campi liberi: unità di misura, tipo di imballaggio, numero colli, trasporto sottoposto/non sottoposto, ADR, percorso, destinatario secondario, conducente.

## Cosa faremo

### 1. Una sola app autista con scelta della società
- L'autista, entrando, sceglie **Multyproget** o **Niyol**: la scelta resta memorizzata sul telefono ed è cambiabile in alto, sempre visibile.
- In base alla scelta cambiano società emittente, registro, numerazione del formulario e canale di invio; l'intestazione cambia colore e nome per evitare errori.
- Restano funzionanti i vecchi indirizzi delle due app: chi li apre trova la società già selezionata.

### 2. Formulario completo, tutte le tendine
- Resta il modulo standard (mai l'alternativo) e resta forzato digitale.
- Diventano tendine anche: unità di misura, tipo di imballaggio, trasporto sottoposto/non sottoposto a normativa, classi ADR, operazione di recupero/smaltimento del destinatario secondario, conducente (dall'elenco autisti della società, con possibilità di scrivere a mano), trasportatore e destinatario dall'anagrafica.
- Dove esiste già un elenco ufficiale (codici R/D, stati fisici, ADR, unità di misura) la tendina usa quello, senza testo libero.

### 3. Paletti prima della firma
Il formulario non si firma se manca anche uno solo di: produttore (denominazione, codice fiscale, indirizzo), destinatario (denominazione, codice fiscale, indirizzo, autorizzazione, operazione R/D), trasportatore e sua iscrizione albo, conducente, targa, codice CER valido, descrizione rifiuto, stato fisico, quantità > 0, unità di misura, caratteristiche di pericolo se rifiuto pericoloso, data e ora di partenza. L'elenco dei campi mancanti compare a schermo, con il campo evidenziato.

### 4. Chiusura a destino e giacenze — la parte centrale
Regola unica: **le giacenze si muovono solo alla chiusura, mai alla firma.**

- **Multyproget è partenza (produttore):** alla firma nessun movimento. Quando il destinatario chiude il formulario con il peso reale, il formulario risulta chiuso anche qui e la giacenza scarica il CER con il peso confermato o rettificato.
- **Multyproget è arrivo (destinatario):** il formulario in viaggio compare nella schermata impianto; all'inserimento del peso si chiude il formulario e la giacenza carica **in automatico** il CER letto dal formulario, senza ridigitare nulla.
- **Formulario cartaceo o portato da terzi:** gli operatori lo caricano e hanno un pulsante **"Chiudi formulario e aggiorna giacenze"**, da premere quando il destinatario conferma o rettifica il peso; prima di allora nessun movimento.
- Ogni chiusura, da qualsiasi percorso, passa per la stessa procedura unica: registro generale e giacenze aggiornati allo stesso modo, senza doppioni (la procedura è già idempotente).

### 5. Vedere lo stato dal programma
- Elenco unico dei formulari con stato ben visibile: bozza, firmato/in viaggio, chiuso, con peso di partenza e peso a destino, differenza e data di chiusura.
- Semaforo in app autista coerente: diventa "chiuso" solo quando il destinatario ha chiuso davvero.
- Riquadro "In attesa di chiusura" per gli operatori Multyproget, con i formulari fermi da più di 48 ore.

### 6. RENTRI: passaggio graduale alle API ufficiali
- Firma di partenza, chiusura a destino e invio dei movimenti di registro passano da un unico punto di accesso, con interruttore per società: **bridge attuale** oppure **API RENTRI dirette**.
- Si parte con Niyol (volumi minori) in API dirette, Multyproget resta sul canale attuale finché la prima non ha funzionato per alcuni giorni.
- Ogni chiamata viene registrata (data, esito, identificativo transazione e ricevuta) e in caso di errore il formulario **non** cambia stato: resta in coda con l'errore leggibile e un pulsante "riprova".
- Prima delle prove reali: una prova in bianco per società che verifica le credenziali senza inviare nulla.

## Dettagli tecnici

- Nuovo store `mnDriverCompanyStore` (persistito) + pagina unica `/mn/app` che monta `MNFIRFormComplete` con tenant/contesto dinamici; `MNMultyprogetAppPage` e `MNNiyolAppPage` diventano wrapper che preimpostano la società.
- `validateDeparture` esteso e restituzione dei nomi campo per l'evidenziazione; nuovo modulo `src/lib/firRequiredFields.ts` con l'elenco unico usato sia dall'app sia dalla console.
- Tendine: nuove costanti in `src/data/` (unità di misura, imballaggi, ADR) e riuso di `codiciRecuperoSmaltimento.ts`; conducente da `cliente_conducenti`/`profiles` della società attiva.
- Chiusura: `handleConfirmClosure` e `MNImpiantoDestinatarioPage.handleSave` chiamano entrambi `syncFirFinalToRegistryAndInventory` dopo l'update di stato, con `registryMovementType` derivato dal ruolo (CF Multy produttore → Scarico, destinatario → Carico) e quantità = peso a destino se presente.
- Nuovo pulsante "Chiudi formulario e aggiorna giacenze" nella lista formulari admin (Centro App FIR), abilitato solo su formulari non ancora chiusi, con conferma e campo peso confermato/rettificato.
- Nessun trigger nuovo sul database; nessuna migrazione sui dati. Eventuale unica migrazione strutturale: colonna `peso_destino`/`chiuso_da` su `fir_forms` se assente (verifica prima, con GRANT e RLS invariati per il resto).
- RENTRI: `src/services/rentriApi.ts` riceve un selettore di canale per società (`bridge` | `api`), con log in `rentri_logs`; nessuna modifica ai flussi privati già archiviati.
- Verifica a ogni passo: `node scripts/verify.mjs --smoke`, più screenshot reale della schermata toccata e rilettura del conteggio giacenze prima/dopo per dimostrare che nulla si è mosso.

## Ordine di lavoro

1. App unica con selettore società + tendine complete + paletti alla firma.
2. Chiusura unificata (autista, impianto, pulsante manuale) con giacenze solo alla chiusura.
3. Visibilità stati e riquadro "in attesa di chiusura".
4. Passaggio graduale alle API RENTRI, partendo da Niyol, con prova in bianco.
