# Adeguamento normativo — verifica punto per punto

Ho controllato i 12 punti dell'analista AI contro il codice reale. Alcuni sono già coperti, alcuni sono ipotesi dell'AI non verificabili, alcuni vanno fatti davvero.

## Stato attuale (verificato nel codice)

| # | Punto AI | Stato reale | Azione |
|---|---|---|---|
| 1 | D.D. 210/2026 campi FIR | QR RENTRI ufficiale + stampa modulo ministeriale già presenti. I "nuovi campi" non sono specificati dalla news: non c'è nulla di concreto da implementare senza il testo del decreto | Nessuna modifica al buio |
| 2 | Flag cartaceo/digitale | Esiste il modulo FIR cartaceo separato, ma **non** un flag "Formato" in creazione FIR né avviso scadenza | **Da fare** |
| 3 | Chiusura modalità sicurezza 14 apr 2026 | Riguarda l'app ministeriale RENTRI, non la nostra. Nessuna "firma offline" nel nostro codice | Nessuna modifica |
| 4 | "RENTRI in cifre" widget | Non esiste API pubblica documentata | Nessuna modifica |
| 5 | Allineamento API RENTRI | Il proxy VPS mTLS/JWT è già la nostra integrazione. Nessuna spec nuova nota | Nessuna modifica |
| 6 | Requisiti OS Android/iOS | App web, non nativa. Non applicabile | Nessuna modifica |
| 7 | Soggetti esclusi (L. 199/2025) | Nessun flag "escluso" in anagrafica | Nessuna modifica |
| 8 | Calendario rilascio | Organizzativo, non software | Nessuna modifica |
| 9 | Indisponibilità RENTRI | `rentriVpsApi.ts` già rileva l'offline (`isRentriOfflineResponse`, 502/503/504) ma **non** c'è coda di reinvio automatico | **Da fare (leggero)** |
| 10 | Categoria Albo "2-quater" | Non esiste catalogo categorie Albo nel codice | Nessuna modifica |
| 11 | Promemoria compliance ANCE | Nessun promemoria automatico | Da valutare in seguito |
| 12 | CER obbligatorio | Già presente e obbligatorio sul FIR; in fattura il CER si auto-compila dal FIR ma il campo è libero e non validato | **Da fare (validazione)** |

## Cosa implemento

### 1. Flag formato FIR (digitale / cartaceo) — punto 2
- Nel formulario (`MNFIRFormComplete.tsx`) e nel modulo alternativo (`FIRAlternativeForm.tsx`): selettore **Formato: Digitale RENTRI / Cartaceo**, salvato in `form_data.formato_fir`.
- Se **Cartaceo**: nascondo i pulsanti di invio/vidimazione RENTRI, resta attiva la stampa PDF per archiviazione.
- Se **Digitale**: comportamento attuale invariato.
- Banner informativo nella pagina FIR: "FIR cartaceo ammesso fino al 15 settembre 2026", con conto alla rovescia; dopo quella data il banner diventa di avviso.
- Nessuna modifica allo schema DB: uso il JSONB `form_data` già esistente.

### 2. Coda di reinvio quando RENTRI è giù — punto 9
- Quando l'invio fallisce per indisponibilità (rilevata già da `isRentriOfflineResponse`), il FIR resta in bozza e viene marcato `form_data.rentri_retry_pending = true` con timestamp.
- Nella Console RENTRI: sezione **"In attesa di reinvio"** con elenco dei FIR bloccati e pulsante **"Reinvia tutti"**.
- Nessun job automatico, nessuna modifica di logica esistente: solo lettura + reinvio manuale in batch.

### 3. Validazione CER in fatturazione — punto 12
- In `NuovaFatturaDialog.tsx` il campo CER diventa validato contro `cerCatalog`: formato a 6 cifre e codice esistente.
- Blocco del salvataggio con messaggio d'errore se una riga di tipo smaltimento ha CER mancante o non valido.
- Righe di tipo "servizio" generico restano senza CER.

### 4. Documentazione
- Aggiorno `docs/GUIDA_DEV_MULTY.md` e la conoscenza di Dark Lemon (`dark-lemon-mn`) con il flag formato, la coda di reinvio e la regola CER in fattura.

## Regole di sicurezza rispettate
- **Nessuna migrazione DB**: tutto sui campi JSONB e tabelle esistenti.
- Nessuna modifica alla logica di giacenze, registri, cernite o Dragon.
- Comportamento attuale dei FIR digitali invariato (default = digitale).
- Verifica finale con `node scripts/verify.mjs --smoke` e output mostrato.

## Cosa NON faccio
I punti 1, 3, 4, 5, 6, 7, 8, 10 sono ipotesi dell'AI su notizie senza specifiche tecniche pubblicate, o riguardano l'app ministeriale RENTRI e non il nostro software. Implementarli "al buio" significherebbe inventare campi e regole. Quando esce il testo operativo del D.D. 210/2026, torniamo sul punto 1 con dati reali.
