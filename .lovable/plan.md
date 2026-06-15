## Piano di correzione definitiva

Il problema va chiuso su due livelli: interfaccia e database. Ho trovato che il numero FIR può ancora essere modificato indirettamente dal form/OCR e che alcune funzioni backend possono riassegnare una bozza esistente quando il numero viene considerato mancante/non valido.

## Correzioni previste

1. **Rendere il numero FIR immutabile nel database**
   - Aggiungere una protezione backend su `fir_forms` che impedisce qualunque modifica di `numero_fir` dopo che è stato assegnato.
   - Consentire solo la prima assegnazione quando il campo è vuoto.
   - Se codice, OCR, AI o UI provano a cambiare un numero già presente, il database bloccherà l’operazione.

2. **Correggere le funzioni di assegnazione bozze**
   - Modificare `ensure_user_has_fir_draft_for_tenant` e `ensure_user_has_fir_draft` per non aggiornare mai `numero_fir` su una bozza già esistente.
   - Se una bozza esiste ma ha numero non valido o vuoto, creare/riservare correttamente una nuova bozza invece di sovrascrivere il numero della vecchia.
   - Mantenere allineato `fir_number_pool.reserved_by_fir_id` senza cambiare numeri già legati a formulari.

3. **Bloccare il campo numero FIR nel modulo alternativo**
   - Rendere read-only il campo del numero FIR nel form alternativo.
   - Il valore visualizzato sarà sempre quello del record salvato in `fir_forms.numero_fir`, non quello digitato o letto da OCR.
   - L’OCR non potrà sovrascrivere il campo numero FIR.

4. **Pulire il salvataggio frontend**
   - In `FIRAlternativeForm`, il salvataggio bozza/definitivo userà il numero bloccato dal database.
   - `form_data` verrà riallineato al numero reale per evitare che un valore OCR/manuale sporco resti nei dati JSON.
   - Nessun salvataggio bozza o definitivo invierà più un nuovo `numero_fir` se il formulario ha già un numero.

5. **Aggiornare il workspace Dev Multyproget dopo il salvataggio**
   - Dopo ogni salvataggio, ricaricare il formulario attivo dal database.
   - Così la scheda aperta e la lista mostrano subito il numero reale e non uno stato locale obsoleto.

6. **Verifiche finali**
   - Controllare che il formulario `4211a3d5-f133-48eb-b7e8-54b81cd51afe` mantenga `ZRZXR 000566 LG` dopo un salvataggio.
   - Controllare che una bozza mantenga lo stesso numero dopo più salvataggi bozza.
   - Controllare che un definitivo aggiorni giacenze senza cambiare numero FIR.
   - Controllare che eventuali tentativi di modifica diretta del numero vengano bloccati dal backend.

## Risultato atteso

Una volta applicato, il numero FIR diventa una chiave operativa stabile: viene assegnato una sola volta dal pool RENTRI e non può più cambiare durante salvataggio, modifica, OCR, definitivo, giacenze o automazioni.