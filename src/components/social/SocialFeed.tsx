import { useState } from "react";
import { useSocialFeed, SocialPost } from "@/hooks/useSocialFeed";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircle } from "lucide-react";
import { SocialComments } from "./SocialComments";
import { SocialComposer } from "./SocialComposer";
import { SocialPostCard } from "./SocialPostCard";
import { SocialTabs } from "./SocialTabs";


interface SocialFeedProps {
  isModerator?: boolean;
  onHidePost?: (postId: string, reason: string) => void;
  onDeletePost?: (postId: string, reason: string) => void;
  onWarnUser?: (userId: string, reason: string) => void;
}

export function SocialFeed({ isModerator, onHidePost, onDeletePost, onWarnUser }: SocialFeedProps) {
  const { posts, loading, createPost, toggleLike, deletePost, fetchComments, addComment } = useSocialFeed();
  const { user, profile } = useAuth();
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("feed");

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const handleModAction = (action: string, targetId: string) => {
    const reason = prompt("Motivo della moderazione:");
    if (!reason?.trim()) return;
    if (action === "hide" && onHidePost) onHidePost(targetId, reason);
    if (action === "delete" && onDeletePost) onDeletePost(targetId, reason);
    if (action === "warn" && onWarnUser) onWarnUser(targetId, reason);
  };

  // Filter posts by tab
  const filteredPosts = activeTab === "safety"
    ? posts.filter(p => p.post_type === "safety_tip")
    : activeTab === "annunci"
    ? posts.filter(p => p.post_type === "announcement")
    : posts;

  const userInitial = ((profile as any)?.nome?.[0] || user?.email?.[0] || "U").toUpperCase();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }


  return (
    <div>
      <SocialTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="space-y-4 p-4">
        {/* Composer */}
        <SocialComposer userInitial={userInitial} onSubmit={createPost} />

        {/* Empty state */}
        {filteredPosts.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <MessageCircle size={48} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">
              {activeTab === "safety" ? "Nessun safety tip ancora." : activeTab === "annunci" ? "Nessun annuncio." : "Nessun post ancora. Sii il primo!"}
            </p>
            <p className="text-xs mt-1 opacity-60">Condividi qualcosa con la community 🚛</p>
          </div>
        )}

        {/* Post cards */}
        {filteredPosts.map((post) => (
          <SocialPostCard
            key={post.id}
            post={post}
            isOwn={post.author_id === user?.id}
            isModerator={isModerator}
            showComments={expandedComments.has(post.id)}
            onToggleLike={() => toggleLike(post.id, !!post.liked_by_me)}
            onToggleComments={() => toggleComments(post.id)}
            onDelete={() => deletePost(post.id)}
            onModAction={handleModAction}
          >
            <SocialComments postId={post.id} fetchComments={fetchComments} addComment={addComment} />
          </SocialPostCard>
        ))}
      </div>
    </div>
  );
}
