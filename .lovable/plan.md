## Obiettivi

1. **Data conferimento selezionabile** dal form nuovo conferimento (default = oggi).
2. **PDF ricevuta**: data emissione con stessa dimensione del numero ricevuta (attualmente titolo `h1 26px` con dentro il numero, data mostrata come `12px` nel `.meta`). Rendere entrambi lo stesso stile e dimensione.
3. **Importare i tre allegati del 24 giugno** (che non erano stati inseriti): estendere `import-elisabetta` includendo i nuovi FIR e i movimenti di registro.

## Modifiche

### A) `DevPrivatiModule.tsx` — data conferimento
- Aggiungere campo `data` in `confForm` (default `new Date().toISOString().slice(0,10)`).
- Aggiungere input `<Input type="date">` nella dialog "Nuovo Conferimento".
- Passare `data: confForm.data` all'insert su `privati_conferimenti` (il trigger `sync_privati_conferimento_to_inventory` già usa `NEW.data::date` → giacenza allineata alla data scelta).

### B) `DevRicevuteModule.tsx` — PDF
- Sostituire l'attuale `<div class="meta">Data: …</div>` con un layout header a due colonne dove **Numero ricevuta** e **Data** hanno lo stesso `font-size: 26px; font-weight:800`, così la data risulta grande quanto il numero.
- Mantenere il resto del layout invariato.

### C) Import allegati del 24 giugno
Preparare i dati parsando i 3 Excel e aggiornare l'edge function `import-elisabetta`:

- **niyol_dal_24_giugno.xlsx** → FIR con trasportatore Niyol → routing tenant Niyol (o Multy se produttore/destinatario Multy).
- **conto_proprio_dal_24_giugno.xlsx** → FIR conto proprio Multyproget → tenant Multy.
- **registro_multyproget_dal_24_giugno_2026.xlsx** → 162 movimenti di registro → inseriti in `movimenti_impianto` (tenant Multy, impianto principale), con dedup su `numero_fir + data_movimento + cer + quantita_kg`.

Passi tecnici:
1. Script Python locale: legge i 3 Excel e produce `supabase/functions/import-elisabetta/data_2024_06_24.json` con tre array: `fir_niyol`, `fir_conto_proprio`, `movimenti_registro`.
2. `import-elisabetta/index.ts`:
   - Importa il nuovo JSON e concatena i FIR alla logica esistente (dedup per `numero_fir`).
   - Nuova sezione che inserisce `movimenti_registro` in `movimenti_impianto` risolvendo `impianto_id` con una `select` sul primo impianto del tenant Multy, mappando `C./S.` → `CARICO/SCARICO`, `+/-` per il segno, `Al RENTRI` = `Sì` → `esito_accettazione = 'accettato'`. Dedup: skip se esiste già una riga con stesso `numero_fir + data_movimento + cer + quantita_kg` (o, se `numero_fir` vuoto, stesso `n_int` in `note`).
3. Ritorno funzione esteso con `insertedFir`, `insertedMovimenti`, `skippedFir`, `skippedMovimenti`.
4. `PerElisabettaDialog.tsx`: aggiornare il report mostrato per elencare anche i movimenti in arrivo (163 movimenti registro Multy dal 24/06/2026) e i due lotti FIR. Bottone **Sì** chiama la stessa funzione — che ora esegue anche il nuovo import.

### Note
- Nessun dato viene eliminato dal DB (dedup con skip).
- I trigger giacenza già in produzione aggiornano `magazzino_giacenze` automaticamente sui nuovi movimenti registro solo se passati via `privati_conferimenti`; per `movimenti_impianto` importati serve upsert manuale su `magazzino_giacenze`? **Attenzione**: i movimenti di registro Multy vanno solo a storico, non ricalcolano le giacenze correnti (che sono già allineate al 24/06). Confermo di **non** toccare `magazzino_giacenze` durante questo import.
