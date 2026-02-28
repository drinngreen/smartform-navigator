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
    <div className="border-t border-border bg-secondary/20 px-4 py-3 space-y-3">
      {loading && <div className="text-xs text-muted-foreground">Caricamento...</div>}

      {comments.map((c) => (
        <div key={c.id} className="flex gap-2">
          <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent shrink-0">
            {(c.author_nome?.[0] || "U").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold text-foreground">{c.author_nome} {c.author_cognome}</span>
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: it })}
              </span>
            </div>
            <p className="text-xs text-foreground/80 mt-0.5">{c.content}</p>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Scrivi un commento..."
          className="flex-1 px-3 py-2 text-xs bg-background border border-border rounded-lg"
          maxLength={500}
        />
        <button
          onClick={handleSubmit}
          disabled={!newComment.trim()}
          className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-50 transition-all"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
