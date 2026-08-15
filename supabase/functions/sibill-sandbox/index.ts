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

const mockId = (prefix: string) =>
  `${prefix}_mock_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

/** Risposte simulate con la stessa forma di quelle reali Sibill. */
function mockResponse(path: string, method: string, payload: any, scenario: string) {
  if (scenario === "auth_error") {
    return { status: 401, body: { errors: [{ title: "Unauthorized", detail: "Chiave API Sibill non valida o mancante" }] } };
  }
  if (scenario === "validation_error") {
    return {
      status: 422,
      body: { errors: [{ title: "Unprocessable Entity", detail: "Campo 'vat_number' non valido per il paese IT", source: { pointer: "/vat_number" } }] },
    };
  }
  if (scenario === "rate_limit") {
    return { status: 429, body: { errors: [{ title: "Too Many Requests", detail: "Limite di richieste superato, riprova tra 60 secondi" }] } };
  }

  const isCounterpart = path.includes("/counterparts");
  const now = new Date().toISOString();
  if (isCounterpart) {
    return {
      status: 201,
      body: {
        data: {
          id: mockId("cp"),
          company_name: payload?.company_name ?? null,
          vat_number: payload?.vat_number ?? null,
          tax_number: payload?.tax_number ?? null,
          country: payload?.country ?? "IT",
          identity_type: payload?.identity_type ?? "COMPANY",
          created_at: now,
          mock: true,
        },
      },
    };
  }
  return {
    status: 201,
    body: {
      data: {
        id: mockId("doc"),
        number: payload?.number ?? null,
        date: payload?.date ?? now.slice(0, 10),
        format: payload?.format ?? "FPA12",
        document_type: payload?.document_type ?? "TD01",
        status: "ISSUED",
        delivery_status: "SENT",
        payment_status: "UNPAID",
        total_amount: payload?.total_amount ?? null,
        created_at: now,
        mock: true,
      },
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const apiKey = String(body?.api_key || "").trim();
    const path = String(body?.path || "").trim();
    const method = String(body?.method || "POST").toUpperCase();
    const payload = body?.payload ?? null;
    const mock = body?.mock === true;
    const scenario = String(body?.mock_scenario || "success");

    if (!mock && !apiKey) return json({ error: "Sandbox API Key mancante" }, 400);
    if (!path.startsWith("/")) return json({ error: "Path non valido (deve iniziare con /)" }, 400);
    if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      return json({ error: "Metodo HTTP non supportato" }, 400);
    }

    if (mock) {
      const started = Date.now();
      await new Promise((r) => setTimeout(r, 250 + Math.floor(Math.random() * 350)));
      const sim = mockResponse(path, method, payload, scenario);
      return json({
        ok: sim.status >= 200 && sim.status < 300,
        mock: true,
        scenario,
        status: sim.status,
        url: `${SANDBOX_BASE}${path} (MOCK — nessuna chiamata reale)`,
        elapsed_ms: Date.now() - started,
        response: sim.body,
      });
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
