
# Piano: Interfaccia Telefono + Toggle ON/OFF separato

## Problema attuale
Il pulsante Phone nell'header delle dashboard admin fa due cose contemporaneamente: toggling on/off E dovrebbe aprire un'interfaccia telefono. L'utente non riesce ad accedere alla pagina telefono perche' il click cambia lo stato on/off.

## Soluzione

### 1. Separare il pulsante telefono dal toggle ON/OFF

Nell'header di tutte le dashboard (AdminHeader per Global Reco, MNAdminHeader per Multy Niyol):
- **Icona Phone**: cliccabile, naviga alla pagina telefono (`/admin/telefono` o `/mn/admin/:context/telefono`)
- **Mini toggle ON/OFF**: piccolo switch accanto all'icona che controlla la ricezione chiamate, senza navigare

Layout visivo:
```text
[ Phone icon ] [ ON/OFF switch ]   [ AI ] [ Messages ] [ Bell ]
     |               |
     v               v
  Vai a pagina    Attiva/disattiva
  telefono        ricezione
```

### 2. Creare la pagina Telefono per tutti i tenant

Nuova pagina `PhonePage` con interfaccia telefono che include:
- Stato ricezione chiamate (ON/OFF) ben visibile
- Tastierino numerico stile telefono
- Pulsante chiamata (avvia chiamata Retell per Global Reco)
- Cronologia chiamate recenti dalla tabella `office_calls`
- Indicatore stato connessione

### 3. Logica Retell solo per Global Reco

- Quando il toggle e' su OFF **e** l'utente appartiene al tenant Global Reco (167d07ad-9184-484e-85a6-da5ceafa42a3), si attiva automaticamente la segreteria Retell AI
- Per gli altri tenant (Multyproget, Niyol), il toggle OFF semplicemente disabilita le chiamate senza attivare alcuna segreteria

---

## Dettaglio tecnico

### File da creare
- `src/pages/admin/PhonePage.tsx` — Pagina telefono per Global Reco
- `src/pages/multynijol/MNPhonePage.tsx` — Pagina telefono per tenant MN
- `src/components/calls/PhoneInterface.tsx` — Componente condiviso con UI telefono (tastierino, cronologia, stato)

### File da modificare
- `src/components/layout/AdminHeader.tsx` — Separare icona Phone (naviga a `/admin/telefono`) dal mini-toggle ON/OFF; quando toggle OFF e tenant = Global Reco, attivare segreteria Retell
- `src/components/multynijol/MNAdminHeader.tsx` — Stessa separazione, senza logica Retell
- `src/App.tsx` — Aggiungere rotte `/admin/telefono` e `/mn/admin/:context/telefono`

### Logica toggle ON/OFF + Retell (solo AdminHeader - Global Reco)
- Toggle ON: `receive_calls = true`, stato verde, nessuna segreteria
- Toggle OFF: `receive_calls = false`, stato rosso, chiama `supabase.functions.invoke("retell-call")` per attivare agente segreteria Retell AI
- Persistenza su `online_status` e `localStorage` come gia' implementato

### Interfaccia telefono (PhoneInterface)
- Header con stato ON/OFF e indicatore tenant
- Tastierino numerico (0-9, *, #) con stile neon/cyberpunk coerente col design
- Pulsante verde "Chiama" che usa il `CallContext` esistente (Retell per Global Reco)
- Lista chiamate recenti (query su `office_calls`)
- Per MN: funzionalita' base senza Retell
