# Ripristino e completamento Cernite Dragon

## Obiettivo
Rendere operative le cernite in **Magazzino Dev** senza modificare o disattivare FIR, Privati, Ricevute, Fatturazione, RENTRI o le altre funzioni esistenti. L’implementazione resta nello schema `dragon_*`, isolata per `company_id` Multyproget.

## Problemi verificati
- Il pulsante crea un batch con `model_id = null`, ma il database richiede un modello: la cernita fallisce.
- La conferma usa molte scritture frontend separate: un errore intermedio lascia dati parziali.
- Gli output rifiuto possono aggiornare due volte la giacenza: una volta dal movimento consolidato e una volta dall’inserimento stock esplicito.
- Le tendine leggono solo `dragon_items`: per Multyproget risultano appena 11 CER, mentre Giacenze dispone del catalogo globale di 843 codici.
- L’attuale annullamento è anch’esso multi-step e non protetto da una transazione unica.

## Implementazione

### 1. Catalogo CER coerente e selettore unico
- Creare un componente riutilizzabile per input/output di cernite e modelli.
- Mostrare per primi i **CER preferiti Multyproget**, poi MPS/materiali già configurati.
- Aggiungere il comando **“Tutti i CER”** con ricerca sull’intero catalogo globale usato da Giacenze.
- Quando viene scelto un CER globale non ancora presente in `dragon_items`, registrarlo in modo idempotente per la sola `company_id` attiva, senza duplicati e senza alterare i CER degli altri tenant.
- Usare lo stesso selettore in Nuova Cernita e Modelli Cernita, così le tendine collimano.

### 2. Transazione atomica Dragon
- Aggiungere una RPC dedicata alle lavorazioni immediate che, in un’unica transazione:
  1. valida tenant, causali, articoli, quantità, saldo disponibile e output;
  2. crea il batch anche senza modello preimpostato;
  3. genera lo SCARICO padre;
  4. genera i CARICHI figli CER e i carichi MPS;
  5. collega tutti gli output al batch;
  6. aggiorna la giacenza una sola volta tramite il percorso Dragon già previsto;
  7. registra l’audit.
- In caso di errore, annullare l’intera operazione: nessun batch o movimento parziale.
- Rendere atomico anche l’annullamento, esclusivamente con movimenti compensativi; nessuna cancellazione fisica.

### 3. Flusso differito e modelli
- Consentire cernite immediate con o senza modello.
- Aggiungere lo stato **Pendente** per lo scarico padre completabile in seguito con output reali.
- Correggere la gestione modelli: CER padre, righe CER/MPS, percentuali o quantità fisse, output aggiuntivi e controllo della resa.
- Mostrare separatamente **Lavorazioni pendenti**, **Confermate** e **Annullate**.

### 4. Lotti e tracciabilità
- Estendere in modo additivo lo schema Dragon con lotti per CER/MPS e relative allocazioni al batch.
- Supportare creazione di uno o più lotti, alimentazione di un lotto esistente e saldo per lotto.
- Bloccare gli scarichi superiori alla disponibilità del lotto.
- Implementare **Traccia** e **Rintraccia** usando i collegamenti Dragon esistenti (`source_transform_batch_id`, movimenti registro/stock e allocazioni), con una vista ad albero leggibile.

### 5. Interfaccia operativa
- Ripristinare e verificare i pulsanti **Cernita** e **Modelli Cernita** da Magazzino Dev.
- Mantenere il ritorno rosso al Centro di Comando con `?tab=magazzino-dev`.
- Mostrare saldo disponibile del CER padre, differenza input/output, calo di lavorazione, lotto e messaggi bloccanti chiari.
- Conservare lo stato del modulo aperto durante rinnovi sessione e navigazione interna.

### 6. Dark Lemon, guida e tutorial
- Aggiornare il tool `dragon_cernita` affinché usi la stessa RPC atomica e gli stessi controlli dell’interfaccia.
- Permettere a Dark Lemon di elencare preferiti/globali, proporre un modello, creare/completare una lavorazione e mostrare tracciabilità; le azioni distruttive restano confermate e auditate.
- Aggiornare Guida Dev Multy e tutorial interattivo con cernita immediata, differita, modelli, lotti, annullamento, Traccia/Rintraccia e FAQ.

## Protezione del pregresso e collaudo
- Nessuna modifica alle tabelle o funzioni legacy di FIR, Privati, Ricevute, RENTRI e fatturazione.
- Migrazioni solo additive o correzioni circoscritte alle funzioni/tabelle `dragon_*`, con RLS e grant coerenti.
- Prima/dopo: acquisire conteggi e saldi di controllo per registri e giacenze, senza correggere dati reali automaticamente.
- Test automatici su: successo atomico, rollback forzato, saldo insufficiente, nessun doppio carico, tenant isolation, annullamento compensativo, modello opzionale, CER globale on-demand, lotti e tracciabilità.
- Test browser dei percorsi Cernita/Modelli e controllo regressione delle tab principali del Centro di Comando.
- Nessun dato demo persistente al termine dei test.

## Dettagli tecnici
La proposta allegata viene adattata, non copiata: le sue tabelle generiche (`codici_cer`, `movimenti_registro`, `lavorazioni_effettuate`) entrerebbero in conflitto con il sistema esistente. Verranno riutilizzate ed estese esclusivamente `dragon_items`, `dragon_transform_*`, `dragon_register_movements`, `dragon_stock_movements` e le allocazioni Dragon, preservando `company_id`, audit e movimenti compensativi.
