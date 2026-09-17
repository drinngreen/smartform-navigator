# Audit — Dark Lemon: affidabilità, memoria, contesto
Modalità: sola lettura. Nessun file di codice/prompt/DB modificato. Unico artefatto prodotto: questo referto.

## 1. Metodo
Ispezionati: edge function `dark-lemon-mn/index.ts` (4611 righe, system prompt + 60+ tool), `usePageContext.ts`,
`mnContextStore.ts`, `agentActivityStore.ts`, `autorizzazioni-ai/index.ts`, `docs/MASTER_PROMPT.md`, `ops_memoria.json`,
migrazioni SQL relative ad audit/memoria.

---

## 2. Distinzione memoria narrativa vs stato verificato (CRITICO)

| Fonte | Natura | Rischio |
|---|---|---|
| `docs/MASTER_PROMPT.md` | **Narrativa storica**, non versionata a schema reale, ultimo update 2026-02-16, riferisce endpoint Render/Railway ormai superati dal codice attuale (bridge RENTRI VPS) | L'agente può leggerlo come "verità" anche se il codice ha già cambiato architettura (`docs/MASTER_PROMPT.md:139-156` vs `dark-lemon-mn/index.ts:280-297`) → **doppia fonte di verità contraddittoria** |
| `ops_memoria.json` (root progetto) | File di scratch di un tool esterno (firsender/OCR massivo), persistito nel repo, con percorsi Windows locali (`C:/Users/Dell/...`), stato "flows_active": true | Nessun agente lo consulta oggi, ma è un file di **stato dichiarato** non verificabile né riconciliato con DB reale: se mai referenziato, sarebbe memoria narrativa spacciata per stato — **da isolare o eliminare dal repo** |
| `ai_user_memory` (`save_memory`/`recall_memory`/`list_memories`, `dark-lemon-mn/index.ts:1746-3416`) | Fatti liberi scritti dall'admin in linguaggio naturale (`fact_key`/`fact_value`), iniettati **sempre** nel system prompt (`buildSystemPrompt`, riga 258-261, righe 4363-4378) | Nessuna scadenza (TTL), nessuna verifica di validità nel tempo, nessun collegamento a una query di verifica: un ricordo tipo "il blocco vidimazione è ZRZXR" può diventare falso e resta iniettato come fatto certo finché non viene cancellato manualmente |
| Blocchi "aggiornamento" nel system prompt (es. righe 280, 299, 307, 316 "aggiornata 2026", "novità 14/09/2026", "hardening 12/09/2026") | Patch narrative accumulate nel tempo nello stesso prompt monolitico | Non c'è **versionamento**: non si può sapere quale sotto-regola è stata sovrascritta da quale altra, né chi/quando l'ha introdotta. È un log di modifiche travestito da prompt |
| Regex di "autonomia"/blocco (`AUTONOMY_BLOCKING_PATTERN`, `FIR_ID_BLOCKING_PATTERN`, righe 51-53) | Tentano di impedire che il modello **dichiari** un blocco invece di agire, o si inventi dati | È un cerotto testuale sull'output del modello, non un controllo strutturale: rileva solo pattern linguistici noti, aggirabile da qualunque frase diversa. Non impedisce comunque letture stantie o scritture non verificate |

**Conclusione punto 2:** nel sistema attuale "sapere una cosa" (system prompt, memoria admin, MASTER_PROMPT) e "verificare una cosa nel DB/tenant corrente adesso" sono trattati come equivalenti dal modello: il system prompt fonde regole, stato di dominio (codici RENTRI, ID impianto, ID tenant hardcoded in chiaro nel prompt, righe 9-22, 275-278, 284-290) e istruzioni comportamentali in un unico blocco di testo persuasivo, senza marcatori di provenienza/freschezza.

---

## 3. Fallimenti di contesto individuati

