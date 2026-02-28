import { Heart, MessageCircle, Share2, EyeOff, Trash2, AlertTriangle, MoreHorizontal } from "lucide-react";
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
  children?: React.ReactNode;
}

export function SocialPostCard({
  post, isOwn, isModerator, showComments,
  onToggleLike, onToggleComments, onDelete,
  onModAction, children,
}: SocialPostCardProps) {
  const roleLabel = post.author_is_social_only ? "Ospite" : "Driver";
  const roleBadgeClass = post.author_is_social_only
    ? "bg-accent/10 text-accent border-accent/20"
    : "bg-primary/10 text-primary border-primary/20";

  const postTypeBadge = post.post_type === "safety_tip"
    ? <span className="ml-1.5 px-2 py-0.5 text-[9px] font-bold rounded-md bg-destructive/15 text-destructive uppercase tracking-widest">Safety</span>
    : post.post_type === "announcement"
    ? <span className="ml-1.5 px-2 py-0.5 text-[9px] font-bold rounded-md bg-primary/15 text-primary uppercase tracking-widest">Annuncio</span>
    : null;

  return (
    <div className={`bg-card/70 backdrop-blur-sm border rounded-2xl overflow-hidden transition-all ${
      post.is_hidden ? "border-destructive/30 opacity-40" : "border-border/30 hover:border-border/50"
    }`}>
      {post.is_hidden && (
        <div className="bg-destructive/10 px-4 py-1.5 text-[10px] text-destructive flex items-center gap-1.5 font-medium">
          <EyeOff size={11} /> Nascosto — {post.hidden_reason || "motivo non specificato"}
        </div>
      )}

      <div className="p-4">
        {/* Author row */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-br from-primary/60 to-accent/40 shrink-0">
            <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-xs font-bold text-primary">
              {(post.author_nome?.[0] || "U").toUpperCase()}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-foreground">
                {post.author_nome} {post.author_cognome}
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-md border font-semibold ${roleBadgeClass}`}>
                {roleLabel}
              </span>
              {postTypeBadge}
            </div>
            <span className="text-[10px] text-muted-foreground/70">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: it })}
            </span>
          </div>
          
          <div className="flex items-center gap-0.5">
            {isOwn && (
              <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground/50 hover:text-destructive transition-all">
                <Trash2 size={14} />
              </button>
            )}
            {isModerator && (
              <div className="flex items-center gap-0.5">
                <button onClick={() => onModAction?.("hide", post.id)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground/40 hover:text-foreground" title="Nascondi">
                  <EyeOff size={13} />
                </button>
                <button onClick={() => onModAction?.("delete", post.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive" title="Elimina">
                  <Trash2 size={13} />
                </button>
                <button onClick={() => onModAction?.("warn", post.author_id)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground/40 hover:text-primary" title="Ammoni">
                  <AlertTriangle size={13} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <p className="text-[14px] leading-relaxed text-foreground/85 whitespace-pre-wrap mb-3">{post.content}</p>

        {/* Media */}
        {post.image_url && (
          <div className="rounded-xl overflow-hidden mb-3 border border-border/20">
            <img src={post.image_url} alt="" className="w-full max-h-96 object-cover" />
          </div>
        )}

        {/* Engagement counters */}
        {(post.likes_count > 0 || post.comments_count > 0) && (
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground/70 pb-2.5 mb-2.5 border-b border-border/20">
            {post.likes_count > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="text-destructive">❤️</span>
                {post.likes_count}
              </span>
            )}
            {post.comments_count > 0 && (
              <span className="flex items-center gap-1">
                💬 {post.comments_count}
              </span>
            )}
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleLike}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all flex-1 justify-center ${
              post.liked_by_me
                ? "text-destructive bg-destructive/10"
                : "text-muted-foreground/70 hover:bg-secondary/60 hover:text-foreground"
            }`}
          >
            <Heart size={15} fill={post.liked_by_me ? "currentColor" : "none"} />
            Mi piace
          </button>
          <button
            onClick={onToggleComments}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground/70 hover:bg-secondary/60 hover:text-foreground transition-all flex-1 justify-center"
          >
            <MessageCircle size={15} />
            Commenta
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground/70 hover:bg-secondary/60 hover:text-foreground transition-all flex-1 justify-center">
            <Share2 size={15} />
            Condividi
          </button>
        </div>
      </div>

      {/* Comments slot */}
      {showComments && children}
    </div>
  );
}
