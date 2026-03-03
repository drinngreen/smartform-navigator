// Edge function: invio email via SendGrid per il tenant Global Reco
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GLOBAL_RECO_TENANT_ID = "167d07ad-9184-484e-85a6-da5ceafa42a3";
const FROM_EMAIL = "globalreco@zoli.live";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verifica autenticazione e tenant
    const authHeader = req.headers.get("authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Decodifica JWT per ottenere user_id
    const token = authHeader.replace("Bearer ", "");
    let userId: string | null = null;

    if (token && token !== serviceKey) {
      // Verifica utente via Supabase auth
      const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${token}`, apikey: serviceKey },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        userId = userData.id;
      }
    }

    // Verifica tenant Global Reco
    if (userId) {
      const profileRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}&select=tenant_id`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
      );
      const profiles = await profileRes.json();
      if (!profiles?.[0] || profiles[0].tenant_id !== GLOBAL_RECO_TENANT_ID) {
        return new Response(JSON.stringify({ error: "Accesso riservato a Global Reco" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { to, subject, html, firId, impiantoId, category } = await req.json();
    if (!to) {
      return new Response(JSON.stringify({ error: "Campo 'to' obbligatorio" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sendgridKey = Deno.env.get("SENDGRID_API_KEY_ZOLI");
    if (!sendgridKey) {
      return new Response(JSON.stringify({ error: "SENDGRID_API_KEY_ZOLI non configurata" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Invio via SendGrid REST API
    let status = "sent";
    let errorMessage: string | null = null;

    try {
      const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: FROM_EMAIL, name: "Global Reco" },
          subject: subject || "(nessun oggetto)",
          content: [{ type: "text/html", value: html || "<p>—</p>" }],
        }),
      });

      if (!sgRes.ok) {
        const errBody = await sgRes.text();
        status = "error";
        errorMessage = `SendGrid ${sgRes.status}: ${errBody}`;
        console.error("[send-global-email] SendGrid error:", errorMessage);
      }
    } catch (sgErr: any) {
      status = "error";
      errorMessage = sgErr.message;
      console.error("[send-global-email] Fetch error:", sgErr);
    }

    // Salva in outbox
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/emails_global_outbox`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        to_address: to,
        from_address: FROM_EMAIL,
        subject: subject || null,
        body_html: html || null,
        status,
        error_message: errorMessage,
        category: category || "manuale",
        fir_id: firId || null,
        impianto_id: impiantoId || null,
      }),
    });

    if (!insertRes.ok) {
      console.error("[send-global-email] Outbox insert error:", await insertRes.text());
    }

    return new Response(JSON.stringify({ ok: status === "sent", status, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[send-global-email] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
