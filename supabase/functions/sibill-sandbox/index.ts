import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * SIBILL SANDBOX PROXY — solo ambiente di sviluppo Sibill.
 *
 * ⚠️ Questa funzione NON tocca il database: nessuna scrittura su `fatture`,
 * `anagrafica_aziende_mp`, `fatture_sibill_sync` o qualsiasi altra tabella.
 * Serve unicamente a inoltrare le chiamate di test verso
 * https://integration.dev.sibill.com evitando i blocchi CORS del browser.
 */

const SANDBOX_BASE = "https://integration.dev.sibill.com";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const apiKey = String(body?.api_key || "").trim();
    const path = String(body?.path || "").trim();
    const method = String(body?.method || "POST").toUpperCase();
    const payload = body?.payload ?? null;

    if (!apiKey) return json({ error: "Sandbox API Key mancante" }, 400);
    if (!path.startsWith("/")) return json({ error: "Path non valido (deve iniziare con /)" }, 400);
    if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      return json({ error: "Metodo HTTP non supportato" }, 400);
    }

    const url = `${SANDBOX_BASE}${path}`;
    const started = Date.now();

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        ...(method === "GET" ? {} : { "Content-Type": "application/json" }),
      },
      body: method === "GET" ? undefined : JSON.stringify(payload ?? {}),
    });

    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* risposta non JSON: restituiamo il testo grezzo */
    }

    return json({
      ok: res.ok,
      status: res.status,
      url,
      elapsed_ms: Date.now() - started,
      response: parsed,
    });
  } catch (e) {
    return json({ ok: false, status: 0, error: (e as Error).message }, 200);
  }
});
