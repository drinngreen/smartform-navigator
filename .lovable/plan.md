

## Piano: Allineamento Magazzino Dragon al flusso Prometeo

Basandomi sulla descrizione dettagliata del software Prometeo, ecco le funzionalità mancanti e le modifiche necessarie per allineare il sistema Dragon allo stesso flusso operativo.

---

### Cosa manca rispetto a Prometeo

1. **Articoli — campi mancanti**: fattore di conversione (quando U.M. diversa da kg), sezione "Comunicazione Enti" con tipo MPS/EOW (MPS, EOW, Altro + descrizione), magazzino predefinito
2. **Magazzini multipli**: Prometeo gestisce N magazzini (aree di stoccaggio) con codice, descrizione, flag CER/MPS, limiti di giacenza e associazione a unità locale. Dragon oggi ha solo `warehouse_scope` (WASTE/MPS) senza entità magazzino
3. **Inserimento movimenti manuali dal Magazzino**: form multi-riga per carico/scarico con data registrazione, causale, codice articolo, quantità — attualmente il form esiste solo come rettifica, non come movimento generico
4. **Filtri sui movimenti**: per data, articolo, causale, ambito
5. **Tracciabilità (Rintraccia/Traccia)**: doppio click su un movimento per vedere il collegamento a formulario, scarico lavorazione, DDT, lotto — sfruttando `source_register_movement_id`, `source_transform_batch_id`, `source_document_id`
6. **Stampa situazione magazzino**: giacenza a una data specifica con filtri

---

### Modifiche pianificate

#### 1. Migrazione DB — Nuovi campi e tabella `dragon_warehouses`

- **`dragon_items`**: aggiungere colonne `fattore_conversione` (numeric, default 1), `tipo_mps_eow` (text, nullable — valori: MPS, EOW, ALTRO), `tipo_mps_eow_desc` (text, nullable), `default_warehouse_id` (uuid, nullable)
- **Nuova tabella `dragon_warehouses`**: `id`, `company_id`, `code`, `description`, `has_cer` (bool), `has_mps` (bool), `limit_mps_eow` (numeric, nullable), `active` (bool), `created_at`, `updated_at`. Con RLS su company_id
- **`dragon_stock_movements`**: aggiungere `warehouse_id` (uuid, nullable, FK a dragon_warehouses)

#### 2. Articoli — Form ampliato

Aggiungere al form di creazione/modifica articolo:
- Campo **Fattore di conversione** (visibile solo se U.M. diversa da "kg")
- Sezione **Comunicazione Enti** con select Tipo MPS/EOW e campo descrizione (visibile se tipo = "Altro")
- Select **Magazzino predefinito** (caricato da `dragon_warehouses`)

#### 3. Magazzini — Nuova pagina CRUD

Nuova pagina **`DragonMagazziniPage.tsx`** accessibile dal modulo Magazzino Dev:
- Lista magazzini con codice, descrizione, flag CER/MPS, limite
- Form creazione/modifica con tutti i campi Prometeo
- Aggiunta voce nel menu DevMagazzinoDevModule

#### 4. Magazzino — Inserimento movimenti multi-riga

Aggiungere nel tab "Ledger Movimenti" un pulsante **"Nuovo Movimento"** che apre un Sheet con:
- Data registrazione
- Causale (select da dragon_causes filtrate per scope)
- Tabella multi-riga: articolo + quantità + note per ogni riga
- Pulsante "Registra" che crea N stock_movements in batch

#### 5. Magazzino — Filtri avanzati

Aggiungere sopra la tabella movimenti:
- Filtro per intervallo date
- Filtro per articolo
- Filtro per causale
- I filtri attuali WASTE/MPS restano

#### 6. Magazzino — Tracciabilità movimento

Click su una riga del ledger apre un **Dialog/Sheet** con:
- Dettaglio completo del movimento
- Link al movimento di registro collegato (via `source_register_movement_id`)
- Link al batch di trasformazione (via `source_transform_batch_id`)
- Link al documento (via `source_document_id`)
- Visualizzazione del flusso "Rintraccia" (da formulario → carico → lavorazione → ricarico MPS)

---

### File coinvolti

| Azione | File |
|--------|------|
| Migrazione DB | SQL via migration tool |
| Modifica | `src/pages/dragon/DragonArticoliPage.tsx` + `.js` |
| Modifica | `src/hooks/dragon/useDragonItems.ts` + `.js` |
| Nuovo | `src/pages/dragon/DragonMagazziniPage.tsx` + `.js` |
| Nuovo | `src/hooks/dragon/useDragonWarehouses.ts` |
| Modifica | `src/pages/dragon/DragonMagazzinoPage.tsx` + `.js` |
| Nuovo | `src/components/dragon/DragonMovementDetail.tsx` |
| Nuovo | `src/components/dragon/DragonNewMovementForm.tsx` |
| Modifica | `src/components/multynijol/dev/DevMagazzinoDevModule.tsx` + `.js` (aggiunta voce Magazzini) |
| Modifica | Route in `App` per la nuova pagina magazzini |

---

### Ordine di esecuzione

1. Migrazione DB (tabella + colonne)
2. Hook `useDragonWarehouses`
3. Pagina Magazzini CRUD
4. Ampliamento form Articoli
5. Form nuovo movimento multi-riga nel Magazzino
6. Filtri avanzati nel ledger
7. Dialog tracciabilità movimento

