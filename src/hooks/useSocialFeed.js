import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
export function useSocialFeed() {
    const { user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const fetchPosts = useCallback(async () => {
        if (!user)
            return;
        setLoading(true);
        const { data: postsData, error } = await supabase
            .from("social_posts")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50);
        if (error) {
            console.error("Error fetching posts:", error);
            setLoading(false);
            return;
        }
        if (!postsData || postsData.length === 0) {
            setPosts([]);
            setLoading(false);
            return;
        }
        const authorIds = [...new Set(postsData.map((p) => p.author_id))];
        const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, nome, cognome, avatar_url, is_social_only")
            .in("user_id", authorIds);
        const { data: myLikes } = await supabase
            .from("social_likes")
            .select("post_id")
            .eq("user_id", user.id);
        const likedPostIds = new Set(myLikes?.map((l) => l.post_id) || []);
        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
        const enriched = postsData.map((p) => {
            const profile = profileMap.get(p.author_id);
            return {
                ...p,
                author_nome: profile?.nome || "Utente",
                author_cognome: profile?.cognome || "",
                author_avatar: profile?.avatar_url || null,
                author_is_social_only: profile?.is_social_only || false,
                liked_by_me: likedPostIds.has(p.id),
            };
        });
        setPosts(enriched);
        setLoading(false);
    }, [user]);
    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);
    useEffect(() => {
        const channel = supabase
            .channel("social-posts-realtime")
            .on("postgres_changes", { event: "*", schema: "public", table: "social_posts" }, () => {
            fetchPosts();
        })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchPosts]);
    const uploadMedia = async (file) => {
        if (!user)
            return null;
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("social-media").upload(path, file);
        if (error) {
            console.error("Upload error:", error);
            return null;
        }
        const { data } = supabase.storage.from("social-media").getPublicUrl(path);
        return data.publicUrl;
    };
    const createPost = async (content, postType = "general", imageUrl) => {
        if (!user)
            return;
        const { error } = await supabase.from("social_posts").insert({
            author_id: user.id,
            content,
            post_type: postType,
            image_url: imageUrl || null,
            tenant_id: "167d07ad-9184-484e-85a6-da5ceafa42a3",
        });
        if (error)
            console.error("Create post error:", error);
    };
    const toggleLike = async (postId, currentlyLiked) => {
        if (!user)
            return;
        if (currentlyLiked) {
            await supabase.from("social_likes").delete().eq("post_id", postId).eq("user_id", user.id);
        }
        else {
            await supabase.from("social_likes").insert({ post_id: postId, user_id: user.id });
        }
        fetchPosts();
    };
    const deletePost = async (postId) => {
        await supabase.from("social_posts").delete().eq("id", postId);
        fetchPosts();
    };
    const fetchComments = async (postId) => {
        const { data, error } = await supabase
            .from("social_comments")
            .select("*")
            .eq("post_id", postId)
            .order("created_at", { ascending: true });
        if (error || !data)
            return [];
        const authorIds = [...new Set(data.map((c) => c.author_id))];
        const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, nome, cognome, avatar_url")
            .in("user_id", authorIds);
        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
        return data.map((c) => {
            const profile = profileMap.get(c.author_id);
            return {
                ...c,
                author_nome: profile?.nome || "Utente",
                author_cognome: profile?.cognome || "",
                author_avatar: profile?.avatar_url || null,
            };
        });
    };
    const addComment = async (postId, content) => {
        if (!user)
            return;
        await supabase.from("social_comments").insert({ post_id: postId, author_id: user.id, content });
        fetchPosts();
    };
    return { posts, loading, createPost, uploadMedia, toggleLike, deletePost, fetchComments, addComment, refreshPosts: fetchPosts };
}
