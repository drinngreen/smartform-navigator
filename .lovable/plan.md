

## Piano: Menu cleanup, training Dark Lemon, gestione destinatario FIR

### 1. Rimuovere tab "Magazzino" legacy dal Centro di Comando

**File**: `src/pages/multynijol/MNDevDashboardPage.tsx`
- Rimuovere il `TabsTrigger` con value="magazzino" (righe 129-135)
- Rimuovere il `TabsContent` con value="magazzino" (righe 175-177)
- Rimuovere l'import di `DevMagazzinoModule` (riga 29)
- Lasciare intatto "magazzino-dev" (DevMagazzinoDevModule)

**File**: `src/components/multynijol/MNAdminTopNav.tsx`
- Rimuovere la voce "Magazzino" dal sottomenu Dragon (riga 46: `{ label: "Magazzino", ... path: "/dragon/magazzino" }`)
- Lasciare gli altri sottomenu Dragon (Registro, Articoli CER, Cantieri, Cernite, Documenti, Audit Trail)

### 2. Allenare Dark Lemon su Magazzino Dev (dragon_warehouses + nuove funzionalità)

**File**: `supabase/functions/dark-lemon-mn/index.ts`

Aggiornare il system prompt aggiungendo nella sezione DRAGON:
- `dragon_warehouses`: id, company_id, code, description, has_cer, has_mps, limit_mps_eow, active
- Nuovi campi `dragon_items`: fattore_conversione, tipo_mps_eow, tipo_mps_eow_desc, default_warehouse_id
- Nuovo campo `dragon_stock_movements`: warehouse_id
- Procedure operative per magazzino: creazione articoli con fattore conversione e comunicazione enti, gestione magazzini multipli, inserimento movimenti multi-riga, tracciabilità rintraccia/traccia

### 3. Allineare gestione FIR come destinatario (flusso Prometeo)

**File**: `supabase/functions/dark-lemon-mn/index.ts`

Aggiungere nel system prompt una nuova sezione `## PROCEDURE DESTINATARIO`:
- **Formulario di Ingresso & Carico**: il destinatario riceve un FIR cartaceo, lo inserisce nel sistema indicando numero formulario, produttore, trasportatore, CER, data ricezione e quantità a destino. Solo con la quantità a destino il FIR diventa "Ufficiale" e genera movimento di carico sul registro
- **Stampa preliminare**: inserimento FIR con stampa per trasporto, stato "In attesa di peso a destino" (giallo) finché non viene inserita la quantità a destino
- **Causali destinatario**: "Ingresso da Unità Locale" (produttore diretto), "Ingresso da mio cantiere" (fuori UL propria), "Ingresso da Cantiere di terzi" (terzi fuori UL)
- **Scarico di uscita**: per rifiuti stoccati (R13/D15), derivati da lavorazione non ulteriormente lavorabili, o rifiuti da produttore iniziale
- **Gestione peso a destino**: FIR senza quantità a destino evidenziati in giallo/rosso, completamento successivo
- **Lavorazioni**: modelli da-uno-a-molti (cernita), modelli da-molti-a-uno (miscelazione), proposta di lavorazione automatica, carico manuale di lavorazione CER
- **Traccia lavorazioni**: vista sequenziale scarichi (-) e ricarichi (+) con raggruppamento per CER

Aggiungere nuove causali Dragon nel prompt:
- `INGRESSO_UL` — Ingresso da Unità Locale produttore
- `INGRESSO_MIO_CANTIERE` — Ingresso da cantiere proprio
- `INGRESSO_CANTIERE_TERZI` — Ingresso da cantiere di terzi
- `SCARICO_USCITA` — Scarico di uscita con formulario (stoccaggio/produttore)
- `SCARICO_LAVORAZIONE` — Scarico per lavorazione/cernita
- `CARICO_LAVORAZIONE` — Carico da lavorazione (manuale)
- `SCARICO_MISCELAZIONE` — Scarico per miscelazione
- `CARICO_MISCELAZIONE` — Carico da miscelazione

### 4. Allenare Dark Lemon sulle ultime modifiche

Sempre in `supabase/functions/dark-lemon-mn/index.ts`, aggiornare lo schema DB nel prompt con:
- Tabella `dragon_warehouses` completa
- Campi nuovi di `dragon_items` e `dragon_stock_movements`
- Istruzioni su come usare i multi-magazzino (associazione predefinita a articolo, limiti giacenza, flag CER/MPS)
- Flusso completo destinatario: ingresso → peso a destino → registro → lavorazione → scarico uscita

### File coinvolti

| Azione | File |
|--------|------|
| Modifica | `src/pages/multynijol/MNDevDashboardPage.tsx` — rimuovere tab Magazzino legacy |
| Modifica | `src/components/multynijol/MNAdminTopNav.tsx` — rimuovere voce Magazzino dal menu Dragon |
| Modifica | `supabase/functions/dark-lemon-mn/index.ts` — aggiornare system prompt con magazzino dev, destinatario FIR, causali, schema aggiornato |

