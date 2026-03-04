import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NGROK_BASE = (Deno.env.get("RENTRI_API_URL") || "https://hierurgical-undefinable-magdalene.ngrok-free.dev").replace(/\/$/, "");
const ALLOWED_ENDPOINTS = new Set([
  "/api/rentri/action/emissione",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { endpoint, payload } = body;

    console.log("[rentri-proxy] endpoint:", endpoint, "NGROK_BASE:", NGROK_BASE);

    if (!endpoint || !ALLOWED_ENDPOINTS.has(endpoint)) {
      return new Response(
        JSON.stringify({ error: "endpoint non consentito", requested: endpoint }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = `${NGROK_BASE}${endpoint}`;
    console.log("[rentri-proxy] calling:", url);

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify(payload ?? {}),
    });

    console.log("[rentri-proxy] upstream status:", upstream.status);

    const text = await upstream.text();
    let data: unknown = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    return new Response(JSON.stringify(data), {
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[rentri-proxy] ERROR:", message, stack);
    return new Response(
      JSON.stringify({ error: message, detail: stack }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});