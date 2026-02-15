# Report Log Storico – Tentativi e Risposte RENTRI (Locale)

Questo report aggrega i log e gli esiti delle chiamate effettuate dal bridge e dagli script di test locali, per analizzare l’origine degli errori (401/403/404) e fornire tracce riproducibili.

## Sommario
- Health Bridge: OK al riavvio (`{"status":"ok"}`).
- Invii Produzione:
  - Global “movimenti” → 401 `agIDInterop.invalidIssuer`.
  - Multy “registrazioni” → 404; “movimenti” → 403/401.
- Probe ID REST (liste “registrazioni/movimenti”): tutti gli ID testati hanno risposto 401.
- Callback RENTRI: nessun file presente (non sono arrivati callback).

## Health e Avvio
### Health Check
```
GET http://localhost:8765/health
→ {"status":"ok"}
```

### Avvio Bridge
```
--- BRIDGE RENTRI UFFICIALE (SELF-SIGNED TOKENS) ---
Now listening on: http://[::]:8765
Now listening on: https://[::]:443
Application started. Hosting environment: Production
```

## Invii Singoli – Script `runSubmit.ts`
### Global – certificato.p12 (issuer fissato: 08934760961)
```
[INVIO] CER: '17.04.07' -> https://api.rentri.gov.it/dati-registri/v1.0/operatore/R6QSWHZ6HJV/movimenti
Esito: 401 Unauthorized
Body: {"generic":["agIDInterop.invalidIssuer"]}
```

### Multy – multyproget.p12 (issuer fissato: 12347770013)
```
[INVIO] CER: '17.04.07' -> https://api.rentri.gov.it/dati-registri/v1.0/operatore/RQEL39R7NS0/movimenti
Esito: 401 Unauthorized
Body: {"generic":["agIDInterop.invalidIssuer"]}
```

## Test Endpoint – Script `testOne.ts`
### Multy – registrazioni
```
URL: https://api.rentri.gov.it/dati-registri/v1.0/operatore/RQCGT1GPTN0/registrazioni
Esito: 404 Not Found
Body: {"type":"https://httpstatuses.com/404","title":"Not Found","status":404}
```

### Multy – movimenti (con intermediario)
```
URL: https://api.rentri.gov.it/dati-registri/v1.0/operatore/RQCGT1GPTN0/movimenti
Esito: 403 Forbidden
Body: {"type":"https://httpstatuses.com/403","title":"Forbidden","status":403}
```

### Global – movimenti (varianti issuer)
```
Prove issuer: 08934760961
Esito: 401 Unauthorized (invalidIssuer) per tutte le prove
```

## Probe ID REST – Script `probe.ts`
### Global
```
IDs testati (registrazioni/movimenti):
OP2501RMK022692 → status 401 / 401
R6QSWHZ6HJV     → status 401 / 401
R1DDEWC3SHU     → status 401 / 401
```

### Multy
```
IDs testati (registrazioni/movimenti):
OP2501XMQ021914 → status 401 / 401
RQEL39R7NS0     → status 401 / 401
RQCGT1GPTN0     → status 401 / 401
```

## Diagnostica Certificati – `GET /whoami`
### Global – certificato.p12
```
subject: ... OID.2.5.4.97=CF:IT-08934760961
dnQualifier: (non usato come issuer)
organizationIdentifier: CF:IT-08934760961
```

### Multy – multyproget.p12
```
subject: ... OID.2.5.4.97=CF:IT-12347770013
dnQualifier: (non usato come issuer)
organizationIdentifier: CF:IT-12347770013
```

## Analisi dai Log
1) 401 `agIDInterop.invalidIssuer`: i token vengono letti e la firma è valida; il sistema respinge perché l’`iss` (dal `dnQualifier`) non è autorizzato sull’ID operatore/registro nel path.
2) 404 su “registrazioni” MULTY: l’ID usato non è l’ID REST previsto dall’API per quel registro (“Trasporto conto proprio”).
3) 403 su “movimenti” MULTY: permessi/ACL o modello di risorsa non coerente con l’operatore/registro del certificato.

## Root Cause Probabile
- Disallineamento tra `iss` ↔ ID operatore REST ↔ ID registro REST. Gli ID usati (da UI) non risultano validi per l’API REST quando firmati dai certificati attuali.

## Azioni suggerite
1) Recuperare da RENTRI gli ID REST esatti dell’operatore associati a:
   - Global: `08934760961`.
   - Multy: `12347770013`.
2) Recuperare gli ID registro REST attivi sotto questi operatori.
3) Confermare endpoint coerente (“movimenti” vs “registrazioni”) per ogni registro.
4) Ritentare:
   - Lista → atteso 200 (ID/path validi).
   - Invio singolo → atteso 202 con `transazione_id`.
   - `check-status` e `list-registrazioni` → materializzazione.

## Nota sui Callback
- Nessun file `callbacks` presente in <bridge-service>/bin/Debug/net8.0 (nessun callback ricevuto). Il bridge salva i callback in `callbacks/` quando RENTRI fa il redirect (header `X-Correlation-ID`).

---
Fine report log storico locale.
