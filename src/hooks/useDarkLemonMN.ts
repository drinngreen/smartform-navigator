import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

export interface DLMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: { type: string; name: string; dataUrl: string }[];
  createdAt: Date;
}

export interface DLConversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export function useDarkLemonMN(context?: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DLMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<DLConversation[]>([]);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("ai_conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (data) {
      setConversations(data
        .filter(c => {
          const ctx = c.context as any;
          return ctx?.source === "dark-lemon-mn";
        })
        .map(c => ({
          id: c.id,
          title: c.title,
          createdAt: new Date(c.created_at),
          updatedAt: new Date(c.updated_at),
        }))
      );
    }
  }, [user]);

  const createConversation = useCallback(async (title: string): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("ai_conversations")
      .insert({
        user_id: user.id,
        title,
        context: { source: "dark-lemon-mn", mn_context: context },
      })
      .select()
      .single();
    if (error) { console.error("Error creating conversation:", error); return null; }
    setCurrentConversationId(data.id);
    setMessages([]);
    await loadConversations();
    return data.id;
  }, [user, context, loadConversations]);

  const loadConversation = useCallback(async (conversationId: string) => {
    const { data } = await supabase
      .from("ai_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (data) {
      setMessages(data.map(m => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        createdAt: new Date(m.created_at),
      })));
      setCurrentConversationId(conversationId);
    }
  }, []);

  const sendMessage = useCallback(async (
    content: string,
    attachments?: { type: string; name: string; dataUrl: string }[]
  ) => {
    let convId = currentConversationId;
    if (!convId) {
      convId = await createConversation(content.substring(0, 50) + "...");
    }

    const userMsg: DLMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      attachments,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    if (convId) {
      await supabase.from("ai_messages").insert({ conversation_id: convId, role: "user", content });
    }

    setIsLoading(true);

    // Build API messages - last 19 + current
    const apiMessages = [...messages.slice(-19), userMsg].map(m => {
      // For multimodal messages with attachments
      if (m.attachments && m.attachments.length > 0) {
        const parts: any[] = [{ type: "text", text: m.content }];
        for (const att of m.attachments) {
          if (att.type.startsWith("image/")) {
            parts.push({
              type: "image_url",
              image_url: { url: att.dataUrl },
            });
          } else {
            // For non-image files, include as text description
            parts.push({
              type: "text",
              text: `[Allegato: ${att.name} (${att.type})]`,
            });
          }
        }
        return { role: m.role, content: parts };
      }
      return { role: m.role, content: m.content };
    });

    try {
      const { data, error } = await supabase.functions.invoke("dark-lemon-mn", {
        body: { messages: apiMessages, context },
      });

      if (error) throw new Error(error.message || "Errore nella risposta");

      const assistantContent = data.content || "Mi dispiace, non ho capito.";
      const assistantMsg: DLMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: assistantContent,
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (convId) {
        await supabase.from("ai_messages").insert({
          conversation_id: convId,
          role: "assistant",
          content: assistantContent,
        });
        if (messages.length === 0) {
          await supabase.from("ai_conversations")
            .update({ title: content.substring(0, 100), updated_at: new Date().toISOString() })
            .eq("id", convId);
          await loadConversations();
        }
      }
    } catch (error) {
      console.error("Dark Lemon MN error:", error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `❌ Errore: ${(error as Error).message}`,
        createdAt: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, currentConversationId, context, createConversation, loadConversations]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    await supabase.from("ai_messages").delete().eq("conversation_id", conversationId);
    await supabase.from("ai_conversations").delete().eq("id", conversationId);
    if (currentConversationId === conversationId) {
      setCurrentConversationId(null);
      setMessages([]);
    }
    await loadConversations();
  }, [currentConversationId, loadConversations]);

  const newChat = useCallback(() => {
    setCurrentConversationId(null);
    setMessages([]);
  }, []);

  useEffect(() => { if (user) loadConversations(); }, [user, loadConversations]);

  return {
    messages, isLoading, conversations, currentConversationId,
    sendMessage, loadConversation, deleteConversation, newChat,
  };
}
