import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RENTRI_BASE_URL = "https://dragonrifiutisender.onrender.com/api/rentri";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fir_number, societa_id } = await req.json();

    if (!fir_number) {
      return new Response(JSON.stringify({ error: "fir_number is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    console.log("[test-rentri-call] Calling firma-fir with:", JSON.stringify({ fir_number, societa_id }));

    const res = await fetch(`${RENTRI_BASE_URL}/firma-fir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log("[test-rentri-call] Response status:", res.status, "body:", JSON.stringify(data).slice(0, 500));

    return new Response(JSON.stringify({ status: res.status, ok: res.ok, data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[test-rentri-call] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
