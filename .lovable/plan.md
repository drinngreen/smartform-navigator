

# Piano Raffinato: Macro-area "Registro & Magazzino" — Dragon Rifiuti 2

## Separazione architetturale (principio tassativo)

Un `dragon_register_movement` può generare **zero o più** `dragon_stock_movements`. Una `dragon_transform_batch` genera **sia** `dragon_register_movements` **sia** `dragon_stock_movements`. Queste tre entità non devono MAI essere fuse in un'unica tabella. Sono livelli distinti:

```text
REGISTER (normativo)  ──1:N──▶  STOCK (fisico)
                                    ▲
TRANSFORM (processo)  ──1:N──▶  REGISTER  ──1:N──▶  STOCK
```

- **Register**: obblighi normativi, cronologia, progressivi, stati RENTRI
- **Stock**: effetto fisico su giacenza, derivato da register o da transform
- **Transform**: lavorazione/cernita, genera entrambi i livelli superiori

## Campi minimi espliciti delle tabelle chiave

### dragon_register_movements
`id`, `company_id`, `register_id`, `movement_number`, `movement_date`, `recording_date`, `item_id`, `cer_code` (denorm.), `movement_type` (CARICO|SCARICO), `cause_id`, `quantity`, `unit_of_measure`, `sign` (PLUS|MINUS), `source_site_id` (nullable), `source_context` (UL|FUORI_UL), `linked_document_id` (nullable), `weight_status`, `status` (BOZZA→CONSOLIDATO→STAMPATO→INVIATO_RENTRI), `parent_movement_id`, `source_transform_batch_id`, `created_by`, `created_at`, `updated_at`, `deleted_at`

### dragon_stock_movements
`id`, `company_id`, `item_id`, `movement_date`, `cause_id`, `quantity`, `sign` (PLUS|MINUS), `warehouse_scope` (WASTE|MPS), `source_register_movement_id`, `source_transform_batch_id`, `source_document_id`, `lot_reference`, `note`, `created_by`, `created_at`

### dragon_transform_batches
`id`, `company_id`, `model_id`, `execution_date`, `source_register_movement_id`, `source_item_id`, `input_quantity`, `status` (BOZZA|CONFERMATA|ANNULLATA), `notes`, `created_by`, `created_at`

## RLS: company_id unico, niente legacy

Tutte le tabelle `dragon_*` usano **esclusivamente** `company_id` (UUID). Non si usano mai le vecchie colonne `organization_id` o `tenant_id`. Ogni query UI passa il `company_id` corrente dal profilo MN (via `mnContextStore` → tenant UUID). Le RLS policy saranno:
- SELECT/INSERT/UPDATE: `company_id = get_user_tenant(auth.uid())` OR `has_role(auth.uid(), 'admin')`
- Nessun DELETE diretto (soft delete via `deleted_at`)

## Cernite: logica input/output esplicita

Quando si conferma un `dragon_transform_batch`:
1. Crea **uno scarico di lavorazione** (`SCARICO_PER_LAVORAZIONE`) su `dragon_register_movements` per l'input
2. Crea **uno o più carichi** (`CARICO_DA_LAVORAZIONE`) su `dragon_register_movements` per ogni output di tipo `WASTE_CER`
3. Crea **movimenti di magazzino** su `dragon_stock_movements` per ogni output di tipo `MPS` o `MATERIAL` (warehouse_scope = MPS)
4. Tutti i record sono collegati via `source_transform_batch_id`
5. L'annullamento crea movimenti inversi, non cancella righe

## Dark Lemon: tabelle dragon_* esclusive

In FASE 6, il system prompt di Dark Lemon sarà aggiornato con regola esplicita: "Quando l'utente chiede funzioni su registro, magazzino, giacenze, cernite o lavorazioni, usa **sempre** le tabelle `dragon_*` e **mai** quelle legacy (`register_movements`, `movimenti_impianto`, `cernite`, `cernita_output`)."

## Fasi di implementazione

### FASE 1 — Database
- 16 enum, 14 tabelle `dragon_*`, indici, RLS, trigger per stock auto-generation, funzione progressivo
- Seed 13 causali pre-caricate

### FASE 2 — Anagrafiche CRUD
- Items (CER/MPS/MAT), Cantieri, Documenti, Registri
- Selettori riutilizzabili (CER picker, causale picker)

### FASE 3 — Registro cronologico
- Griglia con filtri avanzati, export Excel
- Form nuovo movimento dinamico (campi guidati da causale)
- Wizard carico/scarico contestuale (2 movimenti atomici + stock)
- Scarico cumulativo con allocazioni FIFO (`dragon_movement_allocations`)

### FASE 4 — Magazzino
- Vista saldi per item (WASTE vs MPS), ledger movimenti
- Rettifiche (aggiunta/sottrazione/inventariale) con motivo obbligatorio
- Dati demo per test iniziali

### FASE 5 — Cernite/Lavorazioni
- CRUD modelli (input → N output con % o fisso)
- Wizard esecuzione batch con logica input/output sopra descritta
- Annullamento con movimenti inversi

### FASE 6 — Audit + Dark Lemon
- Vista audit trail (`dragon_audit_logs`)
- Aggiornamento system prompt Dark Lemon con consapevolezza esclusiva `dragon_*`

