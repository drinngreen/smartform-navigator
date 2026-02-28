import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

export interface SocialGroup {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  member_count?: number;
  last_message?: string | null;
  last_message_time?: string | null;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_nome?: string;
  sender_cognome?: string;
  sender_avatar?: string | null;
}

export function useSocialGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<SocialGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: groupsData, error } = await supabase
      .from("social_groups")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching groups:", error);
      setLoading(false);
      return;
    }

    if (!groupsData || groupsData.length === 0) {
      setGroups([]);
      setLoading(false);
      return;
    }

    // Get member counts and last messages
    const enriched: SocialGroup[] = await Promise.all(
      groupsData.map(async (g: any) => {
        const { count } = await supabase
          .from("social_group_members")
          .select("*", { count: "exact", head: true })
          .eq("group_id", g.id);

        const { data: lastMsg } = await supabase
          .from("social_group_messages")
          .select("content, created_at")
          .eq("group_id", g.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...g,
          member_count: count || 0,
          last_message: lastMsg?.content || null,
          last_message_time: lastMsg?.created_at || null,
        };
      })
    );

    setGroups(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const createGroup = async (name: string, description: string, memberIds: string[]) => {
    if (!user) return null;

    const { data: group, error } = await supabase
      .from("social_groups")
      .insert({ name, description: description || null, created_by: user.id })
      .select()
      .single();

    if (error || !group) {
      console.error("Create group error:", error);
      return null;
    }

    // Add creator as admin
    const members = [
      { group_id: group.id, user_id: user.id, role: "admin" },
      ...memberIds.map((id) => ({ group_id: group.id, user_id: id, role: "member" })),
    ];

    await supabase.from("social_group_members").insert(members);
    fetchGroups();
    return group;
  };

  const fetchGroupMessages = async (groupId: string): Promise<GroupMessage[]> => {
    const { data, error } = await supabase
      .from("social_group_messages")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });

    if (error || !data) return [];

    const authorIds = [...new Set(data.map((m: any) => m.sender_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, nome, cognome, avatar_url")
      .in("user_id", authorIds);

    const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

    return data.map((m: any) => {
      const profile = profileMap.get(m.sender_id);
      return {
        ...m,
        sender_nome: profile?.nome || "Utente",
        sender_cognome: profile?.cognome || "",
        sender_avatar: profile?.avatar_url || null,
      };
    });
  };

  const sendGroupMessage = async (groupId: string, content: string) => {
    if (!user || !content.trim()) return;
    await supabase.from("social_group_messages").insert({
      group_id: groupId,
      sender_id: user.id,
      content: content.trim(),
    });
  };

  return { groups, loading, createGroup, fetchGroupMessages, sendGroupMessage, refreshGroups: fetchGroups };
}
