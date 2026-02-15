# Report tecnico completo – Integrazione RENTRI (GLOBAL RECO S.R.L. e MULTY PROGET S.R.L.)

## Contesto e risultato attuale
- Bridge locale e UI/API avviati: `http://localhost:8765` (health OK) e `http://localhost:3001`.
- Certificati utilizzati:
  - Global: `certificato.p12` – issuer fisso: `08934760961`.
  - Multy: `multyproget.p12` – issuer fisso: `12347770013`.
- Correzioni lato client:
  - Formattazione CER con puntini (es. `170407` → `17.04.07`), mantenendo l’asterisco se presente.
  - Impostazione `stato_fisico` obbligatoria (default Solido).
  - Normalizzazione UM (`KG`/`L`).
  - Inserimento di `intermediario` e `intermediari` solo per MULTY.
- Esito prove attuali (Produzione):
  - Global “movimenti” → HTTP 401 `agIDInterop.invalidIssuer`.
  - Multy “registrazioni” → HTTP 404 Not Found; “movimenti” → HTTP 403 Forbidden; interrogazioni lista con identificativi non coerenti → HTTP 401 `invalidIssuer`.

## Sommario modifiche al codice (diff sintetico)
- `bridge-service/Program.cs`
  - Mappatura issuer aggiornata: `certificato.p12` → `08934760961`; `multyproget.p12` → `12347770013`: `bridge-service/Program.cs:27-32`.
  - Aggiunta `IssuedAt` ai JWT AUTH/INTEGRITY e gestione audience dinamica (demo/prod).
  - Endpoint diagnostico `GET /whoami` per leggere `dnQualifier` e `OID.2.5.4.97` dal certificato.
  - `send-rentri` e `send-registrazioni`: headers completi (`Authorization`, `Digest`, `Agid-JWT-Signature`, `Accept`); eliminati retry con issuer alternativi (issuer sempre CF).
- `server/rentriClient.ts`
  - Nuove helper: `formatCER`, `formatUM`, `formatDate`, `formatTipo`, `determineCausale`, `formatDesc`.
  - Inserimento condizionale di `intermediario`/`intermediari` solo per MULTY; per Global NON sono inviati.
  - Payload “movimenti” include `provenienza` per `RE` e `destinato_attivita` per scarichi (default `R13`).
- `server/scripts/testOne.ts` e `server/scripts/runSubmit.ts`
  - Script CLI per testare invii singoli/batch su `movimenti`/`registrazioni`, con risoluzione dinamica di issuer via `GET /whoami`.

## Ambiente e configurazione
- Sistema operativo: Windows.
- Avvio servizi (script): `.\start-dev.ps1` – avvia Bridge e UI/API.
- Bridge .NET (Kestrel): porte `8765` (HTTP) e `443` (HTTPS).
- CORS abilitato.
- Certificati caricati da file `.p12` con password in mappa (solo locali di sviluppo).

## Certificati e identificativi (da UI RENTRI e bridge)
- Global RECO S.R.L.
  - CF: `08934760961`
  - Certificato interoperabilità: attivo
  - `dnQualifier`: presente nel certificato, non usato come issuer
  - Registri locali attivi (UI): `R1DDEWC3SHU`, `RYPHK2M3RKA`
  - Blocchi FIR: `GPFMK`
- MULTY PROGET S.R.L.
  - CF: `12347770013`
  - Certificato interoperabilità: attivo (seriale 100005490)
  - `dnQualifier`: presente nel certificato, non usato come issuer
  - Unità locale: `OP2501XMQ021914-TO0001`
  - Blocchi FIR: `FRVKM`, `ZRZXR`
  - Registro “Trasporto conto proprio” attivo (UI): visualizzato con causale T+AT, CER 17.04.05/07 accettati

## Bridge: generazione token e invio
- File: `bridge-service/Program.cs`
  - Mappa issuer corretta: `certificato.p12` → `08934760961`; `multyproget.p12` → `12347770013` (bridge-service/Program.cs:27-32).
  - Endpoint diagnostico per estrazione identificativi cert: `GET /whoami` (bridge-service/Program.cs:808-845).
  - Token JWT:
    - `Authorization: Bearer <JWS>` con header `x5c` foglia; claims: `iss`, `aud`, `jti`, `iat`, `nbf`, `exp`.
    - `Agid-JWT-Signature` (Integrity): JWS con `signed_headers` che includono esattamente `Digest` e `Content-Type`.
  - Digest: `Digest: SHA-256=<hash del body>`.
  - Audience dinamica: demo `rentrigov.demo.api` se l’URL contiene `demoapi.rentri.gov.it`, altrimenti `rentrigov.api`.
  - Invii:
    - `POST /send-rentri` – per “movimenti”.
    - `POST /send-registrazioni` – per “registrazioni”.
    - `POST /check-status` – status/result con follow su 303.
    - `POST /list-rentri` – GET su elenco `registrazioni`.
    - `POST /list-movimenti` – GET su elenco `movimenti`.

