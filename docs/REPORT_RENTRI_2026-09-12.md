# REPORT SITUAZIONE RENTRI — 12/09/2026

Verifiche eseguite in diretta oggi (sola lettura, nessuna scrittura su RENTRI).

---

## 1. Infrastruttura: dove passano le richieste

```
App (browser)
   -> Edge Function "rentri-vps-proxy" (Lovable Cloud)
      -> Bridge VPS  https://rentri-bridge.dragonrifiuti.space/invia-operazione
         -> RENTRI (mTLS + certificato p12 + firma JWT)
```

- Il VPS/bridge è raggiunto in HTTPS all'host `rentri-bridge.dragonrifiuti.space`.
  L'IP storico `178.104.22.197:3000` è obsoleto e non più usato.
- Autenticazione verso il bridge: header `x-bridge-key` (secret `RENTRI_BRIDGE_KEY`).
  URL base configurabile con `RENTRI_BRIDGE_URL`.
- mTLS, certificato `.p12`, firma JWT `Agid-JWT-Signature`, Digest e token Bearer
  sono gestiti **dal VPS**, non dalla piattaforma. La piattaforma invia solo
  metodo + path + payload.

Contratto verso il bridge (file `supabase/functions/rentri-vps-proxy/handler.ts`):

```json
{ "cliente": "multyproget", "company": "MULTYPROGET", "issuer": "12347770013",
  "tipo_operazione": "LISTA_BLOCCHI", "rentri_method": "GET",
  "rentri_path": "/vidimazione-formulari/v1.0?identificativo=12347770013",
  "payload": null }
```

Modalità `dry_run: true` = validazione senza invio reale.
Gli errori non vengono mascherati: 500/502/423 vengono propagati con `error_code`
(`BRIDGE_ERROR`, `BRIDGE_UNAVAILABLE`, `CLIENT_ERROR`).

### Identificativi configurati

| Cliente | CF / issuer | Unità locale | Registri RENTRI | Blocchi FIR |
|---|---|---|---|---|
| Multyproget (`multy`) | 12347770013 | OP2501XMQ021914-TO0001 | RAH20NP7O40 (impianto), RQCTGTP7NT0 (trasporto c/proprio), RQEL39R7NS0 (intermediario) | ZRZXR (TO0001), FRVKM |
| Niyol | 09879800010 | OP2501SXW021767-TO0001 | RTR31497PX0 (trasporto) | BPJMG (TO0001), DGXYQ |
| Global Reco | 08934760961 | OP2501RMK022692-TO0001 | R6QSWHZ6HJV | FMGWB, SKKZR, XNQLK, GPFMK |

---

## 2. Endpoint RENTRI usati

| Operazione | Metodo | Path |
|---|---|---|
| Lista blocchi | GET | `/vidimazione-formulari/v1.0?identificativo={CF}` |
| Vidimazione (pesca numeri) | POST | `/vidimazione-formulari/v1.0/{blocco}` |
| Lotto vidimato | GET | `/vidimazione-formulari/v1.0/{blocco}/{progressivo a 6 cifre}` |
| PDF lotto | GET | `.../{progressivo}/pdf` |
| Emissione FIR | POST | `/formulari/v1.0` |
| Elenco formulari del soggetto | GET | `/formulari/v1.0?identificativo_soggetto={CF}&num_iscr_sito={UL}` |
| Dettaglio FIR | GET | `/formulari/v1.0/{numeroFIR senza spazi}` |
| **Accettazione a destino (firma impianto)** | POST | `/formulari/v1.0/{numeroFIR}/accettazione?identificativo_soggetto=..&num_iscr_sito=..` |
| Movimenti registro C/S | POST | `/dati-registri/v1.0/operatore/{registro}/movimenti` |
| Ricerca movimenti | GET | `/dati-registri/v1.0/operatore/{registro}/movimenti?dataRegistrazioneDa=..&A=..` |
| Stato transazione registro | GET | `/dati-registri/v1.0/operatore/{registro}/transazioni/{id}` |

