import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare, Send, Paperclip, ArrowLeft, User, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
export default function AdminMessagesPage() {
    const { partnerId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { messages, conversations, loading, sending, sendMessage, markAsRead, getAttachmentUrl, refetch } = useMessages(partnerId);
    const [text, setText] = useState("");
    const [files, setFiles] = useState([]);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);
    useEffect(() => {
        if (partnerId)
            markAsRead();
    }, [partnerId, markAsRead]);
    const handleSend = async () => {
        if (!text.trim() && files.length === 0)
            return;
        await sendMessage(text.trim(), files.length > 0 ? files : undefined);
        setText("");
        setFiles([]);
    };
    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };
    return (_jsx(AdminLayout, { title: "Zoli Messages", subtitle: "Messaggistica interna", children: _jsxs("div", { className: "flex h-[calc(100vh-180px)] rounded-2xl border border-border/30 bg-card/60 backdrop-blur-xl overflow-hidden", children: [_jsxs("div", { className: `w-80 border-r border-border/30 flex flex-col ${partnerId ? "hidden lg:flex" : "flex w-full lg:w-80"}`, children: [_jsx("div", { className: "p-4 border-b border-border/30", children: _jsxs("h3", { className: "text-sm font-display uppercase tracking-wider text-foreground flex items-center gap-2", children: [_jsx(MessageSquare, { className: "h-4 w-4 text-cyan-400" }), "Conversazioni"] }) }), _jsx("div", { className: "flex-1 overflow-y-auto", children: loading && !partnerId ? (_jsx("div", { className: "p-8 text-center", children: _jsx(Loader2, { className: "h-6 w-6 animate-spin text-cyan-400 mx-auto" }) })) : conversations.length === 0 ? (_jsx("div", { className: "p-8 text-center text-sm text-muted-foreground", children: "Nessuna conversazione" })) : (conversations.map((conv) => (_jsx("button", { onClick: () => navigate(`/admin/messaggi/${conv.user_id}`), className: `w-full text-left p-4 border-b border-border/10 hover:bg-white/5 transition-colors ${partnerId === conv.user_id ? "bg-cyan-500/10 border-l-2 border-l-cyan-400" : ""}`, children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-10 h-10 rounded-full bg-cyan-600/30 flex items-center justify-center flex-shrink-0", children: _jsx(User, { className: "h-5 w-5 text-cyan-400" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-sm font-medium text-foreground truncate", children: conv.user_name }), conv.unread_count > 0 && (_jsx("span", { className: "ml-2 px-2 py-0.5 text-xs rounded-full bg-cyan-500 text-white font-bold", children: conv.unread_count }))] }), _jsx("p", { className: "text-xs text-muted-foreground truncate mt-0.5", children: conv.last_message || "..." }), _jsx("p", { className: "text-[10px] text-white/40 mt-0.5", children: format(new Date(conv.last_message_time), "dd/MM HH:mm", { locale: it }) })] })] }) }, conv.user_id)))) })] }), _jsx("div", { className: `flex-1 flex flex-col ${!partnerId ? "hidden lg:flex" : "flex"}`, children: partnerId ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "p-4 border-b border-border/30 flex items-center gap-3", children: [_jsx("button", { onClick: () => navigate("/admin/messaggi"), className: "lg:hidden p-2 rounded-lg hover:bg-white/10", children: _jsx(ArrowLeft, { className: "h-5 w-5 text-white" }) }), _jsx("div", { className: "w-10 h-10 rounded-full bg-cyan-600/30 flex items-center justify-center", children: _jsx(User, { className: "h-5 w-5 text-cyan-400" }) }), _jsx("div", { className: "flex-1", children: _jsx("p", { className: "text-sm font-semibold text-foreground", children: conversations.find(c => c.user_id === partnerId)?.user_name || "Utente" }) })] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-4 space-y-3", children: [loading ? (_jsx("div", { className: "flex justify-center py-8", children: _jsx(Loader2, { className: "h-6 w-6 animate-spin text-cyan-400" }) })) : messages.length === 0 ? (_jsx("div", { className: "text-center text-sm text-muted-foreground py-8", children: "Nessun messaggio. Inizia la conversazione!" })) : (messages.map((msg) => {
                                        const isMe = msg.sender_id === user?.id;
                                        return (_jsx("div", { className: `flex ${isMe ? "justify-end" : "justify-start"}`, children: _jsxs("div", { className: `max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? "bg-cyan-600 text-white rounded-br-md" : "bg-white/10 text-foreground rounded-bl-md"}`, children: [msg.content && _jsx("p", { className: "whitespace-pre-wrap", children: msg.content }), msg.message_attachments?.map((att) => (_jsx(AttachmentLink, { attachment: att, getUrl: getAttachmentUrl }, att.id))), _jsx("p", { className: `text-[10px] mt-1 ${isMe ? "text-cyan-200" : "text-white/40"}`, children: format(new Date(msg.created_at), "HH:mm", { locale: it }) })] }) }, msg.id));
                                    })), _jsx("div", { ref: messagesEndRef })] }), _jsxs("div", { className: "p-4 border-t border-border/30", children: [files.length > 0 && (_jsx("div", { className: "flex gap-2 mb-2 flex-wrap", children: files.map((f, i) => (_jsxs("span", { className: "text-xs bg-white/10 px-2 py-1 rounded text-foreground", children: [f.name, _jsx("button", { onClick: () => setFiles(prev => prev.filter((_, j) => j !== i)), className: "ml-1 text-red-400", children: "\u00D7" })] }, i))) })), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => fileInputRef.current?.click(), className: "p-2.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors", children: _jsx(Paperclip, { className: "h-5 w-5 text-white/70" }) }), _jsx("input", { ref: fileInputRef, type: "file", multiple: true, className: "hidden", accept: ".jpg,.jpeg,.png,.pdf,.xlsx,.xls", onChange: (e) => setFiles(Array.from(e.target.files || [])) }), _jsx("input", { type: "text", value: text, onChange: (e) => setText(e.target.value), onKeyDown: handleKeyDown, placeholder: "Scrivi un messaggio...", className: "flex-1 bg-white/10 text-foreground rounded-lg px-4 py-2.5 text-sm border border-border/30 placeholder:text-white/30 focus:outline-none focus:border-cyan-500" }), _jsx("button", { onClick: handleSend, disabled: sending || (!text.trim() && files.length === 0), className: "p-2.5 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 transition-colors disabled:opacity-40", children: sending ? _jsx(Loader2, { className: "h-5 w-5 animate-spin" }) : _jsx(Send, { className: "h-5 w-5" }) })] })] })] })) : (_jsx("div", { className: "flex-1 flex items-center justify-center text-muted-foreground text-sm", children: _jsxs("div", { className: "text-center", children: [_jsx(MessageSquare, { className: "h-12 w-12 mx-auto mb-3 opacity-30" }), _jsx("p", { children: "Seleziona una conversazione per iniziare" })] }) })) })] }) }));
}
function AttachmentLink({ attachment, getUrl }) {
    const [url, setUrl] = useState(null);
    useEffect(() => { getUrl(attachment.file_path).then(setUrl); }, [attachment.file_path]);
    if (!url)
        return _jsx("span", { className: "text-xs opacity-50", children: attachment.file_name });
    return (_jsxs("a", { href: url, target: "_blank", rel: "noopener noreferrer", className: "block text-xs text-cyan-300 underline mt-1", children: ["\uD83D\uDCCE ", attachment.file_name] }));
}
