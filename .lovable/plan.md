

# Piano: Integrazione RENTRI Completa nel Modulo Alternativo FIR

## Problemi Identificati

1. **Mapping tenant errato**: `getRentriCliente()` restituisce `"multy"` per tutti i percorsi `/mn/` incluso niyol se il path non contiene esplicitamente "niyol" — potenziale bug su route `/mn/admin/:context/modulo-alternativo` dove il context è un parametro
2. **Preset produttore incompleti**: Mancano NIYOL come preset e i preset destinatario/trasportatore della versione principale
3. **Logica firma mancante**: Il modulo alternativo non distingue tra:
   - Produttore = Global/Multy/Niyol → firma come **produttore E trasportatore**
   - Produttore diverso (esterno) → firma come **solo trasportatore**
4. **Preset a tendina assenti**: La versione principale (FIRFormComplete) ha preset ricercabili per ~200 destinatari/impianti — il modulo alternativo li ha ma senza la stessa ricchezza di informazioni e senza il trasportatore come preset

## Modifiche Previste

### File 1: `src/data/anagrafiche.ts`
- Aggiungere export `NIYOL` come `Soggetto` con CF `09879800010` e indirizzo corretto

### File 2: `src/components/fir/FIRAlternativeForm.tsx`
- **Tenant detection migliorata**: usare `useParams()` per leggere `:context` dalle route admin MN, oltre al pathname
- **Preset produttore dinamici**: mostrare solo il preset del tenant corrente come default (Global→GLOBAL_RECO, Multy→MULTYPROGET, Niyol→NIYOL) + opzione "Altro produttore" per inserimento libero
- **Logica firma automatica**: aggiungere stato `isOwnProduction` che si attiva quando il produttore selezionato corrisponde al tenant corrente. Passare questa info a `FIRRentriActions`
- **Tutti i preset destinatario**: mantenere il selettore ricercabile esistente con l'intera anagrafica DESTINATARI (~200 impianti)

### File 3: `src/components/fir/FIRRentriActions.tsx`
- Aggiungere prop `firmaComeProduttore: boolean`
- Quando `firmaComeProduttore = true`: emissione FIR firmata come produttore+trasportatore (il payload include i flag `firma_produttore: true, firma_trasportatore: true`)
- Quando `firmaComeProduttore = false`: emissione FIR firmata solo come trasportatore (`firma_trasportatore: true, firma_produttore: false`)
- Il componente mostra un badge visivo "FIRMA: PRODUTTORE + TRASPORTATORE" o "FIRMA: SOLO TRASPORTATORE" per chiarezza operativa

### File 4: `src/pages/multynijol/MNAppModuloAlternativoPage.tsx`
- Passare il context corretto al form usando `useParams()` per le route admin

## Logica firma riassunta

```text
Produttore selezionato == tenant corrente?
  SÌ → firma_produttore: true + firma_trasportatore: true
  NO → firma_produttore: false + firma_trasportatore: true
```

## File coinvolti
1. `src/data/anagrafiche.ts` — aggiunta NIYOL
2. `src/components/fir/FIRAlternativeForm.tsx` — preset dinamici + logica firma
3. `src/components/fir/FIRRentriActions.tsx` — prop firma + badge visivo
4. `src/pages/multynijol/MNAppModuloAlternativoPage.tsx` — context routing

