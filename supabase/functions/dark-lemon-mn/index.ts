import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TENANT_ID = "dc2a6046-d9a8-4549-8e45-82367d695ac6"; // Multy Niyol

const DB_SCHEMA = `
## Database Schema — Tenant MultyNiyol (dc2a6046-d9a8-4549-8e45-82367d695ac6)

### anagrafica_privati
Anagrafica cittadini privati che conferiscono rifiuti all'impianto.
Colonne: id (uuid PK), tenant_id (uuid), impianto_id (uuid), nome (text), cognome (text), codice_fiscale (text), comune_residenza, numero_tessera, tipo_utenza (default 'domestica'), denominazione, indirizzo, cap, provincia, nazione, email, telefono, cellulare, pec, fax, partita_iva, codice_destinatario, note, attivo (bool), automezzo, targa_automezzo, import_source, import_batch_id, created_at, updated_at.

### privati_conferimenti
Registra ogni conferimento di rifiuti da parte dei privati all'impianto.
Colonne: id (uuid PK), tenant_id (uuid), impianto_id (uuid), privato_id (uuid FK->anagrafica_privati), data_conferimento (date), codice_eer (text), descrizione_rifiuto, quantita_kg (numeric), stato_fisico, note, operatore_id (uuid), numero_ricevuta, created_at, updated_at.

### pagamenti_privati
Pagamenti effettuati dai privati per i conferimenti.
Colonne: id (uuid PK), tenant_id (uuid), privato_id (uuid FK->anagrafica_privati), conferimento_id (uuid FK->privati_conferimenti), importo (numeric), metodo_pagamento, data_pagamento (date), numero_ricevuta, note, created_at.

### ricevute_privati
Ricevute emesse ai privati.
Colonne: id (uuid PK), tenant_id (uuid), conferimento_id (uuid), privato_id (uuid), numero_ricevuta, data_ricevuta, importo, descrizione, created_at.

### storico_ricevute_privati
Archivio storico ricevute importate.
Colonne: id (uuid PK), tenant_id (uuid), numero_doc, data_doc (date), tipo_doc, codice_cliente, ragione_sociale, codice_fiscale, imponibile, totale_doc, quantita_kg, indirizzo, cap, citta, provincia, peso_netto, peso_lordo, metodo_pagamento, descrizione_pagamento, stato_ddt, quantita_fatturabile, created_at.

### rubrica_contatti
Rubrica contatti aziendali.
Colonne: id (uuid PK), tenant_id (uuid), nome, cognome, ruolo, azienda, email, telefono, cellulare, note, mn_context, created_at, updated_at.

### profiles
Profili utenti della piattaforma.
Colonne: id (uuid PK), user_id (uuid), nome, cognome, email, ruolo, telefono, tenant_id (uuid), mn_context, avatar_url, created_at, updated_at.

### fir_forms
Formulari di Identificazione Rifiuti compilati dagli autisti.
Colonne: id (uuid PK), user_id, tenant_id, status, numero_fir, produttore_denominazione, produttore_codice_fiscale, produttore_indirizzo/comune/provincia/cap, destinatario_denominazione/codice_fiscale/indirizzo/comune/provincia/cap/autorizzazione, intermediario_denominazione/codice_fiscale/iscrizione_albo, trasportatore_denominazione/codice_fiscale/iscrizione_albo/conducente/targa_automezzo/targa_rimorchio, codice_eer, stato_fisico, descrizione_rifiuto, quantita, unita_misura, caratteristiche_hp, note, data_partenza, data_arrivo, form_data, allegati, created_at, updated_at, submitted_at, completed_at.

### fir_number_pool
Pool numeri FIR assegnati agli autisti.
Colonne: id, societa_id, user_id, fir_number, status, assigned_at, assigned_by, consumed_at, reserved_by_fir_id, qr_code_data, suspended, created_at.

### impianti
Impianti di trattamento rifiuti.
Colonne: id, tenant_id, organization_id, nome, indirizzo, comune, provincia, codice_rentri, autorizzaz_regione, capacita_m3, tipi_trattamento, coord_geo, created_at, updated_at.

### movimenti_impianto
Movimenti in entrata/uscita dall'impianto.
Colonne: id, tenant_id, impianto_id, tipo_movimento, data_movimento, cer, quantita_kg, quantita_presunta, descrizione_rifiuto, produttore_denominazione, trasportatore_denominazione, destinatario_denominazione, numero_fir, fir_id, ruolo_impianto, esito_accettazione, origine, note, created_at, updated_at.

### magazzino_deposito
Giacenze magazzino per CER e impianto.
Colonne: id, tenant_id, impianto_id, cer, kg_in, kg_out, data_in, data_out, limite_m3, note, created_at, updated_at.

### limiti_privati
Limiti di conferimento per tipo utenza e CER.
Colonne: id, tenant_id, impianto_id, tipo_utenza, cer, limite_conferimento_kg, limite_giornaliero_kg, limite_mensile_kg, limite_annuo_kg, periodo_riferimento, note, created_at, updated_at.

### registro_kg_privati
Registro chilogrammi conferiti dai privati (cumulo).
Colonne: id, tenant_id, privato_id, cer, kg_totale, anno, mese, created_at, updated_at.

### organizations
Organizzazioni (produttori, trasportatori, destinatari, intermediari).
Colonne: id, name, codice_fiscale, partita_iva, indirizzo, comune, provincia, cap, tipo, numero_albo, tipo_autorizzazione, numero_autorizzazione, data_autorizzazione, codice_rentri, tenant_id, created_at, updated_at.

### tenants
Tenant della piattaforma.
Colonne: id, name, slug, created_at.

### comunicazioni_log
Log comunicazioni (SMS, email, WhatsApp).
Colonne: id, tenant_id, canale, destinatario, oggetto, contenuto, stato, contatto_id, risposta_api, created_by, created_at.

### office_calls
Registro chiamate telefoniche.
Colonne: id, user_id, tenant_id, retell_call_id, agent_id, from_number, to_number, direction, status, duration_ms, start_timestamp, end_timestamp, transcript, call_summary, recording_url, call_successful, user_sentiment, disconnection_reason, metadata, fir_id, created_at, updated_at.

### messages
Messaggi tra utenti.
Colonne: id, sender_id, receiver_id, content, is_read, read_at, deleted_by_sender, deleted_by_receiver, created_at, updated_at.

### intermediari
Anagrafica intermediari rifiuti (Cat. 8 Albo Gestori Ambientali).
Colonne: id (uuid PK), tenant_id (uuid), ragione_sociale (text NOT NULL), nome, cognome, codice_fiscale, partita_iva, indirizzo, cap, comune, provincia, nazione, pec, email, telefono, codice_destinatario, numero_iscrizione_albo, categoria_albo, data_iscrizione_albo (date), data_scadenza_albo (date), cer_autorizzati (text[]), note, attivo (bool default true), created_at, updated_at.

### intermediazioni
Operazioni di intermediazione rifiuti — collega produttore, intermediario, trasportatore e destinatario.
Colonne: id (uuid PK), tenant_id (uuid), intermediario_id (uuid FK->intermediari NOT NULL), produttore_id (uuid FK->organizations), destinatario_id (uuid FK->organizations), trasportatore_id (uuid FK->organizations), fir_id (uuid FK->fir), fir_form_id (uuid FK->fir_forms), cer (text), descrizione_rifiuto, quantita_stimata_kg (numeric), quantita_effettiva_kg (numeric), tipo_provvigione (text: 'euro_ton'|'percentuale'|'forfait'), valore_provvigione (numeric), importo_provvigione (numeric), contratto_ref, condizioni_economiche, stato (text: 'bozza'|'in_corso'|'completata'|'annullata'), fatturata (bool), fattura_id (uuid FK->erp_fatture_vendita), note, created_by, created_at, updated_at.

### movimenti_intermediario
Registro cronologico movimenti dell'intermediario (obbligatorio per Cat. 8).
Colonne: id (uuid PK), tenant_id (uuid), intermediario_id (uuid FK->intermediari NOT NULL), intermediazione_id (uuid FK->intermediazioni), data_movimento (date), fir_id (uuid FK->fir), fir_form_id (uuid FK->fir_forms), produttore_id (uuid FK->organizations), destinatario_id (uuid FK->organizations), produttore_denominazione, destinatario_denominazione, cer (text NOT NULL), descrizione_rifiuto, quantita_kg (numeric NOT NULL), numero_fir, tipo_movimento (text default 'intermediazione'), note, created_by, created_at, updated_at.

### listini_intermediazione
Listini provvigioni per intermediari (fee per produttore/CER).
Colonne: id (uuid PK), tenant_id (uuid), intermediario_id (uuid FK->intermediari NOT NULL), produttore_id (uuid FK->organizations), cer, tipo_provvigione (text: 'euro_ton'|'percentuale'|'forfait'), valore_provvigione (numeric NOT NULL), fee_minimo (numeric), descrizione, valido_dal (date), valido_al (date), attivo (bool default true), created_at, updated_at.
`;

