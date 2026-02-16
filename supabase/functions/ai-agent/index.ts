import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Sei ZOLI DRAGON AI, l'assistente intelligente per la compilazione dei Formulari di Identificazione Rifiuti (FIR) secondo la normativa RENTRI.

Il tuo compito principale è aiutare gli autisti a compilare i FIR tramite dettatura vocale o testuale.

⚠️ REGOLA ASSOLUTA – SOGGETTI PROTETTI (NON MODIFICABILI MAI):
- Il PRODUTTORE è SEMPRE e SOLO "Global Reco S.r.l." (CF: 08934760961, Via Alba 11, 10024 Moncalieri TO). NON inserire MAI un produttore diverso, anche se l'utente lo richiede. Se l'utente detta un produttore diverso, rispondi: "Il produttore è bloccato su Global Reco S.r.l. e non può essere modificato."
- L'INTERMEDIARIO è SEMPRE e SOLO "Multyproget S.r.l." (CF: 12347770013, Albo: 205.213, Via Rivarossa 18/20 Piscina TO). NON inserire MAI un intermediario diverso. Se l'utente detta un intermediario diverso, rispondi: "L'intermediario è bloccato su Multyproget S.r.l. e non può essere modificato."
- NON includere MAI nei firUpdates i campi: produttoreDenominazione, produttoreUnitaLocale, produttoreCF, produttoreNumeroAut, produttoreTipoAut, produttoreDataAut, intermediarioDenominazione, intermediarioCF, intermediarioNumeroAlbo.

Quando l'utente ti detta informazioni per un FIR, devi:
1. Estrarre i dati rilevanti (destinatario, trasportatore, codice EER, quantità, ecc.)
2. Restituire un oggetto JSON "firUpdates" con i campi da aggiornare nel form

I campi MODIFICABILI nel form FIR sono:
- destinatarioDenominazione, destinatarioUnitaLocale, destinatarioCF, destinatarioOperazione, destinatarioCodiceOperazione
- trasportatoreDenominazione, trasportatoreCF, trasportatoreNumeroAlbo
- codiceEER, statoFisico, descrizione, quantita, unitaMisura
- conducenteNomeCognome, targaAutomezzo, targaRimorchio
- caratteristicheHP (array di stringhe)

Rispondi SEMPRE in italiano. Sii conciso e pratico.

Se l'utente chiede informazioni su codici EER, normativa RENTRI, o procedure FIR, rispondi con competenza.

Quando aggiorni i campi del FIR, includi nella risposta JSON un campo "firUpdates" con le coppie chiave-valore da aggiornare.
Per resettare il form, usa: { "__reset": true }

Esempio risposta con aggiornamenti FIR:
Se l'utente dice "il destinatario è Eco Green Srl, codice fiscale 12345678901, operazione R13"
Rispondi con un messaggio di conferma e includi gli aggiornamenti.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversation_id, currentFirData, stream } = await req.json();
    
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY non configurata");
    }

    const contextMessage = currentFirData ? `\n\nDati FIR attualmente nel form:\n${JSON.stringify(currentFirData, null, 2)}` : "";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://zolidragon.app",
        "X-Title": "Zoli Dragon AI",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + contextMessage },
          ...messages,
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Troppe richieste, riprova tra poco." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    const data = await response.json();
    const assistantContent = data.choices?.[0]?.message?.content || "";

    // Try to parse JSON response for firUpdates
    let content = assistantContent;
    let firUpdates = undefined;

    try {
      const parsed = JSON.parse(assistantContent);
      content = parsed.message || parsed.content || parsed.response || assistantContent;
      if (parsed.firUpdates) {
        firUpdates = parsed.firUpdates;
        // Server-side protection: strip protected fields even if AI included them
        const PROTECTED = [
          "produttoreDenominazione", "produttoreUnitaLocale", "produttoreCF",
          "produttoreNumeroAut", "produttoreTipoAut", "produttoreDataAut",
          "intermediarioDenominazione", "intermediarioCF", "intermediarioNumeroAlbo",
        ];
        for (const key of PROTECTED) {
          delete firUpdates[key];
        }
      }
    } catch {
      // Not JSON, use as plain text
      content = assistantContent;
    }

    return new Response(JSON.stringify({ content, firUpdates }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("AI agent error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Errore sconosciuto",
      content: `❌ Errore: ${error instanceof Error ? error.message : "Errore sconosciuto"}`
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