## Client: normalizzazione dati e payload
- File: `server/rentriClient.ts` (ristrutturato per prova e ripristino funzionalità di base)
  - CER:
    - `formatCER(codice)` → se 6 cifre, aggiunge puntini `xx.xx.xx` e mantiene `*` se presente.
  - UM:
    - `formatUM(u)` → `KG`/`L`.
  - Data:
    - `formatDate(d)` → `YYYY-MM-DDT12:00:00+01:00`.
  - Stato fisico:
    - Default `1` (Solido) se non specificato.
  - Intermediario (solo MULTY):
    - Aggiunge `intermediario` e `intermediari` con denominazione `MULTY PROGET S.R.L.` e CF `12347770013`.
  - Endpoint usati per invio di prova:
    - “movimenti” su `https://api.rentri.gov.it/dati-registri/v1.0/operatore/<ID>/movimenti`
    - `<ID>` provato sia come ID registro (R… local) sia come ID operatore (OP…).
  - Codice riferimento:
    - CER con puntini e stato fisico (server/rentriClient.ts: righe intorno 30–60).
    - Costruzione payload “movimenti” e inserimento intermediario per MULTY (server/rentriClient.ts: ~90–140).

## Script di test autonomi
- File: `server/scripts/testOne.ts`
  - Invio batch su endpoint “registrazioni” e “movimenti” con selettore `global|multy`, `prod|demo`.
  - Varianti `issuer`: prova con `dnQualifier`, `organizationIdentifier` (OID 2.5.4.97) e versioni ripulite (`CF:IT-…`, `IT-…`, numerico puro).
  - Tentativi su ID operatori e ID registri (parametrizzati).
- File: `server/scripts/runSubmit.ts`
  - Invio singolo “movimenti” con CER `170407` → `17.04.07`, quantità `1`, UM `KG`, descrizione “Prova movimento”.

## Tentativi eseguiti (Produzione) e risposte
### Global (certificato.p12, iss=08934760961)
1) “movimenti” su `.../operatore/R6QSWHZ6HJV/movimenti`  
   → 401 `{"title":"Unauthorized","status":401,"model_state":{"generic":["agIDInterop.invalidIssuer"]}}`  
   Log: `[INVIO] CER: '17.04.07'`
2) “movimenti” su `.../operatore/OP2501RMK022692/movimenti`  
   → 401 `invalidIssuer` (stesso esito)
3) Lista “registrazioni” su `.../operatore/R1DDEWC3SHU/registrazioni?limit=10&order=desc`  
   → chiamata locale fallita (errore costruzione payload in PowerShell), ma i tentativi precedenti in bridge indicano mismatch identità quando interrogato con ID non coerente.

### Multy (multyproget.p12, iss=12347770013, intermediario attivo)
1) “registrazioni” su `.../operatore/RQCGT1GPTN0/registrazioni` (Registro Trasporto Conto Proprio mostrato)  
   → 404 `{"title":"Not Found","status":404}`  
   Nota: l’endpoint “registrazioni” non sembra disponibile per questo identificativo.
2) “movimenti” su `.../operatore/RQCGT1GPTN0/movimenti`  
   → 403 `{"title":"Forbidden","status":403}`  
   Con intermediario e causale impostata.
3) “registrazioni” su `.../operatore/RQEL39R7NS0/registrazioni` (altro ID provato)  
   → 404 Not Found.
4) Lista “registrazioni/movimenti” con ID non coerente  
   → 401 `invalidIssuer`.

## Analisi tecnica e cause probabili
- Gli errori 401 `agIDInterop.invalidIssuer` non dipendono dal contenuto del payload (CER/stato fisico OK) ma dalla **coerenza tra:**
  1. `iss` del JWT (operatore del certificato, dal `dnQualifier`),
  2. l’**identificativo in path** (`operatore/<ID>`), e
  3. il **registro consultato/aggiornato** che deve appartenere all’operatore del token.
