import { describe, it, expect, vi, beforeEach } from "vitest";

const invoke = vi.fn();
vi.mock("@/lib/supabaseClient", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

import { inviaOperazioneRentri, verificaConfigurazioneRentri } from "@/lib/rentriVpsApi";

function httpError(status: number, body: string, contentType = "application/json") {
  const err = new Error(`Edge Function returned a non-2xx status code`);
  (err as unknown as { context: Response }).context = new Response(body, {
    status,
    headers: { "Content-Type": contentType },
  });
  return err;
}

const baseRequest = {
  cliente: "multyproget" as const,
  tipo_operazione: "LISTA_BLOCCHI" as const,
  payload: null,
};

beforeEach(() => {
  invoke.mockReset();
});

describe("inviaOperazioneRentri — gestione errori", () => {
  it("FunctionsHttpError con body JSON strutturato: propaga status ed error_code", async () => {
    invoke.mockResolvedValue({
      data: null,
      error: httpError(500, JSON.stringify({ success: false, status: 500, error_code: "BRIDGE_ERROR", error: "Errore del bridge RENTRI" })),
    });

    const res = await inviaOperazioneRentri(baseRequest);
    expect(res.success).toBe(false);
    expect(res.status).toBe(500);
    expect(res.errorCode).toBe("BRIDGE_ERROR");
    expect(res.userMessage).toMatch(/nessun invio confermato/i);
  });

  it("FunctionsHttpError con body non JSON: usa comunque lo status HTTP", async () => {
    invoke.mockResolvedValue({ data: null, error: httpError(502, "<html>Bad Gateway</html>", "text/html") });

    const res = await inviaOperazioneRentri(baseRequest);
    expect(res.success).toBe(false);
    expect(res.status).toBe(502);
    expect(res.errorCode).toBe("BRIDGE_UNAVAILABLE");
    expect(res.userMessage).toMatch(/non disponibile/i);
  });

  it("FunctionsRelayError: nessuna Response, esito non riuscito", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("Relay Error invoking the Edge Function") });
    const res = await inviaOperazioneRentri(baseRequest);
    expect(res.success).toBe(false);
    expect(res.errorCode).toBe("BRIDGE_UNAVAILABLE");
  });

  it("FunctionsFetchError: rete non raggiungibile", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("Failed to fetch") });
    const res = await inviaOperazioneRentri(baseRequest);
    expect(res.success).toBe(false);
    expect(res.rentri_offline).toBe(true);
  });

  it("timeout: trattato come servizio non disponibile", async () => {
    invoke.mockImplementation(() => { throw new Error("The signal has been aborted: timeout"); });
    const res = await inviaOperazioneRentri(baseRequest);
    expect(res.success).toBe(false);
    expect(res.status).toBe(503);
  });

  it("HTTP 200 con success:false non è un successo", async () => {
    invoke.mockResolvedValue({ data: { success: false, status: 422, error: "num_iscr_sito mancante" }, error: null });
    const res = await inviaOperazioneRentri(baseRequest);
    expect(res.success).toBe(false);
    expect(res.errorCode).toBe("INVALID_DATA");
  });

  it.each([
    [401, /Autorizzazione/i],
    [422, /non validi/i],
    [429, /Limite temporaneo/i],
    [500, /bridge/i],
    [503, /non disponibile/i],
  ])("status %i mappato su messaggio leggibile", async (status, matcher) => {
    invoke.mockResolvedValue({ data: null, error: httpError(status, JSON.stringify({ success: false, status })) });
    const res = await inviaOperazioneRentri(baseRequest);
    expect(res.status).toBe(status);
    expect(res.userMessage).toMatch(matcher);
  });

  it("non espone mai segreti nei messaggi", async () => {
    invoke.mockResolvedValue({
      data: null,
      error: httpError(500, JSON.stringify({ success: false, status: 500, error: "fetch failed x-bridge-key: SUPERSEGRETO123" })),
    });
    const res = await inviaOperazioneRentri(baseRequest);
    expect(JSON.stringify(res)).not.toContain("SUPERSEGRETO123");
  });
});

describe("verificaConfigurazioneRentri (dry-run)", () => {
  it("invia dry_run:true e restituisce l'anteprima", async () => {
    invoke.mockResolvedValue({
      data: {
        success: true,
        status: 200,
        mode: "dry_run",
        preview: { cliente: "multyproget", config_key: "multy", has_num_iscr_sito: true },
      },
      error: null,
    });

    const res = await verificaConfigurazioneRentri("multyproget", "LISTA_BLOCCHI");
    expect(invoke).toHaveBeenCalledWith("rentri-vps-proxy", expect.objectContaining({
      body: expect.objectContaining({ dry_run: true, cliente: "multyproget" }),
    }));
    expect(res.mode).toBe("dry_run");
    expect(res.preview?.config_key).toBe("multy");
    expect(res.success).toBe(true);
  });
});
