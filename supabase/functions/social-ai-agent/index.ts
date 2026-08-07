import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildSystemPrompt(userName: string, memories: any[]) {
  const memoryBlock = memories.length > 0
    ? `\n\n### Memoria utente:\n${memories.map(m => `- ${m.fact_key}: ${m.fact_value}`).join("\n")}`
    : "";

  return `Sei l'Assistente Social di Global Reco, dedicato alla community dei trasportatori.
Il tuo nome è Social Dragon AI e aiuti ${userName} a interagire con il social network.

## Le tue capacità (usa i tool forniti):
1. **Post**: Pubblicare post nel feed (general, safety_tip, announcement)
2. **Feed**: Leggere gli ultimi post della community
3. **Like**: Mettere like ai post
4. **Commenti**: Leggere e scrivere commenti
5. **Messaggi**: Inviare e leggere messaggi diretti
6. **Membri**: Cercare membri della community
7. **Notifiche**: Leggere le notifiche
8. **Memoria**: Salvare fatti importanti sull'utente

## Regole:
- Rispondi SEMPRE in italiano, amichevole e conciso
- Usa i tool per azioni concrete
- Sei un assistente social: aiuta a scrivere post efficaci, consiglia engagement
- Puoi suggerire safety tips e best practice per trasportatori
- NON hai accesso a FIR, formulari o dati gestionali
${memoryBlock}`;
}

