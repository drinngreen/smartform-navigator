

# Comunicazioni Aziendali: SMS, WhatsApp, Email e Rubrica

## Panoramica
Aggiungere 4 nuove sezioni a tutti e tre i tenant admin (Global Reco, Multyproget, Niyol): SMS, WhatsApp, Email e Rubrica. Ogni tenant ha la propria rubrica e i propri dati completamente separati tramite `tenant_id`.

## 1. Database -- Nuova tabella `rubrica_contatti`

Tabella centrale dei contatti aziendali, isolata per tenant:

| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid | PK |
| tenant_id | uuid | Isolamento tenant |
| nome | text | Obbligatorio |
| cognome | text | |
| ragione_sociale | text | |
| telefono | text | Per SMS |
| cellulare | text | Per WhatsApp |
| email | text | Per Email |
| pec | text | |
| codice_fiscale | text | |
| partita_iva | text | |
| indirizzo | text | |
| comune | text | |
| provincia | text | |
| note | text | |
| origine | text | 'manuale' o 'anagrafica' |
| anagrafica_id | uuid | Link opzionale a erp_anagrafiche |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS: solo admin del tenant possono leggere/scrivere.

## 2. Database -- Nuova tabella `comunicazioni_log`

Log di tutti i messaggi inviati (SMS, WhatsApp, Email):

| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid | PK |
| tenant_id | uuid | |
| contatto_id | uuid | FK a rubrica_contatti (nullable) |
| canale | text | 'sms', 'whatsapp', 'email' |
| destinatario | text | Numero o email |
| oggetto | text | Solo per email |
| contenuto | text | Corpo del messaggio |
| stato | text | 'inviato', 'errore', 'in_coda' |
| risposta_api | jsonb | Risposta dal provider |
| created_by | uuid | Chi ha inviato |
| created_at | timestamptz | |

RLS: solo admin del tenant.

## 3. Database -- Trigger auto-sync Anagrafica verso Rubrica