- Il fatto che `registrazioni` su MULTY ritorni 404 e `movimenti` 403 indica:
  - L’**identificativo usato in path** non è quello previsto dall’API REST per quella operazione (alcuni ID visibili in UI sono “ID registro locale”, non l’ID REST dell’operatore).
  - “Trasporto conto proprio” in UI potrebbe avere un modello **non coperto dall’endpoint “registrazioni”** standard; spesso è tracciato come “movimenti” con causale T+AT, ma richiede il **registro REST corretto** sotto l’operatore del certificato.
- In generale, RENTRI accetta solo se:
  - `iss == operatore REST` associato al certificato,
  - il `registro` su cui si opera è **attivo e appartenente** a quell’operatore,
  - l’endpoint è coerente (`registrazioni` vs `movimenti`) con il tipo di registro/modello.

## Bridge: dettagli tecnici token/headers
- Headers inviati:
  - `Authorization: Bearer <JWT>` (header `x5c` con foglia)
  - `Digest: SHA-256=<hash(body)>`
  - `Agid-JWT-Signature: <JWT>` con claims:
    - `signed_headers`:  
      `[{ "digest": "SHA-256=<...>" }, { "content-type": "application/json" }]`
    - `jti`: UUID
  - `Accept`: `application/json, application/problem+json`
- Claims principali:
  - `iss`: issuer dalla mappatura CF (`ISSUERS`)
  - `aud`: `rentrigov.api`
  - `iat/nbf/exp`: impostati correttamente.
- Catena certificato (`x5c` foglia) allegata; `RevocationMode = NoCheck`.

## Riferimenti codice (con linee)
- Bridge
  - Mappa issuer (incluso MULTY): `bridge-service/Program.cs:27-32`
  - Endpoint diagnostico `GET /whoami`: `bridge-service/Program.cs:808-845`
  - Generazione token AUTH e INTEGRITY con `IssuedAt`: `bridge-service/Program.cs:131-139` e `bridge-service/Program.cs:142-159`
  - Invio “movimenti”: `bridge-service/Program.cs:48-257`
  - Invio “registrazioni”: `bridge-service/Program.cs:259-353`
  - Lista “registrazioni”: `bridge-service/Program.cs:354-421`
  - Lista “movimenti”: `bridge-service/Program.cs:568-613`
  - Check transazione: `bridge-service/Program.cs:615-691`
  - Check status/result: `bridge-service/Program.cs:693-760`
- Client
  - CER con puntini, UM, data, stato fisico: `server/rentriClient.ts` (prime ~60 righe)
  - Intermediario MULTY e payload “movimenti”: `server/rentriClient.ts` (~90–140)
  - Invio verso `operatore/<ID>/movimenti`: `server/rentriClient.ts` (~120–140)
- Script
  - Test generico endpoint/mode: `server/scripts/testOne.ts` (costruzione URL e varianti issuer)
  - Invio singolo “movimenti”: `server/scripts/runSubmit.ts`

## Dettaglio dei payload e degli headers inviati
### Esempio payload “movimenti” (Global)
```json
[
  {
    "data_movimento": "2025-12-18T12:00:00+01:00",
    "tipo_movimento": "CA",
    "causale": "RE",
    "descrizione": "Prova movimento",
    "rifiuto": {
      "codice_eer": "17.04.07",
      "quantita": 1.0,
      "unita_misura": "KG",
      "stato_fisico": 1,
      "pericoloso": false
    },
    "provenienza": "U",
    "note": "Prg: TEST"
  }
]
```
### Esempio payload “movimenti” (Multy, intermediario)
```json
[
  {
    "data_movimento": "2025-12-18T12:00:00+01:00",
    "tipo_movimento": "CA",
    "causale": "RE",
    "descrizione": "Prova movimento",
    "rifiuto": {
      "codice_eer": "17.04.07",
      "quantita": 1.0,
      "unita_misura": "KG",
      "stato_fisico": 1,
      "pericoloso": false
    },
    "provenienza": "U",
    "intermediario": { "denominazione": "MULTY PROGET S.R.L.", "codice_fiscale": "12347770013" },
    "intermediari": [ { "denominazione": "MULTY PROGET S.R.L.", "codice_fiscale": "12347770013" } ],
    "note": "Prg: TEST"
  }
]
```
### Headers HTTP
```
Authorization: Bearer <JWT AUTH>
Digest: SHA-256=<base64sha256>
Agid-JWT-Signature: <JWT INTEGRITY>
Content-Type: application/json
Accept: application/json, application/problem+json
```
### Claims principali dei JWT
```json
{
  "iss": "08934760961",
  "aud": "rentrigov.api",
  "jti": "<uuid>",
  "iat": "<epoch>",
  "nbf": "<epoch-60s>",
  "exp": "<epoch+5min>"
}
```

