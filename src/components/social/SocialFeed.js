import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useSocialFeed } from "@/hooks/useSocialFeed";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircle } from "lucide-react";
import { SocialComments } from "./SocialComments";
import { SocialComposer } from "./SocialComposer";
import { SocialPostCard } from "./SocialPostCard";
import { SocialTabs } from "./SocialTabs";
import { SocialStories } from "./SocialStories";
import { SocialMembers } from "./SocialMembers";
import { SocialGroupList } from "./SocialGroupList";
export function SocialFeed({ isModerator, onHidePost, onDeletePost, onWarnUser, onOpenChat, onOpenGroup }) {
    const { posts, loading, createPost, uploadMedia, toggleLike, deletePost, fetchComments, addComment } = useSocialFeed();
    const { user, profile } = useAuth();
    const [expandedComments, setExpandedComments] = useState(new Set());
    const [activeTab, setActiveTab] = useState("feed");
    const toggleComments = (postId) => {
        setExpandedComments((prev) => {
            const next = new Set(prev);
            if (next.has(postId))
                next.delete(postId);
            else
                next.add(postId);
            return next;
        });
    };
    const handleModAction = (action, targetId) => {
        const reason = prompt("Motivo della moderazione:");
        if (!reason?.trim())
            return;
        if (action === "hide" && onHidePost)
            onHidePost(targetId, reason);
        if (action === "delete" && onDeletePost)
            onDeletePost(targetId, reason);
        if (action === "warn" && onWarnUser)
            onWarnUser(targetId, reason);
    };
    const handleCreatePost = async (content, postType, imageUrl) => {
        await createPost(content, postType, imageUrl);
    };
    const filteredPosts = activeTab === "safety"
        ? posts.filter(p => p.post_type === "safety_tip")
        : activeTab === "annunci"
            ? posts.filter(p => p.post_type === "announcement")
            : posts;
    const userInitial = (profile?.nome?.[0] || user?.email?.[0] || "U").toUpperCase();
    const userAvatar = profile?.avatar_url || null;
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center py-20", children: _jsx("div", { className: "w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" }) }));
    }
    return (_jsxs("div", { children: [_jsx(SocialStories, {}), _jsx(SocialTabs, { activeTab: activeTab, onTabChange: setActiveTab }), activeTab === "gruppi" ? (_jsx(SocialGroupList, { onOpenGroup: onOpenGroup || (() => { }) })) : activeTab === "membri" && onOpenChat ? (_jsx(SocialMembers, { onOpenChat: onOpenChat })) : activeTab === "membri" ? (_jsx(SocialMembers, { onOpenChat: () => { } })) : (_jsxs("div", { className: "space-y-3 p-4", children: [_jsx(SocialComposer, { userInitial: userInitial, userAvatar: userAvatar, onSubmit: handleCreatePost, onUploadMedia: uploadMedia }), filteredPosts.length === 0 && (_jsxs("div", { className: "text-center py-16 text-muted-foreground", children: [_jsx("div", { className: "w-16 h-16 rounded-full bg-secondary/60 flex items-center justify-center mx-auto mb-4", children: _jsx(MessageCircle, { size: 28, className: "opacity-30" }) }), _jsx("p", { className: "text-sm font-medium", children: activeTab === "safety" ? "Nessun safety tip ancora." : activeTab === "annunci" ? "Nessun annuncio." : "Nessun post ancora. Sii il primo!" }), _jsx("p", { className: "text-xs mt-1.5 opacity-50", children: "Condividi qualcosa con la community \uD83D\uDE9B" })] })), filteredPosts.map((post) => (_jsx(SocialPostCard, { post: post, isOwn: post.author_id === user?.id, isModerator: isModerator, showComments: expandedComments.has(post.id), onToggleLike: () => toggleLike(post.id, !!post.liked_by_me), onToggleComments: () => toggleComments(post.id), onDelete: () => deletePost(post.id), onModAction: handleModAction, children: _jsx(SocialComments, { postId: post.id, fetchComments: fetchComments, addComment: addComment }) }, post.id)))] }))] }));
}
