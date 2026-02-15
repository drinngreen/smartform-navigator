# Report aggiornato e strategie di sblocco (RENTRI – produzione)

## Stato attuale
- Firma JWT aderente agli esempi: OP come `iss`, `aud=rentrigov.api`, `x5c` foglia, Digest su body (POST) e su stringa vuota (GET), `Agid-JWT-Signature` con `signed_headers`.
- POST “movimenti”:
  - Global (OP2501RMK022692) su `/dati-registri/v1.0/operatore/R6QSWHZ6HJV/movimenti` → 202 con `transazione_id` (più eventi confermati).
  - Multy (OP2501XMQ021914) su `/dati-registri/v1.0/operatore/RQEL39R7NS0/movimenti` → 202 con `transazione_id`.
- GET status e Liste:
  - Global: status e liste → 401 `agIDInterop.invalidIssuer` su tutte le varianti di path provate.
  - Multy: status e liste → 401 `agIDInterop.invalidIssuer`.

## Ultimi ID e URL provati
### Global
- Transazioni create (esempi): `6b86120a-5874-4ec9-b56e-9998bf0875e1`, `68151adb-cb85-4d23-9236-62a7ae274483`, `d1454101-56ea-4618-93aa-c7c9933d8f40`.
- Status:
  - `/dati-registri/v1.0/{id}/status` → 401
  - `/dati-registri/v1.0/transazioni/{id}` → 401
  - `/dati-registri/v1.0/operatore/R6QSWHZ6HJV/transazioni/{id}` → 401
  - `/dati-registri/v1.0/operatore/R1DDEWC3SHU/transazioni/{id}` → 401
  - `/dati-registri/v1.0/operatore/OP2501RMK022692/transazioni/{id}` → 401
- Liste:
  - `/dati-registri/v1.0/operatore/R1DDEWC3SHU/registrazioni?limit=10&order=desc` → 401
  - `/dati-registri/v1.0/operatore/R6QSWHZ6HJV/registrazioni?limit=10&order=desc` → 401
  - `/dati-registri/v1.0/operatore/{id}/movimenti?limit=10&order=desc` (con id `R1DDEWC3SHU`, `R6QSWHZ6HJV`, `OP2501RMK022692`) → 401

### Multy
- Transazioni create (esempi): `6c4d76be-792e-488f-8ae1-bdb88349c82b`, `5a119f50-c47c-4156-9077-f039a2168b94`.
- Status:
  - `/dati-registri/v1.0/transazioni/{id}` → 401
  - `/dati-registri/v1.0/operatore/RQEL39R7NS0/transazioni/{id}` → 401
  - `/dati-registri/v1.0/operatore/RQCGT1GPTN0/transazioni/{id}` → 401
  - `/dati-registri/v1.0/operatore/OP2501XMQ021914/transazioni/{id}` → 401
- Liste:
  - `/dati-registri/v1.0/operatore/RQEL39R7NS0/registrazioni?limit=10&order=desc` → 401

## Analisi
- Il flusso JWT/headers è corretto: le POST sono accettate con 202; le GET sono firmate con digest di body vuoto e `signed_headers` coerenti.
- I 401 su consultazione indicano mismatch di autorizzazione tra:
  - `iss` (OP dal subject del p12),
  - l’ID usato nel path (operatore/registro), e
  - la risorsa (transazione/lista) che RENTRI espone per quell’operatore/registro.
- È ragionevole che le transazioni status/result siano “scoped” all’operatore/registro che le ha generate: servono gli ID REST attesi dal backend (non necessariamente gli identificativi mostrati in UI).

## Strategie di sblocco (operative)
1) Issuer letterale dal subject:
   - Usare esattamente l’OP del subject p12 come `iss` (nessuna variante o normalizzazione).
   - Validare con `GET /whoami` e fissare l’OP “letterale” nei profili cert→OP.
2) Path status “scoped”:
   - Provare status con path che includono operatore/registro:
     - `/operatore/{OP}/movimenti/transazioni/{id}`
     - `/operatore/{R…}/movimenti/transazioni/{id}`
   - Mantenere identici i JWT tra POST e GET (riuso `jti`, stesso `iss`, stessa `aud`).
3) Liste per ID registro REST:
   - Provare i registri Global con `R1DDEWC3SHU`, `R6QSWHZ6HJV`, `RYPHK2M3RKA`.
   - Validare “movimenti” vs “registrazioni” coerenti alle attività (R4/R12/R13).
4) Versioni e domini:
   - Verificare se status/result rispondono su dominio/servizio differente (es. `trasmissioni`, `esiti`, `anagrafiche` per alcuni operatori).
   - Provare varianti di basePath con stesso `iss` e `aud`.
5) Congelamento profilo:
   - Appena si ottiene un 200 su `status` o `lista`, congelare:
     - `iss` (OP letterale),
     - path completo (incluso segmento `/operatore/...` se presente),
     - `regId` se richiesto.
   - Inserire questo profilo nel bridge come configurazione standard per il certificato.

## Prossimi test pianificati
- Global:
  - Status: `/dati-registri/v1.0/operatore/OP2501RMK022692/movimenti/transazioni/{id}`
  - Lista registrazioni: `/dati-registri/v1.0/operatore/R1DDEWC3SHU/registrazioni?limit=50&order=desc`
  - Lista movimenti: `/dati-registri/v1.0/operatore/R1DDEWC3SHU/movimenti?limit=50&order=desc`
- Multy:
  - Status: `/dati-registri/v1.0/operatore/OP2501XMQ021914/movimenti/transazioni/{id}`
  - Lista movimenti: `/dati-registri/v1.0/operatore/RQCGT1GPTN0/movimenti?limit=50&order=desc`

## Esito atteso e consegna
- Primo `200` su consultazione (status/lista) con OP come `iss` e path corretto.
- Congelamento parametri e inserimento “profilo standard” nel bridge.
- Dimostrazione end‑to‑end per quell’operatore/registro:
  - POST 202 → GET status 200/result → lista 200.
- Generalizzazione sugli altri operatori mantenendo gli stessi pattern.

