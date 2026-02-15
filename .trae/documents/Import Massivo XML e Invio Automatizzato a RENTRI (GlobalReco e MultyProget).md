## Funzionalità Richieste
- Importare XML FIR multipli (fino a 7000) in un’unica operazione, vincolando l’invio a un registro selezionato.
- Normalizzare e inviare automaticamente i movimenti con il formato che ha dato esito 202 (RFC3339 Z, EER numerico, causale/UM/stato coerenti).
- Gestire rate‑limit/temporanei blocchi RENTRI (es. 1000/min), memorizzare lo stato e riprendere automaticamente.
- Abilitare multi‑tenant: Global Reco (`certificato.p12`) e Multy Proget (`multyproget.p12`) con registri selezionabili.

## UI Web
- Nuova pagina `ImportMassivo` con:
  - Upload di uno o più file XML (drag & drop) e anteprima conteggio FIR.
  - Selettore `Operatore` (GlobalReco/MultyProget) e `Registro` (lista ID registri dell’operatore).
  - Parametri: `progressivo iniziale`, `anno`, `data di registrazione` (default oggi), dimensione batch, e rate‑limit (invii/min).
  - Avvio import: crea job persistente; pannello di avanzamento (in coda, inviati, accettati, errori), pulsanti pausa/riprendi/annulla.

## Backend Node (server)
- Nuove route in `server/routers.ts`:
  - `POST /import/start` (body: operatore, registroId, opzioni, files) → crea job, salva stato su disco (`data/imports/<jobId>.json`).
  - `GET /import/status/:jobId` → stato live e dettagli (contatori, ultimi errori/accettazioni).
  - `POST /import/control/:jobId` (pause/resume/cancel).
- Moduli:
  - `server/importParser.ts`: parsing FIR XML → oggetti movimento (riferimenti, rifiuto). Riusa `fast-xml-parser` e mappatura già presente (submitFir).
  - `server/importQueue.ts`: coda persistente con token‑bucket rate‑limit (parametrico). Salvataggio progressi per ripartenza.
  - `server/importSender.ts`: costruzione payload array e invio via Bridge (`/send-registrazioni`), con retry/backoff su 429/503/403. Polling opzionale di `transazione_id` e registrazione esito.
- Persistenza:
  - File JSON per job e chunks: `data/imports/` (senza nuove librerie). Stato: `queued`, `sending`, `paused`, `done`, `failed`.

## Regole di Normalizzazione
- Data: `riferimenti.data_ora_registrazione` in `YYYY-MM-DDT12:00:00Z`.
- Registrazione: `riferimenti.numero_registrazione.{anno,progressivo}` con progressivo incrementale; anno impostato o derivato.
- Causale/Tipo: dedotta da XML (`CA`/`SC` → `RE`/`TE`), default sicuro per carico: `RE`.
- Codice EER: numerico senza punti (es. `170405`).
- Quantità: numero; UM: `kg`/`l` in minuscolo; Stato: `S` se solido (default), da XML ove disponibile.

## Selezione Operatore e Registro
- GlobalReco: file `certificato.p12` (già configurato) e registro target (esistente o nuovo identificativo operativo).
- MultyProget: file `multyproget.p12` (aggiungere in mappa se assente) e registri:
  - Dalle schermate: `RAH20NP7O40` (Produttore‑Destinatario), `RQCTG1TP7NT0` (Trasporto Conto Proprio), `RQEL39R7NS0` (Intermediazione).
  - UL: `OP2501XMQ021914-TO0001`; CF: `12347770013`; numero iscritto operatore: `OP2501XMQ021914` (per eventuale creazione registro/anagrafiche).
- UI: drop‑down popolato via consult (Bridge `/list-registrazioni` o se necessario elenco manuale iniziale), con override manuale.

## Invio Massivo e Rate‑Limit
- Batch builder: crea payload array (dimensione configurabile, es. 50–200) per ridurre overhead.
- Rate limiter: token‑bucket con capacità `invii/min` (default 1000). Se riceve 429/403 specifico → backoff esponenziale e sospensione; ripresa automatica al successivo slot.
- Persistenza: ogni batch loggato con `transazione_id` e stato. In caso di crash, job riparte dal primo batch non confermato.

## Error Handling
- Validazioni pre‑invio: CER numerico, UM/stato/codici obbligatori, peso >0.
- Gestione errori RENTRI:
  - 400 con `model_state`: evidenzia campo e applica regole di fallback (es. normalizzazione EER, data, causale) prima del retry.
  - 401: retry con forme issuer (dnQualifier/CF numerico) già implementate nel Bridge.
  - 403/404: pausa job e notifica; consente intervento manuale su registro/permessi.

## Telemetria e Monitoraggio
- UI: progress bar e tabella ultimi N invii (identificativo, batch, stato, transazione).
- Log server: file per job con timing, esiti e next‑retry.

## Estensioni Bridge (se necessarie)
- Nessuna modifica al flusso di firma: riutilizzo `/send-registrazioni` e rotte `list-*` esistenti.
- Opzionale: rotta `/check-transazione` per consolidare polling delle transazioni asincrone.

## Rollout
- Step 1: aggiungere mappa registri/operatori (GlobalReco e MultyProget) e UI pagina `ImportMassivo`.
- Step 2: parser XML e costruzione coda persistente.
- Step 3: sender con rate‑limit, retry/backoff, progressi.
- Step 4: prove con 100–200 movimenti, poi scalare a 7000.

## Dati Allegati Utilizzati (Multy Proget)
- CF: `12347770013`; Num. iscritto operatore: `OP2501XMQ021914`; UL: `OP2501XMQ021914-TO0001`.
- Registri attivi: `RAH20NP7O40`, `RQCTG1TP7NT0`, `RQEL39R7NS0`.

## Conferma
- Se confermi, implemento UI/Backend, aggiungo mapping MultyProget e avvio test con lotti pilota prima degli invii massivi.