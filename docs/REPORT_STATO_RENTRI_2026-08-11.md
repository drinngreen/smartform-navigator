# Report stato dell'arte — RENTRI / App personale / Dark Lemon
Data: 11/08/2026 — contesto: Multyproget + Niyol (Dev Multy)

## 1. Cosa ESISTE già e funziona

### 1.1 Canale RENTRI
- Edge Function `rentri-vps-proxy` (+ `handler.ts`, 532 righe) → bridge `https://rentri-bridge.dragonrifiuti.space/invia-operazione`, header `x-bridge-key`.
  - alias `multyproget` → config `multy`, propagazione reale degli status HTTP (no falsi 200), modalità `dry_run`.
  - test reali OK: lista blocchi Multyproget (`FRVKM`, `ZRZXR`) e Niyol (`DGXYQ`, `BPJMG`).
- Edge Function alternativa `rentri-action-proxy` (usata dai flussi FIR) + `rentri-get-pdf`, `rentri-refresh-media`.
- Client `src/lib/rentriVpsApi.ts` con operazioni già mappate:
  listaBlocchi, richiestaVidimazione, leggiLotto, scaricaPdfLotto, emissioneFir, dettaglioFir, ricercaFir,
  inserimentoMovimento (registro), ricercaMovimenti, statoTransazioneRegistro/Fir, firmaRicezione,
  listaFirInArrivoDestinatario, accettaFirInArrivoDestinatario, vidimaFIRAsync, dry-run.
- Cronologia: tabella `rentri_operation_history` + `RentriHistoryPanel` + `rentri_logs`.
- Pagina `MNRENTRIPage` = console minima: 7 tipi operazione, textarea JSON grezzo, Verifica (dry-run) / Invia, storico.

### 1.2 Impianto / FIR in entrata
- `MNImpiantoDestinatarioPage` + `MNImpiantoProduttorePage` (inserimento manuale movimenti impianto).
- `src/services/impiantoFirService.ts`: lista FIR in arrivo, firma ricezione, firma destinatario, import in `impianto_fir_inbox`.
- Componenti `ImpiantoFirList / Detail / Search / Timeline`.
- Tabelle: `impianto_fir_inbox`, `movimenti_impianto`, `fir_forms`, `fir_digitali`, `register_movements`, `registro_generale`.

### 1.3 App personale
- App autiste: `MNMultyprogetAppPage`, `MNNiyolAppPage`, `MNTransporterAppPage` + pagine app (cronologia, GPS, modulo alternativo, profilo…).
- Admin: `MNTrasportatoriPage` (670 righe) — elenco personale, credenziali, elimina utente, "Assegna FIR all'app", storico bozze/inviati.
- Formulari con doppia vista Standard / Alternativo sincronizzate (`MNFIRFormComplete`, `FIRAlternativeForm`).

### 1.4 Dark Lemon
- Edge Function `dark-lemon-mn` (3.237 righe), ~55 tool: DB read/write, FIR, privati, conferimenti, ricevute, fatture, Dragon (stock/registri/cernite/audit), GPS, rubrica, email, memoria, knowledge base.
- Prompt di sistema costruito dinamicamente con memoria admin e guide operative.

---

## 2. Cosa MANCA (gap reali)

