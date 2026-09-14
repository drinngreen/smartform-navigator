# Censimento automatismi database — 14/09/2026 (sola lettura)

Verifica completa di tutti gli automatismi attivi: 27 in totale (esclusi i banali
"aggiorna data modifica" e "normalizza codice CER", che non cambiano mai valori operativi).
Nessun dato è stato toccato durante questa verifica.

## 1. Automatismi che toccano le GIACENZE (4)

| Automatismo | Quando scatta | Cosa fa | Rischio |
|---|---|---|---|
| `trg_dragon_strict_stock_reconciliation` su `dragon_stock_movements` | a ogni movimento di magazzino Dragon | riallinea la giacenza operativa al saldo Dragon | **Basso** — direzione corretta (Dragon = fonte unica). Salta le righe di test. |
| `trg_dragon_auto_stock` / `trg_dragon_auto_stock_insert` su `dragon_register_movements` | quando un movimento di registro passa a CONSOLIDATO | crea il corrispondente movimento di magazzino | **Basso** — è la logica normale carico/scarico. |
| `trg_recalculate_stock_after_plant_movement` su `movimenti_impianto` | inserimento/modifica/eliminazione movimento impianto | ricalcola la giacenza del solo CER coinvolto | **Basso** — ricalcolo, non inventa quantità. |

**Rimosso il 14/09/2026:** `trg_magazzino_sync_to_dragon` — era l'unico che andava nella
direzione sbagliata (giacenza → Dragon) e generava scarichi automatici senza controllare la
disponibilità: è la causa dei saldi negativi del 12/09. **Non esiste più e non va ricreato.**

## 2. Automatismi su PRIVATI / RICEVUTE (6)

- `trg_assign_dbt_progressivo` — assegna il numero progressivo al conferimento.
- `trg_privato_allinea_data_registrazione` — allinea la data di registrazione a quella del conferimento.
- `trg_sync_privati_conferimento_to_inventory` — genera il movimento di magazzino del conferimento.
- `trg_sync_ricevuta_da_conferimento` — crea/aggiorna la ricevuta collegata.
- `trg_ricevuta_forza_coerenza_movimento` — impedisce che ricevuta e movimento divergano.
- `trg_ricevuta_blocca_eliminazione_isolata` — impedisce di cancellare una ricevuta lasciando orfano il movimento.

Gli ultimi due sono **protezioni**: bloccano operazioni sbagliate, non modificano dati.

## 3. Automatismi sui FORMULARI (5)

- `trg_guard_and_reserve_fir_on_insert` — riserva il numero FIR dal blocchetto.
- `trg_link_pool_row_after_fir_insert` — collega la riga del blocchetto al formulario.
- `trg_fir_forms_lock_numero_fir` — blocca la modifica del numero una volta assegnato.
- `trg_auto_release_on_soft_delete` — rimette a disposizione il numero se il formulario viene annullato.
- `route_completed_fir_to_impianto` — instrada il formulario completato alla posta dell'impianto.
- `trg_notify_fir_draft` — sola notifica.

Tutti legati alla numerazione: nessuno modifica pesi, quantità o giacenze.

## 4. Altri (protezioni, notifiche, contatori)

`trg_fatture_lock_guard` (blocca modifica fatture chiuse), `trg_dragon_validate_lot_balance`
(impedisce lotti in negativo), `trg_dragon_calo_peso`, `sync_anagrafica_rubrica`,
`trg_sync_privato_veicoli`, notifiche chiamate/messaggi, contatori like e commenti social.

## 5. Operazioni programmate

Una sola: **backup del database ogni ora**. Nessun'altra procedura automatica pianificata,
nessun processo che modifichi dati da solo nel tempo.

## Conclusione

Dopo la rimozione del trigger difettoso **non esiste più nessun automatismo che possa
modificare le giacenze senza un'operazione dell'utente**. Tutto ciò che resta o è un
ricalcolo fedele di dati già inseriti, o è una protezione che blocca errori.
Non risulta alcun automatismo in grado di bloccare l'operatività dell'app.