1. **Tenant hardcoded nel system prompt invece che da query pre-operazione**
   `dark-lemon-mn/index.ts:9-16` — `TENANT_MAP` e `DEFAULT_TENANT_ID` sono costanti statiche nel codice della function. Il tenant attivo è deciso lato client (`mnContextStore.ts:14-16`, un solo contesto hardcoded "Multy Dev") e passato come stringa `context` che la function traduce con `resolveTenantId` (riga 153-157) **senza mai verificare lato server che l'utente chiamante abbia effettivamente accesso a quel tenant**. Non risulta controllo incrociato con `auth.uid()` → tenant_id reale dell'utente prima di eseguire tool.
   → **Fallimento**: tenant "dichiarato" dal frontend, non "provato" dal backend ad ogni chiamata.

2. **Duplicazione di contesto pagina/tenant su percorsi diversi**
   - `usePageContext.ts` cattura DOM (route, form, tabelle) lato client e lo inietta come testo libero.
   - `mnContextStore.ts` tiene il tenant attivo lato client (persistito in localStorage, `mn-context`).
   - `dark-lemon-mn/index.ts` riceve `context` come stringa e la rimappa (`normalizeContext`, riga 149-151) con un secondo alias (`dev-` prefix).
   - Il MASTER_PROMPT (fonte terza) descrive un modello multi-tenant diverso (Global Reco/Multyproget/Niyol come tenant separati, righe 9-19 di MASTER_PROMPT.md) rispetto al `mnContextStore.ts` che ha **un solo contesto attivo** ("i vecchi contesti separati sono disattivati", riga 12-13).
   → Tre rappresentazioni del tenant/contesto che possono divergere senza che nessuna delle tre sia la fonte di verità autorevole verificata dal DB (RLS) ad ogni chiamata.

3. **`autorizzazioni-ai/index.ts` è un secondo agente parallelo indipendente** (riga 2: "Indipendente da Dark Lemon") con proprio prompt, propria selezione documenti, proprio modello — nessun registro condiviso di decisioni tra i due agenti, nessun modo per Dark Lemon di sapere cosa Authority AI ha risposto o viceversa. **Percorso duplicato non riconciliato.**

4. **Memoria iniettata senza citazione di prova**: `buildSystemPrompt` (riga 258-261) inserisce i ricordi come fatti (`fact_key: fact_value`) senza timestamp visibile al modello nel testo iniettato, senza riferimento alla query che li ha originati, senza distinzione "confermato da DB" vs "dichiarato dall'admin in chat".

5. **Query dirette senza journaling delle decisioni**: `query_database`/`write_database` (righe 2427-2445) eseguono SQL arbitrario passato dal modello. C'è un controllo minimo (SELECT vs non-SELECT) ma **nessun log strutturato "prima" della scrittura** con motivazione, nessuna tabella `decisions_log` versionata collegata al tool-call id. L'unico audit strutturato esistente è `dragon_audit_logs`, usato solo per un sottoinsieme di operazioni Dragon (riga 4251), non per `write_database` generico né per `update_fir_form`, `create_privato`, ecc.

6. **Conferma utente = pattern testuale, non stato macchina**: la "doppia conferma" esistente oggi (`explain_and_fix`, riga 1216, 2312-2318; `confirm: true/false` su FILL_FORM, riga 1134-1136; `requires_human_confirmation: true` riga 3652) è basata su:
   - il modello che decide da solo se mostrare `confirm`,
   - una stringa `"CONFERMO"` scritta dall'utente in chat e mai validata contro un token/hash dell'operazione proposta.
   → Nessun **legame crittografico o di stato** tra la proposta mostrata e l'operazione poi eseguita: il modello potrebbe eseguire un'operazione diversa da quella confermata (drift) senza che nulla lo impedisca meccanicamente.

7. **`ops_memoria.json` nel root del repository**: contiene percorsi locali Windows di un altro progetto (firsender) e uno stato operativo dichiarato ("accepted_totali": 16000, "flows_active": true) che non ha alcun collegamento verificabile con questo sistema. È un file di memoria narrativa "vagante" committato per errore o abbandono — rischio concreto se in futuro un agente venisse istruito a "leggere file di contesto nel root".

8. **Nessun TTL/expiry su `ai_user_memory`, nessun campo `verified_at`/`source_query`**: la tabella (righe 3379-3409) ha solo `fact_key, fact_value, category, environment, updated_at`; `updated_at` è quando è stato scritto il ricordo, non quando è stato riverificato contro lo stato reale.