Il progressivo FIR viene sempre normalizzato a 6 cifre (padding con zeri).

---

## 3. Prove eseguite oggi (reali)

1. **Dry-run** LISTA_BLOCCHI Multyproget → `route_valida: true`, issuer, unità locale,
   registro e chiave bridge tutti presenti.
2. **Chiamata reale** LISTA_BLOCCHI → **HTTP 200**:
   - FRVKM — 1.375 FIR vidimati — ultimo utilizzo 11/09/2026
   - ZRZXR — 792 FIR vidimati — ultimo utilizzo 11/09/2026
3. **Chiamata reale** elenco formulari (`/formulari/v1.0?...`) → **HTTP 200**, elenco
   completo dei FIR del soggetto con produttore, trasportatori, destinatari, EER,
   quantità, stato e blocco `accettazione` (data arrivo, quantità accettata, tipo).

**Conclusione: il canale tecnico verso il RENTRI funziona oggi, in produzione.**

---

## 4. FIR in arrivo dall'esterno (impianto che deve firmare)

- Fonte: **non c'è un endpoint dedicato "in arrivo"**. Si usa l'elenco formulari del
  soggetto `GET /formulari/v1.0?identificativo_soggetto={CF}&num_iscr_sito={UL}`:
  il RENTRI restituisce anche i formulari emessi da terzi in cui l'impianto è
  destinatario. Da firmare = record **senza** blocco `accettazione`.
- Codice: `src/lib/rentriVpsApi.ts` (`elencoFormulariRentri`,
  `accettaFirInArrivoDestinatario`), pannello
  `src/components/rentri/RentriFirDaFirmarePanel.tsx`, contatore
  `src/hooks/useFirDaFirmareCount.ts`, servizio `src/services/impiantoFirService.ts`.
- UI: Console RENTRI → scheda con "Cerca su RENTRI", filtro "Da firmare", dettaglio,
  firma con kg pesati, data/ora arrivo ed esito
  (ACCETTATO_TOTALMENTE / ACCETTATO_PARZIALMENTE / RESPINTO).
- **Limiti attuali:** interrogazione solo manuale (nessun polling automatico né
  notifica), e dopo la firma **non** si aggiornano in automatico movimenti impianto
  e giacenze.

---

## 5. Flusso ufficio (come si emette oggi)

Percorso: `/mn/admin/dev-multyproget/rentri-console` (`MNRentriConsolePage.tsx`).

1. **Pesca numeri**: `vidimaFIRAsync` → POST vidimazione sul blocco, polling
   transazione, i numeri entrano nel serbatoio.
2. **Compilazione**: `MNFIRFormComplete.tsx` (Standard / Modulo alternativo) oppure
   la scheda "Nuovo formulario" della console.
3. **Invio a RENTRI**: `RentriBozzePanel.tsx` → `emissioneFir` → POST `/formulari/v1.0`.
4. **Carico nel sistema**: pulsante "CARICA NEL SISTEMA (REGISTRO + GIACENZE)".
5. **Registro C/S verso RENTRI**: funzione `inserimentoMovimento` presente, tabella
   `rentri_invii_registri` creata ma **vuota (0 righe)** → nella pratica gli invii di
   registro non sono ancora stati messi in esercizio.

---

## 6. App dipendenti / autisti

- Pagine: `MNMultyprogetAppPage.tsx`, `MNNiyolAppPage.tsx`, `MNTransporterAppPage.tsx`,
  più cronologia, GPS, modulo alternativo, profilo, comunicazioni.
- L'app carica lo **stesso** formulario completo (`MNFIRFormComplete` con
  `forceRentriDigital`), quindi l'autista compila tutti i campi di trasporto.
- **Gap grave:** dall'app **non parte nessuna chiamata al RENTRI**. Nessun riferimento
  a `emissioneFir`/`rentriVpsApi` nelle pagine app: l'autista salva in database, poi
  l'invio deve essere fatto dall'ufficio dalla console.
