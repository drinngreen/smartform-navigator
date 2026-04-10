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
const DEFAULT_TENANT_ID = "dc2a6046-d9a8-4549-8e45-82367d695ac6"; // Multy Niyol fallback

function resolveTenantId(context?: string): string {
  if (context && TENANT_MAP[context]) return TENANT_MAP[context];
  return DEFAULT_TENANT_ID;
}

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

### profiles
Profili utenti della piattaforma.
Colonne: id (uuid PK), user_id (uuid), nome, cognome, email, ruolo, telefono, tenant_id (uuid), mn_context, avatar_url, created_at, updated_at.

### fir_forms
Formulari di Identificazione Rifiuti compilati dagli autisti.
Colonne: id (uuid PK), user_id, tenant_id, status, numero_fir, produttore_denominazione, destinatario_denominazione, trasportatore_denominazione, codice_eer, stato_fisico, descrizione_rifiuto, quantita, unita_misura, note, created_at, updated_at.

### messages
Messaggi tra utenti.
Colonne: id, sender_id, receiver_id, content, is_read, read_at, created_at.

### social_posts
Post del social network.
Colonne: id, author_id, content, post_type, is_hidden, likes_count, comments_count, created_at.

### social_comments
Commenti ai post social.
Colonne: id, post_id, author_id, content, created_at.

### social_moderation
Azioni di moderazione social.
Colonne: id, moderator_id, target_type, target_id, action, reason, created_at.

### organizations, tenants, intermediari, intermediazioni, impianti, movimenti_impianto, magazzino_deposito, limiti_privati, registro_kg_privati, comunicazioni_log, office_calls
(vedi schema completo nella knowledge base)
`;

function buildSystemPrompt(adminName: string, contextNote: string, memories: any[], tenantId: string, contextLabel: string) {
  const memoryBlock = memories.length > 0
    ? `\n\n### Memoria admin (fatti appresi dalle conversazioni precedenti):\n${memories.map(m => `- ${m.fact_key}: ${m.fact_value}`).join("\n")}`
    : "";

  return `Sei DARK LEMON AI, l'assistente intelligente avanzato per ${contextLabel}, personalizzato per ${adminName}.

Il tenant_id attivo è: ${tenantId}
${contextNote}

**REGOLA CRITICA DI ISOLAMENTO**: Devi SEMPRE filtrare per tenant_id = '${tenantId}' in OGNI query. Non accedere MAI a dati di altri tenant. Questo è fondamentale per la sicurezza e l'isolamento dei dati.

Hai PIENO accesso al database e puoi:
1. **Leggere dati** — interrogare qualsiasi tabella
2. **Scrivere dati** — inserire nuovi record (sempre con tenant_id = '${tenantId}')
3. **Aggiornare dati** — modificare record esistenti (solo del tenant attivo)
4. **Eliminare dati** — rimuovere record (con conferma, solo del tenant attivo)
5. **Social** — leggere feed, moderare post, inviare messaggi
6. **Messaggi** — inviare e leggere messaggi con trasportatori
7. **Memoria** — salvare fatti per ricordarli in futuro
8. **Magazzino** — gestire giacenze, movimenti carico/scarico, cernite

### Tabelle magazzino (aggiuntive):
- **magazzino_giacenze**: id, tenant_id, impianto_id, cer, quantita_kg, ultimo_carico_at, created_at, updated_at
- **movimenti_impianto**: id, tenant_id, impianto_id, cer, tipo_movimento (CARICO/SCARICO), quantita_kg, ruolo_impianto, descrizione, data_movimento, note, created_at
- **cernite**: id, tenant_id, impianto_id, cer_input, quantita_input, descrizione_input, stato, note, created_at
- **cernita_output**: id, cernita_id, cer_output, quantita, tipo_output, descrizione_output

${DB_SCHEMA}

### Regole operative:
- Rispondi SEMPRE in italiano, in modo chiaro e professionale.
- Quando l'utente chiede dati, usa query_database.
- Quando chiede di scrivere, usa write_database.
- Per le query, filtra SEMPRE per tenant_id = '${tenantId}' dove la colonna esiste.
- Quando inserisci dati, includi SEMPRE tenant_id = '${tenantId}'.
- Formatta i dati tabellari in modo leggibile.
- Per operazioni distruttive, chiedi conferma.
- Limita le SELECT a max 50 righe.
${memoryBlock}`;
}

