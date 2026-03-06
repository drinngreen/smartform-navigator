

## Piano: Modulo Alternativo FIR (Vista Sperimentale)

### Obiettivo
Creare una vista read-only/sperimentale del formulario FIR che carica il template salvato da `fir_form_templates`, mostra le 3 pagine del formulario con i campi mappati come input trasparenti (cornice leggera, nessun salvataggio). Accessibile da tutte le app utente e aree admin.

### Componenti da creare

**1. `src/components/fir/FIRAlternativeForm.tsx`**
- Carica il primo template da `fir_form_templates` (query semplice, il template salvato)
- Renderizza le 3 pagine del formulario (`pag_1/2/3.png`) con i campi sovrapposti
- Ogni campo è un `<input>` o `<textarea>` trasparente con bordo sottile semi-trasparente (no background, solo `border: 1px solid rgba(...)`)
- Checkbox → input checkbox trasparente
- Lo stato dei campi è locale (`useState`), nessun salvataggio backend
- Banner in alto: "⚡ MODULO ALTERNATIVO — Sperimentale" con stile coerente al tema

**2. `src/pages/multynijol/MNAppModuloAlternativoPage.tsx`**
- Wrapper mobile con `MobileShell` + `MNBottomNav`
- Rileva `basePath` dal pathname (`/mn/app/multyproget` o `/mn/app/niyol`)
- Renderizza `FIRAlternativeForm`

### Modifiche esistenti

**3. `src/components/layout/MNBottomNav.tsx`**
- Aggiungere voce "MODULO ALT" con icona `FileText` che punta a `${basePath}/modulo-alternativo`

**4. `src/App.tsx`** — Nuove route:
- `/mn/app/multyproget/modulo-alternativo`
- `/mn/app/niyol/modulo-alternativo`
- `/mn/admin/:context/modulo-alternativo`
- `/super/modulo-alternativo`
- `/admin/modulo-alternativo` (Global Reco)

**5. Aree Admin** — Aggiungere link/bottone "Modulo Alternativo" in:
- `SuperAdminDashboard.tsx` — link accanto a "Editor Formulario"
- Dashboard admin MN (context dashboard) — bottone nel menu
- Dashboard admin Global Reco — bottone nel menu
- Dev Multyproget dashboard — bottone nel pannello

### Stile campi trasparenti
```css
/* Ogni campo sovrapposto */
background: transparent;
border: 1px solid rgba(100, 100, 100, 0.3);
border-radius: 2px;
font-size: proporzionale alla dimensione del campo;
color: #333;
outline: none;
```

### Nessun backend
- I dati digitati restano solo in stato locale React
- Nessuna chiamata di salvataggio
- Template letto una sola volta al mount dalla tabella esistente `fir_form_templates`

