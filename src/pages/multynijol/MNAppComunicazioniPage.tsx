import { useParams } from "react-router-dom";
import { MNBottomNav } from "@/components/layout/MNBottomNav";
import { MobileShell } from "@/components/layout/MobileShell";
import { useMessages, useAdminId } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import { Send, MessageCircle, Camera, FileText } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import logoDragon from "@/assets/logo-dragon.png";

export default function MNAppComunicazioniPage() {
  const { context } = useParams<{ context: string }>();
  const basePath = `/mn/app/${context || "multyproget"}`;
  const { user } = useAuth();
  const adminId = useAdminId();
  const { messages, loading: isLoading, sendMessage } = useMessages(adminId || undefined);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages?.length]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    try { await sendMessage(newMessage.trim()); setNewMessage(""); } catch {}
  };

  return (
    <MobileShell>
      <div className="flex flex-col h-full min-h-screen">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(192, 173, 103, 0.15)' }}>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground tracking-wider">ZOLI MESSAGES</h1>
            <p className="text-muted-foreground text-xs font-mono mt-1 flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> Chat con {context === "niyol" ? "Niyol" : "Multyproget"}
            </p>
          </div>
          <img src={logoDragon} alt="Dragon" className="h-8 w-8 opacity-60" />
        </div>

        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(192, 173, 103, 0.15)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary/50 border border-primary/30 flex items-center justify-center">
              <span className="text-sm font-display font-bold text-foreground">{context === "niyol" ? "N" : "M"}</span>
            </div>
            <div>
              <p className="text-sm font-display font-semibold text-foreground">{context === "niyol" ? "Niyol" : "Multyproget"}</p>
              <p className="text-xs text-neon-green font-mono">Online</p>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><div className="text-primary animate-pulse font-display">Caricamento...</div></div>
          ) : (!messages || messages.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground text-sm">Nessun messaggio</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Inizia la conversazione!</p>
            </div>
          ) : (
            messages.map((msg: any) => {
              const isMine = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${isMine ? "bg-primary/20 text-foreground rounded-br-sm" : "bg-card/60 border border-border/30 text-foreground rounded-bl-sm"}`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{msg.created_at ? format(new Date(msg.created_at), "HH:mm", { locale: it }) : ""}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 py-3 pb-20" style={{ borderTop: '1px solid rgba(192, 173, 103, 0.15)' }}>
          <div className="flex items-center gap-2">
            <button className="p-2 text-primary/60 hover:text-primary transition-colors"><Camera className="h-5 w-5" /></button>
            <button className="p-2 text-primary/60 hover:text-primary transition-colors"><FileText className="h-5 w-5" /></button>
            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Scrivi un messaggio..." className="flex-1 bg-secondary/50 border border-border/30 rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <button onClick={handleSend} className="p-2.5 rounded-xl text-primary hover:text-primary/80 transition-all"><Send className="h-5 w-5" /></button>
          </div>
        </div>

        <MNBottomNav basePath={basePath} />
      </div>
    </MobileShell>
  );
}
