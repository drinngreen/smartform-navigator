import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
export function SocialComments({ postId, fetchComments, addComment }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        fetchComments(postId).then((c) => {
            setComments(c);
            setLoading(false);
        });
    }, [postId, fetchComments]);
    const handleSubmit = async () => {
        if (!newComment.trim())
            return;
        await addComment(postId, newComment.trim());
        setNewComment("");
        const updated = await fetchComments(postId);
        setComments(updated);
    };
    return (_jsxs("div", { className: "border-t border-border/20 bg-secondary/10 px-4 py-3 space-y-3", children: [loading && _jsx("div", { className: "text-[10px] text-muted-foreground/50", children: "Caricamento..." }), comments.map((c) => (_jsxs("div", { className: "flex gap-2.5", children: [_jsx("div", { className: "w-7 h-7 rounded-full p-[1.5px] bg-gradient-to-br from-accent/40 to-primary/30 shrink-0", children: c.author_avatar ? (_jsx("img", { src: c.author_avatar, alt: "", className: "w-full h-full rounded-full object-cover" })) : (_jsx("div", { className: "w-full h-full rounded-full bg-card flex items-center justify-center text-[9px] font-bold text-accent", children: (c.author_nome?.[0] || "U").toUpperCase() })) }), _jsxs("div", { className: "flex-1 min-w-0 bg-secondary/30 rounded-xl px-3 py-2", children: [_jsxs("div", { className: "flex items-baseline gap-2", children: [_jsxs("span", { className: "text-[11px] font-semibold text-foreground", children: [c.author_nome, " ", c.author_cognome] }), _jsx("span", { className: "text-[9px] text-muted-foreground/50", children: formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: it }) })] }), _jsx("p", { className: "text-[12px] text-foreground/75 mt-0.5 leading-relaxed", children: c.content })] })] }, c.id))), _jsxs("div", { className: "flex items-center gap-2 pt-1", children: [_jsx("input", { value: newComment, onChange: (e) => setNewComment(e.target.value), onKeyDown: (e) => e.key === "Enter" && handleSubmit(), placeholder: "Scrivi un commento...", className: "flex-1 px-3 py-2 text-xs bg-secondary/40 border border-border/20 rounded-xl text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/30 transition-colors", maxLength: 500 }), _jsx("button", { onClick: handleSubmit, disabled: !newComment.trim(), className: "p-2 rounded-xl bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-30 transition-all", children: _jsx(Send, { size: 13 }) })] })] }));
}
