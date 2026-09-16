# Anagrafica automatica e flusso FIR comprensibile

## Obiettivo
- Ogni nuova azienda compilata nel formulario viene registrata nell'anagrafica corretta quando si salva la bozza, senza creare duplicati.
- Ogni indirizzo operativo nuovo viene registrato come sede operativa dell'azienda e diventa subito disponibile nelle tendine.
- Il percorso digitale viene mostrato in ordine chiaro: bozza → invio/firma di partenza → viaggio → arrivo → pesata ed esito → firma destinatario → chiusura RENTRI.

## Modifiche
1. **Salvataggio automatico in anagrafica**
   - Al salvataggio della bozza, confrontare produttore, destinatario, trasportatore e intermediario con l'anagrafica del tenant.
   - Creare solo i soggetti realmente nuovi; aggiornare il soggetto esistente quando coincide per CF/P.IVA.
   - Se l'indirizzo usato nel FIR è diverso dalla sede legale e non esiste già, salvarlo in “Sedi operative / unità locali”.
   - Evitare duplicati tramite confronto normalizzato di CF/P.IVA e indirizzo; mostrare un esito chiaro del salvataggio.

2. **Flusso digitale senza ambiguità**
   - Separare nettamente “Invia e firma la partenza” da “Sono arrivato”.
   - “Sono arrivato” apre la fase di destinazione ma non chiude nulla e non modifica giacenze.
   - Nella fase di destinazione rendere obbligatori peso reale, data/ora, esito (totale/parziale/respinto) ed eventuale motivazione.
   - Solo “Firma del destinatario e chiudi FIR” invia l'accettazione a RENTRI; solo dopo il successo applica registro e giacenze tramite il percorso unico già autorizzato.
   - Mostrare sempre lo stato corrente e il prossimo passo, sia in ufficio sia nell'app autista.

3. **Sicurezza e verifica**
   - Nessuna bozza, partenza o semplice arrivo modifica registro o giacenze.
   - Nessun invio RENTRI reale durante la verifica automatica.
   - Eseguire `node scripts/verify.mjs --smoke`, controllare il flusso nel browser e confrontare prima/dopo giacenze, cernite e righe nascoste (`is_system_hidden`).
