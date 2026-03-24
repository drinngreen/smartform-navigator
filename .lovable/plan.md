

## Piano: Aggiornare l'Architettura Proxy con gli Endpoint RENTRI Definitivi

### Contesto
Attualmente il proxy VPS (`rentri-vps-proxy`) invia tutto a un singolo endpoint generico `/invia-operazione` sulla VPS, che poi deve smistare internamente. Ora abbiamo la lista definitiva degli endpoint RENTRI di produzione. Il piano è ristrutturare il proxy per mappare ogni operazione al percorso corretto dell'API RENTRI, e aggiornare la VPS bridge di conseguenza.

### Endpoint RENTRI Definitivi

```text
VIDIMAZIONE
  GET  /vidimazione-formulari/v1.0?identificativo={CF}          → lista blocchi
  POST /vidimazione-formulari/v1.0/{CODICE_BLOCCO}              → nuovo numero FIR
  GET  /vidimazione-formulari/v1.0/{CODICE_BLOCCO}/{PROGRESSIVO}     → leggi numero + QR
  GET  /vidimazione-formulari/v1.0/{CODICE_BLOCCO}/{PROGRESSIVO}/pdf → download PDF

EMISSIONE FIR
  POST /formulari/v1.0                                          → emissione FIR compilato
  GET  /formulari/v1.0/{UUID_FIR}                               → consultazione FIR
  GET  /formulari/v1.0?numeroFir={NUM}&identificativo_soggetto={CF} → ricerca FIR

REGISTRI (MOVIMENTI)
  POST /dati-registri/v1.0/operatore/{ID_REGISTRO}/movimenti    → inserimento movimento
  GET  /dati-registri/v1.0/operatore/{ID_REGISTRO}/movimenti?...→ ricerca movimenti

TRANSAZIONI (ESITI ASINCRONI)
  GET  /dati-registri/v1.0/operatore/{ID_REGISTRO}/transazioni/{TXN_ID}
  GET  /formulari/v1.0/transazioni/{TXN_ID}

Identificativi:
  JWT iss = Codice Fiscale
  Vidimazione path = Codice Fiscale
  Registri path = ID Registro (es. R6QSWHZ6HJV)
```

### Modifiche

**1. Aggiornare `rentri-test/config.ts`**
- Aggiungere `registryId` per Global (manca attualmente)
- Aggiungere gli endpoint come costanti di riferimento
- Aggiungere i `unitId` (num_iscr_sito) come campo strutturato

**2. Aggiornare `src/lib/rentriBlockCodes.ts`**
- Aggiungere `unitId` (num_iscr_sito) per ogni azienda, necessario nel payload di vidimazione
- Aggiungere `registryId` per ogni azienda, necessario per i movimenti

**3. Ristrutturare `supabase/functions/rentri-vps-proxy/index.ts`**
- Cambiare la logica di routing: invece di mandare tutto a `/invia-operazione`, mappare ogni `tipo_operazione` al percorso RENTRI corretto
- Nuova mappa delle rotte:
  - `LISTA_BLOCCHI` → `GET /vidimazione-formulari/v1.0?identificativo={CF}`
  - `VIDIMAZIONE` → `POST /vidimazione-formulari/v1.0/{CODICE_BLOCCO}` con body `{ num_iscr_sito }`
  - `LOTTO` → `GET /vidimazione-formulari/v1.0/{CODICE_BLOCCO}/{PROGRESSIVO}`
  - `FIR_EMISSIONE` → `POST /formulari/v1.0`
  - `DETTAGLIO_FIR` → `GET /formulari/v1.0/{UUID_FIR}`
  - `REGISTRO` → `POST /dati-registri/v1.0/operatore/{REGISTRY_ID}/movimenti`
  - `TRANSAZIONE_REGISTRO` → `GET /dati-registri/v1.0/operatore/{REGISTRY_ID}/transazioni/{TXN_ID}`
  - `TRANSAZIONE_FIR` → `GET /formulari/v1.0/transazioni/{TXN_ID}`
- Il proxy continuerà a passare tutto alla VPS, ma con il percorso RENTRI corretto nel body, così la VPS sa esattamente quale API chiamare
- Aggiungere `REGISTRY_IDS` map (global → da determinare, multy → RQEL39R7NS0, niyol → 01-250210-00079463)

**4. Aggiornare `src/lib/rentriVpsApi.ts`**
- Aggiungere i nuovi tipi di operazione alla type union: `TRANSAZIONE_REGISTRO`, `TRANSAZIONE_FIR`, `LISTA_BLOCCHI`
- Aggiungere funzioni helper per le nuove operazioni

**5. Aggiornare `src/lib/rentriNgrokApi.ts`**
- Deprecare o rimuovere — le operazioni dovrebbero passare tutte dal proxy VPS, non direttamente da Ngrok (che è un tunnel temporaneo)

**6. Aggiornare `src/components/superadmin/RENTRIActionsPanel.tsx`**
- Switchare le chiamate da `rentriNgrokApi` a `rentriVpsApi`
- Aggiungere pulsante "Lista Blocchi" e "Stato Transazione"

**7. Documentare gli endpoint in `src/lib/rentriBlockCodes.ts`**
- Aggiungere costanti `RENTRI_ENDPOINTS` con i path template come riferimento per tutta l'app

### Dato mancante
- **Registry ID per Global Reco**: Multy ha `RQEL39R7NS0`, Niyol ha `01-250210-00079463`, ma Global manca. Questo sarà necessario per i movimenti registro. Chiederemo all'utente se lo conosce durante l'implementazione.

### Risultato
Il proxy invierà alla VPS le informazioni complete su quale endpoint RENTRI chiamare, eliminando l'ambiguità del generico `/invia-operazione` e permettendo alla VPS di fare semplicemente il relay mTLS verso l'API corretta.

