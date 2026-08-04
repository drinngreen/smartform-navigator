import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

// Webhook pubblico chiamato da Sibill: eventi 'document.updated' e 'flow.updated'
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const payload = await req.json();
    const event = payload?.event;
    const data = payload?.data || {};

    if (event === "document.updated") {
      const documentId = data?.id;
      if (!documentId) return new Response("ok", { headers: corsHeaders });

      const flow = Array.isArray(data.flows) && data.flows.length ? data.flows[0] : null;

      await admin
        .from("fatture_sibill_sync")
        .update({
          document_status: data.status || null,
          delivery_status: data.delivery_status || null,
          sync_status: "sincronizzata",
          payment_status: flow?.payment_status || null,
          payment_method: flow?.payment_method || null,
          payment_date: flow?.payment_date || null,
          raw_response: data,
          last_sync_at: new Date().toISOString(),
        })
        .eq("sibill_document_id", documentId);
    } else if (event === "flow.updated") {
      const documentId = data?.document_id;
      if (!documentId) return new Response("ok", { headers: corsHeaders });

      await admin
        .from("fatture_sibill_sync")
        .update({
          payment_status: data.payment_status || null,
          payment_method: data.payment_method || null,
          payment_date: data.payment_date || null,
          sync_status: data.payment_status === "PAID" ? "incassata" : "sincronizzata",
          last_sync_at: new Date().toISOString(),
        })
        .eq("sibill_document_id", documentId);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sibill-webhook error", e);
    // Rispondiamo 200 per evitare retry infiniti su payload non gestiti
    return new Response(JSON.stringify({ received: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
