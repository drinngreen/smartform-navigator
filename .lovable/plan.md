

# Piano: Fix Modulo Alternativo vuoto + Firma Impianto RENTRI

## Problema principale
I file `.js` nella cartella `src/components/fir/` (e altrove) sono copie standalone compilate da vecchie versioni dei `.tsx`. Vite risolve `.js` prima di `.tsx`, quindi **tutto il codice aggiornato** (hydration draftData, FormBridge, props `assignedUserId`) **non viene mai caricato**. Questo spiega:

1. **Modulo vuoto**: il `.js` non ha la logica `buildDraftFieldValues` né la prop `draftData`
2. **Dark Lemon non riconosce i campi**: il `.js` non ha `useFormBridgeFields`
3. **Dark Lemon non può creare bozze**: il FormBridge `.js` non ha `resolveField`

## Soluzione

### Step 1 — Eliminare tutti i file `.js` shadow (o convertirli in bridge)
Sostituire ogni `.js` duplicato con un semplice re-export dal `.tsx`:

```js
// src/components/fir/FIRAlternativeForm.js
export { FIRAlternativeForm } from "./FIRAlternativeForm.tsx";
```

File da convertire in bridge (1 riga):
- `src/components/fir/FIRAlternativeForm.js` (934 righe → 1)
- `src/components/fir/FIRRentriActions.js` (134 righe → 1)
- `src/components/fir/FIRFormComplete.js`
- `src/components/fir/FIRTrafficLight.js`
- `src/components/fir/MNFIRFormComplete.js`
- `src/contexts/FormBridgeContext.js`
- `src/hooks/useFormBridge.js`

Verificare e convertire anche tutti gli altri `.js` shadow in `src/` che duplicano un `.tsx`.

### Step 2 — Verifica build
Eseguire `npm run build` per confermare che non ci siano errori di importazione circolare o mancanti.

### Step 3 — Firma Impianto RENTRI (già implementata, ora visibile)
La logica di firma impianto è già stata scritta nel `.tsx` di `DevImpiantoModule` e in `rentriVpsApi.ts` (funzioni `listaFirInArrivoDestinatario` e `accettaFirInArrivoDestinatario`). Una volta risolto il problema dei shadow `.js`, queste funzionalità diventeranno operative automaticamente.

## Dettagli tecnici

**Perché i `.js` esistono?** Sono stati generati in passato (probabilmente da una build o transpilazione) e mai rimossi. Vite segue l'ordine di risoluzione: `.mjs` → `.js` → `.mts` → `.ts` → `.jsx` → `.tsx`. Il `.js` vince sempre sul `.tsx`.

**Perché un bridge e non la cancellazione?** Alcuni import sparsi nel progetto (altri `.js` legacy) potrebbero puntare esplicitamente a `.js`. Il bridge garantisce compatibilità senza rotture.

**Impatto**: tutti i problemi segnalati (modulo vuoto, Dark Lemon che non compila, firma non funzionante) sono causati dalla stessa root cause e si risolvono con un singolo intervento.

