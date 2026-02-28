import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

export interface SocialPost {
  id: string;
  author_id: string;
  content: string;
  image_url: string | null;
  post_type: string;
  is_hidden: boolean;
  hidden_by: string | null;
  hidden_reason: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  author_nome?: string;
  author_cognome?: string;
  author_avatar?: string | null;
  author_is_social_only?: boolean;
  liked_by_me?: boolean;
}

export interface SocialComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  is_deleted: boolean;
  created_at: string;
  author_nome?: string;
  author_cognome?: string;
}

export function useSocialFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    if (!user) return;
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

    // Get author profiles
    const authorIds = [...new Set(postsData.map((p: any) => p.author_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, nome, cognome, avatar_url, is_social_only")
      .in("user_id", authorIds);

    // Get my likes
    const { data: myLikes } = await supabase
      .from("social_likes")
      .select("post_id")
      .eq("user_id", user.id);

    const likedPostIds = new Set(myLikes?.map((l: any) => l.post_id) || []);
    const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

    const enriched: SocialPost[] = postsData.map((p: any) => {
      const profile = profileMap.get(p.author_id);
      return {
        ...p,
        author_nome: profile?.nome || "Utente",
        author_cognome: profile?.cognome || "",
        author_avatar: profile?.avatar_url,
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

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("social-posts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "social_posts" }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchPosts]);

  const createPost = async (content: string, postType = "general", imageUrl?: string) => {
    if (!user) return;
    const { error } = await supabase.from("social_posts").insert({
      author_id: user.id,
      content,
      post_type: postType,
      image_url: imageUrl || null,
      tenant_id: "167d07ad-9184-484e-85a6-da5ceafa42a3",
    });
    if (error) console.error("Create post error:", error);
  };

  const toggleLike = async (postId: string, currentlyLiked: boolean) => {
    if (!user) return;
    if (currentlyLiked) {
      await supabase.from("social_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("social_likes").insert({ post_id: postId, user_id: user.id });
    }
    fetchPosts();
  };

  const deletePost = async (postId: string) => {
    await supabase.from("social_posts").delete().eq("id", postId);
    fetchPosts();
  };

  const fetchComments = async (postId: string): Promise<SocialComment[]> => {
    const { data, error } = await supabase
      .from("social_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error || !data) return [];

    const authorIds = [...new Set(data.map((c: any) => c.author_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, nome, cognome")
      .in("user_id", authorIds);

    const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

    return data.map((c: any) => {
      const profile = profileMap.get(c.author_id);
      return { ...c, author_nome: profile?.nome || "Utente", author_cognome: profile?.cognome || "" };
    });
  };

  const addComment = async (postId: string, content: string) => {
    if (!user) return;
    await supabase.from("social_comments").insert({ post_id: postId, author_id: user.id, content });
    fetchPosts();
  };

  return { posts, loading, createPost, toggleLike, deletePost, fetchComments, addComment, refreshPosts: fetchPosts };
}
