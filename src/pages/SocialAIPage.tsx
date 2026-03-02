import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocialAI } from "@/hooks/useSocialAI";
import { MobileShell } from "@/components/layout/MobileShell";
import { Send, Bot, User, ArrowLeft, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import logoDragon from "@/assets/logo-dragon.png";

export default function SocialAIPage() {
  const navigate = useNavigate();
  const { messages, isLoading, sendMessage, clearChat } = useSocialAI();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <MobileShell>
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/social")} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <ArrowLeft size={18} className="text-muted-foreground" />
          </button>
          <img src={logoDragon} alt="" className="h-8 w-8" style={{ filter: 'drop-shadow(0 0 6px rgba(192, 173, 103, 0.5))' }} />
          <div>
            <h1 className="text-sm font-bold text-foreground">Social Dragon AI</h1>
            <p className="text-[10px] text-muted-foreground">Assistente social community</p>
          </div>
        </div>
        <button onClick={clearChat} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
          <Trash2 size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <img src={logoDragon} alt="" className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-sm text-muted-foreground font-medium">Ciao! Sono Social Dragon AI 🐉</p>
            <p className="text-xs text-muted-foreground mt-1">Posso aiutarti a pubblicare post, leggere il feed, inviare messaggi e molto altro!</p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {["📝 Scrivi un post", "📖 Leggi il feed", "👥 Cerca membri", "💡 Safety tip"].map((hint) => (
                <button
                  key={hint}
                  onClick={() => sendMessage(hint)}
                  className="text-[11px] px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-full text-muted-foreground transition-colors"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot size={14} className="text-primary" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-secondary text-foreground rounded-bl-md"
            }`}>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:mt-1 [&>ol]:mt-1">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-1">
                <User size={14} className="text-accent" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-primary animate-pulse" />
            </div>
            <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card px-3 py-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Chiedi qualcosa..."
            className="flex-1 px-4 py-2.5 bg-secondary border border-border rounded-full text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 transition-all hover:brightness-110"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </MobileShell>
  );
}
