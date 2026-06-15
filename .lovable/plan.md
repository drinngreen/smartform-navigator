# Dev Multyproget — Workspace FIR: 7 fix richiesti

Lavoro concentrato in `src/components/multynijol/dev/DevFirWorkspace.tsx`, `src/components/fir/FIRAlternativeForm.tsx`, e nuova edge function/RPC per giacenze. Nessuna modifica al RENTRI/VPS.

## 1) Errore al salvataggio bozza
- Cause probabili (da confermare in fase di build):
  - `handleSaveDraft` aggiorna `fir_forms` con `updated_at` esplicito (può violare trigger/colonna) e tenta sempre upsert su `registro_generale` anche quando manca permesso o `numero_formulario` esiste con tenant diverso.
  - Admin Multy può non avere policy UPDATE su `fir_forms` di un altro `user_id` → 403.
- Fix:
  - Rimuovere `updated_at` manuale (gestito da trigger).
  - Wrappare l'insert/update `registro_generale` in try/catch separato così l'errore registro non blocca il salvataggio FIR e mostra toast distinto.
  - Mostrare nel toast il messaggio reale dell'errore (oggi: "Errore salvataggio: [object Object]" in certi casi → forzare `err?.message || JSON.stringify(err)`).
  - Verificare RLS `fir_forms UPDATE` per admin Multy (`is_multy_niyol_admin()` + tenant consentito); se manca, aggiungere policy.

## 2) Numero FIR cambia quando modifico una bozza
- Causa: in `FIRAlternativeForm` l'useEffect su `presetNumeroFir` (linee 584-618) cerca un draft per `numero_fir` e può sovrascrivere `activeDraftId` con un'altra bozza che ha lo stesso numero (o lo rigenera). Inoltre `handleSaveDraft` ricalcola `numeroFir` dai campi di form (`valByTokens("numero","fir")`) e lo riscrive su DB se l'utente lo edita inavvertitamente.
- Fix:
  - Quando il workspace passa `firFormId`, ignorare il ramo "resolve by numero" (priorità id).
  - In `handleSaveDraft`: se esiste già `existing.numero_fir` valido, **non** sovrascriverlo mai. Rimuovere `updates.numero_fir` salvo il caso in cui era null.
  - Disabilitare l'editing del campo numero_fir nel form alternativo (read-only quando proviene da pool).

## 3) Preset Multyproget produttore + tendina destinatari da DB
- Modulo alternativo (`FIRAlternativeForm`):
  - Se `tenantContext` = `multyproget` (o workspace Dev) → applicare preset `MULTYPROGET` come produttore al primo render quando i campi produttore sono vuoti.
  - Nuovo dropdown "Destinatario" che carica da `impianti_accounts` (o `anagrafica_aziende_mp`) filtrato per `tenant_id = 77ec...`. Selezione → `buildSoggettoUpdates(..., "destinatario")`.
- Modulo "normale" (`FIRForm` usato in app): stesso preset produttore + stessa tendina destinatari.

## 4) Campo destinazione: codice R/D + autocompletamento descrizione
- Affiancare al flag "recupero/smaltimento" un input testo "Codice operazione" (es. R12, R4, D15).
- Al cambio codice → lookup in `src/lib/codiciRecuperoSmaltimento.ts` (già esistente) → autocompila campo descrizione operazione + flag recupero/smaltimento coerente.

## 5) Eliminare "data/ora arrivo", mantenere "data/ora accettazione"
- Rimuovere binding `data_arrivo` / `ora_arrivo` dal modulo alternativo e normale.
- Tenere e mappare solo `data_accettazione` + `ora_accettazione` (nuova chiave in `form_data`) → utilizzata per registro e firma destinatario.

## 6) Doppio salvataggio: Bozza vs Definitivo (con giacenze)
- In `DevFirWorkspace` sostituire l'unico "Salva formulario e registro" con due pulsanti:
  - **Salva bozza** (`dev-fir-save-draft`): aggiorna `fir_forms.form_data` e `status='bozza'`, **non** tocca registro né giacenze.
  - **Salva definitivo** (`dev-fir-save-final`): aggiorna `fir_forms` (`status='completato'`), inserisce/aggiorna riga `registro_generale`, e applica movimento `magazzino_giacenze` (delta = `quantita` con segno secondo `registryMovementType`).
- Su modifica di un FIR già definitivo: rilevare differenza (`quantita`, `cer`, `registryMovementType`) → eseguire movimento compensativo (inverso del precedente) + nuovo movimento corretto, secondo policy [Dragon Audit Trails].
- Implementazione giacenze:
  - Nuova RPC `apply_fir_giacenza(p_fir_id, p_mode 'apply'|'revert'|'adjust')` che scrive su `magazzino_giacenze` / `movimenti_impianto` mantenendo audit (movimento compensativo).
  - Salvare snapshot `{quantita,cer,segno}` ultimo applicato in `fir_forms.form_data.__giacenza_snapshot` per calcolare il delta alla prossima modifica.

## 7) OCR funzionante per caricare i formulari
- Verificare edge function `ocr-formulario`: input `image_base64`+`mime_type`, output `fields[]`.
- Fix lato client `DevFirWorkspace.handleOcrFile`:
  - PDF multipagina: estrarre prima pagina come immagine prima dell'invio (oggi viene inviato il PDF raw → fallisce su provider vision).
  - Rimuovere il `setTimeout(700)` dopo `ensureDraft` (race condition) → attendere `loadDraft` con `await`.
  - Dopo `fillFields(entries)`, persistere subito su `fir_forms.form_data` (silent save) così l'utente può modificare e poi premere "Salva bozza"/"Salva definitivo".
- Test: log dell'edge function su upload di esempio per confermare provider key + parsing.

## Dettagli tecnici

- File da modificare:
  - `src/components/multynijol/dev/DevFirWorkspace.tsx` — due pulsanti, evento save split, await loadDraft, snapshot.
  - `src/components/fir/FIRAlternativeForm.tsx` — fix preset numero_fir non sovrascrivibile, preset produttore Multy, tendina destinatari, codice R/D, rimozione data/ora arrivo, due handler `handleSaveDraft` / `handleSaveFinal`.
  - `src/components/fir/FIRForm.tsx` (modulo normale) — preset + tendina + R/D autocomplete.
  - `supabase/functions/ocr-formulario/index.ts` — gestione PDF (pdf→png prima pagina) e validazione mime.
- Nuova migration: RPC `apply_fir_giacenza` + policy update se necessarie per admin Multy su `fir_forms`/`registro_generale`/`magazzino_giacenze`.
- Verifica: caricare un FIR di prova, fare OCR, modificare, salvare bozza (no giacenze), salvare definitivo (giacenze +X), modificare quantità, salvare definitivo di nuovo (compensativo -X, nuovo +Y).

## Conferme richieste prima di procedere
1. Per le **giacenze** uso la tabella `magazzino_giacenze` con movimenti su `movimenti_impianto` (CARICO/SCARICO), corretto? O preferisci lo schema Dragon (`dragon_stock_movements`)?
2. La **tendina destinatari** deve leggere da `impianti_accounts` (clienti impianto Multy) o da `anagrafica_aziende_mp` (anagrafica generale)?
3. Per il **modulo normale** intendi `FIRForm` mobile usato in `/mn/app/...` oppure solo il modulo alternativo in `/mn/admin/dev-multyproget`?
