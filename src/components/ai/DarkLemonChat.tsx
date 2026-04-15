import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Plus, Trash2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAIAgent } from "@/hooks/useAIAgent";
import zoliLemonIcon from "@/assets/zoli-dark-lemon-icon.png";
import { MessageCopyButton } from "./MessageCopyButton";

export function DarkLemonChat() {
  const {
    messages, isLoading, conversations, currentConversationId,
    sendMessage, loadConversation, deleteConversation, newChat,
  } = useAIAgent();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-4">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-64 shrink-0 relative rounded-2xl p-[2px] overflow-hidden">
          <div className="absolute inset-0 rounded-2xl animate-gradient" style={{ background: "linear-gradient(90deg, #3b82f6, #ec4899, #22c55e, #06b6d4, #a855f7, #f59e0b, #3b82f6)", backgroundSize: "300% 100%" }} />
          <div className="relative h-full rounded-2xl bg-[hsl(222,47%,6%)] flex flex-col">
            <div className="p-3 border-b border-white/10">
              <button
                onClick={newChat}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs hover:bg-cyan-500/20 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Nuova Chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group flex items-center gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors",
                    conv.id === currentConversationId
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                  onClick={() => loadConversation(conv.id)}
                >
                  <MessageSquare className="h-3 w-3 shrink-0" />
                  <span className="flex-1 truncate">{conv.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main chat */}
      <div className="flex-1 relative rounded-2xl p-[2px] overflow-hidden">
        {/* LED border */}
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
              <p className="text-white/40 text-xs">Assistente intelligente per la gestione rifiuti</p>
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="ml-auto p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            >
              <MessageSquare className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <img src={zoliLemonIcon} alt="Dark Lemon" className="h-20 w-20 mb-4 opacity-40" />
                <h3 className="text-white/60 font-display text-lg mb-2">DARK LEMON AI</h3>
                <p className="text-white/30 text-sm max-w-md">
                  Chiedimi qualsiasi cosa sulla gestione dei rifiuti, compilazione FIR, normative RENTRI...
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={msg.id || i} className={cn("flex gap-3 group", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1" style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.3), rgba(59,130,246,0.3))", boxShadow: "0 0 15px rgba(6,182,212,0.3)" }}>
                    <Bot className="h-4 w-4 text-cyan-400" />
                  </div>
                )}
                <div className={cn(
                  "relative max-w-[75%] rounded-2xl px-4 py-3 text-sm",
                  msg.role === "user"
                    ? "text-white"
                    : "text-white/90"
                )}>
                  <div className="absolute inset-0 rounded-2xl p-[1px] overflow-hidden">
                    <div className="absolute inset-0 rounded-2xl animate-gradient opacity-50" style={{ background: msg.role === "user" ? "linear-gradient(90deg, #3b82f6, #a855f7, #3b82f6)" : "linear-gradient(90deg, #06b6d4, #22c55e, #06b6d4)", backgroundSize: "200% 100%" }} />
                  </div>
                  <div className={cn("relative rounded-2xl px-4 py-3 select-text", msg.role === "user" ? "bg-[hsl(222,47%,12%)]" : "bg-[hsl(222,47%,8%)]")}>
                    {msg.content}
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
                      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="p-4 border-t border-white/10">
            <div className="relative rounded-xl p-[1px] overflow-hidden">
              <div className="absolute inset-0 rounded-xl animate-gradient opacity-60" style={{ background: "linear-gradient(90deg, #3b82f6, #ec4899, #22c55e, #06b6d4, #3b82f6)", backgroundSize: "300% 100%" }} />
              <div className="relative flex items-center gap-2 bg-[hsl(222,47%,8%)] rounded-xl px-4 py-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Scrivi un messaggio..."
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
