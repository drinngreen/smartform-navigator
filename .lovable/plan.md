

# Piano: Dark Lemon Form Bridge — Compilazione Automatica Form via AI

## Vincolo chiave
Nessuna funzionalità manuale esistente viene modificata. L'utente continua a compilare i form normalmente. Il Form Bridge aggiunge solo la **possibilità** per Dark Lemon di compilare i campi, senza alterare il comportamento standard. Solo contesto dev-multyproget.

## Architettura

```text
┌──────────────────────────┐
│  FormBridgeProvider      │  (Context globale)
│  - registry: Map<id, {   │
│      label, type,        │
│      getValue, setValue   │
│    }>                    │
│  - getRegisteredFields() │
│  - fillFields(entries[]) │
└──────────┬───────────────┘
           │
    ┌──────┴──────┐
    │ useFormBridge│  (Hook per registrare campi)
    │ registerField│
    │ unregister   │
    └──────┬──────┘
           │ usato da
    ┌──────┴──────────────┐
    │ Form esistenti      │  (aggiunta di 3-5 righe)
    │ es. FIR form,       │
    │ Anagrafica Privati  │
    └─────────────────────┘

    ┌─────────────────────────────────┐
    │ ZoliDarkLemonWidget.tsx         │
    │ - Intercetta risposta con       │
    │   tag <!--FILL_FORM:{...}-->    │
    │ - Mostra anteprima + "Applica"  │
    │   oppure applica direttamente   │
    └─────────────────────────────────┘

    ┌─────────────────────────────────┐
    │ Edge Function dark-lemon-mn     │
    │ + tool "fill_form"              │
    │ + tool "get_form_fields"        │
    │ + istruzioni nel system prompt  │
    └─────────────────────────────────┘
```

## Dettaglio implementazione

### 1. `FormBridgeContext.tsx` + `useFormBridge.ts` (nuovi)
- Context con `Map<string, FieldDescriptor>` dove ogni campo ha: `id`, `label`, `type` (text/select/date/number), `getValue()`, `setValue(v)`
- Hook `useFormBridge()` che espone `registerField(descriptor)` e cleanup automatico su unmount
- Funzione `fillFields(entries: {id: string, value: string}[])` che chiama `setValue` per ogni campo registrato
- Funzione `getRegisteredFields()` che ritorna l'elenco dei campi con label e valore corrente

### 2. Integrazione nei form esistenti (solo aggiunta, zero modifiche)
Esempio in un form FIR — si aggiungono solo 3 righe:
```typescript
const { registerField } = useFormBridge();
useEffect(() => {
  const cleanup = registerField({
    id: "produttore_denominazione",
    label: "Produttore",
    type: "text",
    getValue: () => formData.produttore_denominazione,
    setValue: (v) => setFormData(prev => ({...prev, produttore_denominazione: v}))
  });
  return cleanup;
}, [formData.produttore_denominazione]);
```
I form da integrare inizialmente (solo dev-multy):
- Form FIR (campi principali: produttore, trasportatore, destinatario, CER, quantita, ecc.)
- Anagrafica Privati (nome, cognome, CF, indirizzo)
- Conferimenti (CER, peso, importo)

### 3. Edge Function — nuovi tool
**`get_form_fields`**: ritorna la lista dei campi registrati nel bridge (iniettata dal widget nel messaggio)
**`fill_form`**: l'AI restituisce un JSON con i campi da compilare. La risposta contiene un marcatore speciale `<!--FILL_FORM:{"fields":[{"id":"...","value":"..."}],"confirm":true}-->` che il widget intercetta.

### 4. Widget — intercettazione e applicazione
- Il widget parsifica la risposta cercando il tag `<!--FILL_FORM:...-->`
- **Modalità conferma** (default): mostra un pannello con l'anteprima dei campi e un pulsante "✅ Applica" / "❌ Annulla"
- **Modalità diretta**: se l'utente dice "compila direttamente" o "compila subito", l'AI mette `"confirm": false` e il widget applica immediatamente
- Dopo l'applicazione, mostra un toast "✅ X campi compilati"

### 5. `usePageContext` — arricchimento
Aggiungere l'elenco dei campi registrati nel bridge al contesto pagina inviato all'AI, così l'agente sa esattamente quali campi può compilare e i loro ID.

### 6. System prompt — nuove istruzioni
Aggiungere una sezione "COMPILAZIONE FORM" al prompt che spiega:
- Quando l'utente chiede di compilare un form, usa `fill_form`
- Se il contesto pagina contiene `bridgeFields`, usali per sapere quali campi sono disponibili
- Di default chiedi conferma, a meno che l'utente non dica "compila subito/direttamente"
- Se l'utente chiede dati da DB (es. "compila con i dati del trasportatore Rossi"), prima cerca nel DB, poi compila

## File coinvolti

| File | Azione |
|------|--------|
| `src/contexts/FormBridgeContext.tsx` | Nuovo — context + provider |
| `src/hooks/useFormBridge.ts` | Nuovo — hook registrazione campi |
| `src/components/ai/ZoliDarkLemonWidget.tsx` | Intercetta FILL_FORM, pannello conferma |
| `src/hooks/usePageContext.js` | Aggiunge bridgeFields al contesto |
| `supabase/functions/dark-lemon-mn/index.ts` | Tool fill_form + istruzioni prompt |
| Form FIR / Privati / Conferimenti | +3 righe di registrazione bridge per form |
| `src/App.tsx` | Wrappare con `FormBridgeProvider` |

