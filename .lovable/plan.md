# Messa in sicurezza delle giacenze prima di ogni nuova funzione

App autisti e API RENTRI vengono messe in coda. Priorità assoluta: rendere le giacenze prevedibili, tracciate e modificabili da un solo punto. In questa fase **non si tocca nessun dato**: nessuna giacenza, cernita, ricevuta, movimento o conferimento viene modificato.

## Risposte alle tue quattro domande (lette ora dal database e dal codice)

**Quali punti scrivono oggi le giacenze?** Nove, su tre livelli diversi:

Automatismi nel database (trigger, scattano da soli):
1. `trg_recalculate_stock_after_plant_movement` su `movimenti_impianto` — ricalcola la giacenza a ogni inserimento, modifica **e cancellazione** di un movimento d'impianto.
2. `trg_sync_privati_conferimento_to_inventory` su `privati_conferimenti` — ogni conferimento privato muove la giacenza.
3. `trg_dragon_strict_stock_reconciliation` su `dragon_stock_movements` — ogni movimento Dragon si riversa sulle giacenze.
4. `trg_dragon_auto_stock_insert` e `trg_dragon_auto_stock` su `dragon_register_movements` — ogni riga di registro Dragon, in inserimento **e in modifica**, genera da sola un movimento di magazzino, che poi finisce sulle giacenze tramite il punto 3. È la catena più pericolosa: tre passaggi automatici a cascata da un'unica scrittura.

