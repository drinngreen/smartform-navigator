import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NGROK_BASE = "https://hierurgical-undefinable-magdalene.ngrok-free.dev";

/**
 * Proxy edge function for RENTRI get-pdf + get-qr.
 * Bypasses browser CORS restrictions on the ngrok tunnel.
 *
 * POST body: { company: string, firId: string }
 * Returns: { qrCode?: string, pdfBase64?: string, pdfUrl?: string, ... }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { company, firId } = await req.json();

    if (!company || !firId) {
      return new Response(
        JSON.stringify({ error: "company and firId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[rentri-get-pdf] Fetching PDF for company=${company} firId=${firId}`);

    // ── 1. Call get-pdf ──────────────────────────────────────
    const pdfRes = await fetch(`${NGROK_BASE}/api/rentri/action/get-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ company, firId }),
    });

    const pdfPayload = await pdfRes.json().catch(() => ({}));
    console.log(`[rentri-get-pdf] get-pdf status=${pdfRes.status} keys=${Object.keys(pdfPayload)}`);

    if (!pdfRes.ok) {
      return new Response(
        JSON.stringify({ error: pdfPayload?.error || pdfPayload?.details || `Backend error ${pdfRes.status}`, raw: pdfPayload }),
        { status: pdfRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Dig into nested structures
    const root: any = pdfPayload?.data || pdfPayload?.result || pdfPayload?.payload || pdfPayload || {};

    const absolutize = (v: string) => {
      if (!v) return "";
      if (v.startsWith("http")) return v;
      if (v.startsWith("/")) return `${NGROK_BASE}${v}`;
      return "";
    };

    const result: any = {
      qrCode: root.qr_code || root.qrCodeBytes || root.qr_code_bytes || root.qr_base64 || root.qrBase64 || root.qrCode || "",
      qrUrl: absolutize(root.qr_url || root.qrUrl || root.qrcodeUrl || root.qrcode_url || ""),
      pdfBase64: root.pdf_base64 || root.pdfBase64 || root.pdfContent || root.content || root.pdf_base_64 || "",
      pdfUrl: absolutize(root.pdf_url || root.pdfUrl || root.url || ""),
      raw_keys: Object.keys(root),
    };

    // ── 2. Fallback: dedicated /get-qr endpoint ──────────────
    if (!result.qrCode) {
      console.log(`[rentri-get-pdf] No QR in get-pdf response, trying /get-qr fallback`);
      try {
        const qrRes = await fetch(
          `${NGROK_BASE}/api/rentri/action/get-qr?firId=${encodeURIComponent(firId)}`,
          { headers: { "ngrok-skip-browser-warning": "true" } }
        );
        if (qrRes.ok) {
          const ct = qrRes.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            const qrData = await qrRes.json().catch(() => ({}));
            result.qrCode =
              qrData?.qr_code || qrData?.qrCode || qrData?.qrCodeBytes || qrData?.content || "";
          } else {
            // Binary response → base64
            const buf = await qrRes.arrayBuffer();
            const bytes = new Uint8Array(buf);
            let binary = "";
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            result.qrCode = btoa(binary);
          }
          console.log(`[rentri-get-pdf] /get-qr fallback: has_qr=${Boolean(result.qrCode)}`);
        }
      } catch (e) {
        console.warn(`[rentri-get-pdf] /get-qr fallback failed:`, e);
      }
    }

    // ── 3. Persist QR to fir_number_pool if found ────────────
    if (result.qrCode) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const db = createClient(supabaseUrl, supabaseKey);

        const qrDataUri = result.qrCode.startsWith("data:")
          ? result.qrCode
          : `data:image/png;base64,${result.qrCode.replace(/\s+/g, "")}`;

        await db
          .from("fir_number_pool")
          .update({ qr_code_data: qrDataUri })
          .eq("fir_number", firId);

        console.log(`[rentri-get-pdf] Persisted QR to fir_number_pool for ${firId}`);
      } catch (e) {
        console.warn(`[rentri-get-pdf] DB persist failed:`, e);
      }
    }

    console.log(`[rentri-get-pdf] Final: has_qr=${Boolean(result.qrCode)} has_pdf=${Boolean(result.pdfBase64)} has_pdf_url=${Boolean(result.pdfUrl)}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`[rentri-get-pdf] Error:`, err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
