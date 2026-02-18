import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RAILWAY_HEALTH_URL = "https://dragonrifiutisender-production.up.railway.app/health";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(RAILWAY_HEALTH_URL, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    return new Response(
      JSON.stringify({ ok: res.ok, status: res.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, status: 0, error: (err as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
