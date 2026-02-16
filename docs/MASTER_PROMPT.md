# MASTER PROMPT — SmartForm Navigator / Zoli Dragon Platform
## Documento di Riferimento Unico (estratto da tutte le conversazioni storiche)
## Ultimo aggiornamento: 2026-02-16

---

## 1. ARCHITETTURA GENERALE

### Piattaforma Multi-Tenant
- L'app è parte di una **piattaforma multi-tenant** complessa e articolata.
- **3 Tenant principali:**
  - **Global Reco** — `globalreco@zolisoftware.cloud`, `globalreco@zolisoftware.space` — Tenant di default, riceve TUTTI i FIR di default
  - **Multyproget** — `multyproget@zolidragon.cloud`
  - **Niyol** — `niyol@zolidragon.cloud` (nota: scritto "nijol" in alcuni punti)
  - **Tenant consolidato:** Multy Niyol — `multyniyol@zoli.live`
- **Email admin aggiuntive:** `admin@zoli.live`, `direzioneglobalreco@zoli.live`, `formulariglobalreco@zoli.live`, `amministrazioneglobalreco@zoli.live`, `segreteriaglobalreco@zoli.live`
- **Global Reco ID:** `167d07ad-9184-484e-85a6-da5ceafa42a3`
- **Fallback tenant:** Se un profilo utente non ha tenant_id, il default è Global Reco (funzione `get_user_tenant`)

### Ruoli Utente
- **Utenti normali** → accedono SOLO alla app mobile FIR (`/app`)
- **Admin** → accedono alla dashboard completa (`/admin`)
- Gli admin sono determinati da una **whitelist di email** nella funzione `bootstrap_admin_role()`
- Gli admin NON devono compilare il profilo (codice fiscale), entrano direttamente in dashboard

### Routing
- Utenti normali → `/app` (app mobile FIR)
- Admin → `/admin` (dashboard completa)
- Login → `/auth`
- Setup profilo → `/profile/setup` (solo per utenti normali senza profilo)

---

## 2. AUTENTICAZIONE

### Registrazione Utenti
- **NIENTE EMAIL** — Solo nome, cognome, codice fiscale e password
- L'email viene generata automaticamente dal codice fiscale: `CODICE_FISCALE@zoli.internal`
- **Conferma email DISABILITATA** — L'utente si registra e accede direttamente
- Login usa **codice fiscale + password**

### Accesso Admin
- Pulsante "Accesso Admin" con **icona lucchetto** posizionato SOTTO il box di login/registrazione
- Gli admin accedono con **email e password**
- **NESSUNA possibilità di registrarsi** come admin — solo accesso

### Logout
- Pulsante "Esci" nella pagina **Profilo** (pagina accessibile dalla barra di navigazione in basso)

---

## 3. INTERFACCIA MOBILE — APP FIR

### Estetica
- **Futuristic HUD** con sfondi neri profondi
- **Sfondo a quadratini** (checkered background) — REQUISITO FONDAMENTALE
- **Bordi LED colorati** (neon) intorno ai componenti principali
- Griglie a doppio strato con effetto gradient-shift
- Icone PNG personalizzate (NON Lucide standard) per dashboard, statistiche, report
- **Logo drago** come elemento interattivo per il refresh dell'app
- Componenti `NeonIcon` e `StatDisplay` per effetti di bagliore neon
- Font display per titoli, font mono per dati tecnici
- Design tokens semantici: `--primary`, `--foreground`, `--background`, `--neon-cyan`, `--neon-green`

### Layout Mobile
- Mobile-first, su desktop mostrato dentro cornice centrata
- `lg:max-h-[92vh]` con `overflow-y-auto` (NO altezza fissa)
- Barra di navigazione in basso (BottomNav) con icone per: FIR, GPS, AI, Messaggi, Profilo

### Saluto Personalizzato
- Header mostra "Ciao [Nome]! 👋" usando il nome del profilo dell'utente loggato

### Semaforo Orizzontale (Traffic Light)
- Nell'header, sincronizzato con lo store Zustand (`workflowStatus`)
- **3 stati:**
  1. **GIALLO (Bozza):** Messaggio "⚠️ COMPILA I DATI", pulsante giallo "INVIA E FIRMA PARTENZA"
  2. **VERDE (In Viaggio):** Messaggio "✅ SEI IN VIAGGIO", pulsante blu "CONTROLLO POLIZIA (QR CODE)", pulsante rosso "ARRIVATO"
  3. **ROSSO (Arrivo):** Messaggio "🏁 SEI ARRIVATO?", popup per peso a destino prima della chiusura