---

## 4. Percorsi duplicati (mappa sintetica)

| Concetto | Percorso A | Percorso B | Percorso C |
|---|---|---|---|
| Tenant attivo | `mnContextStore.ts:14-16` (client, localStorage) | `dark-lemon-mn/index.ts:9-16,153-157` (server, mapping statico) | `docs/MASTER_PROMPT.md:9-19` (narrativa, 3 tenant separati, non coerente col resto) |
| Stato operazione RENTRI | `rentri_operazioni` (tabella, riga 308) | risposta HTTP del bridge (in-memory nella conversazione) | affermazione testuale del modello ("inviato con successo") — la regola del 202 (righe 304, 310) prova a mitigare ma è enunciata in prosa, non enforced da codice che impedisca la frase |
| Audit/log azioni | `dragon_audit_logs` (solo Dragon, riga 3821-3831, 4251) | `agentActivityStore.ts` (solo client, in-memory con max 60 entries, azzerabile, riga 31, 49) | nessun log server-side per `write_database`/`update_fir_form`/`create_privato` |
| Memoria "fatti" | `ai_user_memory` (DB, per admin) | System prompt statico (MASTER_PROMPT.md, mai riletto a runtime) | Regole inline nel system prompt della function (accumulate per data, righe 280-320) |
| Conferma scrittura | Pattern regex sull'output modello (riga 52-53) | Flag `confirm`/`dry_run` scelto dal modello stesso (righe 1134-1136, 2568) | Parola chiave `"CONFERMO"` in chat libera (riga 2312-2318) |

---

## 5. Proposta tecnica (fail-closed, non promessa testuale)

Principio guida: **l'agente non può dichiarare uno stato né eseguire una scrittura senza (a) query fresca con timestamp, (b) tenant esplicito verificato lato server, (c) citazione della prova nella risposta, (d) per le scritture, doppia conferma legata a un token di operazione**. Tutto implementato come vincoli di codice/DB, non come istruzioni nel prompt.

### 5.1 Registro decisioni versionato — tabella `agent_decisions_log`
```sql
create table agent_decisions_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  actor_user_id uuid not null,          -- da auth.uid(), mai dal payload
  session_id uuid not null,
  tool_name text not null,
  tool_args jsonb not null,
  proposal_hash text not null,          -- hash(tool_name+args+tenant_id+timestamp bucket)
  evidence jsonb not null,              -- righe/id DB citate come prova
  decision text not null check (decision in ('proposed','confirmed','rejected','executed','failed')),
  result jsonb,
  context_pack_hash text not null,      -- vedi 5.2
  created_at timestamptz not null default now()
);
```
- **Append-only** (RLS: nessun UPDATE/DELETE da ruolo applicativo; solo INSERT); ogni riga è immutabile → versionamento reale, non un JSON riscrivibile come `ops_memoria.json`.
- Ogni tool-call passa PRIMA per una riga `proposed`, poi (solo dopo conferma) una riga `confirmed`, poi `executed`/`failed` con risultato. Sostituisce sia `dragon_audit_logs` (esteso a TUTTI i tool mutanti, non solo Dragon) sia il pattern regex-based attuale.
- `dragon_audit_logs` e `agentActivityStore.ts` (client, volatile) diventano **viste di lettura** su questo registro unico, non fonti separate.