const tools = [
  {
    type: "function",
    function: {
      name: "send_social_post",
      description: "Pubblica un post nel social feed della community",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "Testo del post" },
          post_type: { type: "string", enum: ["general", "safety_tip", "announcement"], description: "Tipo post" }
        },
        required: ["content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_social_feed",
      description: "Leggi gli ultimi post dal social feed",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Numero post (default 10)" },
          post_type: { type: "string", description: "Filtra per tipo: general, safety_tip, announcement" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "like_post",
      description: "Metti like a un post",
      parameters: {
        type: "object",
        properties: {
          post_id: { type: "string", description: "ID del post" }
        },
        required: ["post_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_comment",
      description: "Aggiungi un commento a un post",
      parameters: {
        type: "object",
        properties: {
          post_id: { type: "string", description: "ID del post" },
          content: { type: "string", description: "Testo del commento" }
        },
        required: ["post_id", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_comments",
      description: "Leggi i commenti di un post",
      parameters: {
        type: "object",
        properties: {
          post_id: { type: "string", description: "ID del post" },
          limit: { type: "number", description: "Numero commenti (default 20)" }
        },
        required: ["post_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_dm",
      description: "Invia un messaggio diretto a un membro",
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
      name: "read_dms",
      description: "Leggi i messaggi diretti recenti",
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
      name: "search_members",
      description: "Cerca membri della community per nome o cognome",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Nome o cognome da cercare" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_notifications",
      description: "Leggi le notifiche",
      parameters: {
        type: "object",
        properties: {
          unread_only: { type: "boolean", description: "Solo non lette (default true)" },
          limit: { type: "number", description: "Numero notifiche (default 10)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "save_memory",
      description: "Salva un fatto importante sull'utente per ricordarlo in futuro",
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

async function executeTool(db: any, userId: string, toolName: string, args: any): Promise<any> {
  switch (toolName) {
    case "send_social_post": {
      const { data, error } = await db.from("social_posts").insert({
        author_id: userId,
        content: args.content,
        post_type: args.post_type || "general",
      }).select("id").single();
      if (error) return { error: error.message };
      return { success: true, post_id: data.id, message: "Post pubblicato!" };
    }

    case "read_social_feed": {
      let query = db.from("social_posts")
        .select("id, content, post_type, created_at, likes_count, comments_count, author_id")
        .eq("is_hidden", false).order("created_at", { ascending: false }).limit(args.limit || 10);
      if (args.post_type) query = query.eq("post_type", args.post_type);
      const { data, error } = await query;
      if (error) return { error: error.message };
      if (data && data.length > 0) {
        const authorIds = [...new Set(data.map((p: any) => p.author_id))];
        const { data: profiles } = await db.from("profiles").select("user_id, nome, cognome").in("user_id", authorIds);
        const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, `${p.nome || ""} ${p.cognome || ""}`.trim()]));
        return { posts: data.map((p: any) => ({ ...p, author_name: profileMap[p.author_id] || "Utente" })) };
      }
      return { posts: data || [] };
    }

    case "like_post": {
      const { error } = await db.from("social_likes").insert({ post_id: args.post_id, user_id: userId });
      if (error) {
        if (error.code === "23505") return { message: "Hai già messo like a questo post" };
        return { error: error.message };
      }
      return { success: true, message: "Like aggiunto!" };
    }

    case "add_comment": {
      const { data, error } = await db.from("social_comments").insert({
        post_id: args.post_id, author_id: userId, content: args.content
      }).select("id").single();
      if (error) return { error: error.message };
      return { success: true, comment_id: data.id, message: "Commento aggiunto!" };
    }

    case "read_comments": {
      const { data, error } = await db.from("social_comments")
        .select("id, content, author_id, created_at")
        .eq("post_id", args.post_id).order("created_at", { ascending: true }).limit(args.limit || 20);
      if (error) return { error: error.message };
      if (data && data.length > 0) {
        const authorIds = [...new Set(data.map((c: any) => c.author_id))];
        const { data: profiles } = await db.from("profiles").select("user_id, nome, cognome").in("user_id", authorIds);
        const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, `${p.nome || ""} ${p.cognome || ""}`.trim()]));
        return { comments: data.map((c: any) => ({ ...c, author_name: profileMap[c.author_id] || "Utente" })) };
      }
      return { comments: data || [] };
    }

    case "send_dm": {
      const { error } = await db.from("messages").insert({
        sender_id: userId, receiver_id: args.receiver_id, content: args.content,
      });
      if (error) return { error: error.message };
      return { success: true, message: "Messaggio inviato!" };
    }

    case "read_dms": {
      let query = db.from("messages")
        .select("id, sender_id, receiver_id, content, is_read, created_at")
        .order("created_at", { ascending: false }).limit(args.limit || 20);
      if (args.partner_id) {
        query = query.or(`and(sender_id.eq.${userId},receiver_id.eq.${args.partner_id}),and(sender_id.eq.${args.partner_id},receiver_id.eq.${userId})`);
      } else {
        query = query.or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
      }
      const { data, error } = await query;
      if (error) return { error: error.message };
      return { messages: data || [] };
    }

    case "search_members": {
      const q = `%${args.query}%`;
      const { data, error } = await db.from("profiles")
        .select("user_id, nome, cognome")
        .eq("tenant_id", "167d07ad-9184-484e-85a6-da5ceafa42a3")
        .or(`nome.ilike.${q},cognome.ilike.${q}`)
        .limit(10);
      if (error) return { error: error.message };
      return { members: data || [] };
    }

    case "get_notifications": {
      let query = db.from("notifications").select("id, type, title, body, is_read, created_at")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(args.limit || 10);
      if (args.unread_only !== false) query = query.eq("is_read", false);
      const { data, error } = await query;
      if (error) return { error: error.message };
      return { notifications: data || [] };
    }

    case "save_memory": {
      const { data: existing } = await db.from("ai_user_memory")
        .select("id").eq("user_id", userId).eq("fact_key", args.fact_key).single();
      if (existing) {
        await db.from("ai_user_memory").update({ fact_value: args.fact_value }).eq("id", existing.id);
      } else {
        await db.from("ai_user_memory").insert({ user_id: userId, fact_key: args.fact_key, fact_value: args.fact_value });
      }
      return { success: true, message: `Memorizzato: ${args.fact_key} = ${args.fact_value}` };
    }

    default:
      return { error: `Tool sconosciuto: ${toolName}` };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ error: "Richiesta non valida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { messages } = body as any;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 80) {
      return new Response(JSON.stringify({ error: "Formato messaggi non valido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    for (const m of messages) {
      if (!m || typeof m !== "object" || !["user", "assistant", "system", "tool"].includes(m.role)) {
        return new Response(JSON.stringify({ error: "Formato messaggi non valido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (typeof m.content === "string" && m.content.length > 20000) {
        return new Response(JSON.stringify({ error: "Messaggio troppo lungo" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }


    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY_NEW") ?? Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY non configurata");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseServiceKey);

    // Extract user from JWT
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    let userId = "";
    let userName = "Ospite";

    if (token) {
      const { data: { user } } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      }).auth.getUser();
      if (user) {
        userId = user.id;
        const { data: profile } = await db.from("profiles").select("nome, cognome").eq("user_id", user.id).single();
        if (profile) {
          userName = `${profile.nome || ""} ${profile.cognome || ""}`.trim() || "Ospite";
        }
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Non autenticato" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load user memories
    const { data: memData } = await db.from("ai_user_memory").select("fact_key, fact_value").eq("user_id", userId).order("updated_at", { ascending: false }).limit(30);
    const memories = memData || [];

    const systemPrompt = buildSystemPrompt(userName, memories);

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
          "X-Title": "Social Dragon AI",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: conversationMessages,
          tools,
          temperature: 0.4,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenRouter error:", response.status, errorText);
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

        const result = await executeTool(db, userId, fn.name, args);
        conversationMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
      }
    }

    return new Response(JSON.stringify({ content: finalContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Social AI Agent error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
