import { useState } from "react";
import { Send, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIAgentChatProps {
  showSidebar?: boolean;
  className?: string;
}

export function AIAgentChat({ showSidebar = true, className }: AIAgentChatProps) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Ciao! Sono Zoli Dragon AI, il tuo assistente per i FIR e la gestione rifiuti. Come posso aiutarti?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sto elaborando la tua richiesta... L'assistente AI è in fase di configurazione." }]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-neon-cyan/20 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-neon-cyan" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                msg.role === "user"
                  ? "bg-primary/20 text-foreground rounded-br-md"
                  : "bg-card border border-neon-cyan/20 text-foreground rounded-bl-md"
              )}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-neon-cyan/20 flex items-center justify-center">
              <Bot className="h-4 w-4 text-neon-cyan animate-pulse" />
            </div>
            <div className="rounded-2xl px-4 py-3 bg-card border border-neon-cyan/20 text-muted-foreground text-sm">
              Sto pensando...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border/30">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Chiedi qualcosa..."
            className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-neon-cyan"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-xl bg-neon-cyan/20 text-neon-cyan disabled:opacity-50 hover:bg-neon-cyan/30 transition-all"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
