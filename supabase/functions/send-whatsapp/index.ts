const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const normalizePhone = (raw: string) => {
  const only = String(raw || "").replace(/[^\d+]/g, "");
  if (!only) return "";
  if (only.startsWith("+")) return only.slice(1);
  if (only.startsWith("00")) return only.slice(2);
  if (only.startsWith("39")) return only;
  return `39${only}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { to, message, tenant_id } = await req.json();
    if (!to || !message) {
      return new Response(JSON.stringify({ error: "Missing 'to' or 'message'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = normalizePhone(to);
    if (!phone) {
      return new Response(JSON.stringify({ error: "Invalid phone number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const TOKEN = Deno.env.get("WHATSAPP_TOKEN");
    const PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (TOKEN && PHONE_ID) {
      const resp = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: { body: String(message).slice(0, 4096) },
        }),
      });
      const payload = await resp.json().catch(() => ({}));
      return new Response(JSON.stringify({ success: resp.ok, provider: "meta", phone, tenant_id, payload }), {
        status: resp.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback deep-link wa.me — always usable without credentials
    const link = `https://wa.me/${phone}?text=${encodeURIComponent(String(message).slice(0, 4096))}`;
    console.log(`[send-whatsapp] wa.me fallback for ${phone}`);
    return new Response(JSON.stringify({
      success: true,
      provider: "wa.me",
      link,
      phone,
      tenant_id,
      hint: "Configura WHATSAPP_TOKEN e WHATSAPP_PHONE_NUMBER_ID per invio automatico",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
