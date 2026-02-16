import { BottomNav } from "@/components/layout/BottomNav";
import { MobileShell } from "@/components/layout/MobileShell";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Send, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function ComunicazioniPage() {
  const { user } = useAuth();
  const { messages, loading: isLoading, sendMessage } = useMessages();
  const [newMessage, setNewMessage] = useState("");

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    try {
      await sendMessage(newMessage.trim());
      setNewMessage("");
    } catch {
      // error handled in hook
    }
  };

  return (
    <MobileShell>
      <div className="px-4 pt-4 pb-2" style={{ borderBottom: '1px solid rgba(192, 173, 103, 0.15)' }}>
        <h1 className="text-xl font-display font-bold text-foreground tracking-wider">Comunicazioni</h1>
        <p className="text-muted-foreground text-xs font-mono mt-1">Messaggi con la sede</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-primary animate-pulse font-display">Caricamento...</div>
          </div>
        ) : (!messages || messages.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">Nessun messaggio</p>
          </div>
        ) : (
          messages.map((msg: any) => {
            const isMine = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                  isMine
                    ? "bg-primary/20 text-foreground rounded-br-sm"
                    : "bg-card/60 border border-border/30 text-foreground rounded-bl-sm"
                }`}>
                  <p>{msg.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {msg.created_at ? format(new Date(msg.created_at), "HH:mm", { locale: it }) : ""}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input area */}
      <div className="px-4 py-3 pb-20 border-t border-border/30">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Scrivi un messaggio..."
            className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleSend}
            className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:brightness-110 transition-all"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>

      <BottomNav />
    </MobileShell>
  );
}
