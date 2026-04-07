

# Piano Completo — 8 Implementazioni Admin Dev Multy

## Stato attuale
- `MNDevDashboardPage.tsx` ha 8 tab: Impianto, Conto Proprio, Intermediario, Contatti, Privati, Ricevute, Aree Riservate, CER Preferiti
- `DevGiacenzeModule.tsx` esiste ma e solo read-only (niente carico/scarico/cernita)
- `MNGestioneFIRPage.tsx` esiste come pagina separata per multy/niyol
- `ImpiantoDashboardPage.tsx` ha gia inbox FIR basica con conferma peso
- Tabelle DB esistenti: `magazzino_giacenze`, `movimenti_impianto`, `fir_number_pool`, `impianto_fir_inbox`, `fir_forms`

---

## 1. Gestione FIR nel Dev Multy

**Nuovo**: `src/components/multynijol/dev/DevGestioneFIRModule.tsx`
- Copia la logica di `MNGestioneFIRPage.tsx` come componente standalone (senza layout wrapper)
- Hardcoded su `societaId = "multy"`, tenant Multyproget
- Pool stats, bulk import, richiesta RENTRI vidimazione, elenco pool paginato, assegnazione utenti, test emissione

**Modifica**: `MNDevDashboardPage.tsx` — aggiungere tab "Gestione FIR" con icona `Database`

---

## 2. Firma Digitale (ricezione destinatario Multyproget)

**Nuovo**: `src/components/multynijol/dev/DevFirmaDigitaleModule.tsx`
- Ricerca FIR su RENTRI via `ricercaFir("multy", numero)`
- Visualizzazione dati FIR trovato (produttore, trasportatore, CER, quantita)
- Form: kg pesata, data arrivo, ora arrivo, esito (accettato/parziale/respinto), motivazione
- Firma ricezione via `firmaRicezione("multy", payload)`
- Firma destinatario (chiusura) con conferma forte
- Timeline eventi locale

**Modifica**: `MNDevDashboardPage.tsx` — aggiungere tab "Firma Digitale" con icona `PenTool`

---

## 3. Serbatoio FIR condiviso (tutte le app + admin)

**Modifica**: Quando i numeri vengono inseriti nel pool (sia da `GestioneFIRPage` che da `MNGestioneFIRPage` che dal nuovo `DevGestioneFIRModule`), vengono assegnati a `SHARED_POOL_USER_ID = "00000000-..."` — questo gia avviene.

**Modifica**: `src/hooks/useFIRForms.ts` e `src/hooks/useMNFIRForms.ts` — la query per ottenere il prossimo numero disponibile deve cercare prima nel pool dell'utente, poi nel pool condiviso (`SHARED_POOL_USER_ID`), filtrando per `societa_id` corretto.

---

## 4. Soglia 1500 kg annui per privati

**Modifica**: `DevPrivatiModule.tsx`
- Aggiungere colonna "Kg Annui" nella tabella privati con barra di progresso verso 1500 kg
- Query su `privati_conferimenti` per sommare kg per anno corrente per ciascun privato
- Badge rosso se >= 1500 kg, arancione se >= 1200 kg
- Nel flusso conferimento: check hard prima di salvare — se >= 1500 annui → toast errore e blocco

**Modifica**: `MNMagazzinoPage.tsx` — stesso check nel flusso conferimento

---

## 5. Magazzino Impianto con operazioni e cernita

### 5a. Nuovo componente: `DevMagazzinoModule.tsx`

**Dashboard giacenze** (tab principale):
- Tabella CER con: codice, descrizione, giacenza kg, stato, tipo conferente (privato se CER 200xxx)
- Filtri: per CER, tipo conferente, stato
- Stats: totale CER attivi, totale kg, movimenti oggi
- Pulsanti per riga: "+ Carico", "- Scarico", "Cernita"

**Operazione Carico** (dialog):
- Form: CER, quantita kg, conferente (privato/azienda), nota, data, n. FIR opzionale
- Salvataggio: INSERT in `movimenti_impianto` tipo=CARICO + upsert `magazzino_giacenze`

**Operazione Scarico** (dialog):
- Form: CER (precompilato), quantita kg, destinatario, nota, n. FIR
- Validazione: non puo scaricare piu della giacenza
- Salvataggio: INSERT in `movimenti_impianto` tipo=SCARICO + aggiorna `magazzino_giacenze`

**Storico movimenti** (sotto-tab):
- Lista movimenti con tipo, CER, kg, data, nota
- Filtri per tipo e CER

### 5b. Nuovo componente: `DevCernitaModule.tsx`

**Lista cernite**: tabella con lavorazioni in corso / completate

**Nuova cernita — wizard 3 step**:
1. **Input**: seleziona CER dal magazzino, inserisci kg da lavorare
2. **Output**: form dinamico con 1..N righe (CER output, kg, tipo: rifiuto/MPS/EOW), autocomplete CER preferiti
3. **Riepilogo**: bilancio input vs output, warning se differenza > 5%, conferma

Al salvataggio:
- Movimento SCARICO per CER input
- Movimento(i) CARICO per ogni CER output
- Aggiornamento `magazzino_giacenze` per tutti i CER coinvolti
- Nota che lega i movimenti alla stessa cernita (campo `note` con ID cernita)

