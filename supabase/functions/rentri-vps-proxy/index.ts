import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleRentriProxy, corsHeaders } from "./handler.ts";

serve(async (req) => {
  try {
    return await handleRentriProxy(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[rentri-vps] ERROR:", message);
    return new Response(
      JSON.stringify({ success: false, status: 500, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
