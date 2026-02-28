import { useState } from "react";
import { useSocialFeed, SocialPost } from "@/hooks/useSocialFeed";
import { useAuth } from "@/hooks/useAuth";
import { Heart, MessageCircle, Send, Trash2, Shield, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { SocialComments } from "./SocialComments";
import { SocialCreatePost } from "./SocialCreatePost";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface SocialFeedProps {
  isModerator?: boolean;
  onHidePost?: (postId: string, reason: string) => void;
  onDeletePost?: (postId: string, reason: string) => void;
  onWarnUser?: (userId: string, reason: string) => void;
}

export function SocialFeed({ isModerator, onHidePost, onDeletePost, onWarnUser }: SocialFeedProps) {
  const { posts, loading, createPost, toggleLike, deletePost, fetchComments, addComment } = useSocialFeed();
  const { user } = useAuth();
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [moderationTarget, setModerationTarget] = useState<{ id: string; type: string } | null>(null);
  const [moderationReason, setModerationReason] = useState("");

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const handleModAction = (action: string, targetId: string) => {
    if (!moderationReason.trim()) return;
    if (action === "hide" && onHidePost) onHidePost(targetId, moderationReason);
    if (action === "delete" && onDeletePost) onDeletePost(targetId, moderationReason);
    if (action === "warn" && onWarnUser) onWarnUser(targetId, moderationReason);
    setModerationTarget(null);
    setModerationReason("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SocialCreatePost onSubmit={createPost} />

      {posts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <MessageCircle size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nessun post ancora. Sii il primo!</p>
        </div>
      )}

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          isOwn={post.author_id === user?.id}
          isModerator={isModerator}
          showComments={expandedComments.has(post.id)}
          onToggleLike={() => toggleLike(post.id, !!post.liked_by_me)}
          onToggleComments={() => toggleComments(post.id)}
          onDelete={() => deletePost(post.id)}
          fetchComments={fetchComments}
          addComment={addComment}
          moderationTarget={moderationTarget}
          setModerationTarget={setModerationTarget}
          moderationReason={moderationReason}
          setModerationReason={setModerationReason}
          onModAction={handleModAction}
        />
      ))}
    </div>
  );
}

function PostCard({
  post, isOwn, isModerator, showComments,
  onToggleLike, onToggleComments, onDelete,
  fetchComments, addComment,
  moderationTarget, setModerationTarget,
  moderationReason, setModerationReason,
  onModAction,
}: {
  post: SocialPost;
  isOwn: boolean;
  isModerator?: boolean;
  showComments: boolean;
  onToggleLike: () => void;
  onToggleComments: () => void;
  onDelete: () => void;
  fetchComments: any;
  addComment: any;
  moderationTarget: any;
  setModerationTarget: any;
  moderationReason: string;
  setModerationReason: any;
  onModAction: any;
}) {
  const isModTarget = moderationTarget?.id === post.id;

  const postTypeLabel = post.post_type === "safety_tip" ? "🛡️ Safety Tip"
    : post.post_type === "announcement" ? "📢 Annuncio" : null;

  return (
    <div className={`bg-card border rounded-xl overflow-hidden transition-all ${post.is_hidden ? "border-destructive/50 opacity-60" : "border-border"}`}>
      {post.is_hidden && (
        <div className="bg-destructive/10 px-4 py-1.5 text-xs text-destructive flex items-center gap-1">
          <EyeOff size={12} /> Post nascosto — {post.hidden_reason || "motivo non specificato"}
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary">
              {(post.author_nome?.[0] || "U").toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {post.author_nome} {post.author_cognome}
                </span>
                {post.author_is_social_only && (
                  <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">Ospite</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: it })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {postTypeLabel && (
              <span className="text-xs bg-secondary px-2 py-1 rounded-full">{postTypeLabel}</span>
            )}
            {isOwn && (
              <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <p className="text-sm text-foreground/90 whitespace-pre-wrap mb-3">{post.content}</p>

        {post.image_url && (
          <img src={post.image_url} alt="" className="rounded-lg max-h-64 w-full object-cover mb-3" />
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-2 border-t border-border/50">
          <button onClick={onToggleLike} className={`flex items-center gap-1.5 text-xs transition-all ${post.liked_by_me ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}>
            <Heart size={16} fill={post.liked_by_me ? "currentColor" : "none"} />
            {post.likes_count || ""}
          </button>
          <button onClick={onToggleComments} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-all">
            <MessageCircle size={16} />
            {post.comments_count || ""}
          </button>

          {isModerator && (
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => setModerationTarget({ id: post.id, type: "hide" })} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground" title="Nascondi">
                <EyeOff size={14} />
              </button>
              <button onClick={() => setModerationTarget({ id: post.id, type: "delete" })} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Elimina">
                <Trash2 size={14} />
              </button>
              <button onClick={() => setModerationTarget({ id: post.author_id, type: "warn" })} className="p-1.5 rounded hover:bg-yellow-500/10 text-muted-foreground hover:text-yellow-500" title="Ammoni utente">
                <AlertTriangle size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Moderation action panel */}
        {isModTarget && (
          <div className="mt-3 p-3 bg-secondary/50 rounded-lg border border-border space-y-2">
            <p className="text-xs font-semibold text-foreground">
              {moderationTarget.type === "hide" ? "🙈 Nascondi Post" : moderationTarget.type === "delete" ? "🗑️ Elimina Post" : "⚠️ Ammoni Utente"}
            </p>
            <input
              value={moderationReason}
              onChange={(e) => setModerationReason(e.target.value)}
              placeholder="Motivo..."
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg"
            />
            <div className="flex gap-2">
              <button onClick={() => onModAction(moderationTarget.type, post.id)} className="px-3 py-1.5 text-xs bg-destructive text-destructive-foreground rounded-lg">
                Conferma
              </button>
              <button onClick={() => setModerationTarget(null)} className="px-3 py-1.5 text-xs bg-secondary text-foreground rounded-lg">
                Annulla
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Comments section */}
      {showComments && (
        <SocialComments postId={post.id} fetchComments={fetchComments} addComment={addComment} />
      )}
    </div>
  );
}
