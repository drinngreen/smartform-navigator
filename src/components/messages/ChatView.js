import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { MessageCopyButton } from "@/components/ai/MessageCopyButton";
export function ChatView({ partnerId, className }) {
    const { user } = useAuth();
    const { messages, loading, sendMessage, markAsRead } = useMessages(partnerId);
    const [newMessage, setNewMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef(null);
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages.length]);
    useEffect(() => {
        markAsRead();
    }, [messages, markAsRead]);
    const handleSend = async () => {
        if (!newMessage.trim() || isSending)
            return;
        setIsSending(true);
        try {
            await sendMessage(newMessage.trim());
            setNewMessage("");
        }
        catch {
            // handled in hook
        }
        finally {
            setIsSending(false);
        }
    };
    return (_jsxs("div", { className: cn("flex flex-col", className), children: [_jsx("div", { ref: scrollRef, className: "flex-1 overflow-y-auto p-4 space-y-3", children: loading ? (_jsx("div", { className: "flex items-center justify-center h-full text-muted-foreground", children: "Caricamento messaggi..." })) : messages.length === 0 ? (_jsx("div", { className: "flex items-center justify-center h-full text-muted-foreground text-sm", children: "Nessun messaggio. Inizia una conversazione!" })) : (messages.map((msg) => {
                    const isOwn = msg.sender_id === user?.id;
                    return (_jsx("div", { className: cn("flex group", isOwn ? "justify-end" : "justify-start"), children: _jsxs("div", { className: cn("max-w-[80%] rounded-2xl px-4 py-2 text-sm select-text relative", isOwn ? "bg-primary/20 text-foreground rounded-br-md" : "bg-card border border-border/30 text-foreground rounded-bl-md"), children: [_jsx("p", { className: "whitespace-pre-wrap", children: msg.content }), _jsx("p", { className: "text-[10px] text-muted-foreground mt-1 text-right font-mono", children: format(new Date(msg.created_at), "HH:mm", { locale: it }) }), !isOwn && _jsx(MessageCopyButton, { content: msg.content, className: "absolute -top-1 -right-1" })] }) }, msg.id));
                })) }), _jsx("div", { className: "p-3 border-t border-border/30", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "text", value: newMessage, onChange: (e) => setNewMessage(e.target.value), onKeyDown: (e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend()), placeholder: "Scrivi un messaggio...", className: "flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" }), _jsx("button", { onClick: handleSend, disabled: !newMessage.trim() || isSending, className: "p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-50 hover:brightness-110 transition-all", children: _jsx(Send, { className: "h-4 w-4" }) })] }) })] }));
}