- Al cambio stato verso "In Viaggio" e "Arrivo": registrazione automatica coordinate GPS
- Validazione campi obbligatori: Targa, EER, Peso, Soggetti

---

## 4. MODULO FIR — 3 SCHEDE (TAB)

### Struttura
- **Scheda 1:** "FIR – Prima pagina" (Sezioni 1-12)
- **Scheda 2:** "Trasbordo / Soste tecniche" (Integrazione: Sezioni 13-17)
- **Scheda 3:** "Trasporto intermodale" (trasporti ferroviari e marittimi)

### Ogni campo deve avere:
- Etichetta in italiano identica alla terminologia ufficiale RENTRI
- Tooltip con spiegazione
- Voice input per dettatura

### Campi principali:
- **Produttore:** denominazione, codice fiscale, indirizzo, CAP, comune, provincia, autorizzazione
- **Trasportatore:** denominazione, CF, sede, conducente, targa automezzo, targa rimorchio, iscrizione albo
- **Destinatario:** denominazione, CF, indirizzo, CAP, comune, provincia, autorizzazione
- **Intermediario:** denominazione, CF, iscrizione albo (default: Multyproget)
- **Rifiuto:** Codice EER, Stato Fisico, Descrizione, Caratteristiche HP (HP1-HP15), Quantità (KG e Litri)
- **Trasporto:** ADR/RID, Classe pericolo, Nr ONU, Percorso
- **Date:** Data/ora inizio, Data/ora fine, Data arrivo, Data partenza
- **Sezione Integrazione:** Trasbordi parziali/totali, sosta tecnica, secondo destinatario, annotazioni
- **Sezione Intermodale:** Trasporti ferroviari e marittimi
- **Riserva Destinatario:** Peso ricevuto, firma, data/ora, accettazione (intero/parziale)

### Mappatura Stato Fisico
- I codici numerici della UI ("1", "2"...) DEVONO essere tradotti in stringhe ufficiali ("solido pulverulento", "liquido"...) prima del salvataggio nel DB

### Sincronizzazione Store
- Lo store Zustand (`firStore.ts`) deve essere sincronizzato bidirezionalmente con il form e il database
- I dati estesi (55+ campi aggiuntivi) sono persistiti nella colonna JSONB `form_data` della tabella `fir_forms`

### Autosave
- Ogni 10 secondi, salvataggio automatico della bozza

### Chiusura FIR
- Lo stato "Rosso" (Arrivo) richiede obbligatoriamente l'inserimento del peso riscontrato a destino
- Un FIR completato diventa **immutabile** e consuma il numero assegnato dal pool

---

## 5. GENERAZIONE PDF MINISTERIALE

### Specifiche Tecniche
- **jsPDF** — 3 pagine A4 (Formulario, Integrazione, Intermodale)
- **Coordinate normalizzate** (0-1) rapportate al formato A4 (210x297mm)
- **Font:** Courier 9pt, colore `#000080` (blu scuro)
- **Riduzioni:** Codice EER 7pt, Stato Fisico 5pt
- **QR Code:** 28x28mm, in alto a destra (dalla pag 2) e nel footer a destra (tutte le pagine)
- **Quadrato vidimazione:** accanto al QR nel footer
- **Numero FIR** ripetuto su tutte le pagine
- **Intermediario predefinito:** Multyproget
- **Sezione "Controllo Polizia":** Anteprima PDF (Live Blob) in tempo reale, rimane visibile fino all'apertura di un nuovo FIR

---

## 6. INTEGRAZIONE API RENDER (RENTRI)

### Endpoint
- **Base URL:** `https://smartform-navigator.onrender.com`
- **Firma FIR:** POST `/firma-fir`
- **PDF Ufficiale:** GET `/pdf/[numero_fir]`
- **XML Ufficiale:** GET `/xml/[numero_fir]`

