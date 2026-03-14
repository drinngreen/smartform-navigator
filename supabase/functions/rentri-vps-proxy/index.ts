import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VPS_URL = "http://178.104.22.197:3000/invia-operazione";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { cliente, tipo_operazione, payload } = body;

    if (!cliente || !tipo_operazione) {
      return new Response(
        JSON.stringify({ success: false, error: "cliente e tipo_operazione sono obbligatori" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[rentri-vps] Invio a VPS: cliente=${cliente}, tipo=${tipo_operazione}`);

    const upstream = await fetch(VPS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cliente, tipo_operazione, payload: payload ?? {} }),
    });

    const text = await upstream.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    console.log(`[rentri-vps] Risposta VPS: status=${upstream.status}`);

    return new Response(
      JSON.stringify({ success: upstream.ok, status: upstream.status, data }),
      { status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[rentri-vps] ERROR:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
