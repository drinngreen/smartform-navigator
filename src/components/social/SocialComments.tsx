import { useState, useEffect } from "react";
import { Send } from "lucide-react";
import { SocialComment } from "@/hooks/useSocialFeed";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface SocialCommentsProps {
  postId: string;
  fetchComments: (postId: string) => Promise<SocialComment[]>;
  addComment: (postId: string, content: string) => Promise<void>;
}

export function SocialComments({ postId, fetchComments, addComment }: SocialCommentsProps) {
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments(postId).then((c) => {
      setComments(c);
      setLoading(false);
    });
  }, [postId, fetchComments]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    await addComment(postId, newComment.trim());
    setNewComment("");
    const updated = await fetchComments(postId);
    setComments(updated);
  };

  return (
    <div className="border-t border-border/20 bg-secondary/10 px-4 py-3 space-y-3">
      {loading && <div className="text-[10px] text-muted-foreground/50">Caricamento...</div>}

      {comments.map((c) => (
        <div key={c.id} className="flex gap-2.5">
          <div className="w-7 h-7 rounded-full p-[1.5px] bg-gradient-to-br from-accent/40 to-primary/30 shrink-0">
            {c.author_avatar ? (
              <img src={c.author_avatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-[9px] font-bold text-accent">
                {(c.author_nome?.[0] || "U").toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 bg-secondary/30 rounded-xl px-3 py-2">
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] font-semibold text-foreground">{c.author_nome} {c.author_cognome}</span>
              <span className="text-[9px] text-muted-foreground/50">
                {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: it })}
              </span>
            </div>
            <p className="text-[12px] text-foreground/75 mt-0.5 leading-relaxed">{c.content}</p>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2 pt-1">
        <input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Scrivi un commento..."
          className="flex-1 px-3 py-2 text-xs bg-secondary/40 border border-border/20 rounded-xl text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/30 transition-colors"
          maxLength={500}
        />
        <button
          onClick={handleSubmit}
          disabled={!newComment.trim()}
          className="p-2 rounded-xl bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-30 transition-all"
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  );
}
