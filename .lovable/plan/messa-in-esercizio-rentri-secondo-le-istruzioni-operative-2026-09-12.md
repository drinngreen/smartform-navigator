# Messa in esercizio RENTRI secondo le istruzioni operative

Obiettivo: coprire i 5 punti della "definizione di pronto" del documento, senza toccare le logiche esistenti di giacenze/cernite/registro se non nei punti indicati.

## Cosa ho verificato confrontando il documento con il codice

Già conforme:
- tutto il traffico RENTRI passa dalla Edge Function `rentri-vps-proxy` verso il bridge Hetzner `https://rentri-bridge.dragonrifiuti.space/invia-operazione` con `x-bridge-key`; nessun mTLS/p12 lato app.
- anagrafiche, unità locali, blocchi FIR e registri corrispondono a quelli del documento (Multy impianto `RAH20NP7O40`, conto proprio `RQCTGTP7NT0`, intermediario `RQEL39R7NS0`, Niyol `RTR31497PX0`, Global `R6QSWHZ6HJV`). Nessun registro errato è presente in codice.

Non conforme, da correggere:
1. `FIRMA_RICEZIONE` punta a `POST /formulari/v1.0` invece di `POST /formulari/v1.0/{numeroFIR}/accettazione?identificativo_soggetto=..&num_iscr_sito=..`.
2. `RICERCA_FIR` non supporta la ricerca per soggetto + unità locale, quindi non si possono elencare i FIR in arrivo da firmare.
3. L'app autista salva il formulario ma non invia a RENTRI.
4. Nessun salvataggio sistematico di `transazione_id` ed esito finale; nessuna verifica post-invio sul listato RENTRI.
5. Residuo da rimuovere: la funzione `rentri-action-proxy` che punta a un vecchio indirizzo ngrok (fonte di errori fantasma).

## Interventi

### A. Proxy: rotte corrette
- Nuova rotta `LISTA_FIR_SOGGETTO`: `GET /formulari/v1.0?identificativo_soggetto={CF}&num_iscr_sito={UL}` (con filtri data opzionali).
- Correzione `FIRMA_RICEZIONE` sul path di accettazione con `numero_fir`, `identificativo_soggetto`, `num_iscr_sito`.
- Nuova rotta `LISTA_MOVIMENTI_REGISTRO` già presente (`RICERCA_MOVIMENTI`): usata per la verifica post-invio e per il calcolo del progressivo reale.
- Eliminazione della funzione `rentri-action-proxy`.

### B. Tracciamento (tabella nuova, isolata)
Nuova tabella `rentri_operazioni` (add-on, nessuna tabella esistente modificata) con: azienda, registro, tipo operazione, payload inviato, data/ora invio, `transazione_id`, esito API, esito finale, identificativo RENTRI, errore. Scrittura solo da Edge Function con service role; lettura per admin/superadmin. Ogni chiamata del proxy scrive una riga e la aggiorna al momento della verifica.

### C. Emissione FIR reale dall'app autista
Nel modulo formulario delle app (Multy/Niyol) il salvataggio definitivo chiama l'emissione RENTRI (`POST /formulari/v1.0`), salva identificativo, `transazione_id` e data/ora. Se il bridge non risponde, il formulario resta salvato e finisce nella coda di reinvio già esistente (`rentri_retry_pending`), con stato visibile all'autista. Nessuna modifica alla fatturazione, che nelle app resta esclusa.

### D. FIR in arrivo e firma a destino
Nella Console RENTRI, scheda "Da firmare": elenco letto da RENTRI con filtro sui formulari privi del blocco `accettazione`. La firma raccoglie peso accettato, data/ora arrivo ed esito (totale / parziale / respinto), invia l'accettazione e, solo in caso di esito confermato, scrive il movimento impianto e aggiorna le giacenze tramite le funzioni già esistenti.

### E. Invio movimenti registro C/S
Invio verso il registro corretto scelto automaticamente (impianto / conto proprio / intermediario / trasporto Niyol) in base al tipo di movimento. Il progressivo viene calcolato dal massimo realmente presente nel listato RENTRI, mai da suggerimenti automatici.

### F. Verifica post-invio obbligatoria
Dopo ogni invio (FIR, accettazione, movimento) si salva il `transazione_id`, si interroga lo stato transazione e si controlla la presenza nel listato RENTRI. `202 Accepted` non è considerato successo: finché la verifica non passa lo stato resta "in verifica", poi "confermato" o "da analizzare".

## Ordine di consegna
1. A + B (rotte corrette e tracciamento) — base per tutto il resto.
2. E + F (movimenti registro con verifica reale).
3. D (FIR in arrivo e firma a destino).
4. C (emissione dall'app autista).

Ogni passo chiuso con `node scripts/verify.mjs --smoke` e con una prova reale su RENTRI riportata con `transazione_id`.