### 5.2 Pacchetto contesto obbligatorio (Context Pack) — non negoziabile per ogni chiamata
Ogni invocazione della function deve costruire, **lato server**, un pacchetto firmato:
```ts
type ContextPack = {
  tenant_id: string;        // risolto da auth.uid() -> profilo -> tenant, MAI dal client
  tenant_source: 'db_verified';
  fetched_at: string;       // ISO now(), max age consentita 30s per dati critici (giacenze, RENTRI, FIR)
  route_claimed: string;    // da usePageContext, marcato come "client-reported, non autorevole"
  memory_snapshot: {fact_key, fact_value, updated_at, verified: boolean}[]; // da ai_user_memory con TTL
  live_facts: {query: string, rows_hash: string, row_count: number, fetched_at: string}[]; // query fresche eseguite ORA
  pack_hash: string;        // hash di tutto quanto sopra
};
```
- Se `tenant_id` non è risolvibile da una sessione autenticata verificata → **richiesta bloccata prima di chiamare il modello** (fail-closed), non "il modello si scusa".
- `route_claimed` (contesto DOM lato client, oggi unica fonte in `usePageContext.ts`) è marcato esplicitamente come non autorevole: può guidare l'assistenza UI ma non può mai giustificare da solo una scrittura sui dati.
- `memory_snapshot`: solo ricordi con `verified=true` (rivalidati contro il DB con una query dedicata entro TTL, es. 24h) entrano nel prompt come "fatto"; i non verificati entrano marcati `[NON VERIFICATO — dichiarato da admin il gg/mm]`.
- Il modello riceve il `pack_hash` e deve ripeterlo in ogni risposta interna (tool `report_with_evidence`, sotto), così un audit successivo può controllare che la risposta si basi su quel pack e non su conoscenza pregressa nel contesto conversazionale.

