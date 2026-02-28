

## Piano: Campanella Universale + Agent AI Personalizzato per Utente con Capacità Social/Messaggi/FIR

### Problema attuale
1. **NotificationBell** presente solo in AdminHeader, MNAdminHeader e SocialHeader — manca nelle pagine mobile app (FIR, Cronologia, GPS, Comunicazioni, AI, Profilo, Guida)
2. **AI Agent utenti** (`ai-agent`) è limitato solo alla compilazione FIR — non può interagire con social, messaggi, o leggere dati utente
3. **Dark Lemon MN** (`dark-lemon-mn`) è per admin tenant — non è personalizzato per singolo utente/admin
4. Nessun sistema di apprendimento contestuale per utente

---

### Step 1 — NotificationBell visibile OVUNQUE

Aggiungere `NotificationBell` come componente globale fisso (floating) nell'app, visibile su TUTTE le pagine per utenti autenticati, indipendentemente dal layout.

**Implementazione**: Inserire un `<GlobalNotificationBell />` in `App.tsx` accanto al `<CallManager />`, posizionato `fixed top-4 right-4 z-[9990]`. Visibile solo se l'utente è autenticato. Si nasconde sulle pagine admin (dove la campanella è già nell'header).

---

### Step 2 — Potenziamento Edge Function `ai-agent` con tool-calling completo

Trasformare la Edge Function `ai-agent` da "compilatore FIR" a **agente completo personalizzato per utente** con accesso a:

**Nuovi tool (strumenti) da aggiungere:**

| Tool | Descrizione |
|------|-------------|
| `send_social_post` | Pubblica un post nel social feed |
| `read_social_feed` | Leggi gli ultimi post del social |
| `send_dm` | Invia un messaggio diretto a un membro (es. "scrivi a Mario Rossi") |
| `read_dms` | Leggi i messaggi diretti recenti |
| `send_hq_message` | Invia messaggio alla sede (admin) |
| `read_hq_messages` | Leggi messaggi dalla sede |
| `search_members` | Cerca membri per nome nella community |
| `get_my_firs` | Leggi i propri FIR (bozze, inviati, completati) |
| `get_notifications` | Leggi le proprie notifiche |
| `update_fir` | Aggiorna campi del FIR corrente (mantiene logica esistente) |

**Contesto utente**: L'edge function riceverà `user_id` dal token JWT per filtrare tutti i dati. Il system prompt includerà il nome e ruolo dell'utente.

**Schema conversazione**: Le conversazioni in `ai_conversations` già tracciano per `user_id` — l'apprendimento è implicito: l'agente vede la cronologia delle sue conversazioni passate con quell'utente.

---

### Step 3 — Potenziamento Edge Function `dark-lemon-mn` per admin

Estendere `dark-lemon-mn` con tool aggiuntivi social/messaggi:

| Tool | Descrizione |
|------|-------------|
| `send_message_to_user` | Invia messaggio a un trasportatore specifico |
| `read_messages` | Leggi conversazioni con trasportatori |
| `read_social_feed` | Visualizza feed social |
| `moderate_post` | Nascondi/elimina post (per admin) |

L'agente già ha accesso DB completo tramite `exec_sql_readonly`/`exec_sql_write`, quindi i tool social saranno wrapper SQL specializzati per guidare meglio il modello.

---

### Step 4 — Apprendimento contestuale per utente

**Meccanismo**: Ogni conversazione è già legata a `user_id` in `ai_conversations`. Per l'apprendimento progressivo:

1. **Memoria utente**: Nuova tabella `ai_user_memory` — salva fatti chiave estratti automaticamente (es. "L'utente preferisce il destinatario Eco Green", "Targa automezzo AB123CD")
2. **Caricamento contestuale**: Ad ogni conversazione, l'edge function carica gli ultimi N fatti dalla memoria utente e li inietta nel system prompt
3. **Estrazione automatica**: Dopo ogni risposta dell'agente, un tool opzionale `save_memory` memorizza fatti utili

**Filtro per utente/admin**: Ogni record in `ai_user_memory` è filtrato per `user_id`, garantendo isolamento totale della conoscenza.

---

### Step 5 — Database migration

Nuova tabella:
```text
ai_user_memory
├── id (uuid PK)
├── user_id (uuid, NOT NULL)
├── fact_key (text) — es. "preferred_destinatario", "targa"
├── fact_value (text) — il dato
├── source (text) — "auto" o "manual"
├── created_at (timestamptz)
├── updated_at (timestamptz)
```
Con RLS: utente vede solo i propri fatti. Indice su `user_id`.

---

### Riepilogo modifiche file

| File | Azione |
|------|--------|
| `src/components/notifications/GlobalNotificationBell.tsx` | NUOVO — campanella floating globale |
| `src/App.tsx` | Aggiungere `GlobalNotificationBell` per utenti autenticati |
| `supabase/functions/ai-agent/index.ts` | Riscrittura — aggiungere tool-calling con social/messaggi/FIR |
| `supabase/functions/dark-lemon-mn/index.ts` | Estendere con tool social/messaggi |
| `src/hooks/useAIAgent.ts` | Aggiornare per gestire nuovi tool responses |
| Migration SQL | Tabella `ai_user_memory` + RLS |

