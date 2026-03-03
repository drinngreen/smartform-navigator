// Edge function: webhook receiver per email in arrivo (SendGrid Inbound Parse o simile)
// NOTA: IMAP diretto non è supportato in Deno Edge Functions (no TCP raw).
// Questa function riceve email parsate via webhook POST.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Accetta sia JSON (chiamata manuale) che form-data (SendGrid Inbound Parse)
    let emails: Array<{
      message_id: string;
      from_address: string;
      to_address: string;
      subject?: string;
      body_text?: string;
      body_html?: string;
      received_at: string;
    }> = [];

    const ct = req.headers.get("content-type") || "";

    if (ct.includes("application/json")) {
      const body = await req.json();
      emails = Array.isArray(body.emails) ? body.emails : body.email ? [body.email] : [];
    } else if (ct.includes("multipart/form-data") || ct.includes("application/x-www-form-urlencoded")) {
      // SendGrid Inbound Parse format
      const formData = await req.formData();
      const envelope = JSON.parse(formData.get("envelope") as string || "{}");
      emails = [{
        message_id: (formData.get("headers") as string || "").match(/Message-ID:\s*<([^>]+)>/i)?.[1] || crypto.randomUUID(),
        from_address: envelope.from || (formData.get("from") as string || ""),
        to_address: envelope.to?.[0] || (formData.get("to") as string || ""),
        subject: formData.get("subject") as string || undefined,
        body_text: formData.get("text") as string || undefined,
        body_html: formData.get("html") as string || undefined,
        received_at: new Date().toISOString(),
      }];
    }

    if (emails.length === 0) {
      return new Response(JSON.stringify({ imported: 0, message: "Nessuna email ricevuta" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let imported = 0;
    for (const email of emails) {
      const res = await fetch(`${supabaseUrl}/rest/v1/emails_global_inbox`, {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          message_id: email.message_id,
          from_address: email.from_address,
          to_address: email.to_address || "globalreco@zoli.live",
          subject: email.subject || null,
          body_text: email.body_text || null,
          body_html: email.body_html || null,
          received_at: email.received_at || new Date().toISOString(),
          is_read: false,
        }),
      });

      if (res.ok) imported++;
      else {
        const errText = await res.text();
        // Ignora duplicati (message_id unique constraint)
        if (!errText.includes("duplicate")) {
          console.error("[sync-global-inbox] Insert error:", errText);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, imported }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[sync-global-inbox] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
