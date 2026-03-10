

## Piano: Modifica modulo Privati in Dev Multy

### Cosa cambia

**1. Dialog "Nuovo Privato" / "Modifica Privato"**
- Rinominare "N° Tessera" → "N° Documento"
- Rimuovere "Tipo Utenza" e "Note"
- Aggiungere "Scadenza Documento" con date picker (range futuro)
- Aggiungere "Modello Automezzo" e "Targa Automezzo"
- Lo stesso dialog serve sia per creazione che modifica

**2. Lista Privati — Pulsante Modifica**
- Aggiungere icona Edit2 su ogni riga privato nell'elenco per aprire il dialog in modalità modifica

**3. Dialog "Nuovo Conferimento" — CER con selezione da preferiti**
- Sostituire l'input CER libero con un combo: dropdown con i CER preferiti (dalla lista `CER_DATA` già presente in `DevCERPreferitiModule`) + possibilità di digitare un codice CER nuovo
- Auto-compilare Targa e Modello Automezzo dal privato selezionato se presenti, altrimenti mostrare i campi input editabili

### Modifiche tecniche

**Database migration:**
- Aggiungere colonne `numero_documento TEXT`, `scadenza_documento DATE`, `modello_automezzo TEXT` alla tabella `anagrafica_privati` (la colonna `targa_automezzo` e `automezzo` esistono già)

**File: `src/components/multynijol/dev/DevPrivatiModule.tsx`**
- Aggiornare `privatoForm` state: rimuovere `tipo_utenza`, `note`, `numero_tessera`; aggiungere `numero_documento`, `scadenza_documento`, `modello_automezzo`, `targa_automezzo`
- Aggiungere stato `editPrivato` per modifica
- Aggiornare `handleSavePrivato` per gestire sia insert che update
- Dialog privato: usare date picker per scadenza documento
- Lista privati: aggiungere pulsante Edit2 per aprire dialog in edit
- Dialog conferimento: importare `CER_DATA` da `DevCERPreferitiModule`, creare un combobox con filtro + input libero; auto-fill targa/modello dal privato selezionato

