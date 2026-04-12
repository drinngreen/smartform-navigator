import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Heart, MessageCircle, Share2, EyeOff, Trash2, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { useMemo } from "react";
// Renders text with clickable links and hashtags
function RichContent({ text }) {
    const parts = useMemo(() => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const hashtagRegex = /(#[\w\u00C0-\u024F]+)/g;
        const combined = new RegExp(`(${urlRegex.source}|${hashtagRegex.source})`, "g");
        const segments = [];
        let lastIndex = 0;
        let match;
        while ((match = combined.exec(text)) !== null) {
            if (match.index > lastIndex) {
                segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
            }
            if (match[0].startsWith("http")) {
                segments.push({ type: "url", value: match[0] });
            }
            else {
                segments.push({ type: "hashtag", value: match[0] });
            }
            lastIndex = combined.lastIndex;
        }
        if (lastIndex < text.length) {
            segments.push({ type: "text", value: text.slice(lastIndex) });
        }
        return segments;
    }, [text]);
    return (_jsx("p", { className: "text-[14px] leading-relaxed text-foreground/85 whitespace-pre-wrap mb-3", children: parts.map((part, i) => {
            if (part.type === "url") {
                return (_jsxs("a", { href: part.value, target: "_blank", rel: "noopener noreferrer", className: "text-primary underline underline-offset-2 hover:text-primary/80 break-all", children: [part.value.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40), part.value.replace(/^https?:\/\/(www\.)?/, "").length > 40 ? "…" : ""] }, i));
            }
            if (part.type === "hashtag") {
                return (_jsx("span", { className: "text-primary font-medium", children: part.value }, i));
            }
            return _jsx("span", { children: part.value }, i);
        }) }));
}
export function SocialPostCard({ post, isOwn, isModerator, showComments, onToggleLike, onToggleComments, onDelete, onModAction, children, }) {
    const roleLabel = post.author_is_social_only ? "Ospite" : "Driver";
    const roleBadgeClass = post.author_is_social_only
        ? "bg-accent/10 text-accent border-accent/20"
        : "bg-primary/10 text-primary border-primary/20";
    const postTypeBadge = post.post_type === "safety_tip"
        ? _jsx("span", { className: "ml-1.5 px-2 py-0.5 text-[9px] font-bold rounded-md bg-destructive/15 text-destructive uppercase tracking-widest", children: "Safety" })
        : post.post_type === "announcement"
            ? _jsx("span", { className: "ml-1.5 px-2 py-0.5 text-[9px] font-bold rounded-md bg-primary/15 text-primary uppercase tracking-widest", children: "Annuncio" })
            : null;
    const isVideo = post.image_url?.match(/\.(mp4|webm|mov|avi)(\?|$)/i);
    return (_jsxs("div", { className: `bg-card/70 backdrop-blur-sm border rounded-2xl overflow-hidden transition-all ${post.is_hidden ? "border-destructive/30 opacity-40" : "border-border/30 hover:border-border/50"}`, children: [post.is_hidden && (_jsxs("div", { className: "bg-destructive/10 px-4 py-1.5 text-[10px] text-destructive flex items-center gap-1.5 font-medium", children: [_jsx(EyeOff, { size: 11 }), " Nascosto \u2014 ", post.hidden_reason || "motivo non specificato"] })), _jsxs("div", { className: "p-4", children: [_jsxs("div", { className: "flex items-center gap-3 mb-3", children: [_jsx("div", { className: "w-10 h-10 rounded-full p-[2px] bg-gradient-to-br from-primary/60 to-accent/40 shrink-0", children: post.author_avatar ? (_jsx("img", { src: post.author_avatar, alt: "", className: "w-full h-full rounded-full object-cover" })) : (_jsx("div", { className: "w-full h-full rounded-full bg-card flex items-center justify-center text-xs font-bold text-primary", children: (post.author_nome?.[0] || "U").toUpperCase() })) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-1.5 flex-wrap", children: [_jsxs("span", { className: "text-sm font-semibold text-foreground", children: [post.author_nome, " ", post.author_cognome] }), _jsx("span", { className: `text-[9px] px-1.5 py-0.5 rounded-md border font-semibold ${roleBadgeClass}`, children: roleLabel }), postTypeBadge] }), _jsx("span", { className: "text-[10px] text-muted-foreground/70", children: formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: it }) })] }), _jsxs("div", { className: "flex items-center gap-0.5", children: [isOwn && (_jsx("button", { onClick: onDelete, className: "p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground/50 hover:text-destructive transition-all", children: _jsx(Trash2, { size: 14 }) })), isModerator && (_jsxs("div", { className: "flex items-center gap-0.5", children: [_jsx("button", { onClick: () => onModAction?.("hide", post.id), className: "p-1.5 rounded-lg hover:bg-secondary text-muted-foreground/40 hover:text-foreground", title: "Nascondi", children: _jsx(EyeOff, { size: 13 }) }), _jsx("button", { onClick: () => onModAction?.("delete", post.id), className: "p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive", title: "Elimina", children: _jsx(Trash2, { size: 13 }) }), _jsx("button", { onClick: () => onModAction?.("warn", post.author_id), className: "p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground/40 hover:text-primary", title: "Ammoni", children: _jsx(AlertTriangle, { size: 13 }) })] }))] })] }), _jsx(RichContent, { text: post.content }), post.image_url && (_jsx("div", { className: "rounded-xl overflow-hidden mb-3 border border-border/20", children: isVideo ? (_jsx("video", { src: post.image_url, className: "w-full max-h-96 object-cover", controls: true })) : (_jsx("img", { src: post.image_url, alt: "", className: "w-full max-h-96 object-cover" })) })), (post.likes_count > 0 || post.comments_count > 0) && (_jsxs("div", { className: "flex items-center gap-4 text-[11px] text-muted-foreground/70 pb-2.5 mb-2.5 border-b border-border/20", children: [post.likes_count > 0 && (_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-destructive", children: "\u2764\uFE0F" }), post.likes_count] })), post.comments_count > 0 && (_jsxs("span", { className: "flex items-center gap-1", children: ["\uD83D\uDCAC ", post.comments_count] }))] })), _jsxs("div", { className: "flex items-center gap-1", children: [_jsxs("button", { onClick: onToggleLike, className: `flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all flex-1 justify-center ${post.liked_by_me
                                    ? "text-destructive bg-destructive/10"
                                    : "text-muted-foreground/70 hover:bg-secondary/60 hover:text-foreground"}`, children: [_jsx(Heart, { size: 15, fill: post.liked_by_me ? "currentColor" : "none" }), "Mi piace"] }), _jsxs("button", { onClick: onToggleComments, className: "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground/70 hover:bg-secondary/60 hover:text-foreground transition-all flex-1 justify-center", children: [_jsx(MessageCircle, { size: 15 }), "Commenta"] }), _jsxs("button", { className: "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground/70 hover:bg-secondary/60 hover:text-foreground transition-all flex-1 justify-center", children: [_jsx(Share2, { size: 15 }), "Condividi"] })] })] }), showComments && children] }));
}
