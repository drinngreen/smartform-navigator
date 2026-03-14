

# Piano: Super Admin RENTRI Demo Testing Hub

## Obiettivo
Creare un pannello di test completo nella Super Admin che permetta di testare tutte le operazioni RENTRI via VPS in modalità demo, con serbatoi FIR demo separati dai serbatoi di produzione dei tenant.

## Architettura

### 1. Database: Pool FIR Demo separato
- Aggiungere una colonna `is_demo` (boolean, default false) alla tabella `fir_number_pool`
- I numeri FIR richiesti dalla Super Admin in modalità demo verranno salvati con `is_demo = true` e `societa_id` del tenant selezionato
- Le query esistenti dei tenant NON vedranno mai i record demo (filtrando `is_demo = false`)

### 2. Nuovo componente: `RENTRIDemoTestHub`
Un pannello unico nella Super Admin con queste sezioni, tutte che inviano alla VPS via proxy edge function:

**a) Serbatoio FIR Demo (Vidimazione)**
- Selettore quantità (5, 10, 50, 100)
- Richiesta via VPS con `tipo_operazione: "VIDIMAZIONE"`
- Salvataggio nel pool con flag `is_demo = true`
- Contatore numeri demo disponibili per tenant selezionato

**b) Firma Produttore**
- Disponibile per: MULTY, GLOBAL (non NIYOL che è solo trasportatore)
- Invia `tipo_operazione: "FIR_EMISSIONE"` alla VPS
- Payload pre-compilato con dati demo del tenant

**c) Firma Trasportatore**
- Disponibile per: NIYOL, MULTY, GLOBAL
- Invia `tipo_operazione: "FIR_EMISSIONE"` con ruolo trasporto alla VPS

**d) Firma Impianto (Ricezione)**
- Disponibile solo per: MULTY (che ha l'impianto)
- Invia `tipo_operazione: "REGISTRO"` alla VPS

**e) Risultati**
- Banner risultato per ogni azione con JSON response
- Log console integrato

### 3. Mappatura Ruoli per Tenant

```text
┌──────────────┬────────────┬──────────────┬──────────┐
│   Tenant     │ Produttore │ Trasportatore│ Impianto │
├──────────────┼────────────┼──────────────┼──────────┤
│ MULTY        │     ✓      │      ✓       │    ✓     │
│ GLOBAL       │     ✓      │      ✓       │    ✗     │
│ NIYOL        │     ✗      │      ✓       │    ✗     │
└──────────────┴────────────┴──────────────┴──────────┘
```

### 4. Modifiche ai file

**Migrazione DB:**
- `ALTER TABLE fir_number_pool ADD COLUMN is_demo boolean NOT NULL DEFAULT false;`

**File nuovi:**
- `src/components/superadmin/RENTRIDemoTestHub.tsx` — pannello completo con tutte le sezioni

**File modificati:**
- `src/pages/SuperAdminDashboard.tsx` — aggiungere il nuovo hub
- `src/components/superadmin/FIRPoolSection.tsx` — filtrare `is_demo = false` nelle query esistenti (protezione)
- `src/lib/rentriVpsApi.ts` — aggiungere tipi operazione aggiuntivi e helper per demo

**Query esistenti dei tenant**: aggiungere `.eq("is_demo", false)` alle query principali nei componenti di produzione per sicurezza.

### 5. Dettagli tecnici

Il componente `RENTRIDemoTestHub` utilizza `inviaOperazioneRentri()` che passa tramite l'edge function `rentri-vps-proxy` per evitare problemi di mixed content HTTP/HTTPS. I numeri FIR demo vengono salvati localmente nel pool con `is_demo = true` e non interferiscono con i pool di produzione.

Quando i test sono completati e si passa ai certificati reali sulla VPS, basterà usare le stesse funzioni senza il flag demo.