## Comandi e operazioni eseguite (Windows/PowerShell)
- Pulizia forzata e riavvio servizi:
  - Terminazione processi (bridge/UI):  
    `taskkill /F /IM RentriBridgeService.exe /T`  
    `taskkill /F /IM dotnet.exe /T`  
    `taskkill /F /IM node.exe /T`  
    `taskkill /F /IM VBCSCompiler.exe /T`
  - Pulizia cartelle build:  
    `Remove-Item .\bridge-service\bin -Recurse -Force`  
    `Remove-Item .\bridge-service\obj -Recurse -Force`
  - Avvio servizi:  
    `.\start-dev.ps1`
- Verifica bridge:  
  `Invoke-RestMethod -Uri 'http://localhost:8765/health' -Method Get`
- Endpoint diagnostico:  
  `Invoke-RestMethod -Uri 'http://localhost:8765/whoami?filename=certificato.p12' -Method Get`
- Test invio singolo:  
  `npx tsx server\scripts\runSubmit.ts certificato.p12`
- Test varianti:  
  `npx tsx server\scripts\testOne.ts global prod`  
  `npx tsx server\scripts\testOne.ts multy prod <issuer> <mode>`

## Cosa serve dall’esperto RENTRI
1. **Conferma degli ID REST corretti** da usare nel path:
   - ID operatore REST per Global corrispondente a `08934760961`.
   - ID operatore REST per Multy corrispondente a `12347770013`.
   - ID registro REST (non locale UI) attivo sotto ciascun operatore.
2. **Chiarimento endpoint per “Trasporto Conto Proprio”**:
   - È corretto usare “movimenti” con causale T+AT?  
   - L’endpoint “registrazioni” è previsto per questo registro?
3. **Conferma formato issuer**:
   - Preferito `iss = dnQualifier`?  
   - Ammesse varianti `CF:IT-...` o numerico puro in alcuni endpoint?
4. **Criteri di autorizzazione**:
   - Il 403 su MOVIMENTI indica ACL/ruoli sull’operatore/registro?  
   - Richieste intestazioni aggiuntive (es. `X-ReplyTo`) per “movimenti”?

## Proposta piano di sblocco (operativo)
1. Ottenere dall’UI RENTRI o supporto l’ID operatore REST e l’ID registro REST esatti per ciascun certificato.
2. Aggiornare gli script e il client per puntare a `operatore/<ID_OPERATORE>/movimenti` e/o `registrazioni` coerente al registro.
3. Firmare sempre con `iss = dnQualifier` del certificato che appartiene all’operatore del path.
4. Eseguire un invio singolo con payload minimo conforme, verificare:
   - HTTP 202 e `transazione_id` via `check-status`.
   - Materializzazione su `list-registrazioni`.
5. Se accetta, attivare lockstep per far salire “Accettati RENTRI”.

## Allegati (estratti dalle prove)
### Global
- Endpoint provato:  
  `POST https://api.rentri.gov.it/dati-registri/v1.0/operatore/R6QSWHZ6HJV/movimenti`  
  Esito: `401 Unauthorized` – `{"model_state":{"generic":["agIDInterop.invalidIssuer"]}}`
- Endpoint provato:  
  `POST https://api.rentri.gov.it/dati-registri/v1.0/operatore/OP2501RMK022692/movimenti`  
  Esito: `401 Unauthorized` – `invalidIssuer`
### Multy
- Endpoint provato:  
  `POST https://api.rentri.gov.it/dati-registri/v1.0/operatore/RQCGT1GPTN0/registrazioni`  
  Esito: `404 Not Found`
- Endpoint provato:  
  `POST https://api.rentri.gov.it/dati-registri/v1.0/operatore/RQCGT1GPTN0/movimenti`  
  Esito: `403 Forbidden`
- Endpoint provato (altro ID):  
  `POST https://api.rentri.gov.it/dati-registri/v1.0/operatore/RQEL39R7NS0/registrazioni`  
  Esito: `404 Not Found`

---
## Conclusione
Il layer di firma e i contenuti (CER/stato fisico) sono corretti; il blocco è sull’allineamento **issuer ↔ operatore REST ↔ registro REST**. Servono gli identificativi REST esatti per ciascun operatore e il chiarimento del flusso (“registrazioni” vs “movimenti”) per il registro “Trasporto conto proprio”. Appena definiti, gli invii dovrebbero passare con `202` e materializzare in lista.