| Area | Gap |
|---|---|
| Console RENTRI | Non esiste una vera console: solo textarea JSON. Mancano: stato VPS/bridge live (l'IP mostrato `178.104.22.197:3000` è **obsoleto**, hardcoded), pesca numeri FIR (richiesta vidimazione con UI), assegnazione numeri a personale, invio registri con form, pannello blocchi/lotti, contatore FIR residui. |
| Invio registri | `inserimentoMovimento` esiste come funzione ma **nessuna UI** la usa. `DevInviiRentriModule` legge un **JSON statico** (`src/data/inviiRentriMulty.json`), non il DB: gli "invii effettuati" mostrati sono finti/storici. Nessuna tabella `rentri_invii_registri` con stato transazione e polling `statoTransazioneRegistro`. |
| FIR in entrata (impianto) | La firma ricezione/accettazione esiste a livello servizio ma non è collegata a una dashboard di monitoraggio con polling periodico, badge "da firmare", e scrittura automatica su `movimenti_impianto` + giacenze dopo la firma. |
| QR code | **Nessuna libreria QR installata** (`qrcode`/`react-qr-code` assenti in package.json). Esistono solo riferimenti a URL `fir-documents`. Manca generazione/stampa QR alla partenza del FIR. |
| App personale ↔ admin | L'admin assegna il FIR ma non può **compilare da remoto** il formulario dell'autista in modo condiviso live; l'autista non ha un flusso guidato completo di compilazione + firma partenza + QR. |
| Dark Lemon | **Zero tool RENTRI**: non può pescare numeri, vidimare, inviare registri, firmare ricezioni, leggere stato VPS. Il system prompt non contiene le regole 2026 (bridge nuovo, alias multyproget, dry-run, blocchi attivi, obbligo conferma "CONFERMO" per firme). |
| Barra comandi | Non esiste un campo input Dark Lemon "azioni" nella console RENTRI. |

---

## 3. Carenze informative — cosa mi serve da te

1. **Endpoint/percorsi RENTRI ufficiali** che il bridge accetta per: inserimento movimenti registro (path esatto + versione), stato transazione, firma ricezione destinatario. Ho i path storici ma non la conferma della versione attuale (`/registri/v1.0`? `/dati-registro/v1.0`?).
2. **Numeri iscrizione**: `num_iscr_sito` / identificativo unità locale per ogni impianto Multyproget e Niyol (mi serve la lista esatta, oggi ho solo CF 12347770013 e 09879800010).
3. **Registri RENTRI attivi**: ID/codice registro per ciascuna unità locale (per l'invio movimenti serve l'id registro, non solo il CF).
4. **Blocchi FIR da usare**: uso `FRVKM`/`ZRZXR` (Multy) e `DGXYQ`/`BPJMG` (Niyol)? Quale è quello "corrente" da cui pescare?
5. **Policy firma**: chi può firmare la ricezione come impianto (solo admin? anche personale?) e serve doppia conferma testuale?
6. **Formato QR**: il QR sul FIR deve contenere l'URL pubblico del PDF, il numero FIR, o il payload RENTRI standard? Dimensione richiesta (28x28 mm come da memoria)?
7. **App personale**: l'autista compila tutto o solo i campi di trasporto (targa, conducente, data/ora partenza, kg)?
8. **Chiave bridge**: confermi che `RENTRI_BRIDGE_KEY` è valido anche per POST (finora testato solo GET)?

---

## 4. Piano proposto (dopo le tue risposte)

- **F1 — Console RENTRI** (`/mn/admin/:context/rentri-console`): stato bridge/VPS live, blocchi + FIR residui, pesca numeri (vidimazione), assegnazione numeri al personale, invio registri, storico invii reale da DB, barra comandi Dark Lemon.
- **F2 — Invii registri**: tabella `rentri_invii_registri` + UI di selezione movimenti + polling stato transazione.
- **F3 — Impianto FIR in entrata**: dashboard monitoraggio con polling, firma ricezione/destinatario, aggiornamento automatico giacenze.
- **F4 — QR code**: libreria QR, generazione alla partenza, stampa e pagina pubblica di verifica.
- **F5 — App personale**: compilazione admin-side e autista-side sincronizzata sullo stesso formulario.
- **F6 — Dark Lemon**: nuovi tool RENTRI (`rentri_status`, `rentri_lista_blocchi`, `rentri_pesca_numeri`, `rentri_assegna_numero`, `rentri_invia_registro`, `rentri_fir_in_arrivo`, `rentri_firma_ricezione`, `rentri_stato_transazione`) + system prompt aggiornato con conferma obbligatoria "CONFERMO" per ogni azione che scrive su RENTRI.

Nessuna modifica applicata: questo documento è solo diagnostico.
