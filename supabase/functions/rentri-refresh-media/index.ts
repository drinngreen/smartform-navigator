import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NGROK_BASE = "https://hierurgical-undefinable-magdalene.ngrok-free.dev";

const TENANT_MAP: Record<string, string> = {
  "167d07ad-9184-484e-85a6-da5ceafa42a3": "GLOBAL",
  "dc2a6046-d9a8-4549-8e45-82367d695ac6": "MULTY",
};

const MN_CONTEXT_MAP: Record<string, string> = {
  multyproget: "MULTY",
  "multyproget-intermediario": "MULTY",
  "multyproget-impianto": "MULTY",
  niyol: "NIYOL",
};

function resolveSocietaId(tenantId?: string | null, mnContext?: string | null): string {
  if (mnContext && MN_CONTEXT_MAP[mnContext]) return MN_CONTEXT_MAP[mnContext];
  if (tenantId && TENANT_MAP[tenantId]) return TENANT_MAP[tenantId];
  return "GLOBAL";
}

function toImageDataUri(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  if (value.startsWith("data:image/")) return value;
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) return value;
  return `data:image/png;base64,${value.replace(/\s+/g, "")}`;
}

function absolutize(value: unknown): string {
  const v = String(value || "").trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  if (v.startsWith("/")) return `${NGROK_BASE}${v}`;
  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const codiceFiscale = String(body?.codiceFiscale ?? "").trim().toUpperCase();
    const userIdInput = String(body?.userId ?? "").trim();
    const firNumberInput = String(body?.firNumber ?? "").trim();

    if (!codiceFiscale && !userIdInput) {
      return new Response(
        JSON.stringify({ error: "Passa codiceFiscale o userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let profile: any = null;

    if (userIdInput) {
      const { data } = await db
        .from("profiles")
        .select("user_id, tenant_id, mn_context, codice_fiscale")
        .eq("user_id", userIdInput)
        .maybeSingle();
      profile = data;
    } else {
      const { data } = await db
        .from("profiles")
        .select("user_id, tenant_id, mn_context, codice_fiscale")
        .eq("codice_fiscale", codiceFiscale)
        .maybeSingle();
      profile = data;
    }

    if (!profile?.user_id) {
      return new Response(
        JSON.stringify({ error: "Profilo non trovato" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const company = resolveSocietaId(profile.tenant_id, profile.mn_context);

    let q = db
      .from("fir_forms")
      .select("id, numero_fir, status, updated_at")
      .eq("user_id", profile.user_id)
      .in("status", ["inviato", "chiuso"])
      .order("updated_at", { ascending: false })
      .limit(20);

    if (firNumberInput) q = q.eq("numero_fir", firNumberInput);

    const { data: firs, error: firsError } = await q;
    if (firsError) throw firsError;

    if (!firs || firs.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "Nessun FIR inviato/chiuso trovato", refreshed: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const refreshed: any[] = [];

    for (const fir of firs) {
      const firId = String(fir.numero_fir || "").trim();
      if (!firId) continue;

      const res = await fetch(`${NGROK_BASE}/api/rentri/action/get-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ company, firId }),
      });

      const payload = await res.json().catch(() => ({}));
      const root: any = payload?.data || payload?.result || payload?.payload || payload || {};

      if (!res.ok) {
        refreshed.push({ fir_number: firId, ok: false, status: res.status, error: root?.error || root?.details || "Errore get-pdf" });
        continue;
      }

      const qrSourcePrimary =
        root.qr_code || root.qrCodeBytes || root.qr_code_bytes || root.qr_base64 || root.qrBase64 || root.qr_url || root.qrUrl || "";
      const pdfBase64 = root.pdf_base64 || root.pdfContent || root.content || root.pdf_base_64 || "";
      const pdfUrl = absolutize(root.pdf_url || root.pdfUrl || root.url || "");

      let qrData = toImageDataUri(qrSourcePrimary);

      // Fallback GET /get-qr with ngrok bypass header when get-pdf does not include QR
      if (!qrData) {
        try {
          const qrRes = await fetch(`${NGROK_BASE}/api/rentri/action/get-qr?firId=${encodeURIComponent(firId)}`, {
            headers: { "ngrok-skip-browser-warning": "true" },
          });
          if (qrRes.ok) {
            const ct = qrRes.headers.get("content-type") || "";
            if (ct.includes("application/json")) {
              const qrPayload = await qrRes.json().catch(() => ({}));
              qrData = toImageDataUri(
                qrPayload?.qr_code || qrPayload?.qrCode || qrPayload?.qrCodeBytes || qrPayload?.content || ""
              );
            } else {
              const buf = await qrRes.arrayBuffer();
              const bytes = new Uint8Array(buf);
              let binary = "";
              for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
              qrData = `data:image/png;base64,${btoa(binary)}`;
            }
          }
        } catch {
          // keep null
        }
      }

      if (qrData) {
        await db
          .from("fir_number_pool")
          .update({ qr_code_data: qrData } as any)
          .eq("fir_number", firId);
      }

      refreshed.push({
        fir_number: firId,
        ok: true,
        has_qr: Boolean(qrData),
        has_pdf_base64: Boolean(String(pdfBase64).trim()),
        has_pdf_url: Boolean(pdfUrl),
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        user_id: profile.user_id,
        codice_fiscale: profile.codice_fiscale,
        company,
        refreshed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Errore interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
