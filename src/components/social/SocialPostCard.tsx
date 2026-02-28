import { Heart, MessageCircle, Share2, EyeOff, Trash2, AlertTriangle } from "lucide-react";
import { SocialPost } from "@/hooks/useSocialFeed";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface SocialPostCardProps {
  post: SocialPost;
  isOwn: boolean;
  isModerator?: boolean;
  showComments: boolean;
  onToggleLike: () => void;
  onToggleComments: () => void;
  onDelete: () => void;
  onModAction?: (action: string, targetId: string) => void;
  children?: React.ReactNode; // comments slot
}

export function SocialPostCard({
  post, isOwn, isModerator, showComments,
  onToggleLike, onToggleComments, onDelete,
  onModAction, children,
}: SocialPostCardProps) {
  const roleLabel = post.author_is_social_only ? "Ospite" : "Driver";
  const roleBadgeClass = post.author_is_social_only
    ? "bg-accent/15 text-accent border-accent/30"
    : "bg-primary/15 text-primary border-primary/30";

  const postTypeBadge = post.post_type === "safety_tip"
    ? <span className="ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full bg-destructive/20 text-destructive border border-destructive/30 uppercase tracking-wider">Safety</span>
    : post.post_type === "announcement"
    ? <span className="ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary/20 text-primary border border-primary/30 uppercase tracking-wider">Annuncio</span>
    : null;

  return (
    <div className={`bg-card border rounded-2xl overflow-hidden transition-all shadow-lg shadow-black/10 ${post.is_hidden ? "border-destructive/40 opacity-50" : "border-border/60"}`}>
      {post.is_hidden && (
        <div className="bg-destructive/10 px-4 py-1.5 text-xs text-destructive flex items-center gap-1.5">
          <EyeOff size={12} /> Post nascosto — {post.hidden_reason || "motivo non specificato"}
        </div>
      )}

      <div className="p-4">
        {/* Author row */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 border-2 border-primary/40 flex items-center justify-center text-sm font-bold text-primary">
            {(post.author_nome?.[0] || "U").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">
                {post.author_nome} {post.author_cognome}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${roleBadgeClass}`}>
                {roleLabel}
              </span>
              {postTypeBadge}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: it })}
            </span>
          </div>
          {isOwn && (
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all">
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* Content */}
        <p className="text-[15px] leading-relaxed text-foreground/90 whitespace-pre-wrap mb-3">{post.content}</p>

        {/* Media */}
        {post.image_url && (
          <div className="rounded-xl overflow-hidden mb-3 border border-border/30">
            <img src={post.image_url} alt="" className="w-full max-h-80 object-cover" />
          </div>
        )}

        {/* Engagement counters */}
        {(post.likes_count > 0 || post.comments_count > 0) && (
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground pb-2 mb-2 border-b border-border/30">
            {post.likes_count > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-destructive/20 flex items-center justify-center text-[8px]">❤️</span>
                {post.likes_count} {post.likes_count === 1 ? "reazione" : "reazioni"}
              </span>
            )}
            {post.comments_count > 0 && (
              <span>{post.comments_count} {post.comments_count === 1 ? "commento" : "commenti"}</span>
            )}
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 flex-1">
            <button
              onClick={onToggleLike}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all flex-1 justify-center ${
                post.liked_by_me
                  ? "text-destructive bg-destructive/10"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Heart size={16} fill={post.liked_by_me ? "currentColor" : "none"} />
              Mi piace
            </button>
            <button
              onClick={onToggleComments}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all flex-1 justify-center"
            >
              <MessageCircle size={16} />
              Commenta
            </button>
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all flex-1 justify-center">
              <Share2 size={16} />
              Condividi
            </button>
          </div>

          {isModerator && (
            <div className="flex items-center gap-0.5 ml-2 border-l border-border/50 pl-2">
              <button onClick={() => onModAction?.("hide", post.id)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground" title="Nascondi">
                <EyeOff size={13} />
              </button>
              <button onClick={() => onModAction?.("delete", post.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Elimina">
                <Trash2 size={13} />
              </button>
              <button onClick={() => onModAction?.("warn", post.author_id)} className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary" title="Ammoni">
                <AlertTriangle size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comments slot */}
      {showComments && children}
    </div>
  );
}
