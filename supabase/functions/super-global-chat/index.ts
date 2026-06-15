// Super Admin Global Chat - Comando Global Reco
// AI con tool calling per CRUD completo sul tenant Global Reco.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GLOBAL_TENANT_ID = "167d07ad-9184-484e-85a6-da5ceafa42a3";

const SYSTEM_PROMPT = `Sei "Comando Global Reco", l'assistente AI Super Admin di Global Reco.
Operi esclusivamente sul tenant Global Reco (id: ${GLOBAL_TENANT_ID}).

Hai pieno potere di CREARE, LEGGERE, MODIFICARE, INVIARE qualsiasi dato di Global Reco.
Utilizza i tool a disposizione (db_read, db_write, invoke_edge_function, fill_form_fields).

REGOLE D'ORO:
- Includi SEMPRE il filtro "tenant_id = '${GLOBAL_TENANT_ID}'" in ogni query SQL.
- Non operare MAI su altri tenant (multyproget 77ec…, niyol 819c…).
- Per operazioni distruttive (DELETE/UPDATE massivi, invii email reali, vidimazione FIR) chiedi conferma esplicita prima di procedere.
- Le tabelle principali: profiles, fir_forms, fir_number_pool, anagrafiche_aziendali, rubrica_contatti,
  email_messages, office_calls, notifications, user_roles, social_posts, impianti_accounts, movimenti_impianto.
- Per inviare email usa edge function: send-global-email
- Per chiamate/SMS/WhatsApp: send-sms, send-whatsapp, retell-create-call
- Per FIR RENTRI: rentri-vidima-fir, rentri-firma-fir
- Per creare utenti: bootstrap-superglobal o admin-create-user

Quando vuoi compilare il formulario a destra usa fill_form_fields.
Rispondi all'admin in italiano, conciso, professionale.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "db_read",
      description: "Esegue query SELECT sul database. Includere SEMPRE filtro tenant_id Global Reco.",
      parameters: {
        type: "object",
        properties: {
          sql: { type: "string", description: "SELECT statement" },
        },
        required: ["sql"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_write",
      description: "Esegue INSERT/UPDATE/DELETE. Includere SEMPRE filtro tenant_id. Per UPDATE/DELETE specifica WHERE.",
      parameters: {
        type: "object",
        properties: {
          sql: { type: "string", description: "INSERT/UPDATE/DELETE statement con RETURNING se utile" },
        },
        required: ["sql"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "invoke_edge_function",
      description: "Invoca un'edge function Supabase (es: send-global-email, send-sms, rentri-vidima-fir).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          payload: { type: "object" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fill_form_fields",
      description: "Compila campi nel formulario alternativo a destra.",
      parameters: {
        type: "object",
        properties: {
          updates: {
            type: "array",
            items: {
              type: "object",
              properties: { id: { type: "string" }, value: { type: "string" } },
              required: ["id", "value"],
            },
          },
        },
        required: ["updates"],
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY_NEW") ?? Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { messages, form_fields, selected_user, ocr_context } = await req.json();

    const contextBlock = `### Contesto runtime
- Tenant: Global Reco (${GLOBAL_TENANT_ID})
- Utente app selezionato: ${selected_user ? JSON.stringify(selected_user) : "nessuno"}
- Campi formulario (id [label] = valore):
${(form_fields || []).slice(0, 80).map((f: any) => `  • ${f.id} [${f.label}] = ${JSON.stringify(f.value)}`).join("\n") || "  (nessuno)"}
${ocr_context ? `\n- Ultimo OCR:\n${JSON.stringify(ocr_context).slice(0, 3000)}` : ""}`;

    const conv: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: contextBlock },
      ...(messages || []),
    ];

    const collectedFieldUpdates: any[] = [];
    const toolTrace: any[] = [];

    // Tool-calling loop (max 6 turns)
    for (let i = 0; i < 6; i++) {
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://multyproget.lovable.app",
          "X-Title": "Comando Global Reco",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: conv,
          tools: TOOLS,
          tool_choice: "auto",
          temperature: 0.2,
        }),
      });

      if (!r.ok) {
        const errText = await r.text();
        return new Response(JSON.stringify({ error: "OpenRouter call failed", detail: errText }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await r.json();
      const msg = data?.choices?.[0]?.message;
      if (!msg) break;
      conv.push(msg);

      const toolCalls = msg.tool_calls || [];
      if (!toolCalls.length) {
        return new Response(
          JSON.stringify({
            ok: true,
            reply: msg.content || "(nessuna risposta)",
            field_updates: collectedFieldUpdates,
            tool_trace: toolTrace,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      for (const tc of toolCalls) {
        const fname = tc.function?.name;
        let args: any = {};
        try { args = JSON.parse(tc.function?.arguments || "{}"); } catch {}
        let result: any;
        try {
          if (fname === "db_read") {
            const { data: d, error } = await supa.rpc("exec_sql_readonly", { query: args.sql });
            result = error ? { error: error.message } : { rows: d };
          } else if (fname === "db_write") {
            const sqlUpper = (args.sql || "").toUpperCase();
            if (!sqlUpper.includes("TENANT_ID") && !sqlUpper.includes("USER_ROLES") && !sqlUpper.includes("FIR_NUMBER_POOL")) {
              result = { error: "BLOCCATO: query write deve contenere filtro tenant_id" };
            } else {
              const { data: d, error } = await supa.rpc("exec_sql_write", { query: args.sql });
              result = error ? { error: error.message } : { result: d };
            }
          } else if (fname === "invoke_edge_function") {
            const { data: d, error } = await supa.functions.invoke(args.name, { body: args.payload || {} });
            result = error ? { error: error.message } : { response: d };
          } else if (fname === "fill_form_fields") {
            collectedFieldUpdates.push(...(args.updates || []));
            result = { filled: (args.updates || []).length };
          } else {
            result = { error: `Unknown tool: ${fname}` };
          }
        } catch (e) {
          result = { error: e instanceof Error ? e.message : String(e) };
        }
        toolTrace.push({ tool: fname, args, result });
        conv.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result).slice(0, 8000),
        });
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      reply: "Loop tool calling terminato senza risposta finale.",
      field_updates: collectedFieldUpdates,
      tool_trace: toolTrace,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
