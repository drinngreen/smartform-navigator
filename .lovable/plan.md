

## Piano di correzione FIR — Autocompilazione, Indirizzo, Intermediario, Stato Fisico

Ho analizzato a fondo il codice e ho trovato **6 problemi strutturali** che causano i malfunzionamenti che descrivi.

---

### Problema 1: DestinatarioSelector non compila tutti i campi

**Dove**: `FIRFormComplete.tsx` riga 633-637, `MNFIRFormComplete.tsx` riga 499-502

Il `DestinatarioSelector` chiama `onSelect(nome, indirizzo, cf)` ma il `handleDestinatarioSelect` imposta solo 3 campi:
- `destinatarioDenominazione`
- `destinatarioUnitaLocale` (indirizzo)
- `destinatarioCF`

**Mancano completamente**: `destinatarioNumeroAut`, `destinatarioTipoAut`, `destinatarioOperazione`, `destinatarioCodiceOperazione`

**Fix**: Estendere il tipo `Soggetto` in `anagrafiche.ts` con campi `autorizzazione`, `tipoAut`, `operazione`, `codiceOperazione`. Aggiornare il `DestinatarioSelector` per passare tutti i campi e il `handleDestinatarioSelect` per impostarli.

---

### Problema 2: Anagrafica impianti incompleta

**Dove**: `src/data/anagrafiche.ts`

Molti impianti hanno `indirizzo: ""` e `cf: ""`. Quando l'operatore seleziona uno di questi, il campo resta vuoto e `parseIndirizzo` riceve stringa vuota, generando il fallback su Roma.

**Fix**: Aggiungere campi estesi al tipo `Soggetto` (`autorizzazione`, `tipoAut`, `operazione`, `comuneIstat`). Per gli impianti piu usati (quelli con indirizzo gia presente), aggiungere i codici ISTAT del comune. Per quelli senza dati, mostrare un avviso nel selettore.

---

### Problema 3: parseIndirizzo fallback su Roma (il problema principale)

**Dove**: `src/services/rentriApi.ts` righe 113-174

Quando l'indirizzo non matcha la regex, il sistema mette `Roma / 058091` come default. Questo e il motivo per cui l'impianto riceve un indirizzo sbagliato.

**Fix**: 
- Il fallback non deve MAI sostituire la citta. Se il parse fallisce, usare la stringa originale come `indirizzo` e lasciare `comune_id` vuoto piuttosto che inventare Roma.
- Espandere `COMUNE_ID_BY_NAME` da 3 a 100+ comuni (tutti quelli presenti negli impianti in anagrafica).
- Estrarre la citta dalla stringa del tipo `"VIA X, 10022 CARMAGNOLA (TO)"` con regex migliore.

---

### Problema 4: Intermediario ignorato nella chiamata RENTRI

**Dove**: `src/services/rentriApi.ts` funzione `buildEmissionePayload` righe 218-293

Il payload costruito **non include MAI** il blocco `intermediario`. Il campo esiste nello store (`intermediarioDenominazione`, `intermediarioCF`, `intermediarioNumeroAlbo`) e viene salvato nel DB, ma `buildEmissionePayload` semplicemente lo ignora.

**Fix**: Aggiungere il blocco `intermediario` nel payload RENTRI:
```
intermediario: {
  denominazione: str("intermediario_denominazione"),
  codice_fiscale: str("intermediario_codice_fiscale"),
  numero_iscrizione_albo: normalizeNumeroIscrizioneAlbo(str("intermediario_iscrizione_albo")),
  nazione_id: "IT",
}
```

---

### Problema 5: stato_fisico mapping sbagliato + brute-force

**Dove**: `src/services/rentriApi.ts` righe 179-209

`STATO_FISICO_TO_CODE` mappa `"1" -> "SP"`, `"2" -> "SP"`, ecc. Ma dal log, il primo successo (riga 45) ha usato il codice numerico `"2"`. Il RENTRI accetta **codici numerici** ("1"-"5"), non le sigle testuali.

Il loop `getStatoFisicoCandidates` prova SP, S, 1, 2, 6 in sequenza, sprecando 3-4 chiamate API per FIR.

**Fix**: Mappare direttamente ai codici numerici RENTRI:
```
"1" -> "1", "solido pulverulento" -> "1"
"2" -> "2", "solido non pulverulento" -> "2"  
"3" -> "3", "fangoso palabile" -> "3"
"4" -> "4", "liquido" -> "4"
"5" -> "5", "aeriforme" -> "5"
"6" -> "2"  (Altro -> fallback solido non pulv.)
```
Eliminare `getStatoFisicoCandidates` e il loop `for..of`.

---

### Problema 6: numero_iscrizione_albo trasportatore non incluso

**Dove**: `buildEmissionePayload` riga 265-273

Il blocco `trasportatori` non include `numero_iscrizione_albo`. RENTRI lo richiede.

**Fix**: Aggiungere al blocco trasportatori:
```
numero_iscrizione_albo: normalizeNumeroIscrizioneAlbo(str("trasportatore_iscrizione_albo")),
```

---

### Riepilogo file da modificare

| File | Intervento |
|------|-----------|
| `src/data/anagrafiche.ts` | Estendere `Soggetto` con autorizzazione/tipoAut/operazione/comuneIstat. Popolare dati mancanti per impianti principali |
| `src/services/rentriApi.ts` | Fix stato_fisico (codici numerici), aggiungere intermediario al payload, fix parseIndirizzo (no fallback Roma), aggiungere albo trasportatore, rimuovere brute-force loop |
| `src/components/fir/FIRFormComplete.tsx` | Aggiornare `handleDestinatarioSelect` per impostare tutti i campi, aggiornare `DestinatarioSelector` per mostrare dati estesi |
| `src/components/fir/MNFIRFormComplete.tsx` | Stessa modifica del DestinatarioSelector |
| `src/stores/firStore.ts` | Nessuna modifica necessaria (i campi ci sono gia) |
| `src/hooks/useFIRForms.ts` | Nessuna modifica necessaria (il mapping e corretto) |

