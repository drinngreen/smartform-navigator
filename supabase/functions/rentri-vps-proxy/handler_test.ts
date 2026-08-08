import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  handleRentriProxy, buildUpstreamBody, resolveRoute, configKey,
  errorCodeForStatus, sanitizeMessage,
} from "./handler.ts";

const BRIDGE = "https://bridge.test";
const KEY = "test-bridge-key";

function makeReq(body: unknown) {
  return new Request("http://localhost/rentri-vps-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

interface Captured { url: string; init: RequestInit; body: Record<string, unknown> }

function mockFetch(responder: (c: Captured) => Response | Promise<Response>) {
  const calls: Captured[] = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    const captured: Captured = {
      url: String(url),
      init: init ?? {},
      body: JSON.parse(String(init?.body ?? "{}")),
    };
    calls.push(captured);
    return await responder(captured);
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const GET_BLOCCHI = {
  cliente: "multyproget",
  rentri_method: "GET",
  rentri_path: "/vidimazione-formulari/v1.0?identificativo=12347770013",
  payload: null,
};

Deno.test("multyproget è alias configurativo di multy ma resta cliente=multyproget nel body", async () => {
  assertEquals(configKey("multyproget"), "multy");

  const { impl, calls } = mockFetch(() =>
    new Response(JSON.stringify({ blocchi: [] }), { status: 200 })
  );

  const res = await handleRentriProxy(makeReq(GET_BLOCCHI), {
    fetchImpl: impl, bridgeUrl: BRIDGE, bridgeKey: KEY,
  });
  await res.text();

  assertEquals(calls.length, 1);
  const sent = calls[0].body;
  assertEquals(sent.cliente, "multyproget");
  assertEquals(sent.rentri_method, "GET");
  assertEquals(sent.rentri_path, "/vidimazione-formulari/v1.0?identificativo=12347770013");
  // il valore proviene esclusivamente dalla config `multy`
  assertEquals(sent.num_iscr_sito, "OP2501XMQ021914-TO0001");
  assert(sent.num_iscr_sito !== "");

  // registro e blocchi risolti dalla config multy
  assertEquals(
    resolveRoute("REGISTRO", "multyproget", {}).path,
    "/dati-registri/v1.0/operatore/RQEL39R7NS0/movimenti",
  );
  assertEquals(
    buildUpstreamBody("multyproget", "VIDIMAZIONE", {}, resolveRoute("VIDIMAZIONE", "multyproget", {}))
      .codice_blocco,
    "ZRZXR",
  );
});

Deno.test("risposta bridge 200 propagata come successo", async () => {
  const { impl } = mockFetch(() =>
    new Response(JSON.stringify({ blocchi: [{ codice_blocco: "ZRZXR" }] }), { status: 200 })
  );
  const res = await handleRentriProxy(makeReq(GET_BLOCCHI), {
    fetchImpl: impl, bridgeUrl: BRIDGE, bridgeKey: KEY,
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.status, 200);
});

Deno.test("risposta bridge 500 propagata come HTTP 500 (non 200)", async () => {
  const { impl, calls } = mockFetch(() =>
    new Response(JSON.stringify({ error: "Errore del bridge RENTRI" }), { status: 500 })
  );
  const res = await handleRentriProxy(makeReq(GET_BLOCCHI), {
    fetchImpl: impl, bridgeUrl: BRIDGE, bridgeKey: KEY,
  });
  const body = await res.json();
  assertEquals(res.status, 500);
  assertEquals(body.success, false);
  assertEquals(body.status, 500);
  assertEquals(calls.length, 1); // nessun retry
});

Deno.test("risposta bridge 4xx propagata con lo stesso status", async () => {
  const { impl } = mockFetch(() =>
    new Response(JSON.stringify({ message: "non autorizzato" }), { status: 401 })
  );
  const res = await handleRentriProxy(makeReq(GET_BLOCCHI), {
    fetchImpl: impl, bridgeUrl: BRIDGE, bridgeKey: KEY,
  });
  const body = await res.json();
  assertEquals(res.status, 401);
  assertEquals(body.success, false);
  assertEquals(body.error, "non autorizzato");
});

Deno.test("bridge irraggiungibile → HTTP 502 con body strutturato", async () => {
  const { impl, calls } = mockFetch(() => {
    throw new TypeError("tcp connect error: Connection refused");
  });
  const res = await handleRentriProxy(makeReq(GET_BLOCCHI), {
    fetchImpl: impl, bridgeUrl: BRIDGE, bridgeKey: KEY,
  });
  const body = await res.json();
  assertEquals(res.status, 502);
  assertEquals(body.success, false);
  assertEquals(body.status, 502);
  assert(typeof body.error === "string" && body.error.length > 0);
  assertEquals(calls.length, 1); // nessun retry
});

Deno.test("timeout (abort) → HTTP 502", async () => {
  const { impl } = mockFetch(() => {
    const err = new Error("The signal has been aborted");
    err.name = "AbortError";
    throw err;
  });
  const res = await handleRentriProxy(makeReq(GET_BLOCCHI), {
    fetchImpl: impl, bridgeUrl: BRIDGE, bridgeKey: KEY, timeoutMs: 5,
  });
  const body = await res.json();
  assertEquals(res.status, 502);
  assertEquals(body.success, false);
});

Deno.test("bridge key assente: nessun header x-bridge-key e nessun segreto nel body", async () => {
  const { impl, calls } = mockFetch(() => new Response("{}", { status: 200 }));
  const res = await handleRentriProxy(makeReq(GET_BLOCCHI), {
    fetchImpl: impl, bridgeUrl: BRIDGE, bridgeKey: "",
  });
  const raw = await res.text();
  const headers = (calls[0].init.headers ?? {}) as Record<string, string>;
  assertEquals(headers["x-bridge-key"], undefined);
  assertEquals(raw.includes("bridge-key"), false);
});

Deno.test("bridge key presente: inviata come header, mai nella risposta", async () => {
  const { impl, calls } = mockFetch(() => new Response("{}", { status: 500 }));
  const res = await handleRentriProxy(makeReq(GET_BLOCCHI), {
    fetchImpl: impl, bridgeUrl: BRIDGE, bridgeKey: KEY,
  });
  const raw = await res.text();
  const headers = (calls[0].init.headers ?? {}) as Record<string, string>;
  assertEquals(headers["x-bridge-key"], KEY);
  assertEquals(raw.includes(KEY), false);
  assertEquals(JSON.stringify(calls[0].body).includes(KEY), false);
});

Deno.test("route GET esplicita: nessun retry su altri candidati", async () => {
  const { impl, calls } = mockFetch(() => new Response(JSON.stringify({ error: "boom" }), { status: 500 }));
  const res = await handleRentriProxy(makeReq(GET_BLOCCHI), {
    fetchImpl: impl, bridgeUrl: BRIDGE, bridgeKey: KEY,
  });
  await res.text();
  assertEquals(calls.length, 1);
  assertEquals(calls[0].body.cliente, "multyproget");
});

/* ── DRY RUN ── */

Deno.test("dry-run: nessuna fetch esterna e nessuna scrittura", async () => {
  const { impl, calls } = mockFetch(() => {
    throw new Error("La fetch non deve mai essere chiamata in dry-run");
  });
  const res = await handleRentriProxy(makeReq({ ...GET_BLOCCHI, dry_run: true }), {
    fetchImpl: impl, bridgeUrl: BRIDGE, bridgeKey: KEY,
  });
  const body = await res.json();
  assertEquals(calls.length, 0);
  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.mode, "dry_run");
  assertEquals(body.sent_to_bridge, false);
});

Deno.test("dry-run: anteprima corretta di multyproget con alias configurativo multy", async () => {
  const { impl, calls } = mockFetch(() => new Response("{}", { status: 200 }));
  const res = await handleRentriProxy(makeReq({ ...GET_BLOCCHI, dry_run: true }), {
    fetchImpl: impl, bridgeUrl: BRIDGE, bridgeKey: KEY,
  });
  const body = await res.json();
  assertEquals(calls.length, 0);
  assertEquals(body.preview.cliente, "multyproget");
  assertEquals(body.preview.config_key, "multy");
  assertEquals(body.preview.rentri_method, "GET");
  assertEquals(body.preview.rentri_path, "/vidimazione-formulari/v1.0?identificativo=12347770013");
  assertEquals(body.preview.has_num_iscr_sito, true);
  assertEquals(body.preview.has_registry_id, true);
  assertEquals(body.preview.blocchi_configurati, 2);
  assertEquals(body.validation.cliente_riconosciuto, true);
  // nessun valore sensibile nell'anteprima
  assertEquals("num_iscr_sito" in body.preview, false);
  assertEquals("payload" in body.preview, false);
});

Deno.test("dry-run: dati obbligatori mancanti → 400 con validazione", async () => {
  const { impl, calls } = mockFetch(() => new Response("{}", { status: 200 }));
  const res = await handleRentriProxy(makeReq({ dry_run: true, payload: null }), {
    fetchImpl: impl, bridgeUrl: BRIDGE, bridgeKey: KEY,
  });
  const body = await res.json();
  assertEquals(calls.length, 0);
  assertEquals(res.status, 400);
  assertEquals(body.success, false);
  assertEquals(body.error_code, "BAD_REQUEST");
  assertEquals(body.validation.cliente_presente, false);
});

Deno.test("dry-run: cliente sconosciuto → 422 con errori di validazione", async () => {
  const { impl, calls } = mockFetch(() => new Response("{}", { status: 200 }));
  const res = await handleRentriProxy(
    makeReq({ cliente: "sconosciuto", tipo_operazione: "LISTA_BLOCCHI", dry_run: true }),
    { fetchImpl: impl, bridgeUrl: BRIDGE, bridgeKey: KEY },
  );
  const body = await res.json();
  assertEquals(calls.length, 0);
  assertEquals(res.status, 422);
  assertEquals(body.error_code, "INVALID_DATA");
  assertEquals(body.validation.cliente_riconosciuto, false);
});

Deno.test("dry-run: nessun segreto nell'anteprima né nei log", async () => {
  const logs: string[] = [];
  const origLog = console.log;
  console.log = (...a: unknown[]) => { logs.push(a.join(" ")); };
  try {
    const { impl } = mockFetch(() => new Response("{}", { status: 200 }));
    const res = await handleRentriProxy(makeReq({ ...GET_BLOCCHI, dry_run: true }), {
      fetchImpl: impl, bridgeUrl: BRIDGE, bridgeKey: KEY,
    });
    const raw = await res.text();
    assertEquals(raw.includes(KEY), false);
    assertEquals(logs.join("\n").includes(KEY), false);
    assert(logs.join("\n").includes("bridge_key=present"));
  } finally {
    console.log = origLog;
  }
});

Deno.test("errori sanitizzati: segreti e header rimossi dai messaggi", async () => {
  assertEquals(sanitizeMessage(`fallito con x-bridge-key: ${KEY}`, KEY).includes(KEY), false);
  assertEquals(sanitizeMessage("Authorization: Bearer abc123"), "Authorization: ***");
  assertEquals(sanitizeMessage("boom\n  at file.ts:1:1"), "boom");
  assertEquals(errorCodeForStatus(429), "RATE_LIMITED");
  assertEquals(errorCodeForStatus(503), "BRIDGE_UNAVAILABLE");
});

Deno.test("errore reale del bridge: messaggio sanitizzato, nessuna chiave esposta", async () => {
  const { impl } = mockFetch(() =>
    new Response(JSON.stringify({ error: `firma fallita con x-bridge-key: ${KEY}` }), { status: 500 })
  );
  const res = await handleRentriProxy(makeReq(GET_BLOCCHI), {
    fetchImpl: impl, bridgeUrl: BRIDGE, bridgeKey: KEY,
  });
  const body = await res.json();
  assertEquals(res.status, 500);
  assertEquals(body.error_code, "BRIDGE_ERROR");
  assertEquals(String(body.error).includes(KEY), false);
});
