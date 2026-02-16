import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileShell } from "@/components/layout/MobileShell";
import { useAIAgent } from "@/hooks/useAIAgent";
import { Send, Bot, User, FileText, Mic } from "lucide-react";
import logoDragon from "@/assets/logo-dragon.png";

export default function AIAssistantPage() {
  const navigate = useNavigate();
  const { messages, isLoading, sendMessage } = useAIAgent();
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");
    await sendMessage(text);
  };

  const quickActions = [
    { icon: "📋", title: "Compila FIR", desc: "Inizia a dettare un FIR" },
    { icon: "🟢", title: "Codice EER", desc: "Cerca un codice EER" },
    { icon: "📚", title: "Normativa", desc: "Domande su RENTRI" },
    { icon: "📊", title: "Riepilogo", desc: "Mostra dati FIR inseriti" },
  ];

  return (
    <MobileShell>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(192, 173, 103, 0.15)' }}>
        <div className="flex items-center gap-2">
          <img src={logoDragon} alt="Dragon" className="h-8 w-8" style={{ filter: 'drop-shadow(0 0 6px rgba(192, 173, 103, 0.4))' }} />
          <div>
            <h1 className="text-lg font-display font-bold text-foreground tracking-wider">ZOLI DRAGON AI</h1>
            <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest">Assistente FIR • RAG • Multi-Tool</p>
          </div>
        </div>
      </div>

      {/* Sub-header */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-border/20">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs font-display text-foreground">ZOLI DRAGON AI</p>
            <p className="text-[10px] text-muted-foreground font-mono">Assistente FIR/RENTRI • Compilazione automatica</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/app")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/30 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <FileText className="h-3.5 w-3.5" /> Vai al FIR
        </button>
      </div>

      {/* Messages / Welcome */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center text-center pt-6">
            <div className="w-14 h-14 rounded-2xl bg-card/60 border border-border/30 flex items-center justify-center mb-4">
              <Bot className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-lg font-display font-bold text-foreground mb-2">Ciao! Sono ZOLI DRAGON AI</h2>
            <p className="text-sm text-muted-foreground max-w-xs mb-1">
              Il tuo assistente per la compilazione FIR. <strong className="text-foreground">Dettami le informazioni</strong> e le inserirò automaticamente nel form.
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              Per esempio: "Il produttore è Eco Srl, codice fiscale 12345678901"
            </p>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-2 w-full">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(action.title); }}
                  className="p-3 rounded-xl bg-card/60 border border-border/30 text-left hover:border-primary/30 transition-colors"
                >
                  <p className="text-sm font-display text-foreground flex items-center gap-1.5">
                    <span>{action.icon}</span> {action.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{action.desc}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                msg.role === "user"
                  ? "bg-primary/20 text-foreground rounded-br-sm"
                  : "bg-card/60 border border-border/30 text-foreground rounded-bl-sm"
              }`}>
                <div className="flex items-center gap-1.5 mb-1">
                  {msg.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3 text-primary" />}
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {msg.role === "user" ? "Tu" : "Dragon AI"}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))
        )}
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
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Scrivi o detta i dati del FIR..."
            className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button className="p-2.5 text-muted-foreground hover:text-primary transition-colors">
            <Mic className="h-5 w-5" />
          </button>
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <p className="text-[10px] text-primary/60 font-mono mt-1.5 text-center">
          Detta i dati del FIR e verranno inseriti automaticamente nel form
        </p>
      </div>

      <BottomNav />
    </MobileShell>
  );
}
