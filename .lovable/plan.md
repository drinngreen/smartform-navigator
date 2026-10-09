# Compilare dal programma, firmare dall'app RENTRI

## Obiettivo
La segretaria (ufficio e app di Multyproget e Niyol) compila il formulario, preme «Invia al RENTRI» e lo firma nell'app RENTRI. Per l'impianto inserisce i kg accettati, preme «Invia accettazione» e firma nell'app RENTRI. Quando arriverà la firma elettronica basterà attivarla, senza rifare il resto.

## Cosa ho trovato (letto ora, sola lettura)
L'ultimo formulario inviato dal programma è ZRZXR 000772 TM (18/09). Il RENTRI ha risposto «ricevuto» (HTTP 202, solo accettazione tecnica). I dati inviati contengono errori che obbligano a rifarlo:
- conducente con nome e cognome uguali («KEVIN KEVIN»);
- indirizzo con CAP e città ripetuti dentro la via;
- nelle annotazioni il testo della vidimazione;
- ora di partenza in orario UTC (2 ore indietro);
- richiesta di firma di produttore e trasportatore, che senza firma elettronica non si può fare.

## Cosa faccio
1. **Dati corretti all'invio** (ufficio e app): nome e cognome del conducente presi separati dall'anagrafica; via, CAP e comune separati; annotazioni solo quelle scritte dall'operatrice; ora italiana; nessuna richiesta di firma automatica.
2. **Controllo prima dell'invio**: elenco dei campi mancanti o sbagliati, con il pulsante bloccato finché non sono corretti. Anteprima di cosa arriverà sul RENTRI.
3. **Dopo l'invio**: il formulario resta «Inviato — da firmare nell'app RENTRI». Il programma rilegge il RENTRI e passa a «Partito» solo quando trova la firma. Niente nuovo invio dello stesso formulario.
4. **Impianto, chiusura**: per i formulari in arrivo l'operatrice mette data, ora, kg accettati, esito (totale, parziale o respinto, con motivo obbligatorio se non totale) e preme «Invia accettazione». Lo stato diventa «Accettazione inviata — firma nell'app RENTRI». Registro e giacenze **non** cambiano qui: si registrano con il click esistente solo quando il RENTRI conferma il formulario chiuso. Blocco 21/09 sempre attivo.
5. **Interruttore firma elettronica**: predisposto e spento. Si accende la prossima settimana con la tua configurazione.
6. **Guida**: aggiornata per ufficio, app e impianto.

## Prove
Solo in lettura e con anteprime: nessun invio al RENTRI da parte mia. Ricostruisco il payload di ZRZXR 000772 TM e mostro prima/dopo. Il primo invio vero lo fa la segretaria e io lo rileggo sul RENTRI.

## Dettagli tecnici
- `src/lib/rentriFormMapper.ts`, `src/lib/rentriFirPayloadFromStore.ts`: conducente da anagrafica, `parseAddress` corretto, `data_ora_inizio_trasporto` con fuso Europe/Rome, `firma_produttore/trasportatore` da flag `FIRMA_API_ATTIVA` (false).
- Validazione condivisa in `src/lib/rentriValidazione.ts`, usata da `FIRRentriActions`, `MNFIRFormComplete` e dalle app autisti.
- Impianto: `signIncomingXFir` senza firma, stato «accettazione_inviata»; aggiornamento stato tramite rilettura GET.
- Nessuna modifica a giacenze, cernite, registri o dati esistenti.
