# Dark Lemon → Agent totale

Obiettivo: rendere Dark Lemon un agente "onnisciente" che conosce la struttura del database, agisce in autonomia, vede cosa sta facendo l'utente nell'app e sa correggerlo.

## Cosa si può fare davvero

Dark Lemon ha già ~50 strumenti (SQL read/write, FIR, privati, Dragon, RENTRI, comunicazioni, memoria).
Mancano tre cose per arrivare all'"agente totale":

1. **Conoscenza totale dello schema** — oggi l'agente "indovina" tabelle e colonne.
2. **Coscienza operativa** — oggi vede solo un testo della pagina, non le azioni che l'utente compie.
3. **Modifica del codice** — questa è l'unica parte non realizzabile: l'app pubblicata non ha accesso al proprio repository, quindi nessun agente interno può riscrivere componenti React o fare deploy. Al suo posto: Dark Lemon raccoglie e formula richieste di modifica strutturate (già esiste il modulo System Prompt Requests) e può cambiare comportamento dell'app tramite dati/configurazione.

## Fase 1 — Onniscienza dati

- Nuovo tool `schema_introspect`: elenca tabelle, colonne, tipi, chiavi esterne, policy e funzioni disponibili, con cache in memoria.
- Nuovo tool `db_health_check`: controlli di coerenza (giacenze vs movimenti, FIR orfani, ricevute senza conferimento, numerazioni doppie) con esito PASS/FAIL per riga.
- Nuovo tool `explain_and_fix`: analizza un disallineamento rilevato e propone la correzione SQL, che esegue solo dopo conferma esplicita dell'utente ("CONFERMO").
- System prompt aggiornato: obbligo di introspezione prima di scritture su tabelle non note.

## Fase 2 — Coscienza delle azioni in corso

- Registro azioni lato client (`agentActivityStore`): ogni operazione rilevante dell'app (creazione conferimento, salvataggio FIR, eliminazione, sync giacenze, invio RENTRI) registra evento, esito ed errore.
- Il payload inviato all'agente include le ultime 30 azioni con tempi ed errori, oltre al contesto pagina già presente.
- Nuovo tool `review_recent_actions`: l'agente valuta la sequenza e segnala errori operativi ("hai creato il conferimento ma la giacenza non è stata ricalcolata").
- Barra "Supervisione" nel widget: mostra in tempo reale l'ultima verifica dell'agente (OK / Attenzione / Errore).

## Fase 3 — Autonomia controllata

- Modalità **Autopilot** (interruttore nel widget): l'agente può concatenare fino a N strumenti e ritentare le operazioni fallite, con log completo di ogni passo mostrato in chat.
- Scritture distruttive (DELETE, UPDATE massivi, invii RENTRI) restano sempre dietro conferma esplicita.
- Ogni azione dell'agente viene tracciata in `dragon_audit_logs` con attore `dark-lemon`.

## Fase 4 — Ponte verso le modifiche software

- Tool `request_app_change`: crea una richiesta strutturata (area, comportamento attuale, comportamento desiderato, priorità) nella tabella già esistente delle richieste, visibile dal Super Admin.
- Pannello nella console con le richieste aperte e il loro stato.

## Note tecniche

- Tutto lato Edge Function `dark-lemon-mn` (nuovi tool + system prompt) e lato client nei componenti Dark Lemon esistenti.
- Nessuna modifica a tabelle esistenti; eventuale nuova tabella solo per il log azioni agente, se serve persistenza.
- Modello con visione già attivo per screenshot: resta invariato.
