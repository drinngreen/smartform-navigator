## Piano: Editor Visuale Formulario FIR per Super Admin

### Obiettivo

Creare una pagina `/super/form-editor` accessibile solo dal Super Admin che permetta di:

- Visualizzare le 3 pagine del formulario FIR (le immagini caricate) in colonna a destra
- Avere a sinistra una palette di campi trascinabili (data/ora, testo lungo, testo corto)
- Drag & drop dei campi sulle immagini del formulario con posizionamento preciso
- Ridimensionamento, rinomina, blocco (lock) di ogni campo
- Salvataggio completo del layout nel database per uso futuro

### Struttura tecnica

**1. Nuova pagina e routing**

- Creare `src/pages/SuperAdminFormEditor.tsx`
- Aggiungere route `/super/form-editor` in `App.tsx` (protetta da `ProtectedRoute`)
- Aggiungere link dalla dashboard Super Admin

**2. Copiare le 3 immagini del formulario**

- Copiare `formulario_pag_1.png`, `formulario_pag_2.png`, `formulario_pag_3.png` in `src/assets/`

**3. Componente Editor (`FormFieldEditor`)**

Layout a 2 colonne:

- **Sinistra** : Palette campi trascinabili (DatePicker, TimePicker, Short Text, Long Text)
- **Destra**: Le 3 pagine del formulario impilate verticalmente, ciascuna come contenitore relativo dove i campi possono essere posizionati

Ogni campo posizionato avrà:

- Posizione (x, y in % relativa all'immagine)
- Dimensione (width, height ridimensionabili)
- Nome campo (editabile inline)
- Stato: locked/unlocked
- Tipo: `date` | `time` | `short_text` | `long_text`
- Pagina di appartenenza (1, 2 o 3)

Implementazione drag & drop con eventi nativi HTML5 (dragstart, dragover, drop) senza librerie esterne, dato che il posizionamento è libero su coordinate assolute.

**4. Database**

- Creare tabella `fir_form_templates` con colonne: `id`, `name`, `fields` (JSONB con array di campi e relative posizioni), `created_at`, `updated_at`
- RLS: accessibile solo via service_role (nessuna policy pubblica)

Il campo `fields` JSONB conterrà:

```json
[
  {
    "id": "uuid",
    "name": "codice_eer",
    "type": "short_text",
    "page": 1,
    "x": 12.5,
    "y": 45.2,
    "width": 15,
    "height": 3,
    "locked": true
  }
]
```

**5. Funzionalità dell'editor**

- Drag da palette → drop su foglio → crea campo con posizione
- Click su campo → mostra pannello proprietà (nome, tipo, dimensioni)
- Drag su foglio → riposiziona (se non locked)
- Bordi ridimensionabili (resize handles)
- Toggle lock/unlock per campo
- Pulsante "Salva Template" → salva tutto nel DB via Edge Function o direttamente
- Pulsante "Carica Template" → ripristina layout salvato

**6. File da creare/modificare**

- `src/assets/formulario_pag_1.png` (copia)
- `src/assets/formulario_pag_2.png` (copia)
- `src/assets/formulario_pag_3.png` (copia)
- `src/pages/SuperAdminFormEditor.tsx` (nuovo)
- `src/components/superadmin/FormFieldPalette.tsx` (palette campi)
- `src/components/superadmin/FormPageCanvas.tsx` (canvas per ogni pagina)
- `src/components/superadmin/FormFieldOverlay.tsx` (campo singolo posizionato)
- `src/App.tsx` (aggiunta route)
- `src/pages/SuperAdminDashboard.tsx` (link alla nuova pagina)
- Migrazione SQL per `fir_form_templates`