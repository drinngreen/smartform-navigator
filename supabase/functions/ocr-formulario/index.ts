// OCR Formulario via OpenRouter (Gemini 2.0 Flash Vision)
// Estrae campi FIR da immagini caricate dal Super Admin Global.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OCR_SYSTEM_PROMPT = `Sei un OCR specializzato nell'estrazione di dati da Formulari di Identificazione Rifiuti (FIR) italiani.
Analizza l'immagine fornita ed estrai TUTTI i campi visibili in formato JSON strutturato.

Restituisci SOLO un JSON valido con questa forma:
{
  "fields": [
    { "id": "<nome_campo_normalizzato_snake_case>", "label": "<etichetta umana>", "value": "<valore estratto>" }
  ],
  "raw_text": "<testo grezzo letto dal documento>",
  "confidence": "high" | "medium" | "low"
}

Campi tipici da cercare: numero_fir, data_emissione, produttore_denominazione, produttore_cf,
produttore_indirizzo, destinatario_denominazione, destinatario_cf, destinatario_indirizzo,
trasportatore_denominazione, trasportatore_cf, cer, descrizione_rifiuto, peso_kg, quantita,
operazione_destinatario (R/D), targa_veicolo, data_trasporto, ora_trasporto, annotazioni.

Non inventare valori. Se un campo non è leggibile, omettilo.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY_NEW") ?? Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { image_base64, mime_type, instruction } = await req.json();
    if (!image_base64) {
      return new Response(JSON.stringify({ error: "image_base64 required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const effectiveMime = mime_type || "image/png";
    const dataUrl = `data:${effectiveMime};base64,${image_base64}`;
    const isPdf = effectiveMime.includes("pdf");

    const userPrompt = instruction
      ? `${instruction}\n\nEstrai i campi dal formulario nell'immagine.`
      : "Estrai tutti i campi del formulario dall'immagine.";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://multyproget.lovable.app",
        "X-Title": "Multyproget OCR Formulario",
      },
      body: JSON.stringify({
        model: "amazon/nova-2-lite-v1",
        messages: [
          { role: "system", content: OCR_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              isPdf
                ? { type: "file", file: { filename: "formulario.pdf", file_data: dataUrl } }
                : { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter error:", response.status, errText);
      return new Response(JSON.stringify({ error: "OpenRouter call failed", detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { fields: [], raw_text: content, confidence: "low" };
    }

    return new Response(JSON.stringify({ ok: true, ...parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ocr-formulario error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
