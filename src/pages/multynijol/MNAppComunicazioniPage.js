import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLocation } from "react-router-dom";
import { MNBottomNav } from "@/components/layout/MNBottomNav";
import { MobileShell } from "@/components/layout/MobileShell";
import { useMessages } from "@/hooks/useMessages";
import { useMNAdminId } from "@/hooks/useMNAdminId";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import { Send, MessageCircle, Camera, FileText } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import logoDragon from "@/assets/logo-dragon.png";
export default function MNAppComunicazioniPage() {
    const location = useLocation();
    const context = location.pathname.includes("/niyol") ? "niyol" : "multyproget";
    const basePath = `/mn/app/${context}`;
    const { user } = useAuth();
    const adminId = useMNAdminId(context);
    const { messages, loading: isLoading, sendMessage } = useMessages(adminId || undefined);
    const [newMessage, setNewMessage] = useState("");
    const scrollRef = useRef(null);
    useEffect(() => { if (scrollRef.current)
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages?.length]);
    const handleSend = async () => { if (!newMessage.trim())
        return; try {
        await sendMessage(newMessage.trim());
        setNewMessage("");
    }
    catch { } };
    return (_jsx(MobileShell, { children: _jsxs("div", { className: "flex flex-col h-full min-h-screen", children: [_jsxs("div", { className: "px-4 pt-4 pb-2 flex items-center justify-between", style: { borderBottom: '1px solid rgba(192, 173, 103, 0.15)' }, children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-display font-bold text-foreground tracking-wider", children: "ZOLI MESSAGES" }), _jsxs("p", { className: "text-muted-foreground text-xs font-mono mt-1 flex items-center gap-1", children: [_jsx(MessageCircle, { className: "h-3 w-3" }), " Chat con ", context === "niyol" ? "Niyol" : "Multyproget"] })] }), _jsx("img", { src: logoDragon, alt: "Dragon", className: "h-8 w-8 opacity-60" })] }), _jsx("div", { className: "px-4 py-3", style: { borderBottom: '1px solid rgba(192, 173, 103, 0.15)' }, children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-10 h-10 rounded-full bg-secondary/50 border border-primary/30 flex items-center justify-center", children: _jsx("span", { className: "text-sm font-display font-bold text-foreground", children: context === "niyol" ? "N" : "M" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-display font-semibold text-foreground", children: context === "niyol" ? "Niyol" : "Multyproget" }), _jsx("p", { className: "text-xs text-neon-green font-mono", children: "Online" })] })] }) }), _jsx("div", { ref: scrollRef, className: "flex-1 overflow-y-auto px-4 py-4 space-y-3", children: isLoading ? (_jsx("div", { className: "flex items-center justify-center py-12", children: _jsx("div", { className: "text-primary animate-pulse font-display", children: "Caricamento..." }) })) : (!messages || messages.length === 0) ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-16 text-center", children: [_jsx("p", { className: "text-muted-foreground text-sm", children: "Nessun messaggio" }), _jsx("p", { className: "text-muted-foreground/60 text-xs mt-1", children: "Inizia la conversazione!" })] })) : (messages.map((msg) => {
                        const isMine = msg.sender_id === user?.id;
                        return (_jsx("div", { className: `flex ${isMine ? "justify-end" : "justify-start"}`, children: _jsxs("div", { className: `max-w-[75%] p-3 rounded-2xl text-sm ${isMine ? "bg-primary/20 text-foreground rounded-br-sm" : "bg-card/60 border border-border/30 text-foreground rounded-bl-sm"}`, children: [_jsx("p", { className: "whitespace-pre-wrap", children: msg.content }), _jsx("p", { className: "text-[10px] text-muted-foreground mt-1", children: msg.created_at ? format(new Date(msg.created_at), "HH:mm", { locale: it }) : "" })] }) }, msg.id));
                    })) }), _jsx("div", { className: "px-4 py-3 pb-20", style: { borderTop: '1px solid rgba(192, 173, 103, 0.15)' }, children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { className: "p-2 text-primary/60 hover:text-primary transition-colors", children: _jsx(Camera, { className: "h-5 w-5" }) }), _jsx("button", { className: "p-2 text-primary/60 hover:text-primary transition-colors", children: _jsx(FileText, { className: "h-5 w-5" }) }), _jsx("input", { type: "text", value: newMessage, onChange: (e) => setNewMessage(e.target.value), onKeyDown: (e) => e.key === "Enter" && handleSend(), placeholder: "Scrivi un messaggio...", className: "flex-1 bg-secondary/50 border border-border/30 rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" }), _jsx("button", { onClick: handleSend, className: "p-2.5 rounded-xl text-primary hover:text-primary/80 transition-all", children: _jsx(Send, { className: "h-5 w-5" }) })] }) }), _jsx(MNBottomNav, { basePath: basePath })] }) }));
}
