# Piano: DARK LEMON agente completo, guide aggiornate, prove totali senza traccia

## Regole che restano valide
- Giacenze fino al 21/09/2026 mai toccate (blocco nel database già attivo).
- Nessun automatismo: ogni scrittura di DARK LEMON richiede conferma esplicita dell'operatrice.
- Nessun invio RENTRI reale senza autorizzazione; la firma partenza resta dall'app RENTRI.
- Nessuna cancellazione fisica dei dati veri: gli annullamenti sono movimenti contrari.
- Le prove le faccio io e non lasciano traccia (vedi sotto).

## 1. Prove senza traccia
- Prove sul database fatte dentro una transazione chiusa con annullamento totale (ROLLBACK): nulla viene salvato, nessuna riga, nessun log.
- Prove a schermo con browser automatico in sola lettura o fermandosi prima del salvataggio.
- Sibill: solo bozze, poi eliminate su Sibill; mai invio a SDI o cassetto fiscale.
- Schermate prima e dopo di giacenze, cernite e registro per ogni fase, salvate tra i file.

## 2. Guide e tutorial
- Aggiornare la guida completa e i tutorial con: operazioni di magazzino, FIR → Giacenze, blocco 21/09, blocco cernite sotto zero, avviso firma partenza da app RENTRI, aggiornamento anagrafica Sibill, privati dopo il 21/09, nuove capacità di DARK LEMON.
- Le stesse guide diventano la base di conoscenza di DARK LEMON, così resta sempre aggiornato.

## 3. DARK LEMON "come una vibe"
- Conoscenza: guida completa + schema del database + regole di memoria caricati a ogni conversazione.
- Nuovi strumenti (tutti con anteprima e poi conferma):
  - Fattura da formulario: "fai fattura del formulario X" → bozza con cliente, CER, kg, prezzo da contratto/listino → mostra la bozza → alla conferma invia a Sibill.
  - Formulari: creare bozza FIR, compilare, inviare al RENTRI (con conferma), rileggere stato.
  - Privati: nuovo conferimento + ricevuta; incide sulle giacenze solo se data dopo il 21/09.
  - Anagrafica: creare e modificare aziende, privati, targhe, conducenti.
  - Operazioni di magazzino e cernite (con gli stessi blocchi della schermata).
  - Annulla operazione: movimento contrario, mai cancellazione.
  - Test: esegue le verifiche del programma in sola lettura e riporta l'esito.
- Limite che resta: DARK LEMON non modifica il codice del programma.

## 4. Sibill
- Elenco con TUTTE le fatture Sibill (paginazione completa, filtri, stato).
- Test: creazione bozza, lettura, eliminazione bozza; controllo che ogni fattura del programma sia presente su Sibill.

## 5. Privati
- I conferimenti privati con data dopo il 21/09 aggiornano le giacenze a catena (stesso calcolo delle operazioni di magazzino), con blocco 21/09 e anti-saldo-negativo.

## 6. Stress test totale (decine di prove)
- App dipendenti (Multy, Niyol): accesso, FIR, documento viaggio, stampa.
- Ufficio: FIR, registri, export PDF/Excel, ricevute privati, cernite, operazioni di magazzino, FIR → Giacenze.
- DARK LEMON: 30+ richieste reali (lettura, bozza fattura, bozza FIR, anagrafica, privato, annullo) fermate prima del salvataggio o in transazione annullata.
- Rapporto finale con esito di ogni prova e schermate prima/dopo.

## Dettagli tecnici
- Edge function dark-lemon-agent: nuovi tool (create_invoice_from_fir, send_invoice_sibill, create_fir_draft, create_privato_conferimento, upsert_anagrafica, undo_operation, run_selftest), conferma a due passi con token.
- Contesto: guida in markdown generata da GuidaCompletaPage e caricata in ai_knowledge_base.
- Giacenze privati: fetchMovimentiSuccessivi include privati_conferimenti con data > 21/09.
- Prove DB: funzione di test che esegue BEGIN … ROLLBACK.
- Ordine di lavoro: 1 → 2 → 5 → 3 → 4 → 6, con verify.mjs a ogni fase.