const SYSTEM_PROMPT = `Sei DARK LEMON AI, l'assistente intelligente avanzato per il tenant Multy Niyol.
Multy Niyol è il tenant consolidato che gestisce due società gemelle:
- **Multyproget S.r.l.** — società di trasporto e intermediazione rifiuti
- **Niyol S.r.l.** — società gemella con funzioni analoghe

Il tenant_id di Multy Niyol è: ${TENANT_ID}

Hai PIENO accesso al database e puoi:
1. **Leggere dati** — interrogare qualsiasi tabella (anagrafica, conferimenti, FIR, magazzino, ecc.)
2. **Scrivere dati** — inserire nuovi record (contatti in rubrica, privati in anagrafica, conferimenti, ecc.)
3. **Aggiornare dati** — modificare record esistenti
4. **Eliminare dati** — rimuovere record (con conferma)
5. **Compilare moduli** — compilare FIR e altri formulari
6. **Dare informazioni** — rispondere a qualsiasi domanda sui dati in pancia

${DB_SCHEMA}

### Regole operative:
- Rispondi SEMPRE in italiano, in modo chiaro e professionale.
- Quando l'utente chiede dati, usa lo strumento query_database per recuperarli.
- Quando l'utente chiede di aggiungere dati, usa lo strumento write_database.
- Per le query, filtra SEMPRE per tenant_id = '${TENANT_ID}' dove la colonna esiste.
- Quando mostri dati tabellari, formattali in modo leggibile.
- Se una richiesta è ambigua, chiedi chiarimenti.
- Non inventare dati. Se non trovi risultati, dillo chiaramente.
- Per operazioni distruttive (DELETE, UPDATE massivo), chiedi sempre conferma all'utente.
- Limita le SELECT a max 50 righe se non specificato altrimenti.`;

