# Report ricostruzione collegamento RENTRI (VPN / Bridge)

Data report: 07/08/2026

---

## 1. Architettura del vecchio collegamento

```
App (browser)
   └─> Edge Function  rentri-vps-proxy      (Lovable Cloud)
          └─> POST http://167.235.29.27:3000/invia-operazione   (VPS Hetzner, dentro/dietro VPN)
                 └─> Bridge firma mTLS + JWT (certificati .p12)
                        └─> https://api.rentri.gov.it   (produzione)
```

Percorso legacy alternativo (ancora nel codice, da dismettere):

```
App → Edge Functions rentri-action-proxy / rentri-get-pdf / rentri-refresh-media
      └─> https://hierurgical-undefinable-magdalene.ngrok-free.dev   (tunnel ngrok, PC Windows locale)
```

---

## 2. Stato attuale della connettività (verificato ora)

| Endpoint | Esito |
|---|---|
| `http://167.235.29.27:3000/health` | **non raggiungibile** (timeout, nessuna risposta) |
| `https://hierurgical-undefinable-magdalene.ngrok-free.dev/health` | risponde **404** (tunnel vivo ma servizio/route non attivi) |

Conseguenza: il proxy marca RENTRI come offline per 180 s dopo ogni errore di rete e l'app continua a lavorare in locale (bozze/FIR salvabili).

---

## 3. Parametri di rete da ricreare

| Parametro | Valore attuale in codice | Note |
|---|---|---|
| Host VPS | `167.235.29.27` | Hetzner |
| Porta bridge | `3000` | HTTP in chiaro |
| Base URL completo | `http://167.235.29.27:3000` | override con secret `RENTRI_VPS_URL` |
| Endpoint unico d'ingresso | `POST /invia-operazione` | il proxy normalizza e rimuove eventuale suffisso duplicato |
| Timeout chiamata | 6000 ms | secret `RENTRI_VPS_TIMEOUT_MS` |
| TTL "offline" | 180000 ms | secret `RENTRI_VPS_OFFLINE_TTL_MS` |
| Bridge .NET locale (Windows) | Kestrel `localhost:8765` (HTTP) e `443` (HTTPS) | `bridge-service/Program.cs` |
| Tunnel legacy | `https://hierurgical-undefinable-magdalene.ngrok-free.dev` | secret `RENTRI_API_URL` per override |

**Secret RENTRI attualmente NON configurati** nel backend: `RENTRI_VPS_URL`, `RENTRI_VPS_TIMEOUT_MS`, `RENTRI_VPS_OFFLINE_TTL_MS`, `RENTRI_API_URL`. Vengono usati i default hardcoded sopra. Appena la nuova VPN è su, basta impostare `RENTRI_VPS_URL` con il nuovo indirizzo (es. `http://10.x.x.x:3000` o `https://bridge.tuodominio/`) senza toccare il codice.

---

## 4. Contratto della richiesta verso il bridge

Il proxy invia sempre `POST {BASE}/invia-operazione` con questo body:

```json
{
  "cliente": "multy",
  "company": "MULTY",
  "issuer": "12347770013",
  "tipo_operazione": "VIDIMAZIONE",
  "rentri_method": "POST",
  "rentri_path": "/vidimazione-formulari/v1.0/ZRZXR",
  "codice_blocco": "ZRZXR",
  "num_iscr_sito": "TO0001",
  "progressivo": null,
  "identificativo": "12347770013",
  "payload": { },
  "dati_inviati": { },
  "quantita": 10,
  "quantity": 10
}
```

Il bridge deve: leggere `rentri_method` + `rentri_path`, firmare e inoltrare a `https://api.rentri.gov.it{rentri_path}`, restituendo JSON con `success` / body RENTRI.

---

## 5. Credenziali e identificativi per azienda

> Certificati presenti nel repo in `bridge-service/` — vanno ricopiati sulla nuova VPS.

### Global Reco S.R.L.
- CF / issuer: `08934760961`
- Unità operativa: `OP2501RMK022692-TO0001`
- Registro: `R6QSWHZ6HJV` (altri visti in UI: `R1DDEWC3SHU`, `RYPHK2M3RKA`)
- Certificato: `certificato.p12` (alias `08934760961.p12`) — password `2$i5)*-H`
- Blocchi vidimazione: `FMGWB` (TO0001, ~71k FIR), `SKKZR` (TO0001), `XNQLK` (MI0001, ~58k), `GPFMK` (senza sito) — primario `FMGWB`

### Multy Proget S.R.L.
- CF / issuer: `12347770013`
- Unità operativa: `OP2501XMQ021914-TO0001`
- Registro: `RQEL39R7NS0` (conto proprio in UI: `RQCGT1GPTN0`)
- Certificato: `multyproget.p12` — password `1k+F_9nN`
- Blocchi: `ZRZXR` (TO0001, 534 FIR), `FRVKM` (senza sito, 787 FIR) — primario `ZRZXR`

