# Giacenze: nulla si muove da solo, tutto si muove alla pesata

Regola unica che governa tutto il sistema:

**Un movimento modifica le giacenze solo quando è EFFETTIVO. È effettivo solo quando il peso è certificato.**

- **Formulario digitale**: la firma del destinatario (Multyproget o impianto esterno) rende il movimento effettivo. In quel momento, e solo in quel momento, le giacenze si aggiornano **in automatico, senza intervento umano**, con il peso riscontrato dal destinatario.
- **Formulario cartaceo**: nessun aggiornamento automatico mai. Il movimento resta potenziale finché un operatore Multyproget, ricevuta la copia pesata dal destinatario, non preme il pulsante di conferma inserendo il peso reale.
- **Conferimenti dei privati**: il peso è certificato dalla pesa in impianto nel momento stesso del conferimento, quindi **il conferimento privato aggiorna sempre le giacenze**, come fa oggi. Nulla cambia in questo flusso.
- **Cernite e lavorazioni interne**: **non si toccano**. Funzionano e devono continuare a funzionare esattamente come oggi, con le stesse procedure atomiche. Nessuna modifica, nessuna riscrittura, nessun passaggio forzato altrove.
- **Nessun altro evento** (apertura FIR, compilazione, firma del produttore o del trasportatore, salvataggio, sincronizzazione, job) può toccare le giacenze.

Il cartaceo resta disponibile come alternativa permanente, per i giorni in cui RENTRI non risponde.

## I tre casi dei formulari

1. **Multy trasportatore** (materiale di terzi): non tocca mai le giacenze di Multyproget. Transito, a registro come trasporto.
2. **Multy destinatario**: pesa Multyproget stessa. La pesata alla chiusura è la certificazione: carico con il peso riscontrato, non con quello dichiarato alla partenza.
3. **Multy produttore / uscita da impianto**: si attende la pesata del destinatario, anche se il camion è già partito. Digitale: scarica da solo alla firma del destinatario. Cartaceo: scarica al pulsante.

## L'AI agent: può compilare, non può confermare

Dark Lemon resta un agente operativo, non viene ridotto a sola lettura. Cambia il confine:

- **Può fare**: leggere tutto, compilare formulari e moduli, preparare movimenti, proporre cernite, precompilare conferimenti, riempire le tendine, segnalare incongruenze.
- **Non può fare**: rendere effettivo un movimento, aggiornare una giacenza, chiudere un formulario, confermare una pesata.
- **Ogni proposta dell'AI nasce in stato potenziale/bozza** e resta visibile con l'indicazione di chi l'ha creata. Diventa reale solo quando una persona preme conferma.
- Nessuna scrittura silenziosa: ogni azione dell'AI compare nel log con autore "agent" e attende la conferma umana.

## Stato dei movimenti: potenziale, effettivo, rettificato

Ogni movimento di registro nasce **potenziale**: visibile, stampabile, tracciato, ma non conteggiato nelle giacenze e non inviabile a RENTRI.

Diventa **effettivo** con il peso certificato: firma del destinatario nel digitale, conferma manuale nel cartaceo, pesata in impianto per i conferimenti privati, esecuzione della lavorazione per le cernite.

I registri contengono **solo movimenti effettivi**, siano essi interni (cernite, miscelazioni, lavorazioni) o esterni (carichi e scarichi).

Respinto in tutto: non diventa mai effettivo. Respinto in parte: effettivo solo per la quota accettata e pesata. Le rettifiche non cancellano, generano un movimento inverso di pari importo, come oggi.

## Cosa va disattivato, cosa resta

Oggi scrivono giacenze nove punti. Restano intatti, perché già certificano un peso reale: i conferimenti privati, le procedure atomiche di cernita e lavorazione, i movimenti d'impianto confermati.

Si spengono solo i percorsi doppi e non controllati: la catena a cascata registro Dragon → magazzino → giacenze, i ricalcoli sparsi chiamati da cinque schermate diverse, i file duplicati `.js`/`.tsx` con la stessa logica, e la possibilità per l'AI di scrivere un movimento già effettivo.

**Spegnere un automatismo non cambia nessun saldo esistente.** Job notturni: nessuno tocca le giacenze, gira solo un backup orario.

