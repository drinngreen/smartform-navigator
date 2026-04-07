import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useSocialGroups } from "@/hooks/useSocialGroups";
import { ArrowLeft, Send, Users } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
export function SocialGroupChat({ groupId, groupName, onBack }) {
    const { user } = useAuth();
    const { fetchGroupMessages, sendGroupMessage } = useSocialGroups();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const scrollRef = useRef(null);
    const loadMessages = useCallback(async () => {
        const msgs = await fetchGroupMessages(groupId);
        setMessages(msgs);
        setLoading(false);
    }, [groupId, fetchGroupMessages]);
    useEffect(() => {
        loadMessages();
    }, [loadMessages]);
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages.length]);
    useEffect(() => {
        const channel = supabase
            .channel(`group-${groupId}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "social_group_messages", filter: `group_id=eq.${groupId}` }, () => {
            loadMessages();
        })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [groupId, loadMessages]);
    const handleSend = async () => {
        if (!newMessage.trim() || sending)
            return;
        setSending(true);
        await sendGroupMessage(groupId, newMessage);
        setNewMessage("");
        setSending(false);
    };
    return (_jsxs("div", { className: "flex flex-col h-full", children: [_jsxs("div", { className: "flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-card/80 backdrop-blur-sm", children: [_jsx("button", { onClick: onBack, className: "p-2 rounded-xl hover:bg-secondary/60 text-muted-foreground transition-all", children: _jsx(ArrowLeft, { size: 18 }) }), _jsx("div", { className: "w-9 h-9 rounded-full bg-gradient-to-br from-primary/40 to-accent/30 flex items-center justify-center", children: _jsx(Users, { size: 16, className: "text-primary" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h3", { className: "text-sm font-semibold text-foreground truncate", children: groupName }), _jsx("p", { className: "text-[10px] text-muted-foreground", children: "Gruppo" })] })] }), _jsx("div", { ref: scrollRef, className: "flex-1 overflow-y-auto p-4 space-y-2.5", children: loading ? (_jsx("div", { className: "flex items-center justify-center h-full text-muted-foreground text-sm", children: "Caricamento..." })) : messages.length === 0 ? (_jsx("div", { className: "flex items-center justify-center h-full text-muted-foreground text-sm", children: "Inizia una conversazione nel gruppo!" })) : (messages.map((msg) => {
                    const isOwn = msg.sender_id === user?.id;
                    return (_jsx("div", { className: `flex ${isOwn ? "justify-end" : "justify-start"}`, children: _jsxs("div", { className: `max-w-[80%] rounded-2xl px-4 py-2 text-sm ${isOwn
                                ? "bg-primary/20 text-foreground rounded-br-md"
                                : "bg-card border border-border/30 text-foreground rounded-bl-md"}`, children: [!isOwn && (_jsxs("p", { className: "text-[10px] font-semibold text-primary mb-0.5", children: [msg.sender_nome, " ", msg.sender_cognome] })), _jsx("p", { className: "whitespace-pre-wrap", children: msg.content }), _jsx("p", { className: "text-[10px] text-muted-foreground mt-1 text-right font-mono", children: format(new Date(msg.created_at), "HH:mm", { locale: it }) })] }) }, msg.id));
                })) }), _jsx("div", { className: "p-3 border-t border-border/30", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "text", value: newMessage, onChange: (e) => setNewMessage(e.target.value), onKeyDown: (e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend()), placeholder: "Scrivi nel gruppo...", className: "flex-1 bg-secondary/50 border border-border/30 rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50" }), _jsx("button", { onClick: handleSend, disabled: !newMessage.trim() || sending, className: "p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-50 hover:brightness-110 transition-all", children: _jsx(Send, { className: "h-4 w-4" }) })] }) })] }));
}
