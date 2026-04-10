

## Piano: Sezione Personale nel Dev Multy

### Obiettivo
Aggiungere un tab "Personale" nella dashboard Dev Multy (`MNDevDashboardPage.tsx`) con:
1. Importazione dei 16 trasportatori dal file Excel
2. Elenco personale con gestione password
3. Creazione automatica degli account con password `123stella`
4. L'admin può compilare FIR per loro e loro possono accedere autonomamente alla app

### Passaggi

**1. Creare il componente `DevPersonaleModule.tsx`**
- Ricalca la struttura di `PersonalePage.tsx` (Global Reco) adattata al contesto Dev Multy
- Mostra elenco utenti filtrati per tenant Multyproget (`77ec9a3d-...`)
- Funzionalità: ricerca, reset password (via edge function `admin-user-manage`), eliminazione utente
- Pulsante "Crea Trasportatore" con `CreateTransporterDialog` pre-configurato per tenant Multyproget
- Pulsante "Importa da Excel" che crea in batch i 16 utenti dal file allegato

**2. Aggiungere il tab nella dashboard**
- Nuovo tab "Personale" con icona `Users` in `MNDevDashboardPage.tsx`
- Collegato al nuovo `DevPersonaleModule`

**3. Importazione iniziale dei 16 utenti**
- Script che chiama `admin-user-manage` con `action: create_user` per ognuno dei 16 record
- Dati: Nome, Cognome, Codice Fiscale, Targa — password default `123stella`
- Tenant: `77ec9a3d-a6d4-4235-8e68-1a6f345de57a` (Multyproget), mn_context: `multyproget`
- I duplicati (CF già esistente) vengono saltati con toast informativo

### Dettagli tecnici
- Nessuna modifica al database: gli utenti vengono creati tramite l'edge function esistente `admin-user-manage` che gestisce auth + profiles + user_roles
- L'email interna generata sarà `{CODICE_FISCALE}@zoli.internal` (pattern esistente)
- Il reset password usa la stessa logica di Global Reco (`action: reset_password`)
- I file `.js` companion verranno generati per ogni nuovo `.tsx`

