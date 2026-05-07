// Super Admin Global Chat: orchestratore per Global Reco.
// Usa OpenRouter Gemini 2.0 Flash. Restituisce sia testo che field-fill suggestions.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Sei "Comando Global Reco", l'assistente Super Admin di Global Reco.
Operi esclusivamente sul tenant Global Reco (167d07ad-9184-484e-85a6-da5ceafa42a3).

Compiti principali:
1) Compilare formulari FIR a destra (modulo alternativo trasparente sopra il formulario reale).
2) Suggerire valori per i campi del form, restituendoli nel JSON \`field_updates\`.
3) Rispondere all'admin nel campo \`reply\` in italiano, conciso e operativo.
4) Non inventare dati anagrafici: se mancano, chiedi conferma o di selezionare l'utente app dalla lista.

Output OBBLIGATORIO: SOLO JSON valido così:
{
  "reply": "<testo da mostrare in chat>",
  "field_updates": [
    { "id": "<id_campo_o_label>", "value": "<valore>" }
  ],
  "actions": [ { "type": "info" | "warning", "message": "..." } ]
}

Se non ci sono aggiornamenti campi, lascia field_updates: [].`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, form_fields, selected_user, ocr_context } = await req.json();

    const contextBlock = `
### Contesto corrente
- Utente app selezionato: ${selected_user ? JSON.stringify(selected_user) : "nessuno"}
- Campi attualmente nel form (id, label, valore corrente):
${(form_fields || []).slice(0, 120).map((f: any) => `  • ${f.id} [${f.label}] = ${JSON.stringify(f.value)}`).join("\n") || "  (nessun campo registrato)"}
${ocr_context ? `\n- Ultimo OCR:\n${JSON.stringify(ocr_context).slice(0, 4000)}` : ""}
`;

    const fullMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: contextBlock },
      ...(messages || []),
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://multyproget.lovable.app",
        "X-Title": "Comando Global Reco",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: fullMessages,
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: "OpenRouter call failed", detail: errText }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try { parsed = JSON.parse(content); }
    catch { parsed = { reply: content, field_updates: [], actions: [] }; }

    return new Response(JSON.stringify({ ok: true, ...parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
