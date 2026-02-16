import { useState } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileShell } from "@/components/layout/MobileShell";
import { useAIAgent } from "@/hooks/useAIAgent";
import { Send, Bot, User } from "lucide-react";

export default function AIAssistantPage() {
  const { messages, isLoading, sendMessage } = useAIAgent();
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");
    await sendMessage(text);
  };

  return (
    <MobileShell>
      <div className="px-4 pt-4 pb-2" style={{ borderBottom: '1px solid rgba(192, 173, 103, 0.15)' }}>
        <h1 className="text-xl font-display font-bold text-foreground tracking-wider">Assistente AI</h1>
        <p className="text-muted-foreground text-xs font-mono mt-1">Zoli Dark Lemon</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bot className="h-12 w-12 text-primary/30 mb-3" />
            <p className="text-muted-foreground text-sm">Chiedimi qualsiasi cosa sui rifiuti e la normativa RENTRI</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
              msg.role === "user"
                ? "bg-primary/20 text-foreground rounded-br-sm"
                : "bg-card/60 border border-border/30 text-foreground rounded-bl-sm"
            }`}>
              <div className="flex items-center gap-1.5 mb-1">
                {msg.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3 text-primary" />}
                <span className="text-[10px] text-muted-foreground font-mono">
                  {msg.role === "user" ? "Tu" : "AI"}
                </span>
              </div>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="p-3 rounded-2xl bg-card/60 border border-border/30 rounded-bl-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 pb-20 border-t border-border/30">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Scrivi una domanda..."
            className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>

      <BottomNav />
    </MobileShell>
  );
}
