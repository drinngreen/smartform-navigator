
# Piano di Risoluzione: Problemi Critici App e Dashboard

## Problemi Identificati

### 1. GPS Flotta NON traccia automaticamente e admin non vede nulla
- Le app registrano GPS solo con `console.log` (nessun salvataggio in database)
- Non esiste una tabella `driver_locations` per salvare le posizioni
- La pagina admin `/admin/gps` non esiste (nessun file corrispondente)
- I trasportatori devono essere tracciati in automatico quando hanno un FIR attivo

### 2. Icone Dashboard: zoom esce dal riquadro LED
- Le icone con `hover:scale-125` escono dal loro contenitore LED
- Il riquadro LED deve rimanere fermo, solo il contenuto interno deve zoomare
- Soluzione: aggiungere `overflow-hidden` al contenitore dell'icona

### 3. I FIR non si salvano correttamente
- `closeFIR` usa `.maybeSingle()` che puo' restituire `null` senza errore quando RLS blocca
- L'autosave puo' fallire silenziosamente senza feedback
- Il salvataggio bozza chiama `resetForm()` che cancella tutto prima che l'utente veda conferma

### 4. Cronologia scompare
- La query filtra per `deleted_by_user = false` ma non c'e' gestione errori
- Se l'utente non e' autenticato la query fallisce silenziosamente
- Il pulsante Elimina nella cronologia non ha un handler collegato (il bottone Trash2 non fa nulla)

### 5. AI risponde con stringhe JSON invece di linguaggio naturale
- L'edge function forza `response_format: { type: "json_object" }` su OpenRouter
- Il modello e' obbligato a rispondere SEMPRE in JSON
- Il frontend prova a estrarre `parsed.message` ma se il modello usa chiavi diverse, mostra il JSON grezzo
- Soluzione: rimuovere il vincolo `response_format` e gestire risposte miste (testo + JSON opzionale)

### 6. App non ritorna al punto lasciato dopo chiusura/riapertura
- Lo store Zustand persiste `editingFirId` e `workflowStatus` in localStorage
- Ma `MobileAppPage` non controlla se c'e' un FIR attivo al mount
- `FIRFormComplete` usa `useState(!!store.editingFirId)` per `isStarted`, il che funziona solo se lo store e' gia' idratato
- La reidratazione puo' avvenire dopo il render iniziale, lasciando `isStarted = false`

---

## Piano di Implementazione

### Fase 1: Tabella GPS e tracciamento automatico
1. Creare tabella `driver_locations` con colonne: `id`, `user_id`, `lat`, `lng`, `speed`, `accuracy`, `fir_id`, `tenant_id`, `created_at`
2. Aggiungere RLS per permettere INSERT dal trasportatore e SELECT dall'admin
3. Modificare `MobileAppPage` per avviare automaticamente `watchPosition` quando c'e' un FIR in stato "inviato" (in viaggio), e inviare la posizione ogni 30 secondi
4. Creare la pagina admin `/admin/gps` (`src/pages/admin/GPSFlottaPage.tsx`) che mostra in tempo reale le posizioni di tutti i trasportatori attivi con mappa tabellare (nome, targa, posizione, velocita', ultimo aggiornamento, FIR attivo)
5. Aggiungere la rotta in `App.tsx`

### Fase 2: Fix icone Dashboard
1. In `DesktopIconGrid.tsx`, aggiungere `overflow-hidden` al contenitore dell'icona LED
2. Spostare `hover:scale-125` dall'intero contenitore all'immagine interna (`img`)
3. Il riquadro LED rimane fermo, solo l'icona PNG si ingrandisce

### Fase 3: Fix salvataggio FIR
1. In `useFIRForms.ts`:
   - Nella mutation `closeFIR`, dopo `.maybeSingle()` verificare che `data` non sia `null` e in quel caso lanciare errore esplicito
   - Aggiungere log di debug per tracciare i fallimenti
2. In `FIRFormComplete.tsx`:
   - Nel `handleSaveDraft`, spostare `resetForm()` DOPO il toast di successo e aggiungere un piccolo ritardo per evitare che il reset cancelli i dati prima del salvataggio completo
   - Migliorare feedback errori nell'autosave

### Fase 4: Fix Cronologia
1. In `CronologiaFIRPage.tsx`:
   - Collegare il pulsante Trash2 alla mutation `deleteFIR` con conferma
   - Aggiungere gestione errori visibili
   - Permettere modifica anche dei FIR "inviato" (non solo "bozza")

### Fase 5: Fix AI - risposte in linguaggio naturale
1. In `supabase/functions/ai-agent/index.ts`:
   - Rimuovere `response_format: { type: "json_object" }`
   - Aggiornare il system prompt per istruire il modello a rispondere in linguaggio naturale e includere `firUpdates` come blocco JSON separato (es. dentro tag ```json```)
   - Nel parsing, cercare blocchi JSON nel testo della risposta per estrarre `firUpdates`
   - Se non c'e' JSON, usare il testo come risposta diretta

### Fase 6: Fix persistenza sessione FIR
1. In `FIRFormComplete.tsx`:
   - Cambiare `isStarted` da useState a un valore derivato dallo store: `const isStarted = !!store.editingFirId`
   - Rimuovere `setIsStarted` e usare direttamente lo stato persistito
   - Questo garantisce che alla riapertura dell'app, se c'e' un FIR attivo, il form si mostra subito
2. Subscribere allo store per reagire ai cambiamenti di idratazione

---

## Dettagli Tecnici

### Schema tabella `driver_locations`
```text
driver_locations
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id     UUID NOT NULL (no FK to auth.users)
  tenant_id   UUID
  fir_id      UUID
  lat         DOUBLE PRECISION NOT NULL
  lng         DOUBLE PRECISION NOT NULL
  speed       DOUBLE PRECISION
  accuracy    DOUBLE PRECISION
  created_at  TIMESTAMPTZ DEFAULT now()
```

### RLS Policies
- INSERT: `auth.uid() = user_id`
- SELECT: admin puo' vedere tutto tramite il ruolo admin nel profilo

### Tracciamento GPS automatico
Il componente `MobileAppPage` avviera' un `watchPosition` automatico quando `workflowStatus === 'inviato'` e inviera' coordinate ogni 30 secondi alla tabella `driver_locations`. Quando il FIR viene chiuso, il tracking si ferma.

### AI: strategia di parsing misto
Il prompt verra' aggiornato per dire al modello: "Rispondi sempre in linguaggio naturale italiano. Se devi aggiornare campi FIR, aggiungi un blocco JSON alla fine del messaggio con la struttura `{firUpdates: {...}}`". Il backend cerchera' blocchi JSON nella risposta testuale.
