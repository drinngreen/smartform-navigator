# Giacenze: nulla si muove da solo, tutto si muove alla pesata

Regola unica che governa tutto il sistema:

**Un movimento modifica le giacenze solo quando è EFFETTIVO. È effettivo solo quando il peso è certificato dal destinatario.**

- **Formulario digitale**: la firma del destinatario (Multyproget o impianto esterno) rende il movimento effettivo. In quel momento, e solo in quel momento, le giacenze si aggiornano **in automatico, senza intervento umano**, con il peso riscontrato dal destinatario.
- **Formulario cartaceo**: nessun aggiornamento automatico mai. Il movimento resta potenziale finché un operatore Multyproget, ricevuta la copia pesata dal destinatario, non preme il pulsante di conferma inserendo il peso reale. Solo allora diventa effettivo e le giacenze si aggiornano.
- **Nessun altro evento** (apertura FIR, compilazione, firma del produttore o del trasportatore, salvataggio, sincronizzazione, job) può toccare le giacenze. Mai.

Il cartaceo resta disponibile come alternativa permanente, per i giorni in cui RENTRI non risponde.

## I tre casi che hai descritto

1. **Multy trasportatore** (materiale di terzi): non tocca mai le giacenze di Multyproget, in nessun caso. Il movimento è solo di transito e va a registro come trasporto, non come carico o scarico di magazzino.
2. **Multy destinatario**: è Multyproget stesso che pesa. La pesata inserita alla chiusura è la certificazione: giacenza in carico con il peso riscontrato, non con quello dichiarato alla partenza.
3. **Multy produttore / uscita da impianto**: si attende la pesata del destinatario. Il movimento resta potenziale fino a quel momento, anche se il camion è già partito. Digitale: scarica da solo alla firma del destinatario. Cartaceo: scarica al pulsante.

## Stato dei movimenti: potenziale, effettivo, rettificato

Ogni movimento di registro nasce **potenziale** (oggi diresti "incompleto"): visibile, stampabile, tracciato, ma non conteggiato nelle giacenze e non inviabile a RENTRI.

Diventa **effettivo** solo con il peso certificato: firma del destinatario nel digitale, conferma manuale nel cartaceo. Da quel momento pesa sulle giacenze ed è candidabile all'invio carico/scarico RENTRI.

I registri contengono **solo movimenti effettivi**, siano essi:
- interni (cernite, miscelazioni, lavorazioni, che sono effettivi nel momento in cui l'operazione è eseguita e pesata in impianto);
- esterni (carichi e scarichi, effettivi alla pesata del destinatario).

Un movimento respinto in tutto non diventa mai effettivo. Respinto in parte: diventa effettivo solo per la quota accettata e pesata.

Le rettifiche non cancellano: generano un movimento inverso di pari importo, come già fatto finora.

## Cosa va disattivato

Oggi, letti nel database e nel codice, scrivono giacenze nove punti su tre livelli: quattro automatismi nel database (movimenti d'impianto, conferimenti privati, movimenti Dragon, più la catena a cascata registro Dragon → magazzino → giacenze), i ricalcoli chiamati da cinque schermate, le procedure atomiche di cernita e privati, gli inserimenti diretti delle pagine Dragon, l'assistente AI che oggi può scrivere davvero, e file duplicati `.js`/`.tsx` con la stessa logica. Job notturni: nessuno tocca le giacenze, gira solo un backup orario.

Di questi restano in piedi solo i percorsi che passano dal punto unico. Si spengono la catena a cascata Dragon, i ricalcoli sparsi nelle schermate e la scrittura dell'AI. **Spegnere un automatismo non cambia nessun saldo esistente.**

## Ordine di lavoro

1. **Log obbligatorio** di ogni variazione di giacenza (chi, quando, da dove, prima/dopo, differenza, documento di origine). Nessun dato toccato: si registra e basta. Da qui in poi nulla può più muoversi senza che si sappia perché.
2. **Stato del movimento** (potenziale/effettivo) introdotto su registro e movimenti, con tutti i movimenti storici già esistenti marcati effettivi, così i saldi attuali non cambiano di un chilo.
3. **Punto unico di aggiornamento**: una sola procedura autorizzata a modificare le giacenze, idempotente per documento. Tutto il resto del programma passa da lì.
4. **Spegnimento** della catena Dragon, dei ricalcoli sparsi e delle scritture AI; pulizia dei file duplicati.
5. **Chiusura digitale**: la firma del destinatario rende effettivo il movimento e aggiorna le giacenze in automatico via punto unico.
6. **Pulsante cartaceo**: solo per formulari cartacei/esterni, riservato agli operatori autorizzati, richiede peso ed esito.
7. **Coda RENTRI**: solo i movimenti effettivi entrano nella coda carico/scarico. Nessun invio di movimenti potenziali.
8. **Confronto saldi** in sola lettura per alcuni giorni: ricalcolato contro registrato, CER per CER. Le differenze si elencano, non si correggono da sole.

Solo dopo che il confronto resta stabile si riprende con l'app autisti.

## Dettagli tecnici

- **Log**: `giacenze_audit_log` (cer, tenant/company, qty_prima, qty_dopo, delta, origine, utente, documento, timestamp) alimentata da trigger `AFTER INSERT/UPDATE/DELETE` su `magazzino_giacenze`, con RLS + GRANT (lettura admin, scrittura interna). Unico automatismo nuovo ammesso perché non altera dati.
- **Stato**: colonna `stato_movimento` (`potenziale` | `effettivo` | `annullato`) su `registro_generale` e `movimenti_impianto`, default `effettivo` per lo storico via backfill esplicito, `potenziale` per i nuovi inserimenti da FIR non chiusi. Migrazione strutturale, nessuna riscrittura di valori esistenti.
- **Punto unico**: `applica_movimento_giacenza(cer, qty, segno, causale, documento, utente)` con chiave di idempotenza sul documento; `recalculate_magazzino_giacenza` degradata a strumento diagnostico in sola lettura (`simula_`, restituisce le differenze senza scrivere).
- **Chiamanti da ricondurre**: `src/lib/firFinalSync.*`, `DevGiacenzeModule`, `DevMagazzinoModule`, `DevPrivatiModule`, `PrivatiMovimentiWidget`, `src/pages/dragon/*`, `ScaricoLavorazioneDialog`, `ContoTerziManualDialog`.
- **Spegnimenti**: `DROP TRIGGER trg_dragon_auto_stock` e `trg_dragon_auto_stock_insert` su `dragon_register_movements` (funzioni conservate, riattivabili); `trg_dragon_strict_stock_reconciliation` valutato separatamente finché le pagine Dragon non passano dal punto unico.
- **Chiusura digitale**: `MNImpiantoDestinatarioPage.tsx` scrive peso riscontrato + esito, passa il movimento a `effettivo` e chiama il punto unico; il ruolo trasportatore è escluso dall'effetto giacenza.
- **Cartaceo**: pulsante "Conferma pesata e aggiorna giacenze" nelle schermate Multyproget, abilitato solo su formulari `cartaceo`/`esterno` in stato potenziale.
- **AI**: rimozione degli strumenti di scrittura su `dragon_register_movements`/`dragon_stock_movements` da `supabase/functions/dark-lemon-mn`.
- **Verifica a ogni passo**: `node scripts/verify.mjs --smoke`, conteggio e totale giacenze letti prima e dopo ogni intervento (incluse le righe `is_system_hidden`), screenshot reale della schermata Giacenze come prova che nulla si è mosso.
