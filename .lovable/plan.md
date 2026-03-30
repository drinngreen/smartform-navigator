
Obiettivo: correggere il flusso di vidimazione FIR perché oggi alcune schermate trattano come errore una risposta valida asincrona del backend.

1. Diagnosi confermata
- Il problema non è più la VPS: nei log recenti `rentri-vps-proxy` risponde `status=200` sulla `VIDIMAZIONE`.
- Il problema attuale è applicativo: la UI si aspetta `data.numeri`, ma il backend può restituire solo `{"transazione_id":"..."}`.
- Quindi la richiesta parte correttamente, ma il frontend conclude erroneamente “Nessun numero trovato”.

2. Correzione da implementare
- Creare un helper unico per la vidimazione asincrona in `src/lib/rentriVpsApi.ts` o `src/services/rentriApi.ts`.
- Flusso del nuovo helper:
  1. leggere `LISTA_BLOCCHI` per il blocco selezionato e salvare `numero_fir_vidimati` corrente
  2. inviare `VIDIMAZIONE`
  3. se arrivano numeri subito, usarli
  4. se arriva solo `transazione_id`, trattare la risposta come “richiesta accettata”
  5. recuperare i nuovi FIR leggendo `LOTTO` sul blocco selezionato, partendo dal progressivo successivo al contatore precedente
  6. ripetere per la quantità richiesta, con retry breve e tolleranza ai 404 iniziali
  7. restituire un risultato uniforme: `numeri`, `transazione_id`, `pending/partial`, eventuali errori

3. Punti del codice da aggiornare
- `src/components/superadmin/FIRPoolSection.tsx`
- `src/pages/admin/GestioneFIRPage.tsx`
- `src/pages/multynijol/MNGestioneFIRPage.tsx`
- `src/components/multynijol/dev/DevImpiantoModule.tsx`
- eventuali file `.js` gemelli che replicano la stessa logica
- opzionalmente `src/components/superadmin/RENTRIActionsPanel.tsx` per mostrare anche lì l’esito corretto della vidimazione asincrona

4. Hardening importante
- Uniformare il passaggio di `num_iscr_sito`: alcuni punti passano il codice sito corto (`TO0001`), altri l’`unitId` completo. Va centralizzato per evitare richieste incoerenti.
- Aggiungere fallback nel proxy `rentri-vps-proxy` così un valore corto non sovrascriva l’`unitId` corretto.
- Centralizzare anche l’estrazione/normalizzazione dei numeri FIR, invece di duplicarla in più schermate.

5. Comportamento UI atteso dopo la fix
- Se la vidimazione è asincrona, mostrare stato tipo: “Richiesta inviata, recupero numeri in corso…”
- Se arrivano tutti i numeri: salvarli nel serbatoio e mostrare successo
- Se ne arrivano solo alcuni: salvare quelli validi e mostrare avviso parziale
- Se entro il timeout non arrivano numeri: mostrare messaggio chiaro con `transazione_id` e blocco/progressivo atteso, non “Nessun numero trovato”

6. Nessuna modifica backend dati
- Non servono nuove tabelle o cambi schema database
- Non servono nuove policy
- Non servono nuovi secret

Dettagli tecnici
- Base tecnica già presente:
  - `richiestaVidimazione(...)`
  - `listaBlocchi(...)`
  - `leggiLotto(...)`
- Evidenza già nel repo:
  - `rentri-test/full-cycle-others.ts` usa esattamente questo pattern: legge il conteggio corrente, invia la vidimazione, poi recupera il FIR con `LOTTO`
- Questo indica che il fix corretto è orchestrare il flusso asincrono, non cambiare infrastruttura.

Risultato finale previsto
- La richiesta dal “serbatoio” Global non fallirà più quando il backend restituisce solo `transazione_id`
- I nuovi FIR verranno recuperati automaticamente dal blocco giusto e inseriti nel pool
- Tutte le schermate FIR useranno lo stesso comportamento coerente
