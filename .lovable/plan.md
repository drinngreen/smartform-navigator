# Allineamento definitivo ricevute e movimenti privati

## Obiettivo
Rendere obbligatoria e automatica la corrispondenza **1 movimento privato = 1 ricevuta**, mantenendo i movimenti esistenti invariati e senza intervenire sulle logiche di giacenze, cernite o tabelle Dragon.

## Correzione dei dati esistenti
- Creare le 50 ricevute mancanti partendo esclusivamente dai rispettivi movimenti.
- Allineare per ogni ricevuta collegata:
  - data emissione = data del movimento;
  - anno = anno del movimento;
  - numero ricevuta = progressivo cronologico del movimento nel formato `00001/2026`;
  - privato, tenant, impianto, gruppo e importo dai dati già registrati.
- Correggere solo `created_at` delle anagrafiche private che risultano create dopo il loro primo movimento, portandolo alla data del primo movimento. Nessun movimento sarà modificato.
- Eliminare la possibilità di ricevute scollegate create manualmente.

## Regole permanenti nel database
- Aggiungere unicità sul collegamento `ricevute_privati.conferimento_id`, impedendo doppie ricevute per lo stesso movimento.
- Aggiungere una funzione/trigger dedicata che, dopo la creazione di ogni movimento privato, crea automaticamente la relativa ricevuta se manca.
- Quando cambia la data o il progressivo del movimento, sincronizzare automaticamente data, anno e numero della ricevuta collegata.
- Impedire modifica manuale dei campi identificativi della ricevuta in contrasto col movimento.
- Impedire la cancellazione isolata di una ricevuta finché esiste il movimento collegato; la cancellazione in cascata resta ammessa quando viene eliminato il movimento.
- Validare che l’anagrafica del privato non possa avere una data di creazione successiva alla data del movimento. La creazione atomica userà una data anagrafica coerente senza alterare il movimento.
- Rendere la generazione dei progressivi concorrente e deterministica tramite lock per tenant/impianto/anno.

## Applicazione
- Aggiornare la funzione atomica dei conferimenti affinché non generi più una sola ricevuta di gruppo: ogni riga/movimento riceverà la propria ricevuta tramite la regola centrale.
- Rimuovere dalla UI la creazione manuale di ricevute scollegate e la cancellazione isolata, lasciando stampa ed esportazione.
- Correggere anche il vecchio percorso di inserimento conferimenti affinché usi la data del movimento, non la data odierna.

## Verifiche obbligatorie
- Snapshot prima/dopo dei conteggi e dei saldi di `magazzino_giacenze` e `dragon_stock_movements`.
- Query di integrità con risultato atteso zero per:
  - movimenti senza ricevuta;
  - ricevute senza movimento;
  - date/anni/numeri discordanti;
  - doppie ricevute;
  - privati creati dopo il primo movimento.
- Test di regressione permanente sulle nuove regole SQL/UI.
- Esecuzione di `node scripts/verify.mjs --smoke`.
- Conferma esplicita che quantità, movimenti di magazzino e dati Dragon non abbiano subito variazioni.

## Dettagli tecnici
La modifica sarà una migrazione transazionale: se una verifica interna non torna, l’intera operazione viene annullata. Non verranno eseguiti `UPDATE` su `privati_conferimenti`, `movimenti_impianto`, `magazzino_giacenze` o tabelle `dragon_*`; saranno aggiornate esclusivamente `ricevute_privati` e le date anagrafiche incoerenti in `anagrafica_privati`.
