

# Piano: Dark Lemon Super Agent — Memoria Strategica + Chat AI Generalista

## Panoramica

Due interventi principali:
1. **Memoria strategica categorizzata** con compartimenti stagni e procedure operative rigide — solo per Multyproget (il pattern sarà replicabile per Niyol e Global in futuro)
2. **Capacità generalista** — Dark Lemon diventa anche una chat AI completa, capace di rispondere a domande su normative ambientali, cultura generale, e qualsiasi argomento, mantenendo la specializzazione operativa sul software

## Cosa cambia per l'utente

- L'agente **ricorda** preferenze, pattern e informazioni scoperte, categorizzandole automaticamente (preferenze, pattern operativi, normativa, info aziendali, correzioni)
- Le memorie sono **separate per ambiente** (operativo, normativa, impianto, erp) — nessuna contaminazione
- L'agente **richiama solo i ricordi rilevanti** per l'operazione in corso (max 5-10 fatti pertinenti, non tutto il database)
- Comandi come "Nuovo carico" attivano **procedure automatiche** con validazione sequenziale
- L'agente **blocca** operazioni con dati RENTRI incompleti (supervisore tecnico pignolo)
- L'agente **risponde anche a domande generali**: normative ambientali, codici EER, cultura generale, consigli operativi — come una chat AI completa

## Dettaglio tecnico

### 1. Migrazione DB — `ai_user_memory`

Aggiungere colonne `category` e `environment` con indici:

```sql
ALTER TABLE ai_user_memory 
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'generale',
  ADD COLUMN IF NOT EXISTS environment text DEFAULT 'operativo';

CREATE INDEX IF NOT EXISTS idx_ai_user_memory_cat ON ai_user_memory(user_id, category);
CREATE INDEX IF NOT EXISTS idx_ai_user_memory_env ON ai_user_memory(user_id, environment);
```

Categorie: `preferenze`, `pattern_operativi`, `info_aziendali`, `normativa`, `correzioni`, `generale`
Ambienti: `operativo`, `normativa`, `impianto`, `erp`

### 2. Edge Function `dark-lemon-mn` — Aggiornamenti

**a) Tool `save_memory` potenziato** — nuovi parametri `category` e `environment` (opzionali, il modello li sceglie automaticamente)

**b) Nuovo tool `recall_memory`** — cerca ricordi per keyword/categoria/ambiente con `ILIKE` su `fact_key`/`fact_value`. Restituisce max 10 risultati pertinenti.

**c) Nuovo tool `list_memories`** — elenca tutte le memorie per ambiente/categoria, utile per l'admin per vedere cosa l'agente ha imparato

**d) Nuovo tool `delete_memory`** — cancella un ricordo per `fact_key`

**e) Nuovo tool `search_knowledge`** — cerca nella tabella `ai_knowledge_base` per keyword/categoria, filtrato per `tenant_id`

**f) System prompt aggiornato** con tre nuove sezioni:

- **LIMITI INVALICABILI (SUPERVISORE TECNICO)**: regole rigide RENTRI (mai FIR senza CER, mai invio senza campi obbligatori, CER 6 cifre, stato fisico S/L/F, quantità > 0)
- **PROCEDURE OPERATIVE**: schemi d'azione per "Nuovo carico", "Nuovo FIR", "Conferimento privato", "Invio RENTRI"
- **CAPACITÀ GENERALISTA**: istruzione esplicita che l'agente è anche una chat AI completa — può rispondere a domande su normative ambientali (D.Lgs 152/2006, RENTRI, ADR), codici EER, cultura generale, consigli operativi. Se la domanda non riguarda il software, risponde comunque in modo competente come un'AI generalista

**g) Assemblaggio intelligente del contesto**: il system prompt carica solo le ultime 10 memorie generiche; per operazioni specifiche, il modello usa `recall_memory` per recuperare solo i fatti pertinenti

### 3. Seed `ai_knowledge_base` — Regole RENTRI base

Inserire 10-15 record fondamentali nella knowledge base con `tenant_id = '77ec9a3d-602e-438f-97bf-1c69abd8f691'` (Multyproget):
- Struttura codici EER e famiglie principali (15, 16, 17, 19, 20)
- Regole RENTRI obbligatorie (campi minimi FIR)
- Stati fisici ammessi (S, L, F, P)
- Caratteristiche HP (HP1-HP15)
- Procedure standard compilazione FIR

### 4. Nota sull'isolamento multi-tenant

Tutto il lavoro è scoped a `tenant_id = Multyproget`. Quando si implementerà Niyol o Global, basterà replicare i seed della knowledge base con il `tenant_id` corretto e le stesse funzionalità saranno automaticamente isolate.

### 5. File modificati

| File | Azione |
|------|--------|
| Migrazione SQL | Colonne `category`/`environment` + indici su `ai_user_memory` |
| `supabase/functions/dark-lemon-mn/index.ts` | Nuovi tool, system prompt potenziato, procedure operative, capacità generalista |
| Seed SQL `ai_knowledge_base` | 10-15 record normative RENTRI per Multyproget |