### Niyol Eticons Logistica SRL SB
- CF / issuer: `09879800010`
- Unità operativa: `OP2501SXW021767-TO0001`
- Registro: `01-250210-00079463`
- Certificato: `niyol.p12` — password `86v@1|mG`
- Blocchi: `BPJMG` (TO0001, 322 FIR), `DGXYQ` (senza sito) — primario `BPJMG`

---

## 6. Parametri RENTRI (firma)

- Base URL: `https://api.rentri.gov.it`
- Audience JWT: `rentrigov.api`
- Issuer: **CF dell'operatore** sia per GET che per POST (mappatura in `bridge-service/Program.cs`)
- Header obbligatori: `Authorization: Bearer <idAuth>`, `Agid-JWT-Signature`, `Digest`
- POST: Digest sul body, `signed_headers` = `digest` + `content-type`
- GET: Digest su stringa vuota, `signed_headers` = `digest`
- Certificato: chiave del `.p12`, `x5c` con il certificato foglia

---

## 7. Endpoint RENTRI mappati dal proxy

| tipo_operazione | Metodo | Path |
|---|---|---|
| LISTA_BLOCCHI | GET | `/vidimazione-formulari/v1.0?identificativo={CF}` |
| VIDIMAZIONE | POST | `/vidimazione-formulari/v1.0/{BLOCCO}` |
| LOTTO | GET | `/vidimazione-formulari/v1.0/{BLOCCO}/{PROGRESSIVO}` |
| LOTTO_PDF | GET | `/vidimazione-formulari/v1.0/{BLOCCO}/{PROGRESSIVO}/pdf` |
| FIR_EMISSIONE / FIRMA_RICEZIONE | POST | `/formulari/v1.0` |
| DETTAGLIO_FIR | GET | `/formulari/v1.0/{UUID_FIR}` |
| RICERCA_FIR | GET | `/formulari/v1.0?numeroFir={N}&identificativo_soggetto={CF}` |
| REGISTRO | POST | `/dati-registri/v1.0/operatore/{ID_REGISTRO}/movimenti` |
| RICERCA_MOVIMENTI | GET | `/dati-registri/v1.0/operatore/{ID_REGISTRO}/movimenti?dataRegistrazioneDa=&dataRegistrazioneA=` |
| TRANSAZIONE_REGISTRO | GET | `/dati-registri/v1.0/operatore/{ID_REGISTRO}/transazioni/{TXN}` |
| TRANSAZIONE_FIR | GET | `/formulari/v1.0/transazioni/{TXN}` |

Nota: il progressivo viene sempre paddato a **6 cifre**.

---

## 8. Endpoint esposti dal bridge .NET (porta 8765 in locale)

`GET /health`, `GET /whoami`, `GET /monitor`, `GET /attempts`, `GET /callbacks`
`POST /send-rentri`, `/send-registrazioni`, `/list-rentri`, `/create-registro`, `/list-registrazioni`, `/list-movimenti`, `/export-list`, `/check-transazione`, `/status-poller`, `/check-status`, `/debug-status-sign`, `/rentri-callback`, `/suggest-next`, `/bulk-send`, `GET /bulk-status/{jobId}`

Sulla nuova VPS il bridge Node espone invece `/invia-operazione` (contratto §4) più eventualmente `/health`.

---

## 9. Checklist per ricreare la VPN / il collegamento

1. Attivare la VPN (o IP pubblico) e annotare l'indirizzo raggiungibile dal cloud.
2. Copiare `certificato.p12`, `multyproget.p12`, `niyol.p12` nella cartella del bridge sulla VPS (permessi 600).
3. Avviare il bridge sulla porta **3000** con endpoint `POST /invia-operazione` + `GET /health`.
4. Aprire il firewall solo verso gli IP in uscita del cloud (o mantenere la VPN punto-punto).
5. Impostare il secret `RENTRI_VPS_URL` con il nuovo base URL (senza `/invia-operazione` finale — il proxy lo aggiunge).
6. Facoltativo: alzare `RENTRI_VPS_TIMEOUT_MS` a 15000 se la VPN aggiunge latenza.
7. Test in sequenza: `GET /health` → `LISTA_BLOCCHI` (multy) → `LOTTO` → `VIDIMAZIONE`.
8. Attenzione al WAF RENTRI: dopo troppi tentativi arriva `423 sys.issuerIsBanned` — attendere lo sblocco senza ritentare.

---

## 10. Note e rischi

- Le password dei `.p12` sono in chiaro nel repo (`bridge-service/Program.cs`, `rentri-test/config.ts`): dopo la migrazione conviene spostarle in variabili d'ambiente della VPS.
- Il canale VPS è **HTTP in chiaro**: se la VPN non copre l'intero tratto, usare HTTPS con certificato valido.
- Restava aperto il problema storico dei `401 agIDInterop.invalidIssuer` sulle GET di consultazione (le POST rispondono `202`): dettagli in `docs/rentri-new-strategy.md` e `docs/rentri-202-report.md`.
