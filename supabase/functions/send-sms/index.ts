import "npm:@anthropic-ai/sdk@0.39.0";

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

    // TODO: Integrate SMS provider (Twilio, Vonage, Infobip, etc.)
    // const SMS_API_KEY = Deno.env.get("SMS_API_KEY");

    console.log(`[send-sms] Would send SMS to ${to}: ${message.substring(0, 50)}...`);

    return new Response(JSON.stringify({ success: false, message: "SMS provider not configured yet", to, tenant_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
