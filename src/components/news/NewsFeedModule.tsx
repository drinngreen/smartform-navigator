import { useMemo, useState } from "react";
import { useNewsRifiuti, NewsArticle } from "@/hooks/useNewsRifiuti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, RefreshCw, Search, Sparkles, Send, Loader2, Newspaper, Trash2 } from "lucide-react";

const CATEGORIES: { id: string; label: string }[] = [
  { id: "all", label: "Tutte" },
  { id: "rentri", label: "RENTRI" },
  { id: "normativa", label: "Normativa" },
  { id: "settore", label: "Settore rifiuti" },
  { id: "generale", label: "Generale" },
];

const CATEGORY_STYLE: Record<string, string> = {
  rentri: "bg-pink-500/15 text-pink-600 border-pink-500/30",
  normativa: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  settore: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  generale: "bg-sky-500/15 text-sky-600 border-sky-500/30",
};

const QUICK_PROMPTS = [
  "Queste news contengono nuove regolamentazioni da implementare nel software?",
  "Quali moduli del gestionale (FIR, RENTRI, Dragon, registri) sono impattati dalle novità?",
  "Riassumi le novità RENTRI degli ultimi giorni e le scadenze operative",
  "Cosa cambia per i formulari (FIR) e il registro carico/scarico?",
];


function formatDate(iso: string | null) {
  if (!iso) return "data n/d";
  return new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ArticleCard({ a }: { a: NewsArticle }) {
  return (
    <Card className="p-4 hover:border-primary/40 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <Badge variant="outline" className={CATEGORY_STYLE[a.category] || ""}>{a.category}</Badge>
            <span className="text-xs text-muted-foreground">{a.source_name}</span>
            <span className="text-xs text-muted-foreground">· {formatDate(a.published_at)}</span>
          </div>
          <a href={a.link} target="_blank" rel="noopener noreferrer" className="font-semibold leading-snug hover:underline">
            {a.title}
          </a>
          {a.summary && <p className="text-sm text-muted-foreground mt-1.5 line-clamp-3">{a.summary}</p>}
        </div>
        <a
          href={a.link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Apri notizia"
          className="shrink-0 p-2 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </Card>
  );
}

export function NewsFeedModule() {
  const { articles, sources, fetchedAt, loading, error, loadFeed, messages, aiLoading, askAI, clearChat } = useNewsRifiuti();
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [prompt, setPrompt] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((a) => {
      if (category !== "all" && a.category !== category) return false;
      if (!q) return true;
      return `${a.title} ${a.summary} ${a.source_name}`.toLowerCase().includes(q);
    });
  }, [articles, category, query]);

  const submit = (text: string) => {
    if (!text.trim() || aiLoading) return;
    askAI(text.trim());
    setPrompt("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Feed */}
      <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca nelle news…" className="pl-9" />
          </div>
          <Button variant="outline" onClick={loadFeed} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Aggiorna
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Button key={c.id} size="sm" variant={category === c.id ? "default" : "outline"} onClick={() => setCategory(c.id)}>
              {c.label}
            </Button>
          ))}
        </div>

        <div className="text-xs text-muted-foreground">
          {fetchedAt && <>Ultimo aggiornamento: {formatDate(fetchedAt)} · </>}
          {filtered.length} notizie · fonti attive: {sources.filter((s) => s.count > 0).length}/{sources.length}
        </div>

        {error && <Card className="p-4 border-destructive/40 text-sm text-destructive">{error}</Card>}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            <Newspaper className="w-8 h-8 mx-auto mb-3 opacity-40" />
            Nessuna notizia trovata con i filtri attuali.
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => (
              <ArticleCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </div>

      {/* AI */}
      <div className="space-y-3 order-1 lg:order-2">
        <Card className="p-4 lg:sticky lg:top-4 border-primary/40 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="w-4 h-4 text-primary" />
              AI News Analyst
            </div>

            {messages.length > 0 && (
              <Button variant="ghost" size="icon" onClick={clearChat} aria-label="Svuota chat">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Risponde solo sulle notizie presenti nel feed ({articles.length} articoli), citando le fonti.
          </p>

          <div className="space-y-2 mb-3 max-h-[45vh] overflow-y-auto">
            {messages.length === 0 && (
              <div className="space-y-1.5">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => submit(p)}
                    className="w-full text-left text-xs px-3 py-2 rounded-md bg-secondary/60 hover:bg-secondary transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`text-sm rounded-lg px-3 py-2 whitespace-pre-wrap ${
                  m.role === "user" ? "bg-primary/10 ml-6" : "bg-secondary/60 mr-2"
                }`}
              >
                {m.content}
              </div>
            ))}
            {aiLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analisi del feed in corso…
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(prompt);
            }}
            className="flex gap-2"
          >
            <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Chiedi qualcosa sulle news…" disabled={aiLoading} />
            <Button type="submit" size="icon" disabled={aiLoading || !prompt.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