Chiamate dirette dal programma (l'utente clicca, la giacenza si ricalcola):
5. `recalculate_magazzino_giacenza` invocata da almeno cinque schermate diverse: Giacenze, Magazzino, Privati, widget movimenti privati, salvataggio definitivo dei formulari (`src/lib/firFinalSync`).
6. Procedure atomiche: `esegui_cernita_atomica`, `crea_conferimento_privato_atomico`, `dragon_create/complete/cancel_cernita_atomic`, `dragon_merge_lot_atomic`, `dragon_split_lot_atomic`.
7. Inserimenti diretti su `dragon_register_movements` / `dragon_stock_movements` dalle pagine Dragon (ingresso, carico/scarico, scarico uscita, scarico cumulativo, cernite batch, magazzino).
8. L'assistente AI (funzione server `dark-lemon-mn`) scrive **direttamente** su registro e movimenti Dragon: oggi l'AI può muovere le giacenze.
9. Nel codice convivono file duplicati `.js` e `.tsx` con la stessa logica di scrittura (es. `firFinalSync`, `DevMagazzinoModule`, pagine Dragon): due versioni della stessa procedura, non sempre identiche. Va verificato quale delle due gira davvero.

**Quali job girano senza intervento umano?** Uno solo: `db-backup-hourly`, un backup ogni ora. **Nessun job notturno tocca le giacenze.** Il trigger sbagliato giacenza→Dragon è stato rimosso il 14/09 e non è stato ricreato.

**Qual è il punto unico di verità?** Oggi **non esiste**. `magazzino_giacenze` è una tabella di saldi ricalcolata da fonti diverse (movimenti d'impianto, conferimenti privati, movimenti Dragon), con formule non allineate tra loro. Questa è la causa strutturale dell'instabilità, non un bug singolo.

## Fase 1 — Messa in sicurezza (prima cosa che facciamo)

1. **Censimento certificato**: documento con i 9 punti di scrittura sopra, cosa scrive ciascuno, quando scatta, e qual è la formula usata. Solo lettura.
2. **Log obbligatorio di ogni variazione**: nuova tabella di registro variazioni giacenze. Ogni cambiamento scrive automaticamente: CER, valore prima, valore dopo, differenza, chi l'ha fatto, da quale schermata/procedura, data e ora. Non cambia nessun saldo: registra e basta. Da questo momento nulla può più muoversi "senza che si sappia perché".
3. **Congelamento degli automatismi non essenziali**: disattivazione della catena a cascata Dragon (punti 4 e 3). Restano solo scritture volute e tracciate. Nessun saldo viene modificato dalla disattivazione.
4. **Blocco dell'AI sulle giacenze**: Dark Lemon perde il permesso di scrivere su registro e movimenti; può solo leggere e proporre.
5. **Pulizia dei doppi percorsi**: rimozione dei file duplicati che contengono la stessa logica di scrittura, dopo aver verificato quale versione gira.

## Fase 2 — Stabilizzazione: un solo punto di aggiornamento

- Una sola procedura autorizzata a modificare le giacenze, con firma unica: CER, quantità, segno, causale, documento di origine, utente. Tutto il resto del programma passa da lì.
- Ogni schermata che oggi ricalcola per conto suo viene ricondotta a quella procedura.
- Comportamento deterministico: stessa azione ripetuta = stesso risultato, nessun effetto collaterale (la procedura è idempotente per documento).
- Controllo di coerenza: prova di confronto che, sui dati attuali e senza toccarli, verifica che il saldo ricalcolato coincida con quello registrato, CER per CER. Le differenze si elencano, non si correggono da sole.
- Nessuna correzione automatica: se un saldo non torna, il programma lo segnala e si ferma.

## Fase 3 — RENTRI

Si affronta solo quando la Fase 2 è chiusa e il confronto dei saldi resta stabile per alcuni giorni.

## Fase 4 — App autisti

Si costruisce sopra la base stabile, con la regola già concordata: nel formulario digitale la firma del destinatario chiude tutto e aggiorna le giacenze in automatico; nel cartaceo l'aggiornamento è manuale; i movimenti a registro restano "incompleti" fino alla chiusura.

## Dettagli tecnici

- **Log**: tabella `giacenze_audit_log` (cer, tenant/company, qty_prima, qty_dopo, delta, origine testuale, utente, timestamp, riferimento documento) alimentata da un trigger `AFTER INSERT/UPDATE/DELETE` su `magazzino_giacenze`, con RLS + GRANT (lettura admin, scrittura solo interna). Unico automatismo nuovo ammesso, perché non altera dati.
- **Congelamento**: `DROP TRIGGER trg_dragon_auto_stock` e `trg_dragon_auto_stock_insert` su `dragon_register_movements` (le funzioni restano in database, riattivabili); valutazione separata per `trg_dragon_strict_stock_reconciliation`, che resta finché le pagine Dragon non passano dalla procedura unica.
- **Punto unico**: funzione `applica_movimento_giacenza(...)` in database, con chiave di idempotenza sul documento di origine; `recalculate_magazzino_giacenza` resta solo come strumento diagnostico in sola lettura (versione `simula_` che restituisce le differenze senza scrivere).
- **Chiamanti da ricondurre**: `src/lib/firFinalSync.*`, `DevGiacenzeModule`, `DevMagazzinoModule`, `DevPrivatiModule`, `PrivatiMovimentiWidget`, pagine `src/pages/dragon/*`, `ScaricoLavorazioneDialog`, `ContoTerziManualDialog`.
- **AI**: rimozione degli strumenti di scrittura su `dragon_register_movements`/`dragon_stock_movements` da `supabase/functions/dark-lemon-mn`.
- **Duplicati**: verifica di quale estensione risolve Vite e rimozione dei `.js` compilati doppioni sotto `src/`.
- **Verifica a ogni passo**: `node scripts/verify.mjs --smoke`, conteggio e totale giacenze letti prima e dopo ogni intervento (incluse le righe `is_system_hidden`), screenshot reale della schermata Giacenze come prova che nulla si è mosso.

## Ordine di lavoro

1. Log delle variazioni attivo (nessun dato toccato).
2. Censimento certificato consegnato.
3. Congelamento catena Dragon + blocco scritture AI + pulizia duplicati.
4. Procedura unica di aggiornamento e riconduzione di tutti i chiamanti.
5. Confronto saldi ricalcolati vs registrati, in sola lettura, per alcuni giorni.
6. Solo dopo: RENTRI, poi app autisti.
