# Piano: App Mobile Multyproget e Niyol - Implementazione Completa

## Problemi identificati

1. **Preset Global Reco hardcoded**: Il componente `FIRFormComplete.tsx` ha i dati di Global Reco bloccati (Produttore) e Multyproget (Intermediario) hardcoded. Lo store `firStore.ts` inizializza i campi con i dati di Global Reco. Le app MN NON devono avere questi preset -- tutti i campi devono partire vuoti.
2. **Routing rotto**: Le sotto-pagine (GPS, Cronologia, AI, ecc.) usano `useParams<{ context }>` ma le rotte in `App.tsx` non hanno il parametro `:context`. Il contesto e sempre `undefined` e ricade su `"multyproget"`. Niyol non funziona.
3. **Messaggistica non collegata al tenant**: `MNAppComunicazioniPage` usa `useAdminId()` che trova l'admin di Global Reco, non l'admin del tenant corretto (Multyproget o Niyol).
4. **Nessun isolamento dati FIR**: `useFIRForms` e `useFIRNumberPool` non filtrano per tenant. Gli utenti MN vedono i FIR di Global.

## Soluzione

### 1. Creare `MNFIRFormComplete.tsx` -- form FIR senza preset

Nuovo componente che clona `FIRFormComplete.tsx` ma:

- Rimuove `GLOBAL_RECO`, `MULTYPROGET` dagli import
- Il Produttore NON e bloccato -- tutti i campi sono editabili e partono vuoti
- L'Intermediario NON e bloccato -- tutti i campi sono editabili e partono vuoti
- Mantiene identica l'interfaccia (accordion neon, tre tab, semaforo, pulsanti INIZIA/SALVA/INVIA)
- Accetta un prop `tenantContext` per sapere se e multyproget o niyol

### 2. Creare `mnFirStore.ts` -- store senza preset

Nuovo store Zustand che clona `firStore.ts` ma con `initialFIRData` che ha TUTTI i campi vuoti:

- `produttoreDenominazione: ""` (non "Global Reco")
- `produttoreUnitaLocale: ""` (non "Via Alba 11...")
- `produttoreCF: ""` (non "08934760961")
- `intermediarioDenominazione: ""` (non "Multyproget")
- `intermediarioCF: ""` (non "12347770013")
- `annotazioni: ""` (non la stringa con Multyproget)

### 3. Correggere il routing -- passare il contesto come prop, non come param

Le sotto-pagine non possono usare `useParams` perche le rotte non hanno `:context`. Soluzione: estrarre il contesto dal pathname.

```text
/mn/app/multyproget/gps --> il path contiene "multyproget"
/mn/app/niyol/gps       --> il path contiene "niyol"
```

Ogni sotto-pagina calcolera il contesto da `location.pathname`:

```
const context = location.pathname.includes("/niyol") ? "niyol" : "multyproget";
const basePath = `/mn/app/${context}`;
```

### 4. Collegare la messaggistica al tenant corretto

Creare un hook `useMNAdminId(context)` che restituisce l'admin del tenant corretto:

- `multyproget` --> cerca l'utente con email `multyproget@zolidragon.cloud`
- `niyol` --> cerca l'utente con email `niyol@zolidragon.cloud`

Aggiornare `MNAppComunicazioniPage` per usare questo hook.

### 5. Isolare i FIR per tenant

Creare `useMNFIRForms(tenantId)` che filtra i FIR per `tenant_id` del contesto attivo, in modo che gli utenti Multyproget vedano solo i loro FIR e gli utenti Niyol solo i propri.

### 6. Aggiornare le pagine principali

`**MNMultyprogetAppPage.tsx**` e `**MNNiyolAppPage.tsx**`:

- Usare `MNFIRFormComplete` al posto di `FIRFormComplete`
- Usare `mnFirStore` al posto di `firStore`

**Tutte le sotto-pagine** (`MNAppCronologiaPage`, `MNAppGPSPage`, `MNAppAIPage`, `MNAppComunicazioniPage`, `MNAppProfiloPage`, `MNAppGuidaPage`):

- Estrarre contesto dal pathname invece di `useParams`
- Collegare ai dati del tenant corretto

## Dettagli tecnici

### File nuovi


| File                                       | Descrizione                                  |
| ------------------------------------------ | -------------------------------------------- |
| `src/components/fir/MNFIRFormComplete.tsx` | Form FIR senza preset, tutti campi editabili |
| `src/stores/mnFirStore.ts`                 | Store Zustand con dati iniziali vuoti        |
| `src/hooks/useMNAdminId.ts`                | Hook per trovare l'admin del tenant MN       |
| `src/hooks/useMNFIRForms.ts`               | Hook per FIR filtrati per tenant             |


### File da modificare


| File                                              | Modifica                                        |
| ------------------------------------------------- | ----------------------------------------------- |
| `src/pages/multynijol/MNMultyprogetAppPage.tsx`   | Usa MNFIRFormComplete + mnFirStore              |
| `src/pages/multynijol/MNNiyolAppPage.tsx`         | Usa MNFIRFormComplete + mnFirStore              |
| `src/pages/multynijol/MNAppCronologiaPage.tsx`    | Contesto da pathname, FIR filtrati per tenant   |
| `src/pages/multynijol/MNAppGPSPage.tsx`           | Contesto da pathname                            |
| `src/pages/multynijol/MNAppAIPage.tsx`            | Contesto da pathname, AI collegata a mnFirStore |
| `src/pages/multynijol/MNAppComunicazioniPage.tsx` | Contesto da pathname, admin tenant corretto     |
| `src/pages/multynijol/MNAppProfiloPage.tsx`       | Contesto da pathname                            |
| `src/pages/multynijol/MNAppGuidaPage.tsx`         | Contesto da pathname                            |


### Flusso utente risultante

1. L'utente va su `/mn` (Multyproget) o `/ni` (Niyol)
2. Si registra o accede
3. Viene reindirizzato a `/mn/app/multyproget` o `/mn/app/niyol`
4. Vede il form FIR VUOTO (nessun preset)
5. Compila tutto manualmente
6. Naviga tra le sezioni (Cronologia, GPS, AI, Messaggi, Profilo, Guida)
7. I messaggi vanno all'admin del proprio tenant
8. L'admin del tenant (dalla dashboard `/mn/admin/multyproget` o `/mn/admin/niyol`) vede solo i dati dei propri autisti
9. gli utenti si devono registrare con codice fiscale nome e cognome esattamente come per global
10. sotto la pagina di login/registrazione di entrabe ci vuole un rimandoi a accedi come admin che porta alla pagina di login poer l'admin di multyproget e niyol vche è  [multyniyol@zoli.live](mailto:multyniyol@zoli.live)