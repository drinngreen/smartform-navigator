# Report completo – Invii riusciti (202) e consultazioni post-invio

## Contesto
- Ambiente: Produzione (`api.rentri.gov.it`)
- Bridge: attivo, health `ok`
- Firma JWT: allineata agli esempi ufficiali
  - `iss`: identificativo operatore (OP…) dal subject del certificato
  - `aud`: `rentrigov.api`
  - `x5c`: foglia allegata negli header
  - Digest: `SHA-256=<hash(body)>` su POST; `SHA-256` di stringa vuota `""` su GET
  - `Agid-JWT-Signature`: JWT con `signed_headers` che includono esattamente `digest` e `content-type`

## Mappature certificati → OP (`iss`)
- Global RECO S.R.L.
  - Certificato: `certificato.p12`
  - `iss`: `OP2501RMK022692`
  - Registri UI: `R1DDEWC3SHU`, `R6QSWHZ6HJV`, `RYPHK2M3RKA`
- MULTY PROGET S.R.L.
  - Certificato: `multyproget.p12`
  - `iss`: `OP2501XMQ021914`
  - Registro UI: `RQEL39R7NS0`, `RQCGT1GPTN0` (Trasporto conto proprio)

## Primo 202 e invii successivi
### Global (OP2501RMK022692)
- POST “movimenti”
  - URL: `https://api.rentri.gov.it/dati-registri/v1.0/operatore/R6QSWHZ6HJV/movimenti`
  - Esiti 202 con transazione_id:
    - `82b0ff19-ac53-499a-9861-d3e2e6a9717e`
    - `629f731d-99ac-4fe2-a12a-3b6b2d317f99`
    - `65c05325-a6c9-4f9c-908e-f81e80f31315`
    - `d1454101-56ea-4618-93aa-c7c9933d8f40`
    - `68151adb-cb85-4d23-9236-62a7ae274483`
- Payload di prova (minimale, conforme):
  ```json
  [
    {
      "riferimenti": {
        "numero_registrazione": { "anno": 2025, "progressivo": 1 },
        "data_ora_registrazione": "2025-12-19T12:00:00Z",
        "causale_operazione": "RE"
      },
      "rifiuto": {
        "codice_eer": "170407",
        "stato_fisico": "S",
        "quantita": { "valore": 1, "unita_misura": "kg" },
        "provenienza": "U"
      }
    }
  ]
  ```

### Multy (OP2501XMQ021914)
- POST “movimenti”
  - URL: `https://api.rentri.gov.it/dati-registri/v1.0/operatore/RQEL39R7NS0/movimenti`
  - Esiti 202 con transazione_id:
    - `6c4d76be-792e-488f-8ae1-bdb88349c82b`
    - `5a119f50-c47c-4156-9077-f039a2168b94`

## Consultazioni post-invio (GET status, Liste)
### GET status (digest vuoto + Agid-JWT-Signature su GET, stesso iss; riuso `jti` abilitato)
- Global
  - Tentativi:
    - `https://api.rentri.gov.it/dati-registri/v1.0/{id}/status`
    - `https://api.rentri.gov.it/dati-registri/v1.0/transazioni/{id}`
  - Esito: `401 Unauthorized` con `{"model_state":{"generic":["agIDInterop.invalidIssuer"]}}`
- Multy
  - Tentativi analoghi su `transazione_id` di MULTY
  - Esito: `401 Unauthorized` con `invalidIssuer`

### Liste (registrazioni/movimenti)
- Global
  - `GET https://api.rentri.gov.it/dati-registri/v1.0/operatore/R6QSWHZ6HJV/registrazioni?limit=10&order=desc` → `401 invalidIssuer`
  - (in programma) prova con `R1DDEWC3SHU`
- Multy
  - `GET https://api.rentri.gov.it/dati-registri/v1.0/operatore/RQEL39R7NS0/registrazioni?limit=10&order=desc` → `401 invalidIssuer`

## Osservazioni tecniche
- La pipeline JWT (OP come `iss`) è corretta: le POST entrano con `202` e producono `transazione_id`.
- Le GET status/liste tornano `401 invalidIssuer` anche replicando:
  - `iss` uguale alla POST
  - `aud=rentrigov.api`
  - `x5c` foglia
  - Digest di body vuoto su GET
  - `Agid-JWT-Signature` con `signed_headers` `[digest, content-type]`
  - Riutilizzo `jti` (stesso valore) tra POST e GET
- Questo isola l’URL/risorsa come discriminante: il backend sta vincolando l’accesso allo status/alle liste ad un identificativo di operatore/registro atteso nel path (o “profilo” dell’operatore).

## Azioni in corso (senza contatti esterni)
1. Estrarre l’OP letterale dal subject dei p12 via `GET /whoami` e usare esattamente quel valore come `iss` (evitare varianti).
2. Provare i path “status” alternativi con JWT invariati:
   - `/operatore/{OP}/movimenti/transazioni/{id}`
   - `/operatore/{OP}/transazioni/{id}`
   - `/transazioni/{id}`
3. Provare lista Global con registro `R1DDEWC3SHU` oltre a `R6QSWHZ6HJV`.
4. Appena uno risponde `200`, congelare i parametri:
   - `iss` letterale (copiato)
   - `path` esatto (completo)
   - `regId` se rilevante
   - inserirli nel bridge come “profilo standard” (config per quel certificato/OP).

## Conclusione
- Obiettivo a breve: ottenere il primo `200` su `status` o `lista` con OP come `iss` e gli ID REST coerenti; quindi fissare il profilo nel bridge e dimostrare il flusso end‑to‑end (POST 202 → status/lista 200) per almeno un operatore/registro. A partire da questo profilo, generalizzare sugli altri rimanendo nel pattern JWT/URL già validato in POST.

