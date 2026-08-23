import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface NewsArticle {
  id: string;
  title: string;
  link: string;
  summary: string;
  published_at: string | null;
  source_id: string;
  source_name: string;
  category: "rentri" | "normativa" | "settore" | "generale";
}

export interface NewsSourceStatus {
  id: string;
  name: string;
  category: string;
  count: number;
  error: string | null;
}

export interface NewsAIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function useNewsRifiuti() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [sources, setSources] = useState<NewsSourceStatus[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<NewsAIMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const loadFeed = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("news-rifiuti", {
        body: { action: "feed", force },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setArticles(data?.articles || []);
      setSources(data?.sources || []);
      setFetchedAt(data?.fetched_at || null);
    } catch (e) {
      setError((e as Error).message || "Errore caricamento news");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
    // auto-refresh completo ogni 10 minuti
    const t = setInterval(() => loadFeed(true), 10 * 60 * 1000);
    return () => clearInterval(t);
  }, [loadFeed]);

  const askAI = useCallback(
    async (question: string) => {
      if (!question.trim()) return;
      const userMsg: NewsAIMessage = { id: crypto.randomUUID(), role: "user", content: question };
      setMessages((prev) => [...prev, userMsg]);
      setAiLoading(true);
      try {
        const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
        const { data, error: fnError } = await supabase.functions.invoke("news-rifiuti", {
          body: { action: "ask", question, history, articles: articles.slice(0, 60) },
        });
        if (fnError) throw new Error(fnError.message);
        if (data?.error) throw new Error(data.details || data.error);
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: data?.content || "Nessuna risposta." },
        ]);
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: `❌ Errore: ${(e as Error).message}` },
        ]);
      } finally {
        setAiLoading(false);
      }
    },
    [articles, messages],
  );

  const clearChat = useCallback(() => setMessages([]), []);

  return { articles, sources, fetchedAt, loading, error, loadFeed, messages, aiLoading, askAI, clearChat };
}
