import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_by_sender: boolean;
  deleted_by_receiver: boolean;
  attachments?: MessageAttachment[];
  sender_profile?: { nome: string; cognome: string };
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface Conversation {
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  last_message: string | null;
  last_message_time: string;
  unread_count: number;
  isDeleted?: boolean;
}

export function useMessages(partnerId?: string) {
  const { user, isAdmin } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!user || !partnerId) return;
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`*, message_attachments (*)`)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const filteredMessages = ((data as unknown as Message[]) || []).filter((msg) => {
        if (msg.sender_id === user.id) return !msg.deleted_by_sender;
        return !msg.deleted_by_receiver;
      });
      setMessages(filteredMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  }, [user, partnerId, isAdmin]);

  const fetchConversations = useCallback(async () => {
    if (!user || !isAdmin) return;
    try {
      const { data: messagesData, error } = await supabase
        .from("messages")
        .select("sender_id, receiver_id, content, created_at, is_read")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const userIds = new Set<string>();
      (messagesData || []).forEach((msg) => {
        if (msg.sender_id !== user.id) userIds.add(msg.sender_id);
        if (msg.receiver_id !== user.id) userIds.add(msg.receiver_id);
      });
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, nome, cognome, avatar_url")
        .in("user_id", Array.from(userIds));
      const conversationMap = new Map<string, Conversation>();
      const profileUserIds = new Set(profiles?.map(p => p.user_id) || []);
      (messagesData || []).forEach((msg) => {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (otherUserId === user.id) return;
        if (!conversationMap.has(otherUserId)) {
          const profile = profiles?.find(p => p.user_id === otherUserId);
          conversationMap.set(otherUserId, {
            user_id: otherUserId,
            user_name: profile ? `${profile.nome} ${profile.cognome}` : "Utente eliminato",
            avatar_url: profile?.avatar_url || null,
            last_message: msg.content,
            last_message_time: msg.created_at,
            unread_count: 0,
            isDeleted: !profileUserIds.has(otherUserId),
          });
        }
        if (msg.sender_id === otherUserId && !msg.is_read) {
          const conv = conversationMap.get(otherUserId)!;
          conv.unread_count++;
        }
      });
      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  const sendMessage = useCallback(async (content: string, files?: File[]) => {
    if (!user || !partnerId) return null;
    setSending(true);
    try {
      const { data: messageData, error: messageError } = await supabase
        .from("messages")
        .insert({ sender_id: user.id, receiver_id: partnerId, content: content || null })
        .select()
        .single();
      if (messageError) throw messageError;
      if (files && files.length > 0) {
        for (const file of files) {
          const filePath = `${user.id}/${messageData.id}/${file.name}`;
          const { error: uploadError } = await supabase.storage.from("message-attachments").upload(filePath, file);
          if (uploadError) { console.error("Upload error:", uploadError); continue; }
          await supabase.from("message_attachments").insert({
            message_id: messageData.id, file_name: file.name, file_path: filePath, file_type: file.type, file_size: file.size,
          });
        }
      }
      return messageData;
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Errore invio messaggio");
      return null;
    } finally {
      setSending(false);
    }
  }, [user, partnerId]);

  const deleteMessage = useCallback(async (messageId: string, permanent: boolean = false) => {
    if (!user) return false;
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return false;
      if (permanent && isAdmin) {
        const { error } = await supabase.from("messages").delete().eq("id", messageId);
        if (error) throw error;
        setMessages(prev => prev.filter(m => m.id !== messageId));
        toast.success("Messaggio eliminato definitivamente");
      } else {
        const isSender = message.sender_id === user.id;
        const updateField = isSender ? "deleted_by_sender" : "deleted_by_receiver";
        const { error } = await supabase.from("messages").update({ [updateField]: true }).eq("id", messageId);
        if (error) throw error;
        setMessages(prev => prev.filter(m => m.id !== messageId));
        toast.success("Messaggio rimosso dalla cronologia");
      }
      return true;
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Errore durante l'eliminazione");
      return false;
    }
  }, [user, messages, isAdmin]);

  const markAsRead = useCallback(async () => {
    if (!user || !partnerId) return;
    try {
      await supabase.from("messages")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("receiver_id", user.id)
        .eq("sender_id", partnerId)
        .eq("is_read", false);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  }, [user, partnerId]);

  const getAttachmentUrl = useCallback(async (filePath: string) => {
    const { data } = await supabase.storage.from("message-attachments").createSignedUrl(filePath, 3600);
    return data?.signedUrl || null;
  }, []);

  const getUnreadCount = useCallback(async () => {
    if (!user) return 0;
    const { count } = await supabase.from("messages").select("*", { count: "exact", head: true }).eq("receiver_id", user.id).eq("is_read", false);
    return count || 0;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("messages-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const newMessage = payload.new as Message;
          if (partnerId && ((newMessage.sender_id === user.id && newMessage.receiver_id === partnerId) || (newMessage.sender_id === partnerId && newMessage.receiver_id === user.id))) {
            setMessages(prev => [...prev, newMessage]);
          }
          if (isAdmin) fetchConversations();
        } else if (payload.eventType === "UPDATE") {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, partnerId, isAdmin, fetchConversations]);

  useEffect(() => {
    if (partnerId) { fetchMessages(); markAsRead(); }
    else if (isAdmin) { fetchConversations(); }
  }, [partnerId, isAdmin, fetchMessages, fetchConversations, markAsRead]);

  return { messages, conversations, loading, sending, sendMessage, markAsRead, deleteMessage, getAttachmentUrl, getUnreadCount, refetch: partnerId ? fetchMessages : fetchConversations };
}

export function useAdminId() {
  const [adminId, setAdminId] = useState<string | null>(null);
  useEffect(() => {
    async function fetchAdmin() {
      const { data, error } = await supabase.rpc("get_admin_user_id");
      if (data && !error) setAdminId(data);
    }
    fetchAdmin();
  }, []);
  return adminId;
}
