# GUIDA DEFINITIVA ALLA VIDIMAZIONE FIR IN PRODUZIONE (RENTRI)

Questa guida documenta il processo esatto e testato con successo per ottenere un nuovo numero FIR in ambiente di **Produzione** per l'operatore Global Reco. 
Serve a risolvere falsi errori `403 Forbidden`, `401 Unauthorized` o `404 Not Found` che si verificano comunemente se si sbagliano gli endpoint o la configurazione del certificato.

## 1. Il problema del 403 / 401 sulla VPS
Se sulla VPS ottieni errore `403 Forbidden` mentre da un altro ambiente (es. locale) funziona, **NON c'è alcun ban IP o blocco operatore**. L'errore è dovuto a uno di questi tre fattori critici nel payload del JWT o nella richiesta:

1. **Endpoint Sbagliato:** RENTRI ha cambiato o documentato in modo ambiguo gli endpoint. Molti script tentano di chiamare `POST /vidimazione-formulari/v1.0/vidimazione` o `POST /vidimazione-formulari/v1.0/operatore/{id}/blocchi/{blocco}`. Questi endpoint **danno 404 o 403** a seconda del contesto.
2. **Certificato e Issuer disallineati:** Il certificato caricato sulla VPS potrebbe essere quello Demo invece che Produzione, oppure l'`issuer` (Codice Fiscale) usato per firmare il JWT non corrisponde al certificato.
3. **Mancanza dell'ID Sito:** Alcune richieste di vidimazione vengono rifiutate (403 o 400) se non si specifica il `num_iscr_sito` associato al blocco.

## 2. La Sequenza Esatta e Funzionante (Testata in Produzione)

Per ottenere un nuovo numero FIR (vidimazione) su un blocco esistente (es. `FMGWB`), la procedura richiede **due passaggi asincroni**, utilizzando endpoint specifici che differiscono leggermente da quelli dei movimenti.

### STEP 1: Richiesta di Assegnazione Numero (POST)
Devi chiamare l'endpoint passando direttamente il `codice_blocco` nel path.

- **Endpoint:** `POST https://api.rentri.gov.it/vidimazione-formulari/v1.0/{codice_blocco}`
  *(Esempio: `POST https://api.rentri.gov.it/vidimazione-formulari/v1.0/FMGWB`)*
- **Certificato:** Certificato P12 di Produzione dell'azienda (es. Global Reco).
- **Issuer JWT:** `08934760961` (Codice Fiscale esatto dell'azienda).
- **Payload (Body):**
  ```json
  {
      "num_iscr_sito": "OP2501RMK022692-TO0001"
  }
  ```
  *(Nota: il `num_iscr_sito` deve essere quello associato al blocco al momento della sua creazione).*

**Risposta Attesa (202 Accepted o 200 OK):**
RENTRI **non restituisce subito il numero FIR**. Restituisce un ID di transazione.
```json
{
  "transazione_id": "80da8eab-4d53-4922-8762-524d2d075bb1"
}
```

### STEP 2: Recupero del Numero FIR Vidimato (GET)
Dopo aver ottenuto la transazione, devi attendere l'elaborazione (di solito istantanea) e interrogare RENTRI per farti dare i dettagli del numero generato. 
**ATTENZIONE:** Non si interroga l'endpoint `/transazioni/` (che dà 404), ma si interroga direttamente il progressivo all'interno del blocco!
Devi sapere quale progressivo stavi chiedendo (se il blocco era arrivato a 71375, il prossimo è 71376).

- **Endpoint:** `GET https://api.rentri.gov.it/vidimazione-formulari/v1.0/{codice_blocco}/{progressivo}`
  *(Esempio: `GET https://api.rentri.gov.it/vidimazione-formulari/v1.0/FMGWB/71376`)*
- **Certificato & Issuer:** Uguali allo Step 1.

**Risposta Attesa (200 OK):**
```json
{
  "progressivo": 71376,
  "numero_fir": "FMGWB 071376 WW",
  "qr_code_bytes": "0oRDoQEmoFhJpgBvRk1HV0I...",
  "check_sum": "WW",
  ...
}
```

## 3. Come trovare i blocchi attivi e i progressivi (GET)
Se non sai quale blocco usare o a che progressivo sei arrivato, usa questo endpoint:

- **Endpoint:** `GET https://api.rentri.gov.it/vidimazione-formulari/v1.0?identificativo={issuer}`
  *(Esempio: `GET https://api.rentri.gov.it/vidimazione-formulari/v1.0?identificativo=08934760961`)*

Questa chiamata restituirà l'array di tutti i blocchi assegnati, indicando per ciascuno quanti FIR sono stati vidimati (campo `numero_fir_vidimati`). Il prossimo progressivo da usare sarà `numero_fir_vidimati + 1`.

## 4. Checklist per la VPS (Perché dà 403?)
Se segui gli step sopra e la VPS continua a dare `403`, controlla **esclusivamente** queste tre cose:
1. I file P12 nella VPS sono **esattamente** quelli di Produzione (stesso hash di quelli locali).
2. L'orologio di sistema della VPS (NTP) è perfettamente sincronizzato (se l'orologio sgarra di 1 minuto, il JWT viene scartato per invalidità temporale `nbf` / `exp`, risultando spesso in 401/403).
3. Il Bridge sulla VPS sta firmando il JWT usando l'`issuer` (CF) corretto e non una stringa vuota o un ID Registro (`R6QSWHZ6HJV`). RENTRI vuole il **Codice Fiscale**.