Quando si inserisce un contatto in `erp_anagrafiche`, un trigger database copia automaticamente i dati nella `rubrica_contatti` dello stesso tenant (se non esiste gia' un contatto con lo stesso codice_fiscale/partita_iva).

## 4. Icone Dashboard

Le tre icone caricate dall'utente (sms.png, whatsapp.png, email.png) verranno copiate in `src/assets/menu-icons/` e aggiunte alla griglia delle icone desktop sia in `DashboardPage.tsx` (Global Reco) che in `MNContextDashboardPage.tsx` (Multyproget/Niyol). Servira' anche un'icona per la Rubrica (si usera' un'icona Lucide `BookUser`).

Nuove icone nella dashboard:
- SMS (sms.png) -> `/admin/sms` o `/mn/admin/:context/sms`
- WhatsApp (whatsapp.png) -> `/admin/whatsapp` o `/mn/admin/:context/whatsapp`
- Email (email.png) -> `/admin/email` o `/mn/admin/:context/email`
- Rubrica (icona esistente o Lucide) -> `/admin/rubrica` o `/mn/admin/:context/rubrica`

## 5. Pagine UI

### 5a. Rubrica (`RubricaPage.tsx`)
- Tabella contatti con ricerca, filtri, CRUD completo
- Pulsante "Nuovo Contatto" con form dialog
- Per ogni contatto: pulsanti rapidi per inviare SMS, WhatsApp o Email
- Indicatore di origine (manuale vs da anagrafica)

### 5b. SMS (`SMSPage.tsx`)
- Lista conversazioni SMS a sinistra, area composizione a destra
- Selettore contatto dalla rubrica o inserimento numero manuale
- Se il numero non e' in rubrica: prompt "Vuoi aggiungere questo contatto alla rubrica?"
- Log dei messaggi inviati con stato
- L'invio effettivo sara' abilitato quando si configurera' il provider SMS (per ora UI completa con messaggio "Configura provider SMS")

### 5c. WhatsApp (`WhatsAppPage.tsx`)
- Interfaccia stile chat WhatsApp
- Selettore contatto dalla rubrica o inserimento numero manuale
- Prompt per aggiungere contatti non in rubrica
- L'invio sara' abilitato dopo configurazione Meta Business API

### 5d. Email (`EmailPage.tsx`)
- Interfaccia tipo client email: composizione, invio, log
- Selettore contatto dalla rubrica o inserimento email manuale
- Prompt per aggiungere contatti non in rubrica
- Supporto oggetto + corpo HTML/testo
- Funzionalita' speciale: quando un trasportatore compila un FIR e seleziona un'email dalla rubrica, il sistema invia automaticamente notifica all'impianto

## 6. Edge Functions (predisposte)

Tre edge functions preparate ma attivabili solo dopo configurazione dei provider:

- `send-sms/index.ts` -- Struttura pronta, invio via provider SMS (da configurare)
- `send-whatsapp/index.ts` -- Struttura pronta per Meta WhatsApp Business API
- `send-email/index.ts` -- Struttura pronta per Resend

Ogni function:
- Valida autenticazione admin
- Verifica tenant_id
- Logga in `comunicazioni_log`
- Gestisce errori e retry

## 7. Routing

### Global Reco (App.tsx)
```text
/admin/sms -> SMSPage
/admin/whatsapp -> WhatsAppPage
/admin/email -> EmailPage
/admin/rubrica -> RubricaPage
```

### Multy Niyol (App.tsx)
```text
/mn/admin/:context/sms -> MNSMSPage
/mn/admin/:context/whatsapp -> MNWhatsAppPage
/mn/admin/:context/email -> MNEmailPage
/mn/admin/:context/rubrica -> MNRubricaPage
```

## 8. File coinvolti

| File | Azione |
|------|--------|
| Migrazione SQL | Crea `rubrica_contatti`, `comunicazioni_log`, trigger sync |
| `src/assets/menu-icons/sms.png` | Copia icona caricata |
| `src/assets/menu-icons/whatsapp.png` | Copia icona caricata |
| `src/assets/menu-icons/email.png` | Copia icona caricata |
| `src/pages/admin/SMSPage.tsx` | Nuova pagina SMS |
| `src/pages/admin/WhatsAppPage.tsx` | Nuova pagina WhatsApp |
| `src/pages/admin/EmailPage.tsx` | Nuova pagina Email |
| `src/pages/admin/RubricaPage.tsx` | Nuova pagina Rubrica |
| `src/pages/multynijol/MNSMSPage.tsx` | Wrapper MN per SMS |
| `src/pages/multynijol/MNWhatsAppPage.tsx` | Wrapper MN per WhatsApp |
| `src/pages/multynijol/MNEmailPage.tsx` | Wrapper MN per Email |
| `src/pages/multynijol/MNRubricaPage.tsx` | Wrapper MN per Rubrica |
| `src/components/comunicazioni/RubricaTab.tsx` | Componente rubrica riutilizzabile |
| `src/components/comunicazioni/SMSComposer.tsx` | Componente composizione SMS |
| `src/components/comunicazioni/WhatsAppChat.tsx` | Componente chat WhatsApp |
| `src/components/comunicazioni/EmailComposer.tsx` | Componente composizione email |
| `src/components/comunicazioni/ContattoFormDialog.tsx` | Form nuovo contatto |
| `src/components/comunicazioni/AddToRubricaPrompt.tsx` | Prompt aggiunta rubrica |
| `src/pages/admin/DashboardPage.tsx` | Aggiunta 4 icone |
| `src/pages/multynijol/MNContextDashboardPage.tsx` | Aggiunta 4 icone |
| `src/App.tsx` | Aggiunta 8 route |
| `supabase/functions/send-sms/index.ts` | Edge function SMS |
| `supabase/functions/send-whatsapp/index.ts` | Edge function WhatsApp |
| `supabase/functions/send-email/index.ts` | Edge function Email |

## 9. Isolamento dati tra tenant

- Ogni query filtra per `tenant_id` del tenant corrente
- Global Reco, Multyproget e Niyol hanno rubriche completamente separate
- I log delle comunicazioni sono separati per tenant
- Il trigger di sync da anagrafica rispetta il `tenant_id` originale

## 10. Flusso "Contatto non in rubrica"

Quando l'utente compone un SMS/WhatsApp/Email verso un numero o email non presente in rubrica:
1. Il sistema mostra un banner: "Questo contatto non e' in rubrica. Vuoi aggiungerlo?"
2. Se si': apre il form di creazione contatto pre-compilato con il numero/email
3. Se no: procede con l'invio senza salvare il contatto
4. Il messaggio viene comunque loggato in `comunicazioni_log`

## 11. Provider API -- Da configurare in seguito

I provider SMS, Email e WhatsApp verranno configurati successivamente. Le edge functions saranno predisposte con una struttura modulare che permettera' di inserire le API key e attivare l'invio quando pronti. Nel frattempo l'interfaccia funzionera' completamente per la gestione rubrica e la composizione dei messaggi.