const tools = [
  {
    type: "function",
    function: {
      name: "query_database",
      description: "Esegui una query SELECT sul database. Filtra per tenant_id. Limita a 50 righe.",
      parameters: {
        type: "object",
        properties: {
          sql: { type: "string", description: "Query SQL SELECT" },
          explanation: { type: "string", description: "Spiegazione" }
        },
        required: ["sql", "explanation"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write_database",
      description: "Esegui INSERT/UPDATE/DELETE sul database.",
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
  {
    type: "function",
    function: {
      name: "count_records",
      description: "Conta record in una tabella.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string" },
          filter: { type: "string", description: "WHERE opzionale" }
        },
        required: ["table"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_message_to_user",
      description: "Invia un messaggio diretto a un trasportatore/utente specifico",
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
      description: "Leggi conversazioni con trasportatori/utenti",
      parameters: {
        type: "object",
        properties: {
          partner_id: { type: "string", description: "UUID utente specifico (opzionale)" },
          limit: { type: "number", description: "Numero messaggi (default 20)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_social_feed",
      description: "Leggi i post del social feed (inclusi nascosti per admin)",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Numero post (default 15)" },
          include_hidden: { type: "boolean", description: "Includi post nascosti (default true)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "moderate_post",
      description: "Nascondi o elimina un post social (azione di moderazione)",
      parameters: {
        type: "object",
        properties: {
          post_id: { type: "string", description: "UUID del post" },
          action: { type: "string", enum: ["hide", "delete"], description: "Azione: hide (nasconde) o delete (elimina)" },
          reason: { type: "string", description: "Motivo della moderazione" }
        },
        required: ["post_id", "action", "reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "save_memory",
      description: "Salva un fatto importante per ricordarlo in futuro",
      parameters: {
        type: "object",
        properties: {
          fact_key: { type: "string", description: "Chiave del fatto" },
          fact_value: { type: "string", description: "Valore del fatto" }
        },
        required: ["fact_key", "fact_value"]
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
    const contextNote = context ? `\nContesto attivo: ${contextLabel} (tenant_id: ${tenantId})` : "";
    const systemPrompt = buildSystemPrompt(adminName, contextNote, memories, tenantId, contextLabel);

    const conversationMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

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

      if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
        finalContent = assistantMsg.content || "";
        break;
      }

      for (const toolCall of assistantMsg.tool_calls) {
        const fn = toolCall.function;
        let args: any;
        try {
          args = JSON.parse(fn.arguments);
        } catch {
          conversationMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ error: "JSON non valido" }) });
          continue;
        }

        let result: any;
        try {
          switch (fn.name) {
            case "query_database": {
              const sql = args.sql.trim();
              if (!sql.toUpperCase().startsWith("SELECT")) {
                result = { error: "Solo SELECT permesse. Usa write_database." };
              } else {
                const { data: rows, error } = await db.rpc("exec_sql_readonly", { query: sql }).maybeSingle();
                result = error ? { error: error.message } : rows;
              }
              break;
            }
            case "write_database": {
              const sql = args.sql.trim();
              const upper = sql.toUpperCase();
              if (upper.startsWith("SELECT")) {
                result = { error: "Usa query_database per le SELECT." };
              } else {
                const { data: rows, error } = await db.rpc("exec_sql_write", { query: sql }).maybeSingle();
                result = error ? { error: error.message } : { success: true, data: rows };
              }
              break;
            }
            case "count_records": {
              const table = args.table.replace(/[^a-zA-Z0-9_]/g, "");
              let countQuery = `SELECT COUNT(*) as total FROM ${table} WHERE tenant_id = '${TENANT_ID}'`;
              if (args.filter) countQuery += ` AND (${args.filter})`;
              const { data: rows, error } = await db.rpc("exec_sql_readonly", { query: countQuery }).maybeSingle();
              result = error ? { error: error.message } : rows;
              break;
            }
            case "send_message_to_user": {
              if (!adminUserId) { result = { error: "Admin non autenticato" }; break; }
              const { error } = await db.from("messages").insert({
                sender_id: adminUserId,
                receiver_id: args.receiver_id,
                content: args.content,
              });
              result = error ? { error: error.message } : { success: true, message: "Messaggio inviato!" };
              break;
            }
            case "read_messages": {
              if (!adminUserId) { result = { error: "Admin non autenticato" }; break; }
              let query = db.from("messages")
                .select("id, sender_id, receiver_id, content, is_read, created_at")
                .order("created_at", { ascending: false }).limit(args.limit || 20);
              if (args.partner_id) {
                query = query.or(`and(sender_id.eq.${adminUserId},receiver_id.eq.${args.partner_id}),and(sender_id.eq.${args.partner_id},receiver_id.eq.${adminUserId})`);
              } else {
                query = query.or(`sender_id.eq.${adminUserId},receiver_id.eq.${adminUserId}`);
              }
              const { data: msgs, error } = await query;
              result = error ? { error: error.message } : { messages: msgs || [] };
              break;
            }
            case "read_social_feed": {
              let query = db.from("social_posts")
                .select("id, author_id, content, post_type, is_hidden, likes_count, comments_count, created_at")
                .order("created_at", { ascending: false }).limit(args.limit || 15);
              if (!args.include_hidden) query = query.eq("is_hidden", false);
              const { data: posts, error } = await query;
              if (error) { result = { error: error.message }; break; }
              if (posts && posts.length > 0) {
                const authorIds = [...new Set(posts.map((p: any) => p.author_id))];
                const { data: profiles } = await db.from("profiles").select("user_id, nome, cognome").in("user_id", authorIds);
                const map = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, `${p.nome || ""} ${p.cognome || ""}`.trim()]));
                result = { posts: posts.map((p: any) => ({ ...p, author_name: map[p.author_id] || "Utente" })) };
              } else {
                result = { posts: [] };
              }
              break;
            }
            case "moderate_post": {
              if (!adminUserId) { result = { error: "Admin non autenticato" }; break; }
              if (args.action === "hide") {
                const { error } = await db.from("social_posts").update({ is_hidden: true }).eq("id", args.post_id);
                if (error) { result = { error: error.message }; break; }
              } else if (args.action === "delete") {
                const { error } = await db.from("social_posts").delete().eq("id", args.post_id);
                if (error) { result = { error: error.message }; break; }
              }
              // Log moderation
              await db.from("social_moderation").insert({
                moderator_id: adminUserId,
                target_type: "post",
                target_id: args.post_id,
                action: args.action,
                reason: args.reason,
              });
              result = { success: true, message: `Post ${args.action === "hide" ? "nascosto" : "eliminato"}!` };
              break;
            }
            case "save_memory": {
              if (!adminUserId) { result = { error: "Admin non autenticato" }; break; }
              const { data: existing } = await db.from("ai_user_memory")
                .select("id").eq("user_id", adminUserId).eq("fact_key", args.fact_key).single();
              if (existing) {
                await db.from("ai_user_memory").update({ fact_value: args.fact_value }).eq("id", existing.id);
              } else {
                await db.from("ai_user_memory").insert({ user_id: adminUserId, fact_key: args.fact_key, fact_value: args.fact_value });
              }
              result = { success: true, message: `Memorizzato: ${args.fact_key}` };
              break;
            }
            default:
              result = { error: `Strumento sconosciuto: ${fn.name}` };
          }
        } catch (e) {
          result = { error: e instanceof Error ? e.message : "Errore" };
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