**Dettaglio cernita**: vista read-only con input/output e bilancio

### 5c. Migrazione DB

Nuova tabella `cernite` per tracciare le sessioni di cernita:
```sql
CREATE TABLE cernite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  impianto_id UUID,
  cer_input TEXT NOT NULL,
  quantita_input NUMERIC NOT NULL,
  stato TEXT DEFAULT 'in_corso',
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cernita_output (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cernita_id UUID REFERENCES cernite(id) ON DELETE CASCADE,
  cer_output TEXT NOT NULL,
  quantita NUMERIC NOT NULL,
  tipo_output TEXT DEFAULT 'rifiuto',
  created_at TIMESTAMPTZ DEFAULT now()
);
```
+ RLS policies admin-only + colonne `area_stoccaggio`, `stato`, `tipo_conferente` su `magazzino_giacenze`

### 5d. Integrazione

**Modifica**: `MNDevDashboardPage.tsx` — aggiungere tab "Magazzino" (con sotto-tab Giacenze, Cernita, Storico)

---

## 6. FIR digitali dal modulo alternativo → RENTRI multyproget

**Verifica/fix**: `FIRAlternativeForm.tsx`
- Il `TENANT_MAP` gia mappa `multyproget → cliente: "multy"` — verificare che il routing da Dev Multy passi il contesto corretto
- `FIRRentriActions.tsx` — verificare che `societaId` sia dinamico dal path/contesto e non hardcoded "global"

---

## 7. Pulsante "Stampa FIR" nel serbatoio

**Nuovo**: `src/components/multynijol/dev/DevStampaFIREditor.tsx`
- Editor identico al modulo alternativo (3 pagine del formulario con campi editabili)
- Modalita "solo stampa" — nessuna azione RENTRI
- Numero FIR precompilato dal pool (passato come prop)
- Pulsante "Stampa" via `window.print()` con CSS print-friendly

**Modifica**: `DevGestioneFIRModule.tsx` — pulsante "Stampa FIR" per ogni riga del pool con status "available" → apre dialog con `DevStampaFIREditor` precompilato

---

## 8. Gestione xFIR lato impianto (doppia firma)

### Nuovi tipi: `src/types/impiantoFir.ts`
- `FirStatusInterno`: bozza, importato, attesa_firma_ricezione, firmato_ricezione, firmato_destinatario, errore
- `FirSummary`, `FirDetail`, `FirDestinatarioPayload`, `FirEvent`

### Nuovi servizi: `src/services/impiantoFirService.ts`
- `searchXFir(numero)` → chiama `ricercaFir` via VPS proxy
- `importXFir(numero)` → salva in `impianto_fir_inbox`
- `signReceptionXFir(firId)` → chiama `firmaRicezione` via VPS
- `signDestinationXFir(firId)` → chiama firma destinatario + blocca record

### Nuovi componenti in `src/components/impianto/`:

**`ImpiantoFirList.tsx`** — lista FIR in arrivo con:
- Colonne: numero, produttore, trasportatore, CER, quantita, stato interno, stato RENTRI
- Filtri: numero, CER, data, stato
- Badge doppia firma (ricezione + destinatario)

**`ImpiantoFirSearch.tsx`** — pannello ricerca/import:
- Input numero FIR + "Cerca su RENTRI"
- Anteprima se trovato + "Importa FIR"
- Gestione errori (non trovato, non destinato a questo impianto, rate limit)

**`ImpiantoFirDetail.tsx`** — dettaglio completo:
- Header con badge stati
- Sezione read-only dati FIR (produttore, trasportatore, destinatario, rifiuto, trasporto)
- Form editabile "Presa in carico" (data/ora arrivo, esito, kg accettati, motivazione)
- Barra azioni sticky: Salva bozza, Verifica, Firma Ricezione (modal conferma), Firma Destinatario (modal formale con campo "CONFERMO")
- Timeline eventi

**`ImpiantoFirTimeline.tsx`** — timeline cronologica

### Routing
- **Modifica**: `ImpiantoDashboardPage.tsx` — aggiungere tab/sezione "Gestione xFIR"
- **Modifica**: `App.tsx` — aggiungere route `/area-impianto/:tenant/dashboard/fir/:firId`

---

## Ordine di esecuzione

| Step | Feature | File principali |
|------|---------|-----------------|
| 1 | Migrazione DB (cernite, colonne magazzino) | SQL |
| 2 | Gestione FIR Dev Multy (punto 1) | DevGestioneFIRModule |
| 3 | Firma Digitale (punto 2) | DevFirmaDigitaleModule |
| 4 | Pool condiviso (punto 3) | useFIRForms, useMNFIRForms |
| 5 | Soglia 1500kg (punto 4) | DevPrivatiModule |
| 6 | Magazzino + Cernita (punto 5) | DevMagazzinoModule, DevCernitaModule |
| 7 | Fix modulo alternativo (punto 6) | FIRAlternativeForm |
| 8 | Stampa FIR (punto 7) | DevStampaFIREditor |
| 9 | xFIR impianto (punto 8) | ImpiantoFir* |

Ogni nuovo `.tsx` avra il bridge `.js`. Stile SaaS industriale coerente (glassmorphism, emerald/amber accents).

