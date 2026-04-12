import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TENANT_MAP: Record<string, string> = {
  multyproget: "77ec9a3d-602e-438f-97bf-1c69abd8f691",
  niyol: "819c783e-78dd-4080-8265-802e75b0d813",
};
const DEFAULT_TENANT_ID = "dc2a6046-d9a8-4549-8e45-82367d695ac6";
const MULTY_IMPIANTO_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

function resolveTenantId(context?: string): string {
  if (context && TENANT_MAP[context]) return TENANT_MAP[context];
  return DEFAULT_TENANT_ID;
}

function buildSystemPrompt(adminName: string, tenantId: string, contextLabel: string, memories: any[]) {
  const memoryBlock = memories.length > 0
    ? `\n\n### Memoria admin:\n${memories.map(m => `- ${m.fact_key}: ${m.fact_value}`).join("\n")}`
    : "";

  return `Sei DARK LEMON AI, l'agente operativo COMPLETO per ${contextLabel}. Sei personalizzato per ${adminName}.

## IDENTITÀ
Sei un agente AI con accesso TOTALE a tutte le operazioni aziendali di ${contextLabel}. Non sei un semplice chatbot: sei il braccio operativo dell'amministratore. Puoi fare QUALUNQUE cosa venga richiesta.

## CONTESTO
- Tenant attivo: ${contextLabel} (ID: ${tenantId})
- Impianto principale: ${MULTY_IMPIANTO_ID}
- Società RENTRI: multy (CF: 12347770013)
- Società ID per FIR pool: multy

## REGOLA CRITICA DI ISOLAMENTO
OGNI operazione DEVE essere filtrata per tenant_id = '${tenantId}'. Non accedere MAI a dati di altri tenant.

## CAPACITÀ OPERATIVE

### 1. FORMULARI FIR (Formulario Identificazione Rifiuti)
Puoi gestire l'intero ciclo di vita dei FIR:
- **Consultare** tutti i FIR (bozze, completati, inviati) con list_fir_forms
- **Compilare** un FIR specifico campo per campo con update_fir_form
- **Creare bozze extra** per un utente con create_extra_draft
- **Assegnare** un FIR a un utente specifico
- **Verificare il pool** dei numeri disponibili con check_fir_pool
- **Distribuire** numeri FIR automaticamente con distribute_baseline

#### Campi FIR disponibili per la compilazione:
- numero_fir, status (bozza/completato/inviato)
- produttore_denominazione, produttore_codice_fiscale, produttore_indirizzo, produttore_comune, produttore_provincia, produttore_cap
- destinatario_denominazione, destinatario_codice_fiscale, destinatario_indirizzo, destinatario_comune, destinatario_provincia, destinatario_cap, destinatario_autorizzazione
- trasportatore_denominazione, trasportatore_codice_fiscale, trasportatore_conducente, trasportatore_iscrizione_albo, trasportatore_targa_automezzo, trasportatore_targa_rimorchio
- intermediario_denominazione, intermediario_codice_fiscale, intermediario_iscrizione_albo
- codice_eer, stato_fisico, descrizione_rifiuto, caratteristiche_hp
- quantita, unita_misura, data_partenza, data_arrivo
- note, form_data (JSONB per campi extra)

### 2. INVIO RENTRI
Puoi inviare FIR al sistema RENTRI ministeriale con send_to_rentri.
Il proxy VPS (167.235.29.27:3000) gestisce mTLS e firme JWT.

### 3. ANAGRAFICA PRIVATI
- Cercare privati per nome, cognome, CF con search_privati
- Creare nuovi privati con create_privato
- Aggiornare dati privati con update_privato

### 4. CONFERIMENTI
- Registrare conferimenti rifiuti dai privati con create_conferimento
- Consultare lo storico conferimenti con list_conferimenti

### 5. RICEVUTE
- Creare ricevute per conferimenti con create_ricevuta
- Consultare ricevute emesse

### 6. FATTURE (ERP)
- Creare fatture di vendita con create_fattura
- Consultare fatture esistenti
- Gestire righe fattura

### 7. MAGAZZINO
- Consultare giacenze con query_database
- Registrare movimenti carico/scarico
- Gestire cernite (separazione rifiuti)

### 8. PERSONALE / TRASPORTATORI
- Elencare tutti i trasportatori del tenant
- Visualizzare lo stato dei FIR assegnati per ogni trasportatore
- Inviare messaggi ai trasportatori

### 9. SOCIAL E COMUNICAZIONI
- Leggere e moderare il feed social
- Inviare messaggi diretti
- Gestire comunicazioni

### 10. DATABASE GENERICO
Per qualunque altra esigenza, hai accesso diretto al database con query_database e write_database.

## SCHEMA DATABASE COMPLETO

### fir_forms
Formulari FIR compilati. Colonne principali:
id (uuid PK), user_id (uuid), tenant_id (uuid), status (text: bozza/completato/inviato), numero_fir (text),
produttore_denominazione, produttore_codice_fiscale, produttore_indirizzo, produttore_comune, produttore_provincia, produttore_cap,
destinatario_denominazione, destinatario_codice_fiscale, destinatario_indirizzo, destinatario_comune, destinatario_provincia, destinatario_cap, destinatario_autorizzazione,
trasportatore_denominazione, trasportatore_codice_fiscale, trasportatore_conducente, trasportatore_iscrizione_albo, trasportatore_targa_automezzo, trasportatore_targa_rimorchio,
intermediario_denominazione, intermediario_codice_fiscale, intermediario_iscrizione_albo,
codice_eer, stato_fisico, descrizione_rifiuto, caratteristiche_hp (text[]),
quantita (numeric), unita_misura, data_partenza, data_arrivo,
note, form_data (jsonb), allegati (jsonb), submitted_at, completed_at,
deleted_by_user (bool), created_at, updated_at.

### fir_number_pool
Pool numeri FIR vidimati. Colonne:
id, fir_number (text), user_id (uuid), societa_id (text: global/multy/niyol), status (available/reserved/consumed),
assigned_at, assigned_by, consumed_at, reserved_by_fir_id, suspended (bool), is_demo (bool), qr_code_data.

### profiles
Profili utenti. Colonne: id, user_id, nome, cognome, email, ruolo, telefono, tenant_id, mn_context, avatar_url, is_social_only, codice_fiscale, recording_consent, created_at, updated_at.

### anagrafica_privati
Privati che conferiscono rifiuti. Colonne:
id, tenant_id, impianto_id, nome, cognome, codice_fiscale, denominazione, comune_residenza, indirizzo, cap, provincia, nazione,
numero_tessera, tipo_utenza (domestica/non_domestica), email, telefono, cellulare, pec, fax, partita_iva,
codice_destinatario, note, attivo (bool), automezzo, targa_automezzo, modello_automezzo,
numero_documento, scadenza_documento, import_source, import_batch_id, created_at, updated_at.

### privati_conferimenti
Conferimenti rifiuti. Colonne:
id, impianto_id, tenant_id, privato_id, nome_privato, cf_pi, cer, kg_pesati, data, importo_pagato, metodo_pag,
tipo_utenza, numero_fir, quantita_presunta, stato_rifiuto, codice_ce, esito_pesata, targa_automezzo, modello_automezzo, note, created_at, updated_at.

### ricevute_privati
Ricevute emesse. Colonne:
id, tenant_id, impianto_id, conferimento_id, privato_id, numero_ricevuta, anno, data_emissione, importo, pdf_path, qr_code_data, note, created_at, updated_at.

### erp_fatture_vendita
Fatture vendita. Colonne:
id, tenant_id, numero, data_fattura, tipo_documento, cliente_id, imponibile, iva, totale, ritenuta_acconto, netto_a_pagare,
metodo_pagamento_id, condizioni_pagamento, stato, contabilizzata, causale_id, da_conferimenti, note, created_by, created_at, updated_at.

### erp_righe_fatture_vendita
Righe fattura. Colonne:
id, fattura_id, riga_numero, descrizione, quantita, prezzo_unitario, aliquota_iva, imponibile, importo_iva,
sconto_percentuale, cer, fir_id, conferimento_id, impianto_id, codice_iva_id, centro_costo, commessa, peso_totale.

### erp_anagrafiche
Anagrafiche ERP (clienti/fornitori). Colonne:
id, tenant_id, ragione_sociale, tipo_soggetto (cliente/fornitore/entrambi), nome, cognome, codice_fiscale, partita_iva,
indirizzo, comune, provincia, cap, nazione, email, pec, telefono, codice_destinatario, iban, condizioni_pagamento_default, note, attivo, created_at, updated_at.

### magazzino_giacenze
id, tenant_id, impianto_id, cer, quantita_kg, ultimo_carico_at, created_at, updated_at.

### movimenti_impianto
id, tenant_id, impianto_id, cer, tipo_movimento (CARICO/SCARICO), quantita_kg, ruolo_impianto, descrizione, data_movimento, note, created_at.

### cernite / cernita_output
Cernite e output di separazione rifiuti.

### messages
id, sender_id, receiver_id, content, is_read, read_at, deleted_by_sender, created_at.

### social_posts / social_comments / social_moderation
Post social, commenti, azioni moderazione.

### impianti_accounts / impianto_fir_inbox
Account impianto e inbox FIR destinatario.

### organizations / memberships
Organizzazioni RENTRI e appartenenze.

### intermediari / intermediazioni
Registri intermediazione.

## REGOLE OPERATIVE
1. Rispondi SEMPRE in italiano, chiaro e professionale.
2. Filtra SEMPRE per tenant_id = '${tenantId}'.
3. Quando inserisci, includi SEMPRE tenant_id = '${tenantId}'.
4. Per operazioni distruttive, chiedi conferma PRIMA di eseguire.
5. Formatta i risultati in modo leggibile (tabelle markdown, elenchi).
6. Limita le SELECT a max 50 righe salvo richiesta specifica.
7. Quando compili un FIR, usa update_fir_form per aggiornare i campi specifici.
8. Quando crei una bozza extra, usa create_extra_draft.
9. Per le ricevute, genera automaticamente il numero progressivo.
10. Sii proattivo: se l'utente chiede qualcosa di vago, proponi opzioni concrete.
11. Quando assegni un FIR a un utente, prima cerca l'utente nel DB per ottenere lo user_id.

## APPRENDIMENTO CONTINUO
IMPORTANTE: Devi apprendere attivamente dalle conversazioni! Ogni volta che scopri informazioni utili, usa save_memory per ricordarle.
Esempi di cose da memorizzare:
- Preferenze dell'admin (formato report preferito, utenti frequenti, procedure abituali)
- Pattern ricorrenti (combinazioni CER/destinatario usate spesso, trasportatori preferiti)
- Informazioni aziendali scoperte durante le query (numero medio conferimenti, clienti principali)
- Correzioni o chiarimenti dell'utente (es. "il codice CER corretto per X è Y")
- Flussi di lavoro abituali (es. "prima cerco il privato, poi creo conferimento, poi ricevuta")
- Contatti chiave e ruoli (es. "Mario è il responsabile impianto")

Usa fact_key descrittivi e fact_value dettagliati. Non memorizzare dati sensibili come password.
Apprendi PROATTIVAMENTE: non aspettare che ti venga chiesto, memorizza automaticamente ciò che è utile.
${memoryBlock}`;
}