### 5.3 Validazione pre/post operazione (gate strutturale, non prompt)
Wrapper server-side unico per ogni tool mutante (sostituisce l'attuale `MUTATING_TOOLS` set usato solo per euristiche testuali, riga 55-61):

```
PRE-CHECK (bloccante, eseguito dal server prima di invocare il tool):
 1. tenant_id del context pack === tenant_id embedded nella riga target (query di verifica riga per riga, non solo WHERE lato SQL del modello)
 2. per operazioni RENTRI: stato pre-esistente riletto in tempo reale dal bridge/registro (mai dal contesto conversazione)
 3. proposal_hash calcolato e salvato come riga 'proposed' in agent_decisions_log
 4. se tool in MUTATING_TOOLS_CRITICAL (invii RENTRI, DELETE, UPDATE massivo, firma FIR) → richiede conferma esplicita (5.4)

ESECUZIONE

POST-CHECK (bloccante, prima di rispondere all'utente):
 1. ri-query immediata della riga scritta (mai fidarsi del solo payload di risposta HTTP, vedi regola del 202 già nota ma oggi solo in prosa)
 2. hash del nuovo stato salvato in agent_decisions_log come 'executed' o 'failed'
 3. se lo stato letto post-scrittura non corrisponde a quanto dichiarato → risposta bloccata, sostituita con errore esplicito "scrittura non verificabile", mai un messaggio di successo
```
Questo elimina la possibilità strutturale che il modello dichiari "fatto"/"inviato con successo" senza una query di verifica agganciata: oggi è solo una regola scritta nel prompt (riga 310, "Non dire mai...").

### 5.4 Doppia conferma per scritture — token, non parola chiave
Sostituire il meccanismo attuale (utente scrive "CONFERMO" in chat libera, riga 2312-2318) con:
1. Il server genera un **token di conferma** legato al `proposal_hash` (5.1), con TTL breve (es. 3 minuti) e mostrato all'utente insieme al riepilogo dell'operazione e alle prove (righe interessate, valori prima/dopo).
2. L'esecuzione richiede che il messaggio successivo dell'utente contenga **quel token esatto**, non una parola generica: elimina il rischio che il modello interpreti da solo una frase ambigua come conferma (il pattern regex attuale è euristico e aggirabile).
3. Se tra proposta e conferma il pack di contesto è cambiato (altro utente ha modificato la stessa riga, tenant diverso, stato RENTRI cambiato) → **conferma invalidata automaticamente**, nuova proposta richiesta (blocco conflitti, vedi 5.5).

### 5.5 Blocco conflitti
- Lock ottimistico per riga: ogni entità critica (FIR, giacenza, invio RENTRI) porta `updated_at`/`version` letto nel Context Pack al momento della proposta. L'esecuzione (5.3, esecuzione) fallisce e va in `failed` se `version` è cambiata rispetto alla proposta — evita che due sessioni (o due agenti: Dark Lemon + Authority AI + operazioni manuali da UI) scrivano in conflitto senza saperlo.
- Cross-agent lock: poiché `autorizzazioni-ai` e `dark-lemon-mn` sono processi indipendenti (oggi senza registro condiviso), entrambi devono scrivere in `agent_decisions_log`; un check pre-scrittura verifica che non esista una `proposed`/`confirmed` non ancora `executed`/`failed` sulla stessa entità da un altro agente/sessione nella finestra di TTL.
- Multi-tenant: RLS su `agent_decisions_log` e su ogni tabella toccata da tool mutanti deve negare di default (`tenant_id = current_tenant()` verificato via funzione DB, non via stringa applicativa) — oggi il tenant è solo un parametro applicativo (righe 153-157), non imposto da RLS a livello DB per tutte le tabelle citate nei tool.

### 5.6 Referto con prove — formato di risposta obbligatorio
Ogni risposta dell'agente che dichiara uno stato o conferma un'operazione deve includere, in un blocco strutturato (validato server-side prima dell'invio all'utente, non lasciato al "buon comportamento" del modello):
```
### Prova
- Fonte: <tabella/query esatta>
- Eseguita alle: <timestamp ISO, dal pack, non dal modello>
- Tenant verificato: <tenant_id + come è stato risolto>
- Righe citate: <id/hash>
- Stato pre/post (se scrittura): <valori>
- proposal_hash / decision_id: <riferimento a agent_decisions_log>
```
Se il server non riesce a popolare questo blocco (perché la query non è stata rieseguita, o il tenant non è verificato), la risposta **non viene inviata**: viene sostituita da un messaggio di blocco esplicito. Questo è il meccanismo fail-closed richiesto — l'assenza di prova impedisce l'affermazione, non la rende solo "sconsigliata".

### 5.7 Pulizia debiti tecnici correlati
- Rimuovere/isolare `ops_memoria.json` dal root del repository applicativo (non pertinente a questo sistema, rischio di essere letto come contesto da un futuro agente generico).
- Deprecare `docs/MASTER_PROMPT.md` come fonte operativa per Dark Lemon o marcarlo esplicitamente "storico, non usare come fonte di stato" in testa al file, con verifica automatica di deriva (script che confronta affermazioni chiave — es. endpoint RENTRI — con quanto realmente implementato nel codice).
- Unificare `agentActivityStore.ts` (client, volatile) come mera vista UI del registro server `agent_decisions_log`, non come fonte di verità parallela.

---

## 6. Sintesi con riferimenti file:riga

- Tenant risolto senza verifica server-side dell'appartenenza utente: `dark-lemon-mn/index.ts:153-157`
- System prompt monolitico con dati di dominio hardcoded e patch narrative accumulate per data: `dark-lemon-mn/index.ts:9-22,258-327`
- Regole "regola del 202" e "non dire mai successo" enunciate in prosa, non enforced da codice: `dark-lemon-mn/index.ts:304,310`
- Memoria libera iniettata senza TTL/verifica: `dark-lemon-mn/index.ts:1746-1795,3379-3416,4363-4378`
- Conferma scrittura basata su regex/parola chiave, non su token legato all'operazione: `dark-lemon-mn/index.ts:52-53,1134-1136,2312-2318,2568`
- Audit strutturato esistente solo parziale (solo Dragon): `dark-lemon-mn/index.ts:2115-2116,3821-3831,4251`
- Log azioni lato client, volatile, non condiviso col server: `src/stores/agentActivityStore.ts:31,49`
- Contesto pagina DOM trattato come fonte di verità testuale, non marcato come non autorevole: `src/hooks/usePageContext.ts:144-181`
- Tenant singolo hardcoded lato client, in contraddizione con la narrativa multi-tenant del MASTER_PROMPT: `src/stores/mnContextStore.ts:12-16` vs `docs/MASTER_PROMPT.md:9-19`
- Secondo agente indipendente senza registro condiviso: `supabase/functions/autorizzazioni-ai/index.ts:2`
- File di memoria narrativa vagante nel root del repo, non pertinente al sistema, stato dichiarato non verificabile: `ops_memoria.json:1-46`
