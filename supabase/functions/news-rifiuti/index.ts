import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Source {
  id: string;
  name: string;
  category: "rentri" | "normativa" | "settore" | "generale";
  url: string;
  type?: "rss" | "rentri-html";
}

const bing = (q: string) => `https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=RSS&setmkt=it-IT&setlang=it`;

const SOURCES: Source[] = [
  // RENTRI ufficiale (scraping del portale: non espone RSS)
  { id: "rentri-portale", name: "Portale RENTRI (rentri.gov.it)", category: "rentri", url: "https://www.rentri.gov.it/", type: "rentri-html" },
  { id: "rentri-news", name: "RENTRI news", category: "rentri", url: bing("RENTRI rifiuti registro elettronico tracciabilità") },
  { id: "rentri-site", name: "RENTRI (rassegna)", category: "rentri", url: bing("site:rentri.gov.it") },
  // Normativa
  { id: "normativa", name: "Normativa rifiuti", category: "normativa", url: bing("normativa rifiuti decreto ambiente Italia") },
  { id: "albo", name: "Albo Gestori Ambientali", category: "normativa", url: bing('"Albo Nazionale Gestori Ambientali"') },
  { id: "formulario", name: "FIR, MUD e registri", category: "normativa", url: bing("formulario identificazione rifiuti FIR MUD registro carico scarico") },
  // Settore
  { id: "circolare", name: "Economia circolare", category: "settore", url: bing("economia circolare riciclo rifiuti impianti") },
  { id: "trasporto", name: "Trasporto rifiuti", category: "settore", url: bing("trasporto rifiuti autotrasporto ambientale imprese") },
  { id: "ricicla", name: "Ricicla.tv", category: "settore", url: "https://www.ricicla.tv/feed/" },
  { id: "rifiutiweb", name: "RifiutiWeb", category: "settore", url: "https://www.rifiutiweb.it/feed/" },
  // Generale
  { id: "generale", name: "Ambiente Italia", category: "generale", url: bing("rifiuti ambiente Italia") },
  { id: "sanzioni", name: "Controlli e sanzioni", category: "generale", url: bing("sanzioni rifiuti controlli ambientali NOE sequestro") },
];


function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d)))
    .replace(/\s+/g, " ")
    .trim();
}

function pick(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? decode(m[1]) : "";
}

function parseFeed(xml: string, source: Source) {
  const items: any[] = [];
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi) || [];
  for (const b of blocks) {
    let link = pick(b, "link");
    if (!link) {
      const m = b.match(/<link[^>]*href="([^"]+)"/i);
      if (m) link = m[1];
    }
    const title = pick(b, "title");
    if (!title) continue;
    const dateRaw = pick(b, "pubDate") || pick(b, "updated") || pick(b, "published") || pick(b, "dc:date");
    const d = dateRaw ? new Date(dateRaw) : null;
    const summary = (pick(b, "description") || pick(b, "summary") || pick(b, "content")).slice(0, 600);
    items.push({
      id: `${source.id}-${link || title}`.slice(0, 200),
      title,
      link,
      summary,
      published_at: d && !isNaN(d.getTime()) ? d.toISOString() : null,
      source_id: source.id,
      source_name: source.name,
      category: source.category,
    });
  }
  return items;
}

async function fetchSource(s: Source) {
  try {
    const res = await fetch(s.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MultyprogetNewsBot/1.0)", Accept: "application/rss+xml, application/xml, text/xml, */*" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return { items: [], error: `HTTP ${res.status}` };
    const xml = await res.text();
    return { items: parseFeed(xml, s), error: null };
  } catch (e) {
    return { items: [], error: (e as Error).message };
  }
}

async function getFeed() {
  const results = await Promise.all(SOURCES.map(fetchSource));
  const all = results.flatMap((r) => r.items);
  const seen = new Set<string>();
  const unique = all.filter((a) => {
    const k = a.title.toLowerCase().slice(0, 90);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  unique.sort((a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime());
  const sources = SOURCES.map((s, i) => ({ id: s.id, name: s.name, category: s.category, count: results[i].items.length, error: results[i].error }));
  return { articles: unique.slice(0, 120), sources, fetched_at: new Date().toISOString() };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action || "feed";

    if (action === "probe") {
      const urls: string[] = body.urls || [];
      const out = await Promise.all(urls.map(async (u) => {
        try {
          const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(12000) });
          const t = await r.text();
          return { u, status: r.status, len: t.length, head: t.slice(0, 80) };
        } catch (e) { return { u, error: (e as Error).message }; }
      }));
      return new Response(JSON.stringify(out), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "feed") {
      const data = await getFeed();
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "ask") {
      const question: string = body.question || "";
      if (!question.trim()) throw new Error("Domanda mancante");

      let articles = Array.isArray(body.articles) && body.articles.length > 0 ? body.articles : (await getFeed()).articles;
      articles = articles.slice(0, 60);

      const context = articles
        .map((a: any, i: number) => `[${i + 1}] ${a.title}\nFonte: ${a.source_name} (${a.category})\nData: ${a.published_at ? new Date(a.published_at).toLocaleDateString("it-IT") : "n/d"}\nLink: ${a.link}\nEstratto: ${(a.summary || "").slice(0, 400)}`)
        .join("\n\n");

      const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY_NEW") ?? Deno.env.get("OPENROUTER_API_KEY");
      if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY non configurata");

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001",
          messages: [
            {
              role: "system",
              content: `Sei l'analista news di Multyproget, esperto di normativa rifiuti, RENTRI, FIR, MUD e Albo Gestori Ambientali.
Rispondi SEMPRE in italiano, in modo conciso e operativo.
Regole tassative:
- Usa ESCLUSIVAMENTE le notizie del feed qui sotto. Se l'informazione non c'è, dillo chiaramente.
- Cita sempre le fonti con la notazione [n] corrispondente agli articoli.
- Evidenzia scadenze, obblighi e impatti pratici per un'azienda di trasporto/gestione rifiuti.

### FEED NOTIZIE ATTUALE
${context}`,
            },
            ...(Array.isArray(body.history) ? body.history.slice(-8) : []),
            { role: "user", content: question },
          ],
          temperature: 0.3,
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        return new Response(JSON.stringify({ error: "Errore AI", status: res.status, details: t }), {
          status: res.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const json = await res.json();
      return new Response(
        JSON.stringify({ content: json.choices?.[0]?.message?.content || "Nessuna risposta.", used_articles: articles.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    throw new Error(`Azione sconosciuta: ${action}`);
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
