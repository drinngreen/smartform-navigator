const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { to, subject, body, tenant_id } = await req.json();
    if (!to || !body) {
      return new Response(JSON.stringify({ error: "Missing 'to' or 'body'" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // TODO: Integrate Resend or other email provider
    // const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    console.log(`[send-email] Would send email to ${to}: ${subject || "(no subject)"}`);

    return new Response(JSON.stringify({ success: false, message: "Email provider not configured yet", to, tenant_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
