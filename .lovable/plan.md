

# Piano: Backup Automatico Database → VPS ogni ora

## Architettura

```text
pg_cron (ogni ora)
  → pg_net.http_post → Edge Function "db-backup"
    → SELECT * da tutte le tabelle pubbliche
    → POST JSON → http://46.224.136.98:4000/upload-backup
```

## Step 1 — Edge Function `db-backup`

Creare `supabase/functions/db-backup/index.ts`:
- Connessione al DB via `SUPABASE_DB_URL` (già configurato nei secrets)
- Query `information_schema.tables` per ottenere tutte le tabelle pubbliche
- Per ogni tabella: `SELECT * FROM <table>` → raccolta in oggetto JSON
- POST verso `http://46.224.136.98:4000/upload-backup` con body:
  ```json
  {
    "data": { "profiles": [...], "fir_forms": [...], ... },
    "filename": "backup_2026-03-26T14-00-00Z.json",
    "secret": "MIA_CHIAVE_SEGRETA_BACKUP"
  }
  ```
- Protetta da header `Authorization` (validazione JWT opzionale, ma il cron usa anon key)
- Aggiungere `verify_jwt = false` nel config.toml per questa funzione

## Step 2 — Abilitare estensioni pg_cron e pg_net

Migrazione SQL per abilitare:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

## Step 3 — Schedulare il cron job

Inserire il cron job (via SQL insert, non migrazione) che ogni ora chiama l'edge function:
```sql
SELECT cron.schedule(
  'db-backup-hourly',
  '0 * * * *',
  $$ SELECT net.http_post(
    url := 'https://zungtspcixpxjpjlcwzy.supabase.co/functions/v1/db-backup',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id; $$
);
```

## Step 4 — Secret per la chiave di backup

Salvare `BACKUP_VPS_SECRET` come secret con valore `MIA_CHIAVE_SEGRETA_BACKUP` (o il valore reale che l'utente vuole usare). L'edge function leggerà questo secret.

## Sicurezza
- La chiave segreta viene letta dal secret vault, mai hardcoded nel codice
- Il cron job gira internamente al database, non esposto
- L'edge function valida che la richiesta arrivi dal cron (opzionale)

## File modificati/creati
1. `supabase/functions/db-backup/index.ts` — nuova edge function
2. `supabase/config.toml` — aggiunta sezione `[functions.db-backup]`
3. Migrazione SQL — abilitazione pg_cron + pg_net
4. SQL insert — scheduling del cron job
5. Secret `BACKUP_VPS_SECRET` — chiave per autenticazione verso VPS