- Manca la firma di partenza dell'autista e l'aggancio automatico del numero FIR
  assegnato.

---

## 7. Stato tabelle

| Tabella | Righe |
|---|---|
| `fir_forms` | 1.865 |
| `rentri_registro_esiti` | 697 (ultimo 01/09/2026) |
| `rentri_operation_history` | 0 |
| `rentri_invii_registri` | 0 |
| `rentri_logs` | 1 |
| `impianto_fir_inbox` | 2 |
| `fir_digitali` | 0 |

Lo storico operazioni RENTRI non viene scritto: oggi non c'è tracciabilità interna
degli invii.

---

## 8. Documentazione usata

- `https://demoapi.rentri.gov.it/docs?page=api-flussi-operativi-registri` (API RENTRI demo)
- Linee guida AGID interoperabilità/sicurezza API (PDF 2024) e pattern JWT ModI
- GovWay — documentazione header ModI (`Agid-JWT-Signature`, Digest, signed_headers)
- Documenti interni: `docs/rentri-api-survey.md`, `docs/rentri-new-strategy.md`,
  `docs/HANDOFF_VPS_BRIDGE_RENTRI.md`, `docs/REPORT_STATO_RENTRI_2026-08-11.md`,
  `docs/risoluzione_vidimazione_produzione.md`

---

## 9. Cosa manca per essere conformi tra 3 giorni

Priorità:

1. **Invio da app autista** — l'app deve emettere il FIR a RENTRI, non solo salvarlo.
2. **Firma accettazione con effetto sul magazzino** — dopo la firma scrivere movimento
   e giacenza, oggi è manuale.
3. **Polling FIR in arrivo + notifica** "hai N formulari da firmare".
4. **Registro C/S verso RENTRI in esercizio** con stato transazione e storico
   (`rentri_invii_registri` oggi vuota).
5. **Tracciamento**: scrivere sempre su `rentri_operation_history` / `rentri_logs`.
6. **Verifica GET di consultazione registri** (in passato 401 `invalidIssuer` su alcune
   liste — da riprovare ora che il bridge risponde).

---

## 10. Addendum — analisi approfondita del codice

- **Percorso legacy mai dismesso**: le funzioni `rentri-action-proxy`, `rentri-get-pdf`,
  `rentri-refresh-media` puntano ancora a un vecchio tunnel ngrok su un PC locale
  (risultava offline nei report interni). Vanno rimosse o ricollegate al bridge.
- **Rischio sicurezza**: nella cartella `bridge-service/` sono versionati i certificati
  `certificato.p12`, `multyproget.p12`, `niyol.p12` con le relative password scritte in
  chiaro nel sorgente (`bridge-service/Program.cs`). Da rimuovere dal repository e
  ruotare.
- **Il bridge nel repo non è quello in produzione**: `bridge-service/Program.cs` espone
  `/send-rentri` sulla porta 8765, mentre la piattaforma chiama `/invia-operazione`.
  Il sorgente reale del VPS non è nel progetto.
- **Incoerenza `FIRMA_RICEZIONE`**: lato server la rotta punta a `/formulari/v1.0`
  (stesso path dell'emissione). La firma di accettazione corretta funziona solo perché
  il client usa la rotta diretta `/formulari/v1.0/{numero}/accettazione`.
- **Pagina vuota**: `/mn/admin/:context/fir-digitali` (`MNFirDigitaliPage.tsx`) è un
  segnaposto senza funzionalità.
- **Hook abbandonato**: `src/hooks/useRENTRIFir.ts` lavora su tabelle `fir`/`fir_events`
  non usate dal form reale (`fir_forms`).
- **423 `sys.issuerIsBanned`**: non è gestito a runtime, compare solo come testo nella
  guida. Serve un blocco automatico con attesa.
- **Errori storici su registro C/S**: `401 agIDInterop.invalidIssuer`, `403`, `404` su
  `/dati-registri/...` per disallineamento tra issuer, ID operatore e ID registro.
  Oggi il canale risponde 200 sui formulari: va riprovato il registro.
