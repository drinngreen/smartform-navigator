import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Send } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
export function SocialChat({ partnerId, partnerName, onBack }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const scrollRef = useRef(null);
    const fetchMessages = useCallback(async () => {
        if (!user)
            return;
        const { data } = await supabase
            .from("messages")
            .select("id, sender_id, receiver_id, content, created_at")
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
            .order("created_at", { ascending: true });
        setMessages(data || []);
        setLoading(false);
        // Mark as read
        await supabase
            .from("messages")
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq("receiver_id", user.id)
            .eq("sender_id", partnerId)
            .eq("is_read", false);
    }, [user, partnerId]);
    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages.length]);
    useEffect(() => {
        if (!user)
            return;
        const channel = supabase
            .channel(`dm-${partnerId}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
            const msg = payload.new;
            if ((msg.sender_id === user.id && msg.receiver_id === partnerId) ||
                (msg.sender_id === partnerId && msg.receiver_id === user.id)) {
                setMessages((prev) => [...prev, msg]);
            }
        })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [user, partnerId]);
    const handleSend = async () => {
        if (!newMessage.trim() || sending || !user)
            return;
        setSending(true);
        await supabase.from("messages").insert({
            sender_id: user.id,
            receiver_id: partnerId,
            content: newMessage.trim(),
        });
        setNewMessage("");
        setSending(false);
    };
    return (_jsxs("div", { className: "flex flex-col h-full", children: [_jsxs("div", { className: "flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-card/80 backdrop-blur-sm", children: [_jsx("button", { onClick: onBack, className: "p-2 rounded-xl hover:bg-secondary/60 text-muted-foreground transition-all", children: _jsx(ArrowLeft, { size: 18 }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h3", { className: "text-sm font-semibold text-foreground truncate", children: partnerName }), _jsx("p", { className: "text-[10px] text-muted-foreground", children: "Messaggio diretto" })] })] }), _jsx("div", { ref: scrollRef, className: "flex-1 overflow-y-auto p-4 space-y-2.5", children: loading ? (_jsx("div", { className: "flex items-center justify-center h-full text-muted-foreground text-sm", children: "Caricamento..." })) : messages.length === 0 ? (_jsxs("div", { className: "flex items-center justify-center h-full text-muted-foreground text-sm", children: ["Inizia una conversazione con ", partnerName, "!"] })) : (messages.map((msg) => {
                    const isOwn = msg.sender_id === user?.id;
                    return (_jsx("div", { className: `flex ${isOwn ? "justify-end" : "justify-start"}`, children: _jsxs("div", { className: `max-w-[80%] rounded-2xl px-4 py-2 text-sm ${isOwn
                                ? "bg-primary/20 text-foreground rounded-br-md"
                                : "bg-card border border-border/30 text-foreground rounded-bl-md"}`, children: [_jsx("p", { className: "whitespace-pre-wrap", children: msg.content }), _jsx("p", { className: "text-[10px] text-muted-foreground mt-1 text-right font-mono", children: format(new Date(msg.created_at), "HH:mm", { locale: it }) })] }) }, msg.id));
                })) }), _jsx("div", { className: "p-3 border-t border-border/30", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "text", value: newMessage, onChange: (e) => setNewMessage(e.target.value), onKeyDown: (e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend()), placeholder: "Scrivi un messaggio...", className: "flex-1 bg-secondary/50 border border-border/30 rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50" }), _jsx("button", { onClick: handleSend, disabled: !newMessage.trim() || sending, className: "p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-50 hover:brightness-110 transition-all", children: _jsx(Send, { className: "h-4 w-4" }) })] }) })] }));
}
