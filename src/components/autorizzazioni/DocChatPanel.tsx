import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Sparkles } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Quali CER sono autorizzati?",
  "Quali operazioni (R/D) sono consentite?",
  "Quantitativi e limiti di stoccaggio?",
  "Prescrizioni principali e scadenza",
];

interface Props {
  docId: string;
  titolo: string;
  compact?: boolean;
}

export function DocChatPanel({ docId, titolo, compact }: Props) {
  const [chat, setChat] = useState<Msg[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setChat([]); setQuestion(""); }, [docId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat, asking]);

  const ask = async (preset?: string) => {
    const text = (preset ?? question).trim();
    if (!text || asking) return;
    setQuestion("");
    const history = chat.slice(-8);
    setChat((c) => [...c, { role: "user", content: text }]);
    setAsking(true);
    try {
      const { data, error } = await supabase.functions.invoke("autorizzazioni-ai", {
        body: { action: "ask", question: text, doc_id: docId, history },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Errore AI");
      setChat((c) => [...c, { role: "assistant", content: data.answer }]);
    } catch (e: any) {
      setChat((c) => [...c, { role: "assistant", content: `⚠️ Errore: ${e.message ?? e}` }]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 min-h-0">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="w-4 h-4 text-amber-500" />
        Chiedi all'AI su “{titolo}”
      </div>

      {chat.length === 0 && (
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-border hover:border-primary/60 text-left"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {chat.length > 0 && (
        <div className={`overflow-y-auto space-y-2 rounded-lg bg-muted/30 p-3 ${compact ? "max-h-56" : "max-h-[45vh]"}`}>
          {chat.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <div
                className={`inline-block max-w-[90%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap text-left ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {asking && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Sto leggendo il documento…
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="Fai una domanda su questa autorizzazione…"
        />
        <Button onClick={() => ask()} disabled={asking || !question.trim()}>
          {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
