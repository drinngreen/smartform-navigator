// Autorizzazioni AI — assistente dedicato alle autorizzazioni Multyproget / Niyol
// Provider: OpenRouter (google/gemini-2.0-flash). Indipendente da Dark Lemon.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-flash";
const MAX_CONTEXT_CHARS = 220000;

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}

function squeeze(t: string) {
  return t
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("https://esm.sh/unpdf@0.12.1");
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return squeeze(typeof text === "string" ? text : (text as string[]).join("\n"));
}

/** Estrae il testo dei PDF per le righe che ne sono prive (o per un id specifico). */
async function runExtract(id?: string, force = false) {
  const sb = admin();
  let q = sb.from("autorizzazioni_aziendali").select("id, file_path, file_name, contenuto");
  if (id) q = q.eq("id", id);
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const results: Array<Record<string, unknown>> = [];
  for (const row of data ?? []) {
    if (!row.file_path) continue;
    if (row.contenuto && row.contenuto.length > 200 && !force) continue;
    try {
      const dl = await sb.storage.from("autorizzazioni").download(row.file_path);
      if (dl.error) throw new Error(dl.error.message);
      const bytes = new Uint8Array(await dl.data.arrayBuffer());
      const text = await extractPdfText(bytes);
      await sb.from("autorizzazioni_aziendali").update({ contenuto: text }).eq("id", row.id);
      results.push({ id: row.id, file: row.file_name, chars: text.length });
    } catch (e) {
      results.push({ id: row.id, file: row.file_name, error: String(e) });
    }
  }
  return results;
}

function scoreDoc(doc: any, question: string) {
  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9àèéìòùç\s/.-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const hay = `${doc.titolo} ${doc.numero ?? ""} ${doc.ente ?? ""} ${doc.oggetto ?? ""} ${doc.azienda} ${doc.contenuto ?? ""}`.toLowerCase();
  let s = 0;
  for (const w of words) if (hay.includes(w)) s += 1;
  return s;
}

async function runAsk(question: string, azienda: string | null, history: any[], docId?: string | null) {
  const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY_NEW") ?? Deno.env.get("OPENROUTER_API_KEY");
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY non configurata");

  const sb = admin();
  let q = sb
    .from("autorizzazioni_aziendali")
    .select("id, azienda, titolo, tipo, numero, ente, oggetto, data_rilascio, data_scadenza, file_name, contenuto")
    .order("data_rilascio", { ascending: false });
  if (docId) q = q.eq("id", docId);
  else if (azienda && azienda !== "tutte") q = q.eq("azienda", azienda);
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const docs = [...(data ?? [])].sort((a, b) => scoreDoc(b, question) - scoreDoc(a, question));


  let used = 0;
  const blocks: string[] = [];
  for (const d of docs) {
    const header = `### DOCUMENTO: ${d.titolo}
Azienda: ${d.azienda === "niyol" ? "NIYOL ETICONS LOGISTICA S.R.L. SB" : "MULTY PROGET S.R.L."}
Tipo: ${d.tipo} | Numero: ${d.numero ?? "-"} | Ente: ${d.ente ?? "-"}
Rilascio: ${d.data_rilascio ?? "-"} | Scadenza: ${d.data_scadenza ?? "non indicata"}
Oggetto: ${d.oggetto ?? "-"}
File: ${d.file_name ?? "-"}
TESTO:
`;
    const body = (d.contenuto ?? "(testo non ancora estratto)").slice(0, 60000);
    const block = header + body + "\n";
    if (used + block.length > MAX_CONTEXT_CHARS) continue;
    used += block.length;
    blocks.push(block);
  }

  const system = `Sei "AUTHORITY AI", l'assistente specializzato sulle AUTORIZZAZIONI AMBIENTALI di MULTY PROGET S.R.L. e NIYOL ETICONS LOGISTICA S.R.L. SB (gruppo Multyproget).

REGOLE:
- Rispondi SEMPRE in italiano, in modo tecnico ma chiaro, citando SEMPRE il documento di riferimento (titolo, numero, ente, data) da cui ricavi l'informazione.
- Usa ESCLUSIVAMENTE i documenti forniti nel contesto. Se un dato non è presente, dillo esplicitamente ("non risulta dai documenti in archivio") e suggerisci quale documento consultare o caricare.
- Conosci la normativa di riferimento: D.Lgs. 152/06 (art. 208, 212, 216), Albo Nazionale Gestori Ambientali (categorie 1-10 e classi A-F), operazioni R1-R13 e D1-D15, RENTRI, FIR.
- Quando l'utente chiede elenchi (CER autorizzati, categorie, quantitativi, prescrizioni), rispondi con elenchi puntati ordinati.
- Segnala sempre le scadenze rilevanti e, se una autorizzazione risulta scaduta rispetto alla data odierna (${new Date().toISOString().slice(0, 10)}), evidenzialo con ⚠️.
- Non inventare codici CER, numeri di iscrizione o date.

DOCUMENTI IN ARCHIVIO (${blocks.length} su ${docs.length}):
${blocks.join("\n")}`;

  const messages = [
    { role: "system", content: system },
    ...(history ?? []).slice(-8).map((m: any) => ({ role: m.role, content: String(m.content ?? "") })),
    { role: "user", content: question },
  ];

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.2, max_tokens: 16000, reasoning: { effort: "low" } }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${t.slice(0, 400)}`);
  }
  const json = await res.json();
  return {
    answer: json.choices?.[0]?.message?.content ?? "Nessuna risposta dal modello.",
    documenti_consultati: docs.slice(0, blocks.length).map((d) => ({ id: d.id, titolo: d.titolo, numero: d.numero })),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "ask";

    if (action === "extract") {
      const results = await runExtract(body.id, !!body.force);
      return new Response(JSON.stringify({ ok: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "ask") {
      if (!body.question) throw new Error("Domanda mancante");
      const out = await runAsk(String(body.question), body.azienda ?? null, body.history ?? [], body.doc_id ?? null);
      return new Response(JSON.stringify({ ok: true, ...out }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Azione non supportata: ${action}`);
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e instanceof Error ? e.message : e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
