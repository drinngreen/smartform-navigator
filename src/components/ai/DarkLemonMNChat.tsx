import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Plus, Trash2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDarkLemonMN, type DLSurface } from "@/hooks/useDarkLemonMN";
import { DarkLemonHistory } from "./DarkLemonHistory";
import { DarkLemonSupervisionBar } from "./DarkLemonSupervisionBar";

import zoliLemonIcon from "@/assets/zoli-dark-lemon-icon.png";
import ReactMarkdown from "react-markdown";
import { MessageCopyButton } from "./MessageCopyButton";

interface Props {
  context?: string;
  surface?: DLSurface;
}

export function DarkLemonMNChat({ context, surface = "page" }: Props) {
  const {
    messages, isLoading, conversations, currentConversationId,
    sendMessage, loadConversation, deleteConversation, newChat,
  } = useDarkLemonMN(context, surface);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
  };

  const contextLabel = context === "multyproget" ? "Multyproget" : context === "niyol" ? "Niyol" : "Multy Niyol";

  return (
    <div className="flex h-[calc(100vh-140px)] gap-4">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-64 shrink-0 relative rounded-2xl p-[2px] overflow-hidden">
          <div className="absolute inset-0 rounded-2xl animate-gradient" style={{ background: "linear-gradient(90deg, #3b82f6, #ec4899, #22c55e, #06b6d4, #a855f7, #f59e0b, #3b82f6)", backgroundSize: "300% 100%" }} />
          <div className="relative h-full rounded-2xl bg-[hsl(222,47%,6%)] overflow-hidden">
            <DarkLemonHistory
              conversations={conversations}
              currentConversationId={currentConversationId}
              onSelect={loadConversation}
              onDelete={deleteConversation}
              onNewChat={newChat}
            />
          </div>
        </div>
      )}

      {/* Main chat */}
      <div className="flex-1 relative rounded-2xl p-[2px] overflow-hidden">
        <div className="absolute inset-0 rounded-2xl animate-gradient" style={{ background: "linear-gradient(90deg, #3b82f6, #ec4899, #22c55e, #06b6d4, #a855f7, #f59e0b, #3b82f6)", backgroundSize: "300% 100%" }} />
        <div className="absolute inset-0 rounded-2xl blur-lg opacity-40 animate-gradient" style={{ background: "linear-gradient(90deg, #3b82f6, #ec4899, #22c55e, #06b6d4, #a855f7, #f59e0b, #3b82f6)", backgroundSize: "300% 100%" }} />

        <div className="relative h-full rounded-2xl bg-[hsl(222,47%,6%)] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10 bg-[hsl(222,47%,8%)]">
            <div className="relative">
              <img src={zoliLemonIcon} alt="Dark Lemon" className="h-10 w-10" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[hsl(222,47%,8%)]" />
            </div>
            <div>
              <h2 className="text-white font-display text-lg tracking-wider">DARK LEMON AI</h2>
              <p className="text-white/40 text-xs">Assistente intelligente — {contextLabel} • Accesso completo DB</p>
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={cn(
                "ml-auto inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                sidebarOpen
                  ? "border-cyan-500/30 bg-cyan-500/15 text-cyan-400"
                  : "border-white/10 bg-white/5 text-white/70 hover:border-cyan-500/20 hover:bg-cyan-500/10 hover:text-cyan-400"
              )}
              title="Cronologia"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Cronologia</span>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <img src={zoliLemonIcon} alt="Dark Lemon" className="h-20 w-20 mb-4 opacity-40" />
                <h3 className="text-white/60 font-display text-lg mb-2">DARK LEMON AI — {contextLabel}</h3>
                <p className="text-white/30 text-sm max-w-md mb-6">
                  Assistente con accesso completo al database. Posso cercare dati, aggiungere contatti, compilare moduli, dare statistiche e molto altro.
                </p>
                <div className="grid grid-cols-2 gap-3 max-w-lg">
                  {[
                    { icon: "🔍", text: "Quanti privati abbiamo in anagrafica?" },
                    { icon: "➕", text: "Aggiungi Mario Rossi in rubrica" },
                    { icon: "📊", text: "Mostra gli ultimi 10 conferimenti" },
                    { icon: "📋", text: "Quanti FIR abbiamo in bozza?" },
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(suggestion.text); }}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 text-left hover:border-cyan-500/30 hover:bg-white/10 transition-colors"
                    >
                      <span className="text-sm">{suggestion.icon}</span>
                      <p className="text-xs text-white/60 mt-1">{suggestion.text}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={msg.id || i} className={cn("flex gap-3 group", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1" style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.3), rgba(59,130,246,0.3))", boxShadow: "0 0 15px rgba(6,182,212,0.3)" }}>
                    <Bot className="h-4 w-4 text-cyan-400" />
                  </div>
                )}
                <div className={cn("relative max-w-[75%] rounded-2xl px-4 py-3 text-sm", msg.role === "user" ? "text-white" : "text-white/90")}>
                  <div className="absolute inset-0 rounded-2xl p-[1px] overflow-hidden">
                    <div className="absolute inset-0 rounded-2xl animate-gradient opacity-50" style={{ background: msg.role === "user" ? "linear-gradient(90deg, #3b82f6, #a855f7, #3b82f6)" : "linear-gradient(90deg, #06b6d4, #22c55e, #06b6d4)", backgroundSize: "200% 100%" }} />
                  </div>
                  <div className={cn("relative rounded-2xl px-4 py-3 prose prose-sm prose-invert max-w-none select-text", msg.role === "user" ? "bg-[hsl(222,47%,12%)]" : "bg-[hsl(222,47%,8%)]")}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                    {msg.role === "assistant" && <MessageCopyButton content={msg.content} className="absolute top-1 right-1" />}
                  </div>
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(168,85,247,0.3))", boxShadow: "0 0 15px rgba(59,130,246,0.3)" }}>
                    <User className="h-4 w-4 text-blue-400" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.3), rgba(59,130,246,0.3))" }}>
                  <Bot className="h-4 w-4 text-cyan-400 animate-pulse" />
                </div>
                <div className="relative rounded-2xl p-[1px] overflow-hidden">
                  <div className="absolute inset-0 rounded-2xl animate-gradient opacity-50" style={{ background: "linear-gradient(90deg, #06b6d4, #22c55e, #06b6d4)", backgroundSize: "200% 100%" }} />
                  <div className="relative rounded-2xl px-4 py-3 bg-[hsl(222,47%,8%)]">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <DarkLemonSupervisionBar />
          <div className="p-4 border-t border-white/10">

            <div className="relative rounded-xl p-[1px] overflow-hidden">
              <div className="absolute inset-0 rounded-xl animate-gradient opacity-60" style={{ background: "linear-gradient(90deg, #3b82f6, #ec4899, #22c55e, #06b6d4, #3b82f6)", backgroundSize: "300% 100%" }} />
              <div className="relative flex items-center gap-2 bg-[hsl(222,47%,8%)] rounded-xl px-4 py-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Chiedimi qualsiasi cosa sui dati..."
                  className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 focus:outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="p-2 rounded-lg disabled:opacity-30 transition-all hover:scale-110"
                  style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.3), rgba(59,130,246,0.3))", boxShadow: "0 0 15px rgba(6,182,212,0.2)" }}
                >
                  <Send className="h-4 w-4 text-cyan-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
