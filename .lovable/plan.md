

# Piano: Dark Lemon Page-Aware — Lettura Contesto Pagina in Tempo Reale

## Panoramica

Quando Dark Lemon è in modalità banner/floating (non fullscreen), un pulsante "Analizza Pagina" permette di catturare il contenuto della pagina sottostante e iniettarlo nel messaggio. In più, il widget invia automaticamente il contesto della route corrente (quale pagina, quale sezione) ad ogni messaggio, permettendo a Dark Lemon di dare consigli proattivi.

## Cosa cambia per l'utente

- Un nuovo pulsante **🔍 Analizza Pagina** nell'header del widget cattura il contenuto visibile della pagina
- Dark Lemon sa SEMPRE su quale pagina si trova l'utente (FIR, Trasportatori, Dashboard, ecc.)
- Può dare consigli come: "Vedo che stai compilando un FIR — il codice EER 150106 richiede stato fisico S"
- Può leggere tabelle, form, dati visibili e commentarli
- Se l'utente scrive "cosa vedi?" o "aiutami con questa pagina", Dark Lemon analizza automaticamente il DOM

## Dettaglio tecnico

### 1. Hook `usePageContext` (nuovo file)

Crea `src/hooks/usePageContext.ts` che:
- Usa `useLocation()` per determinare la pagina corrente
- Mappa le route a descrizioni leggibili (es. `/mn/admin/dev-multyproget/formulari` → "Pagina Formulari FIR")
- Espone una funzione `capturePageContent()` che:
  - Prende il contenuto testuale del `<main>` o del container principale (escludendo il widget stesso)
  - Estrae testo da tabelle, form input values, headings, badge/status
  - Limita a ~4000 caratteri per non esplodere il prompt
  - Restituisce un oggetto `{ route, pageTitle, pageContent, formFields, tableData }`

### 2. Widget `ZoliDarkLemonWidget.tsx` — Modifiche

- Importa `usePageContext`
- Aggiunge pulsante "Analizza Pagina" (icona `Eye` o `ScanSearch`) nell'header, visibile solo quando NON in fullscreen
- Al click: chiama `capturePageContent()`, poi invia un messaggio automatico con prefisso `[CONTESTO PAGINA]` contenente il dump
- Ad ogni messaggio utente, inietta silenziosamente il `route` e `pageTitle` come metadato nel body della richiesta API

### 3. Hook `useDarkLemonMN.ts` — Modifiche

- `sendMessage` accetta un nuovo parametro opzionale `pageContext?: { route: string; pageTitle: string; content?: string }`
- Quando presente, aggiunge un blocco `[CONTESTO PAGINA ATTIVA]` nei messaggi API prima dell'ultimo messaggio utente
- Il contesto pagina NON viene salvato nel DB (è volatile, cambia ad ogni messaggio)

### 4. Edge Function `dark-lemon-mn` — Modifiche

- Nel system prompt, aggiungere sezione:
  ```
  ## CONSAPEVOLEZZA PAGINA
  Potresti ricevere un blocco [CONTESTO PAGINA ATTIVA] che descrive cosa l'utente sta vedendo.
  Quando presente:
  - Analizza il contenuto e dai consigli proattivi
  - Se vedi errori nei form, segnalali
  - Se vedi dati incompleti in tabelle, suggerisci azioni
  - Se l'utente chiede "cosa vedi?" o "analizza", usa il contesto pagina per rispondere
  ```

### 5. Mappatura Route → Descrizione

```text
/mn/admin/*/formulari      → "Gestione Formulari FIR"
/mn/admin/*/trasportatori  → "Gestione Trasportatori"
/mn/admin/*/aree-riservate → "Aree Riservate Impianti"
/mn/admin/*/magazzino      → "Magazzino e Giacenze"
/mn/admin/*/privati        → "Anagrafica Privati"
/mn/admin/*/conferimenti   → "Conferimenti Privati"
/mn/admin/*/fatture        → "Fatturazione ERP"
/mn/admin/*/personale      → "Gestione Personale"
/mn/admin/*/social         → "Social / Community"
/mn/admin/*                → "Dashboard Principale"
```

### 6. Funzione di cattura DOM

```typescript
function capturePageContent(): string {
  const main = document.querySelector("main") || document.querySelector("[data-page-content]") || document.body;
  // Escludi il widget stesso
  const clone = main.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("[class*='z-[9999]']").forEach(el => el.remove());
  
  // Estrai form fields con valori
  const inputs = clone.querySelectorAll("input, select, textarea");
  const formData = Array.from(inputs).map(el => {
    const label = el.closest("label")?.textContent || el.getAttribute("placeholder") || el.getAttribute("name");
    return `${label}: ${(el as HTMLInputElement).value}`;
  }).filter(v => v.includes(": ") && !v.endsWith(": "));
  
  // Estrai tabelle
  const tables = clone.querySelectorAll("table");
  // ... parse rows/headers
  
  // Testo generale (heading + paragrafi)
  const textContent = clone.innerText.substring(0, 3000);
  
  return formattedResult;
}
```

### 7. File modificati

| File | Azione |
|------|--------|
| `src/hooks/usePageContext.ts` | Nuovo — cattura DOM e mappa route |
| `src/components/ai/ZoliDarkLemonWidget.tsx` | Pulsante "Analizza Pagina" + invio contesto route |
| `src/hooks/useDarkLemonMN.ts` | Parametro `pageContext` in `sendMessage` |
| `supabase/functions/dark-lemon-mn/index.ts` | Sezione "Consapevolezza Pagina" nel system prompt |

