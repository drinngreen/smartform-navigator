import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fir_number, societa_id } = await req.json();

    const payload = {
      societaId: societa_id || "global",
      payloadFir: {
        numero_fir: fir_number,
        produttore_denominazione: "Global Reco S.r.l.",
        produttore_codice_fiscale: "08934760961",
        produttore_indirizzo: "Via Alba 11",
        produttore_comune: "Moncalieri",
        produttore_provincia: "TO",
        produttore_cap: "10024",
        trasportatore_denominazione: "Global Reco S.r.l.",
        trasportatore_codice_fiscale: "08934760961",
        trasportatore_iscrizione_albo: "TO/00456",
        trasportatore_targa_automezzo: "FH123AB",
        trasportatore_conducente: "Mario Rossi",
        destinatario_denominazione: "Impianto Test S.r.l.",
        destinatario_codice_fiscale: "12345678901",
        destinatario_indirizzo: "Via Roma 1",
        destinatario_autorizzazione: "AUT-001",
        codice_eer: "170405",
        descrizione_rifiuto: "Ferro e acciaio",
        stato_fisico: "solido",
        quantita: 1000,
        unita_misura: "kg",
        data_partenza: new Date().toISOString().split("T")[0],
      },
      isSandbox: false,
    };

    console.log("[test-rentri] Payload:", JSON.stringify(payload).slice(0, 300));

    const res = await fetch("https://dragonrifiutisender.onrender.com/api/rentri/firma-fir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const contentType = res.headers.get("content-type") || "";
    let body: string;
    if (contentType.includes("json")) {
      const json = await res.json();
      body = JSON.stringify(json);
    } else {
      const text = await res.text();
      body = text.slice(0, 1000);
    }

    console.log("[test-rentri] Status:", res.status, "Content-Type:", contentType);
    console.log("[test-rentri] Body:", body.slice(0, 800));

    return new Response(JSON.stringify({ status: res.status, contentType, body }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[test-rentri] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