## Ordine di lavoro

1. **Log obbligatorio** di ogni variazione di giacenza (chi — persona o agent —, quando, da dove, prima/dopo, differenza, documento). Nessun dato toccato.
2. **Stato del movimento** (potenziale/effettivo) su registro e movimenti, con tutto lo storico marcato effettivo: i saldi attuali non cambiano di un chilo.
3. **Punto unico di aggiornamento** delle giacenze, idempotente per documento, usato da tutti i percorsi che restano — cernite e conferimenti privati compresi, senza cambiarne il comportamento visibile.
4. **Spegnimento** della catena Dragon, dei ricalcoli sparsi e delle scritture dirette dell'AI; pulizia dei duplicati.
5. **Conferma umana** per ogni proposta dell'agent: pulsante di conferma sulle bozze create dall'AI.
6. **Chiusura digitale**: la firma del destinatario rende effettivo il movimento e aggiorna le giacenze in automatico.
7. **Pulsante cartaceo**: solo per formulari cartacei/esterni, operatori autorizzati, richiede peso ed esito.
8. **Coda RENTRI**: solo movimenti effettivi entrano nel carico/scarico.
9. **Confronto saldi** in sola lettura per alcuni giorni: ricalcolato contro registrato, CER per CER. Differenze elencate, mai corrette da sole.

Prima e dopo ogni passo: prova di regressione sulle cernite (creazione, completamento, annullamento) e confronto dei saldi, con screenshot reale.

## Dettagli tecnici

- **Log**: `giacenze_audit_log` (cer, tenant/company, qty_prima, qty_dopo, delta, origine, attore `human|agent`, documento, timestamp), trigger `AFTER INSERT/UPDATE/DELETE` su `magazzino_giacenze`, RLS + GRANT. Unico automatismo nuovo ammesso: registra, non altera.
- **Stato**: colonna `stato_movimento` (`potenziale` | `effettivo` | `annullato`) su `registro_generale` e `movimenti_impianto`, backfill esplicito a `effettivo` per lo storico. Migrazione strutturale, nessun valore riscritto.
- **Intatti**: `esegui_cernita_atomica`, `dragon_create/complete/cancel_cernita_atomic`, `dragon_merge/split_lot_atomic`, `crea_conferimento_privato_atomico` e `trg_sync_privati_conferimento_to_inventory` restano come sono; vengono solo coperti dal log e dai test di regressione.
- **Punto unico**: `applica_movimento_giacenza(cer, qty, segno, causale, documento, attore)` con chiave di idempotenza; `recalculate_magazzino_giacenza` degradata a diagnostica in sola lettura (`simula_`).
- **Spegnimenti**: `DROP TRIGGER trg_dragon_auto_stock` e `trg_dragon_auto_stock_insert` su `dragon_register_movements` (funzioni conservate); `trg_dragon_strict_stock_reconciliation` valutato a parte.
- **Chiamanti da ricondurre**: `src/lib/firFinalSync.*`, `DevGiacenzeModule`, `DevMagazzinoModule`, `DevPrivatiModule`, `PrivatiMovimentiWidget`, `src/pages/dragon/*`, `ScaricoLavorazioneDialog`, `ContoTerziManualDialog`.
- **Chiusura digitale**: `MNImpiantoDestinatarioPage.tsx` scrive peso riscontrato + esito, porta il movimento a `effettivo` e chiama il punto unico; il ruolo trasportatore è escluso dall'effetto giacenza.
- **Cartaceo**: pulsante "Conferma pesata e aggiorna giacenze", abilitato solo su formulari cartacei/esterni in stato potenziale.
- **AI**: in `supabase/functions/dark-lemon-mn` gli strumenti di scrittura passano a creare solo bozze (`stato_movimento = 'potenziale'`, `created_by_agent = true`); nessuno strumento può impostare `effettivo` né chiamare il punto unico.
- **Verifica a ogni passo**: `node scripts/verify.mjs --smoke`, conteggio e totale giacenze letti prima e dopo (incluse le righe `is_system_hidden`), screenshot reale della schermata Giacenze e una cernita di prova creata e annullata come prova che il flusso è intatto.
