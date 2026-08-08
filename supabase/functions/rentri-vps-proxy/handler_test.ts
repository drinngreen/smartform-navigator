import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleRentriProxy, buildUpstreamBody, resolveRoute, configKey } from "./handler.ts";

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
