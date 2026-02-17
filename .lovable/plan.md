# Piano: Ristrutturazione Routing e Dashboard Super Admin RENTRI

## Problemi attuali

1. `/mn` reindirizza alla dashboard admin se l'utente e gia loggato (il `useEffect` in MNAuthPage manda a `/` che poi rimanda a `/mn/admin`)
2. Le rotte `/mn/admin/*` NON hanno `ProtectedRoute` -- chiunque puo accedere
3. Non esiste una pagina di login dedicata per l'admin di MultyNiyol
4. Non esiste un Super Admin

## Nuova struttura routing

```text
/mn              --> Login/Registrazione autisti Multyproget (SOLO app, mai redirect a admin)
/ni              --> Login/Registrazione autisti Niyol (SOLO app, mai redirect a admin)
/adminmn         --> Login admin MultyNiyol (solo multyniyol@zoli.live) --> /mn/admin
/superadmin      --> Login Super Admin (solo superadmin@zoli.live) --> /super
/super           --> Dashboard Super Admin con dropdown tenant
/mn/admin/*      --> Protetto: solo multyniyol@zoli.live o superadmin@zoli.live
```

## Modifiche dettagliate

### 1. Correggere MNAuthPage (`/mn` e `/ni`)

- Rimuovere il `useEffect` che reindirizza a `/` quando l'utente e loggato
- Dopo login/registrazione, reindirizzare SEMPRE a `/mn/app/multyproget` o `/mn/app/niyol` in base al contesto
- Il link "Accedi come Admin" deve puntare a `/adminmn` (non `/mn/admin`)

### 2. Creare pagina `/adminmn` -- Login Admin MultyNiyol

- Pagina con login Email + Password (come la sezione admin di AuthPage)
- Accetta SOLO `multyniyol@zoli.live`
- Dopo login, reindirizza a `/mn/admin`
- Stile coerente con il branding Multy Niyol (oro/ambra)

### 3. Proteggere tutte le rotte `/mn/admin/*`

- Avvolgere ogni rotta `/mn/admin/*` in `<ProtectedRoute>`
- Aggiungere controllo admin: se l'utente non e admin, reindirizza a `/mn`

### 4. Creare pagina `/superadmin` -- Login Super Admin

- Login Email + Password
- Accetta SOLO `superadmin@zoli.live`
- Dopo login, reindirizza a `/super`

### 5. Aggiungere `superadmin@zoli.live` al sistema

- Aggiungerlo a `ADMIN_TENANT_EMAILS` in `useAuth.tsx`
- Aggiungerlo a `bootstrap_admin_role` nel database
- Aggiornare `RoleBasedRedirect` per reindirizzare questo utente a `/super`

### 6. Creare Dashboard Super Admin (`/super`) -- Pagina completa

Pagina con:

- Menu a tendina in alto per selezionare tenant: Global Reco, Multy Proget, Niyol
- Banner rosso: "STAI OPERANDO SUL PORTALE REALE RENTRI"
- 5 sezioni operative:

**A. Rifornimento FIR (Vidimazione)**

- Selettore tenant (global/multy/niyol)
- Selettore quantita (50, 100, 500)
- Pulsante "RICHIEDI NUOVI NUMERI" che chiama `POST /vidimate` su Railway
- I numeri ricevuti vengono caricati nel pool (`fir_number_pool`) con il `societa_id` corretto
- Download CSV dei numeri ricevuti

**B. Firme Digitali Smart**

- Firma Produttore/Magazzino (Giallo -> Verde): `POST /firma-fir` con `societaId` corretto
- Firma Destinatario/Accettazione (Verde -> Rosso): `POST /firma-fir` con tipo accettazione
- Mappatura: Global -> "global", Multy Proget -> "multy", Niyol -> "niyol"

**C. Registri Carico e Scarico**

- `POST /registro/carico` per entrata rifiuti
- `POST /registro/scarico` per uscita/recupero
- Isolamento dati per tenant (mai incroci)

**D. Console Log Operazioni RENTRI**

- Log in tempo reale di ogni chiamata API (status 200, 400, 500)
- Da ogni log di successo: download PDF FIR e xFIR (XML firmato)

**E. Modalita Produzione**

- Tutte le chiamate con `isSandbox: false`
- Banner rosso permanente di avviso

## Dettagli tecnici

### File nuovi


| File                                                    | Descrizione                                       |
| ------------------------------------------------------- | ------------------------------------------------- |
| `src/pages/MNAdminAuthPage.tsx`                         | Login admin MultyNiyol (`/adminmn`)               |
| `src/pages/SuperAdminAuthPage.tsx`                      | Login Super Admin (`/superadmin`)                 |
| `src/pages/SuperAdminDashboard.tsx`                     | Dashboard completa con 5 sezioni RENTRI           |
| `src/components/superadmin/FIRPoolSection.tsx`          | Sezione vidimazione e rifornimento                |
| `src/components/superadmin/DigitalSignatureSection.tsx` | Firme digitali mTLS                               |
| `src/components/superadmin/RegistroCarScarSection.tsx`  | Registri carico/scarico                           |
| `src/components/superadmin/RENTRILogConsole.tsx`        | Console log operazioni                            |
| `src/lib/rentriSuperApi.ts`                             | Client API per Railway (tutte le chiamate RENTRI) |


### File da modificare


| File                                   | Modifica                                                                     |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| `src/App.tsx`                          | Nuove rotte `/adminmn`, `/superadmin`, `/super`; proteggere `/mn/admin/*`    |
| `src/pages/MNAuthPage.tsx`             | Rimuovere redirect a `/`; dopo login mandare a app; link admin -> `/adminmn` |
| `src/hooks/useAuth.tsx`                | Aggiungere `superadmin@zoli.live` a `ADMIN_TENANT_EMAILS`                    |
| `src/components/RoleBasedRedirect.tsx` | Gestire redirect per `superadmin@zoli.live` -> `/super`                      |


### Migrazione database

Aggiornare la funzione `bootstrap_admin_role` per includere `superadmin@zoli.live`.

### API Railway utilizzate

Tutte le chiamate puntano a `https://dragonrifiutisender-production.up.railway.app/api/rentri`:

- `POST /vidimate` -- Richiesta nuovi numeri FIR
- `POST /firma-fir` -- Firma digitale mTLS
- `POST /registro/carico` -- Registrazione entrata rifiuti
- `POST /registro/scarico` -- Registrazione uscita rifiuti
- `GET /health` -- Monitoraggio stato servizio

Tutte con `isSandbox: false` (produzione).

TUTTE LE PAGINE ADMIN E LE APP NON HANNO IL LOGUT FUNZIONANTE