### Workflow "INVIA E FIRMA PARTENZA"
1. Invio payload JSON con `societaId` mappato sui tenant: `global_reco`, `multyproget`, `niyol`
2. Il server seleziona il certificato mTLS corretto per il tenant
3. In caso di successo, restituisce `numero_fir` e `qr_code`
4. Salvataggio immediato nel database
5. **Tempo elaborazione:** 3-5 secondi (mostrare spinner)

### NO Railway
- **Railway è stato abbandonato** — NON usare endpoint Railway per nessuna ragione

---

## 7. AGENTE AI

### Requisiti TASSATIVI
- **USARE ESCLUSIVAMENTE OpenRouter** — MAI usare l'AI di Lovable
- **Modello:** `google/gemini-2.0-flash-exp` (o equivalente validato su OpenRouter)
- **Chiave API:** `OPENROUTER_API_KEY` (già configurata come secret)

### Edge Function
- `supabase/functions/ai-agent/index.ts` — Edge function con tool calling via OpenRouter

### Funzionalità
1. **Assistente FIR/RENTRI** — Knowledge base RENTRI integrata nel system prompt
2. **Compilazione FIR reale** — L'agente estrae dati dalla dettatura e li inserisce nello store Zustand (NON finge)
3. **Memoria conversazioni** — Persistenza nelle tabelle `ai_conversations`, `ai_messages`
4. **RAG** — Ricerca nella knowledge base `ai_knowledge_base`
5. **Multi-tool:** Validazione codici EER, calcoli quantità, riepilogo FIR, update_fir_form

### Compilazione vocale
- L'utente detta e l'agente popola il form FIR reale
- Pulsante "COMPILA CON AI" nel form FIR
- Sincronizzazione bidirezionale agente ↔ form

---

## 8. MESSAGGISTICA (ZOLI MESSAGES)

### Funzionalità
- Chat real-time con cronologia persistente
- Allegati (JPG, PNG, PDF, Excel) tramite bucket `message-attachments`
- Cancellazione asimmetrica: messaggi eliminati da autisti restano visibili agli admin
- Admin possono eliminare permanentemente
- Header: "ZOLI MESSAGES", contatto "Global Reco", indicatore Online

---

## 9. DASHBOARD ADMIN

### Pagine
- Dashboard (conteggi FIR reali, link rapido registro)
- GPS Flotta
- Personale (gestione dipendenti)
- RENTRI (registro carico/scarico)
- Fatturazione
- Registro FIR (`/admin/registro-fir`) — lista formulari, filtri, statistiche, dettaglio

### Dati
- **NO dati demo** — Solo dati reali, altrimenti messaggi "Nessun documento registrato"
- Sidebar collassabile

---

## 10. SALVATAGGIO FIR NEL DATABASE

### Tabella `fir_forms`
- Default tenant: Global Reco
- RLS per tenant
- Mappatura dallo store Zustand al DB tramite `mapStoreToDatabaseFields()`
- Pulsante "INVIA FIR" → salva come inviato
- Pulsante "BOZZA" → salva come bozza
- I FIR inviati appaiono nel Registro di Global Reco

### Pool Numeri FIR
- Generazione automatica: `FIR-ANNO-XXXXXX` (6 cifre random)
- 25 numeri per utente alla registrazione
- Stati: available → reserved → consumed
- Admin può assegnare, riassegnare, sospendere numeri

---

## 11. DESIGN DEI CONTROLLI FORM

- Dropdown con sfondi neri/scuri per leggibilità nel tema dark
- Input data con componente `DateInput` con icona calendario dorata (`text-primary`) sempre visibile
- Accordion espandibili per ogni sezione del form

---

## 12. REGOLE ASSOLUTE

1. **MAI usare l'AI di Lovable** — Solo OpenRouter
2. **MAI usare Railway** — Solo Render (`smartform-navigator.onrender.com`)
3. **Estetica Futuristic HUD** con sfondo checkered e bordi LED — sempre
4. **Registrazione senza email** — Solo nome, cognome, CF, password
5. **Admin email whitelist** — Solo accesso, niente registrazione
6. **Global Reco è il tenant di default** per tutti i FIR
7. **PDF millimetrico** con coordinate normalizzate A4
8. **Semaforo orizzontale** nell'header — sempre presente
9. **3 schede FIR** — Principale, Integrazione, Intermodale
10. **Autosave ogni 10 secondi**
11. **Peso a destino obbligatorio** per chiusura FIR