const tools = [
  {
    type: "function",
    function: {
      name: "query_database",
      description: "Esegui una query SELECT sul database per leggere dati. Usa SEMPRE il filtro tenant_id dove applicabile. Limita a 50 righe.",
      parameters: {
        type: "object",
        properties: {
          sql: {
            type: "string",
            description: "Query SQL SELECT da eseguire. DEVE essere una SELECT. Includi LIMIT. Filtra per tenant_id dove possibile."
          },
          explanation: {
            type: "string",
            description: "Breve spiegazione di cosa stai cercando"
          }
        },
        required: ["sql", "explanation"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write_database",
      description: "Esegui operazioni di scrittura sul database (INSERT, UPDATE, DELETE). Per DELETE/UPDATE chiedi sempre conferma.",
      parameters: {
        type: "object",
        properties: {
          sql: {
            type: "string",
            description: "Query SQL INSERT/UPDATE/DELETE da eseguire. Per INSERT, includi RETURNING per mostrare il risultato."
          },
          operation: {
            type: "string",
            enum: ["INSERT", "UPDATE", "DELETE"],
            description: "Tipo di operazione"
          },
          explanation: {
            type: "string",
            description: "Spiegazione di cosa stai facendo e perché"
          }
        },
        required: ["sql", "operation", "explanation"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "count_records",
      description: "Conta i record in una tabella con filtri opzionali. Utile per dare panoramiche rapide.",
      parameters: {
        type: "object",
        properties: {
          table: {
            type: "string",
            description: "Nome della tabella"
          },
          filter: {
            type: "string",
            description: "Condizione WHERE opzionale (es: \"attivo = true\")"
          }
        },
        required: ["table"]
      }
    }
  }
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY non configurata");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseServiceKey);

    const contextNote = context ? `\n\nContesto attivo: ${context === "multyproget" ? "Multyproget S.r.l." : "Niyol S.r.l."}` : "";

    // Build conversation with tools
    const conversationMessages = [
      { role: "system", content: SYSTEM_PROMPT + contextNote },
      ...messages,
    ];

    // Iterative tool-calling loop (max 5 iterations)
    let finalContent = "";
    for (let iteration = 0; iteration < 5; iteration++) {
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

      // If no tool calls, we're done
      if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
        finalContent = assistantMsg.content || "";
        break;
      }

      // Process tool calls
      for (const toolCall of assistantMsg.tool_calls) {
        const fn = toolCall.function;
        let args: any;
        try {
          args = JSON.parse(fn.arguments);
        } catch {
          conversationMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: "Parametri JSON non validi" }),
          });
          continue;
        }

        let result: any;

        try {
          if (fn.name === "query_database") {
            // Validate it's a SELECT
            const sql = args.sql.trim();
            if (!sql.toUpperCase().startsWith("SELECT")) {
              result = { error: "Solo query SELECT sono permesse con questo strumento. Usa write_database per INSERT/UPDATE/DELETE." };
            } else {
              const { data: rows, error } = await db.rpc("exec_sql_readonly", { query: sql }).maybeSingle();
              if (error) {
                // Fallback: try direct query via postgrest
                const { data: directRows, error: directError } = await db.from("").select().limit(0); // won't work, use raw
                result = { error: error.message };
              } else {
                result = rows;
              }
            }
          } else if (fn.name === "write_database") {
            const sql = args.sql.trim();
            const upper = sql.toUpperCase();
            if (upper.startsWith("SELECT")) {
              result = { error: "Usa query_database per le SELECT." };
            } else {
              // Execute via raw SQL
              const { data: rows, error } = await db.rpc("exec_sql_write", { query: sql }).maybeSingle();
              if (error) {
                result = { error: error.message };
              } else {
                result = { success: true, data: rows, operation: args.operation };
              }
            }
          } else if (fn.name === "count_records") {
            const table = args.table.replace(/[^a-zA-Z0-9_]/g, ""); // sanitize
            let countQuery = `SELECT COUNT(*) as total FROM ${table} WHERE tenant_id = '${TENANT_ID}'`;
            if (args.filter) {
              countQuery += ` AND (${args.filter})`;
            }
            const { data: rows, error } = await db.rpc("exec_sql_readonly", { query: countQuery }).maybeSingle();
            if (error) {
              result = { error: error.message };
            } else {
              result = rows;
            }
          } else {
            result = { error: `Strumento sconosciuto: ${fn.name}` };
          }
        } catch (e) {
          result = { error: e instanceof Error ? e.message : "Errore sconosciuto durante l'esecuzione" };
        }

        conversationMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
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
