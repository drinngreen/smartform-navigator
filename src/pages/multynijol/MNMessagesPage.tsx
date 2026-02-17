import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useMessages, Message } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare, Send, Paperclip, ArrowLeft, User, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function MNMessagesPage() {
  const { context, partnerId } = useParams<{ context: string; partnerId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { messages, conversations, loading, sending, sendMessage, markAsRead, getAttachmentUrl, refetch } = useMessages(partnerId);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const basePath = `/mn/admin/${context}/messaggi`;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (partnerId) markAsRead();
  }, [partnerId, markAsRead]);

  const handleSend = async () => {
    if (!text.trim() && files.length === 0) return;
    await sendMessage(text.trim(), files.length > 0 ? files : undefined);
    setText("");
    setFiles([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <MNAdminLayout title="Messaggi" subtitle="Comunicazioni interne">
      <div className="flex h-[calc(100vh-180px)] rounded-2xl border border-border/30 bg-card/60 backdrop-blur-xl overflow-hidden">
        {/* Sidebar */}
        <div className={`w-80 border-r border-border/30 flex flex-col ${partnerId ? "hidden lg:flex" : "flex w-full lg:w-80"}`}>
          <div className="p-4 border-b border-border/30">
            <h3 className="text-sm font-display uppercase tracking-wider text-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-pink-400" />
              Conversazioni
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && !partnerId ? (
              <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-pink-400 mx-auto" /></div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Nessuna conversazione</div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.user_id}
                  onClick={() => navigate(`${basePath}/${conv.user_id}`)}
                  className={`w-full text-left p-4 border-b border-border/10 hover:bg-white/5 transition-colors ${partnerId === conv.user_id ? "bg-pink-500/10 border-l-2 border-l-pink-400" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-pink-600/30 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-pink-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-foreground truncate">{conv.user_name}</span>
                        {conv.unread_count > 0 && (
                          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-pink-500 text-white font-bold">{conv.unread_count}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message || "..."}</p>
                      <p className="text-[10px] text-white/40 mt-0.5">{format(new Date(conv.last_message_time), "dd/MM HH:mm", { locale: it })}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col ${!partnerId ? "hidden lg:flex" : "flex"}`}>
          {partnerId ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border/30 flex items-center gap-3">
                <button onClick={() => navigate(basePath)} className="lg:hidden p-2 rounded-lg hover:bg-white/10">
                  <ArrowLeft className="h-5 w-5 text-white" />
                </button>
                <div className="w-10 h-10 rounded-full bg-pink-600/30 flex items-center justify-center">
                  <User className="h-5 w-5 text-pink-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {conversations.find(c => c.user_id === partnerId)?.user_name || "Utente"}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-pink-400" /></div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">Nessun messaggio. Inizia la conversazione!</div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? "bg-pink-600 text-white rounded-br-md" : "bg-white/10 text-foreground rounded-bl-md"}`}>
                          {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                          {(msg as any).message_attachments?.map((att: any) => (
                            <AttachmentLink key={att.id} attachment={att} getUrl={getAttachmentUrl} />
                          ))}
                          <p className={`text-[10px] mt-1 ${isMe ? "text-pink-200" : "text-white/40"}`}>
                            {format(new Date(msg.created_at), "HH:mm", { locale: it })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border/30">
                {files.length > 0 && (
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {files.map((f, i) => (
                      <span key={i} className="text-xs bg-white/10 px-2 py-1 rounded text-foreground">
                        {f.name}
                        <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="ml-1 text-red-400">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                    <Paperclip className="h-5 w-5 text-white/70" />
                  </button>
                  <input ref={fileInputRef} type="file" multiple className="hidden" accept=".jpg,.jpeg,.png,.pdf,.xlsx,.xls" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Scrivi un messaggio..."
                    className="flex-1 bg-white/10 text-foreground rounded-lg px-4 py-2.5 text-sm border border-border/30 placeholder:text-white/30 focus:outline-none focus:border-pink-500"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || (!text.trim() && files.length === 0)}
                    className="p-2.5 rounded-lg bg-pink-600 text-white hover:bg-pink-500 transition-colors disabled:opacity-40"
                  >
                    {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Seleziona una conversazione per iniziare</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </MNAdminLayout>
  );
}

function AttachmentLink({ attachment, getUrl }: { attachment: any; getUrl: (path: string) => Promise<string | null> }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { getUrl(attachment.file_path).then(setUrl); }, [attachment.file_path]);
  if (!url) return <span className="text-xs opacity-50">{attachment.file_name}</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block text-xs text-pink-300 underline mt-1">
      📎 {attachment.file_name}
    </a>
  );
}
