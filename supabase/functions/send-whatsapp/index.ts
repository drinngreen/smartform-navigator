const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { to, message, tenant_id } = await req.json();
    if (!to || !message) {
      return new Response(JSON.stringify({ error: "Missing 'to' or 'message'" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // TODO: Integrate Meta WhatsApp Business API
    // const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN");
    // const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    console.log(`[send-whatsapp] Would send WhatsApp to ${to}: ${message.substring(0, 50)}...`);

    return new Response(JSON.stringify({ success: false, message: "WhatsApp Business API not configured yet", to, tenant_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