const tools = [
  // === DATABASE GENERICO ===
  {
    type: "function",
    function: {
      name: "query_database",
      description: "Esegui una query SELECT sul database. Filtra per tenant_id. Max 50 righe.",
      parameters: {
        type: "object",
        properties: {
          sql: { type: "string", description: "Query SQL SELECT" },
          explanation: { type: "string", description: "Spiegazione dell'operazione" }
        },
        required: ["sql", "explanation"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write_database",
      description: "Esegui INSERT/UPDATE/DELETE sul database. Per operazioni non coperte da tool specifici.",
      parameters: {
        type: "object",
        properties: {
          sql: { type: "string", description: "Query SQL INSERT/UPDATE/DELETE" },
          operation: { type: "string", enum: ["INSERT", "UPDATE", "DELETE"] },
          explanation: { type: "string", description: "Spiegazione" }
        },
        required: ["sql", "operation", "explanation"]
      }
    }
  },

  // === FIR MANAGEMENT ===
  {
    type: "function",
    function: {
      name: "list_fir_forms",
      description: "Elenca i formulari FIR del tenant. Può filtrare per stato, utente, numero FIR.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filtra per stato: bozza, completato, inviato (opzionale)" },
          user_id: { type: "string", description: "UUID utente specifico (opzionale)" },
          numero_fir: { type: "string", description: "Cerca per numero FIR specifico (opzionale)" },
          limit: { type: "number", description: "Max risultati (default 20)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_fir_form",
      description: "Aggiorna/compila campi di un formulario FIR specifico. Usa per compilare produttore, destinatario, trasportatore, rifiuto, quantità, ecc.",
      parameters: {
        type: "object",
        properties: {
          fir_form_id: { type: "string", description: "UUID del formulario FIR da aggiornare" },
          fields: {
            type: "object",
            description: "Oggetto con i campi da aggiornare. Es: {produttore_denominazione: 'Eco Srl', codice_eer: '150106'}",
          },
          explanation: { type: "string", description: "Spiegazione di cosa si sta compilando" }
        },
        required: ["fir_form_id", "fields", "explanation"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_extra_draft",
      description: "Crea una bozza FIR extra per un utente specifico, prelevando un numero dal pool condiviso.",
      parameters: {
        type: "object",
        properties: {
          user_id: { type: "string", description: "UUID dell'utente a cui assegnare la bozza extra" }
        },
        required: ["user_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_fir_pool",
      description: "Verifica lo stato del pool numeri FIR per il tenant: disponibili, in uso, consumati.",
      parameters: {
        type: "object",
        properties: {
          detail: { type: "boolean", description: "Se true, mostra dettaglio per utente" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "distribute_baseline",
      description: "Esegui la distribuzione automatica baseline dei FIR: 1 bozza per ogni trasportatore, Impianto e Conto Proprio.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "complete_fir",
      description: "Completa un FIR (cambia stato da bozza a completato) e opzionalmente consuma il numero.",
      parameters: {
        type: "object",
        properties: {
          fir_form_id: { type: "string", description: "UUID del FIR da completare" },
        },
        required: ["fir_form_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_to_rentri",
      description: "Invia un FIR completato al sistema RENTRI ministeriale tramite il proxy VPS.",
      parameters: {
        type: "object",
        properties: {
          fir_form_id: { type: "string", description: "UUID del FIR da inviare" },
          rentri_path: { type: "string", description: "Path RENTRI (default: /api/rentri/action/emissioneFir)" }
        },
        required: ["fir_form_id"]
      }
    }
  },

  // === ANAGRAFICA PRIVATI ===
  {
    type: "function",
    function: {
      name: "search_privati",
      description: "Cerca privati nell'anagrafica per nome, cognome, codice fiscale o tessera.",
      parameters: {
        type: "object",
        properties: {
          search_term: { type: "string", description: "Termine di ricerca (nome, cognome, CF, tessera)" },
          limit: { type: "number", description: "Max risultati (default 10)" }
        },
        required: ["search_term"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_privato",
      description: "Crea un nuovo privato nell'anagrafica.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string" },
          cognome: { type: "string" },
          codice_fiscale: { type: "string" },
          comune_residenza: { type: "string" },
          indirizzo: { type: "string" },
          cap: { type: "string" },
          provincia: { type: "string" },
          telefono: { type: "string" },
          email: { type: "string" },
          tipo_utenza: { type: "string", enum: ["domestica", "non_domestica"], description: "Default: domestica" },
          numero_tessera: { type: "string" },
          denominazione: { type: "string" },
          targa_automezzo: { type: "string" },
          note: { type: "string" }
        },
        required: ["nome", "cognome", "codice_fiscale"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_privato",
      description: "Aggiorna i dati di un privato esistente.",
      parameters: {
        type: "object",
        properties: {
          privato_id: { type: "string", description: "UUID del privato" },
          fields: { type: "object", description: "Campi da aggiornare" }
        },
        required: ["privato_id", "fields"]
      }
    }
  },

  // === CONFERIMENTI ===
  {
    type: "function",
    function: {
      name: "create_conferimento",
      description: "Registra un conferimento di rifiuti da un privato all'impianto.",
      parameters: {
        type: "object",
        properties: {
          privato_id: { type: "string", description: "UUID del privato (opzionale se si fornisce nome_privato)" },
          nome_privato: { type: "string", description: "Nome del privato (se non si ha l'UUID)" },
          cf_pi: { type: "string", description: "Codice fiscale o P.IVA del privato" },
          cer: { type: "string", description: "Codice EER/CER del rifiuto" },
          kg_pesati: { type: "number", description: "Kg pesati" },
          importo_pagato: { type: "number", description: "Importo pagato (opzionale)" },
          metodo_pag: { type: "string", description: "Metodo pagamento: contanti, POS, bonifico" },
          tipo_utenza: { type: "string", description: "domestica o non_domestica" },
          stato_rifiuto: { type: "string", description: "Stato fisico del rifiuto" },
          targa_automezzo: { type: "string" },
          note: { type: "string" }
        },
        required: ["cer", "kg_pesati"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_conferimenti",
      description: "Elenca conferimenti rifiuti, con filtri opzionali.",
      parameters: {
        type: "object",
        properties: {
          privato_id: { type: "string", description: "UUID privato (opzionale)" },
          date_from: { type: "string", description: "Data inizio YYYY-MM-DD (opzionale)" },
          date_to: { type: "string", description: "Data fine YYYY-MM-DD (opzionale)" },
          cer: { type: "string", description: "Filtro CER (opzionale)" },
          limit: { type: "number", description: "Max risultati (default 20)" }
        }
      }
    }
  },

  // === RICEVUTE ===
  {
    type: "function",
    function: {
      name: "create_ricevuta",
      description: "Crea una ricevuta per un conferimento. Genera automaticamente il numero progressivo.",
      parameters: {
        type: "object",
        properties: {
          conferimento_id: { type: "string", description: "UUID del conferimento" },
          privato_id: { type: "string", description: "UUID del privato" },
          importo: { type: "number", description: "Importo della ricevuta" },
          note: { type: "string" }
        },
        required: ["conferimento_id", "privato_id"]
      }
    }
  },

  // === FATTURE ERP ===
  {
    type: "function",
    function: {
      name: "create_fattura",
      description: "Crea una fattura di vendita nel sistema ERP.",
      parameters: {
        type: "object",
        properties: {
          cliente_id: { type: "string", description: "UUID del cliente (erp_anagrafiche)" },
          tipo_documento: { type: "string", description: "FPA12 (fattura PA), FPR12 (fattura privati), TD01 (fattura)" },
          righe: {
            type: "array",
            items: {
              type: "object",
              properties: {
                descrizione: { type: "string" },
                quantita: { type: "number" },
                prezzo_unitario: { type: "number" },
                aliquota_iva: { type: "number", description: "Es: 22, 10, 4, 0" },
                cer: { type: "string" },
                peso_totale: { type: "number" }
              },
              required: ["descrizione", "quantita", "prezzo_unitario", "aliquota_iva"]
            },
            description: "Righe della fattura"
          },
          condizioni_pagamento: { type: "string" },
          note: { type: "string" }
        },
        required: ["cliente_id", "righe"]
      }
    }
  },

  // === TRASPORTATORI / PERSONALE ===
  {
    type: "function",
    function: {
      name: "list_trasportatori",
      description: "Elenca tutti i trasportatori/utenti del tenant con stato FIR assegnati.",
      parameters: {
        type: "object",
        properties: {
          with_fir_status: { type: "boolean", description: "Includi conteggio FIR per utente (default true)" }
        }
      }
    }
  },

  // === MESSAGGI ===
  {
    type: "function",
    function: {
      name: "send_message_to_user",
      description: "Invia un messaggio diretto a un trasportatore/utente.",
      parameters: {
        type: "object",
        properties: {
          receiver_id: { type: "string", description: "UUID del destinatario" },
          content: { type: "string", description: "Testo del messaggio" }
        },
        required: ["receiver_id", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_messages",
      description: "Leggi conversazioni con trasportatori/utenti.",
      parameters: {
        type: "object",
        properties: {
          partner_id: { type: "string", description: "UUID utente specifico (opzionale)" },
          limit: { type: "number", description: "Numero messaggi (default 20)" }
        }
      }
    }
  },

  // === SOCIAL ===
  {
    type: "function",
    function: {
      name: "read_social_feed",
      description: "Leggi i post del social feed.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Numero post (default 15)" },
          include_hidden: { type: "boolean", description: "Includi post nascosti (default true per admin)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "moderate_post",
      description: "Nascondi o elimina un post social.",
      parameters: {
        type: "object",
        properties: {
          post_id: { type: "string", description: "UUID del post" },
          action: { type: "string", enum: ["hide", "delete"] },
          reason: { type: "string", description: "Motivo della moderazione" }
        },
        required: ["post_id", "action", "reason"]
      }
    }
  },

  // === MEMORIA ===
  {
    type: "function",
    function: {
      name: "save_memory",
      description: "Salva un fatto importante per ricordarlo in futuro.",
      parameters: {
        type: "object",
        properties: {
          fact_key: { type: "string" },
          fact_value: { type: "string" }
        },
        required: ["fact_key", "fact_value"]
      }
    }
  },

  // === CONTEGGIO ===
  {
    type: "function",
    function: {
      name: "count_records",
      description: "Conta record in una tabella con filtro opzionale.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string" },
          filter: { type: "string", description: "WHERE aggiuntivo (opzionale)" }
        },
        required: ["table"]
      }
    }
  },
];

// ====================== TOOL HANDLERS ======================

async function handleTool(
  fn: { name: string; arguments: string },
  toolCallId: string,
  db: any,
  tenantId: string,
  adminUserId: string,
) {
  let args: any;
  try {
    args = JSON.parse(fn.arguments);
  } catch {
    return { error: "JSON argomenti non valido" };
  }

  switch (fn.name) {

    // ---------- DATABASE GENERICO ----------
    case "query_database": {
      const sql = (args.sql || "").trim();
      if (!sql.toUpperCase().startsWith("SELECT")) return { error: "Solo SELECT permesse qui. Usa write_database." };
      const { data: rows, error } = await db.rpc("exec_sql_readonly", { query: sql }).maybeSingle();
      return error ? { error: error.message } : rows;
    }

    case "write_database": {
      const sql = (args.sql || "").trim();
      if (sql.toUpperCase().startsWith("SELECT")) return { error: "Usa query_database per le SELECT." };
      const { data: rows, error } = await db.rpc("exec_sql_write", { query: sql }).maybeSingle();
      return error ? { error: error.message } : { success: true, data: rows };
    }

    case "count_records": {
      const table = (args.table || "").replace(/[^a-zA-Z0-9_]/g, "");
      let q = `SELECT COUNT(*) as total FROM ${table} WHERE tenant_id = '${tenantId}'`;
      if (args.filter) q += ` AND (${args.filter})`;
      const { data, error } = await db.rpc("exec_sql_readonly", { query: q }).maybeSingle();
      return error ? { error: error.message } : data;
    }

    // ---------- FIR MANAGEMENT ----------
    case "list_fir_forms": {
      let q = `SELECT ff.id, ff.numero_fir, ff.status, ff.codice_eer, ff.descrizione_rifiuto, 
                      ff.produttore_denominazione, ff.destinatario_denominazione, ff.trasportatore_denominazione,
                      ff.quantita, ff.unita_misura, ff.data_partenza, ff.data_arrivo,
                      ff.created_at, ff.updated_at, ff.user_id,
                      p.nome || ' ' || p.cognome as trasportatore_nome
               FROM fir_forms ff
               LEFT JOIN profiles p ON p.user_id = ff.user_id
               WHERE ff.tenant_id = '${tenantId}' AND coalesce(ff.deleted_by_user, false) = false`;
      if (args.status) q += ` AND ff.status = '${args.status.replace(/'/g, "")}'`;
      if (args.user_id) q += ` AND ff.user_id = '${args.user_id.replace(/'/g, "")}'`;
      if (args.numero_fir) q += ` AND ff.numero_fir ILIKE '%${args.numero_fir.replace(/'/g, "")}%'`;
      q += ` ORDER BY ff.updated_at DESC LIMIT ${args.limit || 20}`;
      const { data, error } = await db.rpc("exec_sql_readonly", { query: q }).maybeSingle();
      return error ? { error: error.message } : { fir_forms: data || [] };
    }

    case "update_fir_form": {
      const id = args.fir_form_id;
      const fields = args.fields || {};
      // Build SET clause
      const setClauses: string[] = [];
      const allowedFields = [
        "numero_fir", "status", "produttore_denominazione", "produttore_codice_fiscale",
        "produttore_indirizzo", "produttore_comune", "produttore_provincia", "produttore_cap",
        "destinatario_denominazione", "destinatario_codice_fiscale", "destinatario_indirizzo",
        "destinatario_comune", "destinatario_provincia", "destinatario_cap", "destinatario_autorizzazione",
        "trasportatore_denominazione", "trasportatore_codice_fiscale", "trasportatore_conducente",
        "trasportatore_iscrizione_albo", "trasportatore_targa_automezzo", "trasportatore_targa_rimorchio",
        "intermediario_denominazione", "intermediario_codice_fiscale", "intermediario_iscrizione_albo",
        "codice_eer", "stato_fisico", "descrizione_rifiuto", "quantita", "unita_misura",
        "data_partenza", "data_arrivo", "note", "form_data",
      ];
      for (const [key, value] of Object.entries(fields)) {
        if (!allowedFields.includes(key)) continue;
        if (key === "form_data" && typeof value === "object") {
          setClauses.push(`form_data = COALESCE(form_data, '{}'::jsonb) || '${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`);
        } else if (key === "caratteristiche_hp" && Array.isArray(value)) {
          setClauses.push(`caratteristiche_hp = ARRAY[${(value as string[]).map(v => `'${String(v).replace(/'/g, "''")}'`).join(",")}]::text[]`);
        } else if (typeof value === "number") {
          setClauses.push(`${key} = ${value}`);
        } else if (value === null) {
          setClauses.push(`${key} = NULL`);
        } else {
          setClauses.push(`${key} = '${String(value).replace(/'/g, "''")}'`);
        }
      }
      if (setClauses.length === 0) return { error: "Nessun campo valido da aggiornare" };
      setClauses.push("updated_at = now()");
      const sql = `UPDATE fir_forms SET ${setClauses.join(", ")} WHERE id = '${id}' AND tenant_id = '${tenantId}' RETURNING id, numero_fir, status`;
      const { data, error } = await db.rpc("exec_sql_write", { query: sql }).maybeSingle();
      return error ? { error: error.message } : { success: true, updated: data };
    }

    case "create_extra_draft": {
      const { data, error } = await db.rpc("create_extra_fir_draft", { p_user_id: args.user_id });
      if (error) return { error: error.message };
      // Fetch the created draft details
      const { data: draft } = await db.from("fir_forms").select("id, numero_fir, status, user_id").eq("id", data).single();
      return { success: true, draft: draft || { id: data } };
    }

    case "check_fir_pool": {
      const societa = "multy"; // Multyproget
      let q = `SELECT 
        COUNT(*) FILTER (WHERE status = 'available' AND NOT suspended) as disponibili,
        COUNT(*) FILTER (WHERE status = 'reserved') as in_uso,
        COUNT(*) FILTER (WHERE status = 'consumed') as consumati,
        COUNT(*) as totale,
        COUNT(*) FILTER (WHERE status = 'available' AND user_id = '00000000-0000-0000-0000-000000000000' AND NOT suspended) as nel_serbatoio
      FROM fir_number_pool WHERE societa_id = '${societa}'`;
      const { data: stats, error } = await db.rpc("exec_sql_readonly", { query: q }).maybeSingle();
      if (error) return { error: error.message };

      if (args.detail) {
        const detailQ = `SELECT 
          p.nome || ' ' || p.cognome as trasportatore,
          fnp.fir_number, fnp.status, fnp.user_id,
          ff.status as draft_status
        FROM fir_number_pool fnp
        LEFT JOIN profiles p ON p.user_id = fnp.user_id
        LEFT JOIN fir_forms ff ON ff.numero_fir = fnp.fir_number AND coalesce(ff.deleted_by_user, false) = false
        WHERE fnp.societa_id = '${societa}' AND fnp.status = 'available' AND NOT fnp.suspended
        ORDER BY p.cognome, p.nome`;
        const { data: detail } = await db.rpc("exec_sql_readonly", { query: detailQ }).maybeSingle();
        return { stats: stats?.[0] || stats, detail: detail || [] };
      }
      return { pool_status: stats?.[0] || stats };
    }

    case "distribute_baseline": {
      const { data, error } = await db.rpc("auto_distribute_baseline_fir", { p_societa: "multy" });
      return error ? { error: error.message } : { success: true, drafts_created: data };
    }

    case "complete_fir": {
      // Update status to completato
      const updateSql = `UPDATE fir_forms SET status = 'completato', completed_at = now(), updated_at = now() WHERE id = '${args.fir_form_id}' AND tenant_id = '${tenantId}' AND status = 'bozza' RETURNING id, numero_fir`;
      const { data: updated, error: updateErr } = await db.rpc("exec_sql_write", { query: updateSql }).maybeSingle();
      if (updateErr) return { error: updateErr.message };
      // Consume the FIR number
      const { error: consumeErr } = await db.rpc("consume_fir_number", { p_fir_id: args.fir_form_id });
      if (consumeErr) console.error("Consume error:", consumeErr);
      return { success: true, completed: updated };
    }

    case "send_to_rentri": {
      // Load FIR data
      const { data: fir, error: firErr } = await db.from("fir_forms")
        .select("*")
        .eq("id", args.fir_form_id)
        .eq("tenant_id", tenantId)
        .single();
      if (firErr || !fir) return { error: firErr?.message || "FIR non trovato" };

      // Build RENTRI payload
      const payload = {
        rentri_path: args.rentri_path || "/api/rentri/action/emissioneFir",
        societaId: "multy",
        data: {
          num_iscr_sito: "TO-00001",
          dati_partenza: {
            numero_fir: fir.numero_fir,
            produttore: {
              cf_prod: fir.produttore_codice_fiscale || "",
              denominazione: fir.produttore_denominazione || "",
              indirizzo: fir.produttore_indirizzo || "",
              comune: fir.produttore_comune || "",
              provincia: fir.produttore_provincia || "",
              cap: fir.produttore_cap || "",
            },
            rifiuto: {
              codice_eer: (fir.codice_eer || "").replace(/\./g, ""),
              stato_fisico: fir.stato_fisico === "Solido" ? "SNP" : fir.stato_fisico === "Liquido" ? "L" : fir.stato_fisico || "SNP",
              descrizione: fir.descrizione_rifiuto || "",
              quantita: fir.quantita || 0,
              unita_misura: fir.unita_misura === "tonnellate" ? "T" : "KG",
            },
            trasportatore: {
              cf_tras: fir.trasportatore_codice_fiscale || "",
              denominazione: fir.trasportatore_denominazione || "",
              conducente: fir.trasportatore_conducente || "",
              targa: fir.trasportatore_targa_automezzo || "",
            },
          },
          dati_arrivo: {
            destinatario: {
              cf_dest: fir.destinatario_codice_fiscale || "",
              denominazione: fir.destinatario_denominazione || "",
            },
          },
        },
      };

      try {
        const vpsResp = await fetch("http://167.235.29.27:3000/invia-operazione", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const vpsResult = await vpsResp.json();
        
        // Log the RENTRI operation
        await db.from("rentri_logs").insert({
          tenant_id: tenantId,
          operation_type: "emissione_fir",
          payload: payload,
          response: vpsResult,
          status: vpsResp.ok ? "success" : "error",
        }).catch(() => {});

        return { success: vpsResp.ok, rentri_response: vpsResult };
      } catch (e) {
        return { error: `Errore connessione VPS: ${e instanceof Error ? e.message : "unknown"}` };
      }
    }

    // ---------- ANAGRAFICA PRIVATI ----------
    case "search_privati": {
      const term = (args.search_term || "").replace(/'/g, "''");
      const q = `SELECT id, nome, cognome, codice_fiscale, denominazione, comune_residenza, numero_tessera, tipo_utenza, telefono, email, targa_automezzo, attivo
        FROM anagrafica_privati 
        WHERE tenant_id = '${tenantId}' 
          AND (nome ILIKE '%${term}%' OR cognome ILIKE '%${term}%' OR codice_fiscale ILIKE '%${term}%' 
               OR numero_tessera ILIKE '%${term}%' OR denominazione ILIKE '%${term}%')
        ORDER BY cognome, nome LIMIT ${args.limit || 10}`;
      const { data, error } = await db.rpc("exec_sql_readonly", { query: q }).maybeSingle();
      return error ? { error: error.message } : { privati: data || [] };
    }

    case "create_privato": {
      const cols = ["tenant_id", "impianto_id", "nome", "cognome", "codice_fiscale"];
      const vals = [`'${tenantId}'`, `'${MULTY_IMPIANTO_ID}'`, `'${(args.nome || "").replace(/'/g, "''")}'`, `'${(args.cognome || "").replace(/'/g, "''")}'`, `'${(args.codice_fiscale || "").replace(/'/g, "''")}'`];
      const optFields: Record<string, string | undefined> = {
        comune_residenza: args.comune_residenza, indirizzo: args.indirizzo, cap: args.cap, provincia: args.provincia,
        telefono: args.telefono, email: args.email, tipo_utenza: args.tipo_utenza || "domestica",
        numero_tessera: args.numero_tessera, denominazione: args.denominazione, targa_automezzo: args.targa_automezzo, note: args.note,
      };
      for (const [k, v] of Object.entries(optFields)) {
        if (v !== undefined && v !== null) { cols.push(k); vals.push(`'${String(v).replace(/'/g, "''")}'`); }
      }
      const sql = `INSERT INTO anagrafica_privati (${cols.join(", ")}) VALUES (${vals.join(", ")}) RETURNING id, nome, cognome, codice_fiscale`;
      const { data, error } = await db.rpc("exec_sql_write", { query: sql }).maybeSingle();
      return error ? { error: error.message } : { success: true, privato: data };
    }

    case "update_privato": {
      const sets: string[] = [];
      const allowed = ["nome", "cognome", "codice_fiscale", "comune_residenza", "indirizzo", "cap", "provincia", "telefono", "email", "tipo_utenza", "numero_tessera", "denominazione", "targa_automezzo", "note", "attivo"];
      for (const [k, v] of Object.entries(args.fields || {})) {
        if (!allowed.includes(k)) continue;
        if (typeof v === "boolean") sets.push(`${k} = ${v}`);
        else if (v === null) sets.push(`${k} = NULL`);
        else sets.push(`${k} = '${String(v).replace(/'/g, "''")}'`);
      }
      if (sets.length === 0) return { error: "Nessun campo valido" };
      sets.push("updated_at = now()");
      const sql = `UPDATE anagrafica_privati SET ${sets.join(", ")} WHERE id = '${args.privato_id}' AND tenant_id = '${tenantId}' RETURNING id, nome, cognome`;
      const { data, error } = await db.rpc("exec_sql_write", { query: sql }).maybeSingle();
      return error ? { error: error.message } : { success: true, updated: data };
    }

    // ---------- CONFERIMENTI ----------
    case "create_conferimento": {
      const cols = ["tenant_id", "impianto_id", "cer", "kg_pesati", "data"];
      const vals = [`'${tenantId}'`, `'${MULTY_IMPIANTO_ID}'`, `'${(args.cer || "").replace(/'/g, "''")}'`, `${args.kg_pesati || 0}`, "now()"];
      if (args.privato_id) { cols.push("privato_id"); vals.push(`'${args.privato_id}'`); }
      if (args.nome_privato) { cols.push("nome_privato"); vals.push(`'${args.nome_privato.replace(/'/g, "''")}'`); }
      if (args.cf_pi) { cols.push("cf_pi"); vals.push(`'${args.cf_pi.replace(/'/g, "''")}'`); }
      if (args.importo_pagato !== undefined) { cols.push("importo_pagato"); vals.push(`${args.importo_pagato}`); }
      if (args.metodo_pag) { cols.push("metodo_pag"); vals.push(`'${args.metodo_pag}'`); }
      if (args.tipo_utenza) { cols.push("tipo_utenza"); vals.push(`'${args.tipo_utenza}'`); }
      if (args.stato_rifiuto) { cols.push("stato_rifiuto"); vals.push(`'${args.stato_rifiuto}'`); }
      if (args.targa_automezzo) { cols.push("targa_automezzo"); vals.push(`'${args.targa_automezzo.replace(/'/g, "''")}'`); }
      if (args.note) { cols.push("note"); vals.push(`'${args.note.replace(/'/g, "''")}'`); }
      const sql = `INSERT INTO privati_conferimenti (${cols.join(", ")}) VALUES (${vals.join(", ")}) RETURNING id, cer, kg_pesati, nome_privato`;
      const { data, error } = await db.rpc("exec_sql_write", { query: sql }).maybeSingle();
      return error ? { error: error.message } : { success: true, conferimento: data };
    }

    case "list_conferimenti": {
      let q = `SELECT pc.id, pc.nome_privato, pc.cf_pi, pc.cer, pc.kg_pesati, pc.importo_pagato, pc.metodo_pag, pc.data, pc.note,
                      ap.nome || ' ' || ap.cognome as privato_nome_completo
               FROM privati_conferimenti pc
               LEFT JOIN anagrafica_privati ap ON ap.id = pc.privato_id
               WHERE pc.tenant_id = '${tenantId}'`;
      if (args.privato_id) q += ` AND pc.privato_id = '${args.privato_id}'`;
      if (args.date_from) q += ` AND pc.data >= '${args.date_from}'`;
      if (args.date_to) q += ` AND pc.data <= '${args.date_to}'`;
      if (args.cer) q += ` AND pc.cer ILIKE '%${args.cer.replace(/'/g, "")}%'`;
      q += ` ORDER BY pc.data DESC LIMIT ${args.limit || 20}`;
      const { data, error } = await db.rpc("exec_sql_readonly", { query: q }).maybeSingle();
      return error ? { error: error.message } : { conferimenti: data || [] };
    }

    // ---------- RICEVUTE ----------
    case "create_ricevuta": {
      const year = new Date().getFullYear();
      // Get next receipt number
      const { data: numData } = await db.rpc("next_ricevuta_number", { p_impianto_id: MULTY_IMPIANTO_ID, p_anno: year });
      const numRicevuta = numData || `00001/${year}`;
      const importo = args.importo || 0;
      const sql = `INSERT INTO ricevute_privati (tenant_id, impianto_id, conferimento_id, privato_id, numero_ricevuta, anno, data_emissione, importo, note)
        VALUES ('${tenantId}', '${MULTY_IMPIANTO_ID}', '${args.conferimento_id}', '${args.privato_id}', '${numRicevuta}', ${year}, now(), ${importo}, ${args.note ? `'${args.note.replace(/'/g, "''")}'` : "NULL"})
        RETURNING id, numero_ricevuta, importo`;
      const { data, error } = await db.rpc("exec_sql_write", { query: sql }).maybeSingle();
      return error ? { error: error.message } : { success: true, ricevuta: data };
    }

    // ---------- FATTURE ERP ----------
    case "create_fattura": {
      // Get next invoice number
      const year = new Date().getFullYear();
      const { data: countData } = await db.rpc("exec_sql_readonly", {
        query: `SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(numero, '[^0-9]', '', 'g') AS INTEGER)), 0) + 1 as next_num FROM erp_fatture_vendita WHERE tenant_id = '${tenantId}' AND EXTRACT(YEAR FROM data_fattura) = ${year}`
      });
      const nextNum = countData?.[0]?.next_num || 1;
      const numero = `${String(nextNum).padStart(4, "0")}/${year}`;

      // Calculate totals
      const righe = args.righe || [];
      let imponibile = 0, iva = 0;
      for (const r of righe) {
        const imp = (r.quantita || 1) * (r.prezzo_unitario || 0);
        imponibile += imp;
        iva += imp * ((r.aliquota_iva || 22) / 100);
      }
      const totale = imponibile + iva;

      const sql = `INSERT INTO erp_fatture_vendita (tenant_id, numero, data_fattura, tipo_documento, cliente_id, imponibile, iva, totale, netto_a_pagare, stato, condizioni_pagamento, note, created_by)
        VALUES ('${tenantId}', '${numero}', CURRENT_DATE, '${args.tipo_documento || "TD01"}', '${args.cliente_id}', ${imponibile}, ${iva}, ${totale}, ${totale}, 'bozza', ${args.condizioni_pagamento ? `'${args.condizioni_pagamento}'` : "NULL"}, ${args.note ? `'${args.note.replace(/'/g, "''")}'` : "NULL"}, ${adminUserId ? `'${adminUserId}'` : "NULL"})
        RETURNING id, numero, totale, stato`;
      const { data: fattura, error: fatErr } = await db.rpc("exec_sql_write", { query: sql }).maybeSingle();
      if (fatErr) return { error: fatErr.message };

      const fatturaId = fattura?.[0]?.id || fattura?.id;
      if (fatturaId && righe.length > 0) {
        for (let i = 0; i < righe.length; i++) {
          const r = righe[i];
          const imp = (r.quantita || 1) * (r.prezzo_unitario || 0);
          const ivaRiga = imp * ((r.aliquota_iva || 22) / 100);
          const rigaSql = `INSERT INTO erp_righe_fatture_vendita (fattura_id, riga_numero, descrizione, quantita, prezzo_unitario, aliquota_iva, imponibile, importo_iva${r.cer ? ", cer" : ""}${r.peso_totale ? ", peso_totale" : ""})
            VALUES ('${fatturaId}', ${i + 1}, '${(r.descrizione || "").replace(/'/g, "''")}', ${r.quantita || 1}, ${r.prezzo_unitario || 0}, ${r.aliquota_iva || 22}, ${imp}, ${ivaRiga}${r.cer ? `, '${r.cer}'` : ""}${r.peso_totale ? `, ${r.peso_totale}` : ""})`;
          await db.rpc("exec_sql_write", { query: rigaSql });
        }
      }
      return { success: true, fattura: fattura?.[0] || fattura };
    }

    // ---------- TRASPORTATORI ----------
    case "list_trasportatori": {
      let q = `SELECT p.user_id, p.nome, p.cognome, p.email, p.telefono, p.mn_context, p.codice_fiscale`;
      if (args.with_fir_status !== false) {
        q += `, (SELECT COUNT(*) FROM fir_forms ff WHERE ff.user_id = p.user_id AND ff.status = 'bozza' AND coalesce(ff.deleted_by_user, false) = false AND ff.tenant_id = '${tenantId}') as bozze_attive,
               (SELECT COUNT(*) FROM fir_forms ff WHERE ff.user_id = p.user_id AND ff.status = 'completato' AND ff.tenant_id = '${tenantId}') as completati,
               (SELECT COUNT(*) FROM fir_number_pool fnp WHERE fnp.user_id = p.user_id AND fnp.status = 'available' AND NOT fnp.suspended AND fnp.societa_id = 'multy') as numeri_disponibili`;
      }
      q += ` FROM profiles p WHERE p.tenant_id = '${tenantId}' AND coalesce(p.is_social_only, false) = false ORDER BY p.cognome, p.nome`;
      const { data, error } = await db.rpc("exec_sql_readonly", { query: q }).maybeSingle();
      return error ? { error: error.message } : { trasportatori: data || [] };
    }

    // ---------- MESSAGGI ----------
    case "send_message_to_user": {
      if (!adminUserId) return { error: "Admin non autenticato" };
      const { error } = await db.from("messages").insert({
        sender_id: adminUserId,
        receiver_id: args.receiver_id,
        content: args.content,
      });
      return error ? { error: error.message } : { success: true, message: "Messaggio inviato!" };
    }

    case "read_messages": {
      if (!adminUserId) return { error: "Admin non autenticato" };
      let query = db.from("messages")
        .select("id, sender_id, receiver_id, content, is_read, created_at")
        .order("created_at", { ascending: false }).limit(args.limit || 20);
      if (args.partner_id) {
        query = query.or(`and(sender_id.eq.${adminUserId},receiver_id.eq.${args.partner_id}),and(sender_id.eq.${args.partner_id},receiver_id.eq.${adminUserId})`);
      } else {
        query = query.or(`sender_id.eq.${adminUserId},receiver_id.eq.${adminUserId}`);
      }
      const { data: msgs, error } = await query;
      return error ? { error: error.message } : { messages: msgs || [] };
    }

    // ---------- SOCIAL ----------
    case "read_social_feed": {
      let query = db.from("social_posts")
        .select("id, author_id, content, post_type, is_hidden, likes_count, comments_count, created_at")
        .order("created_at", { ascending: false }).limit(args.limit || 15);
      if (!args.include_hidden) query = query.eq("is_hidden", false);
      const { data: posts, error } = await query;
      if (error) return { error: error.message };
      if (posts && posts.length > 0) {
        const authorIds = [...new Set(posts.map((p: any) => p.author_id))];
        const { data: profiles } = await db.from("profiles").select("user_id, nome, cognome").in("user_id", authorIds);
        const map = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, `${p.nome || ""} ${p.cognome || ""}`.trim()]));
        return { posts: posts.map((p: any) => ({ ...p, author_name: map[p.author_id] || "Utente" })) };
      }
      return { posts: [] };
    }

    case "moderate_post": {
      if (!adminUserId) return { error: "Admin non autenticato" };
      if (args.action === "hide") {
        const { error } = await db.from("social_posts").update({ is_hidden: true }).eq("id", args.post_id);
        if (error) return { error: error.message };
      } else {
        const { error } = await db.from("social_posts").delete().eq("id", args.post_id);
        if (error) return { error: error.message };
      }
      await db.from("social_moderation").insert({
        moderator_id: adminUserId, target_type: "post", target_id: args.post_id, action: args.action, reason: args.reason,
      });
      return { success: true, message: `Post ${args.action === "hide" ? "nascosto" : "eliminato"}!` };
    }

    // ---------- MEMORIA ----------
    case "save_memory": {
      if (!adminUserId) return { error: "Admin non autenticato" };
      const { data: existing } = await db.from("ai_user_memory")
        .select("id").eq("user_id", adminUserId).eq("fact_key", args.fact_key).single();
      if (existing) {
        await db.from("ai_user_memory").update({ fact_value: args.fact_value }).eq("id", existing.id);
      } else {
        await db.from("ai_user_memory").insert({ user_id: adminUserId, fact_key: args.fact_key, fact_value: args.fact_value });
      }
      return { success: true, message: `Memorizzato: ${args.fact_key}` };
    }

    default:
      return { error: `Strumento sconosciuto: ${fn.name}` };
  }
}

// ====================== MAIN SERVER ======================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();

    // Messages can contain multimodal content (text + images)
    // The client sends image_url parts with base64 data URLs for OCR/vision
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY non configurata");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseServiceKey);

    // Extract admin user from JWT
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    let adminUserId = "";
    let adminName = "Admin";

    if (token) {
      const { data: { user } } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      }).auth.getUser();
      if (user) {
        adminUserId = user.id;
        const { data: profile } = await db.from("profiles").select("nome, cognome").eq("user_id", user.id).single();
        if (profile) adminName = `${profile.nome || ""} ${profile.cognome || ""}`.trim() || "Admin";
      }
    }

    // Load admin memories
    let memories: any[] = [];
    if (adminUserId) {
      const { data } = await db.from("ai_user_memory").select("fact_key, fact_value").eq("user_id", adminUserId).order("updated_at", { ascending: false }).limit(30);
      memories = data || [];
    }

    const tenantId = resolveTenantId(context);
    const contextLabel = context === "multyproget" ? "Multyproget S.r.l." : context === "niyol" ? "Niyol S.r.l." : "Multy Niyol";
    const systemPrompt = buildSystemPrompt(adminName, tenantId, contextLabel, memories);

    const conversationMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    let finalContent = "";
    for (let iteration = 0; iteration < 8; iteration++) {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://zolidragon.app",
          "X-Title": "Dark Lemon AI",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: conversationMessages,
          tools,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenRouter error:", response.status, errorText);
        if (response.status === 429) {
          return new Response(JSON.stringify({ content: "⚠️ Troppe richieste, riprova tra poco." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`OpenRouter error: ${response.status}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      if (!choice) throw new Error("No response from model");

      const assistantMsg = choice.message;
      conversationMessages.push(assistantMsg);

      if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
        finalContent = assistantMsg.content || "";
        break;
      }

      for (const toolCall of assistantMsg.tool_calls) {
        let result: any;
        try {
          result = await handleTool(toolCall.function, toolCall.id, db, tenantId, adminUserId);
        } catch (e) {
          result = { error: e instanceof Error ? e.message : "Errore imprevisto" };
        }
        conversationMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
      }
    }

    return new Response(JSON.stringify({ content: finalContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Dark Lemon MN error:", error);
    return new Response(JSON.stringify({
      content: `❌ Errore: ${error instanceof Error ? error.message : "Errore sconosciuto"}`
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
