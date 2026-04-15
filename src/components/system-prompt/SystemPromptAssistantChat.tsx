import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import systemPromptIcon from "@/assets/system-prompt-icon.png";
import ReactMarkdown from "react-markdown";
import { MessageCopyButton } from "@/components/ai/MessageCopyButton";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `Sei un assistente esperto nella scrittura di System Prompt per agenti AI aziendali. Il tuo ruolo è aiutare gli amministratori a scrivere prompt di sistema efficaci.

Guida gli utenti su come strutturare richieste per:
- **Capacità di ricerca**: come definire filtri, query, e pattern di ricerca
- **Nuovi moduli**: come descrivere la struttura di un modulo, i campi, le validazioni
- **Campi aggiuntivi**: come specificare tipo, formato, validazioni, relazioni
- **Nuove funzionalità**: come descrivere il comportamento atteso, input/output
- **Conoscenze**: come formattare informazioni da insegnare all'agente
- **Azioni e procedure**: come definire step-by-step, condizioni, eccezioni
- **Integrazioni esterne**: come documentare API, endpoint, autenticazione, formati dati

Rispondi SEMPRE in italiano. Sii pratico e dai esempi concreti. Suggerisci template pronti all'uso.
Se l'utente descrive qualcosa di vago, aiutalo a renderlo specifico e implementabile.`;

export function SystemPromptAssistantChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const apiMsgs = [...messages.slice(-15), userMsg].map((m) => ({ role: m.role, content: m.content }));
      const { data, error } = await supabase.functions.invoke("ai-agent", {
        body: {
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...apiMsgs],
          source: "system-prompt-assistant",
        },
      });

      const reply = data?.content || data?.choices?.[0]?.message?.content || "Mi dispiace, riprova.";
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: typeof reply === "string" ? reply : JSON.stringify(reply) }]);
    } catch (e) {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: `❌ Errore: ${(e as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-[hsl(222,47%,6%)] flex flex-col h-[400px]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[hsl(222,47%,8%)] rounded-t-2xl">
        <img src={systemPromptIcon} alt="" className="h-8 w-8 rounded-lg" />
        <div>
          <h3 className="text-amber-400 text-sm font-semibold">Assistente System Prompt</h3>
          <p className="text-white/30 text-[10px]">Ti aiuto a scrivere prompt efficaci</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-white/30 text-xs mb-3">💡 Chiedimi come scrivere un prompt efficace</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                "Come descrivo un nuovo modulo?",
                "Template per integrazione API",
                "Come definire azioni step-by-step?",
                "Esempio per nuovi campi",
              ].map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s)}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/40 hover:text-white/60 hover:border-amber-500/20 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-2 group", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-1">
                <Bot className="h-3 w-3 text-amber-400" />
              </div>
            )}
            <div className={cn(
              "max-w-[80%] rounded-xl px-3 py-2 text-xs select-text relative",
              msg.role === "user"
                ? "bg-blue-500/10 border border-blue-500/20 text-white"
                : "bg-white/5 border border-white/10 text-white/80"
            )}>
              <div className="prose prose-xs prose-invert max-w-none">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
              {msg.role === "assistant" && <MessageCopyButton content={msg.content} className="absolute -top-1 -right-1" />}
            </div>
            {msg.role === "user" && (
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-1">
                <User className="h-3 w-3 text-blue-400" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Bot className="h-3 w-3 text-amber-400 animate-pulse" />
            </div>
            <div className="flex gap-1 items-center bg-white/5 rounded-xl px-3 py-2">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Come scrivo un buon prompt..."
            className="flex-1 bg-transparent text-white text-xs placeholder:text-white/30 focus:outline-none"
          />
          <button onClick={send} disabled={!input.trim() || loading} className="p-1.5 rounded-lg disabled:opacity-30 bg-amber-500/20 hover:bg-amber-500/30 transition-colors">
            <Send className="h-3 w-3 text-amber-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
