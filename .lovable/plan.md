
Obiettivo corretto: il sistema Multyproget deve mantenere sempre una dotazione base automatica di FIR, cioè 1 bozza pronta per ogni trasportatore + 1 per Multyproget Impianto + 1 per Multyproget Conto Proprio. L’assegnazione manuale serve solo ad aggiungere FIR extra oltre a questa dotazione base.

1. Correggere prima le incongruenze che oggi rompono la logica
- Sistemare `MNTrasportatoriPage.tsx`: oggi il `CONTEXT_MAP` usa ancora il tenant consolidato `dc2a...` invece del tenant reale Multyproget `77ec9a3d-602e-438f-97bf-1c69abd8f691`.
- Uniformare tutti i punti che creano/filtrano utenti e FIR su quel tenant reale, altrimenti il database assegna i numeri a una società e l’interfaccia ne cerca un’altra.

2. Definire chiaramente i 3 gruppi di assegnazione automatica
- Gruppo A: trasportatori Multyproget (`profiles.mn_context = 'multyproget'`, ruolo user, tenant Multyproget).
- Gruppo B: bucket “Multyproget Impianto”.
- Gruppo C: bucket “Multyproget Conto Proprio”.
- Poiché oggi Impianto e Conto Proprio usano lo stesso admin loggato e non hanno un utente dedicato separato, servirà introdurre una regola esplicita backend per identificarli come destinatari della dotazione base. La soluzione più solida è creare/riusare 2 account operativi dedicati oppure aggiungere una funzione che gestisca 2 bucket speciali separati dal singolo utente admin.

3. Rifare la logica backend di distribuzione automatica
- Aggiornare le funzioni database coinvolte (`auto_distribute_fir_numbers`, `ensure_user_has_fir_draft`, `auto_assign_after_consume`).
- Nuova regola:
  - ogni destinatario “base” deve avere almeno 1 FIR disponibile/bozza;
  - quando un FIR viene consumato o annullato, il sistema pesca dal serbatoio condiviso e ricrea subito il rimpiazzo per quel destinatario;
  - i FIR extra assegnati manualmente non devono essere rimossi dalla logica automatica.
- Separare quindi “dotazione minima automatica” da “assegnazioni extra manuali”, evitando che la routine di ridistribuzione rimandi tutto nel pool condiviso.

4. Aggiungere un’assegnazione manuale davvero “extra”
- Nel pulsante “Assegna” di `DevGestioneFIRModule.tsx`, mantenere solo i trasportatori Multyproget.
- Quando l’admin assegna manualmente un FIR:
  - il numero va associato al trasportatore scelto;
  - non deve interferire con la bozza base automatica già garantita;
  - se quel trasportatore annulla o usa più FIR nello stesso giorno, il sistema continua comunque a garantirgli sempre almeno 1 bozza pronta.

5. Sistemare il pulsante “Crea FIR” nel Personale
- Il pulsante vicino a ogni nome deve creare una bozza aggiuntiva per quell’utente, non limitarsi a “garantire che ne esista una”.
- Quindi non basta chiamare sempre `ensure_user_has_fir_draft`: servirà un nuovo flusso che crei una nuova bozza extra da un numero disponibile del serbatoio.
- Risultato atteso:
  - automatico = 1 bozza minima sempre presente;
  - manuale “Crea FIR” = bozza extra immediata nella app del trasportatore.

6. Far funzionare sia modulo normale che modulo alternativo sui FIR assegnati
- Verificare `MNFIRFormComplete.tsx` e `FIRAlternativeForm.tsx` affinché lavorino sul FIR già assegnato alla persona giusta.
- Controllare che entrambi compongano la chiamata di firma digitale usando il contesto Multyproget corretto (`multy`) e il FIR associato alla bozza corrente.
- Verificare anche il post-firma/post-chiusura: consumo numero, refresh bozza successiva e aggiornamento stato nel pool.

7. Allineare la UX delle app e dei moduli soggetto
- Dev Impianto e Dev Conto Proprio oggi usano il form dell’utente admin, quindi non rappresentano due “dotazioni base” separate.
- Va deciso e implementato un mapping stabile:
  - o due account operativi dedicati;
  - oppure due bucket speciali gestiti da funzione backend e caricati nei rispettivi moduli.
- Poi i moduli Dev Impianto / Dev Conto Proprio dovranno leggere e usare il FIR del proprio bucket, non quello generico dell’admin.

8. Verifiche finali da fare dopo l’implementazione
- Controllare che i 30 FIR vengano distribuiti così: 1 per ogni trasportatore + 1 Impianto + 1 Conto Proprio, tutto il resto nel serbatoio condiviso.
- Usare un FIR da trasportatore e verificare che ne compaia subito un altro in bozza.
- Annullare una bozza e verificare che il numero torni disponibile e venga ristabilita la dotazione minima.
- Assegnare manualmente un FIR extra da “Gestione FIR” e verificare che il trasportatore abbia più di una bozza.
- Usare “Crea FIR” dal Personale e verificare che la bozza extra appaia davvero nella sua app.
- Testare end-to-end firma digitale da modulo normale, modulo alternativo e moduli soggetto.

Dettagli tecnici
- Problema già individuato nel codice: `MNTrasportatoriPage.tsx` usa tenant sbagliato (`dc2a...`) nel `CONTEXT_MAP`.
- Problema architetturale attuale: `ensure_user_has_fir_draft` garantisce al massimo una bozza per utente; non copre il concetto di “bozza base + extra manuali”.
- Problema funzionale attuale: Dev Impianto e Dev Conto Proprio non sono due assegnatari separati, perché usano lo stesso utente loggato.
- Lavoro richiesto in pratica:
  - correzione frontend;
  - migrazione SQL sulle funzioni FIR;
  - probabile introduzione di un nuovo RPC per creare bozza extra;
  - eventuale definizione persistente dei 2 destinatari speciali Impianto / Conto Proprio.

Sequenza consigliata
1. Fix tenant e filtri.
2. Definizione backend dei destinatari base.
3. Refactor funzioni automatiche FIR.
4. Nuovo flusso “bozza extra”.
5. Allineamento moduli normale/alternativo/soggetti.
6. Test end-to-end completo.
