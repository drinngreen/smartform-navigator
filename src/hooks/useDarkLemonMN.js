import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
export function useDarkLemonMN(context) {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentConversationId, setCurrentConversationId] = useState(null);
    const [conversations, setConversations] = useState([]);
    const loadConversations = useCallback(async () => {
        if (!user)
            return;
        const { data } = await supabase
            .from("ai_conversations")
            .select("*")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false });
        if (data) {
            // Filter conversations that have the MN context tag
            setConversations(data
                .filter(c => {
                const ctx = c.context;
                return ctx?.source === "dark-lemon-mn";
            })
                .map(c => ({
                id: c.id,
                title: c.title,
                createdAt: new Date(c.created_at),
                updatedAt: new Date(c.updated_at),
            })));
        }
    }, [user]);
    const createConversation = useCallback(async (title) => {
        if (!user)
            return null;
        const { data, error } = await supabase
            .from("ai_conversations")
            .insert({
            user_id: user.id,
            title,
            context: { source: "dark-lemon-mn", mn_context: context },
        })
            .select()
            .single();
        if (error) {
            console.error("Error creating conversation:", error);
            return null;
        }
        setCurrentConversationId(data.id);
        setMessages([]);
        await loadConversations();
        return data.id;
    }, [user, context, loadConversations]);
    const loadConversation = useCallback(async (conversationId) => {
        const { data } = await supabase
            .from("ai_messages")
            .select("*")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true });
        if (data) {
            setMessages(data.map(m => ({
                id: m.id,
                role: m.role,
                content: m.content,
                createdAt: new Date(m.created_at),
            })));
            setCurrentConversationId(conversationId);
        }
    }, []);
    const sendMessage = useCallback(async (content) => {
        let convId = currentConversationId;
        if (!convId) {
            convId = await createConversation(content.substring(0, 50) + "...");
        }
        const userMsg = { id: crypto.randomUUID(), role: "user", content, createdAt: new Date() };
        setMessages(prev => [...prev, userMsg]);
        if (convId) {
            await supabase.from("ai_messages").insert({ conversation_id: convId, role: "user", content });
        }
        setIsLoading(true);
        const apiMessages = [...messages.slice(-19), userMsg].map(m => ({ role: m.role, content: m.content }));
        try {
            const { data, error } = await supabase.functions.invoke("dark-lemon-mn", {
                body: { messages: apiMessages, context },
            });
            if (error)
                throw new Error(error.message || "Errore nella risposta");
            const assistantContent = data.content || "Mi dispiace, non ho capito.";
            const assistantMsg = {
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
        }
        catch (error) {
            console.error("Dark Lemon MN error:", error);
            setMessages(prev => [...prev, {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: `❌ Errore: ${error.message}`,
                    createdAt: new Date(),
                }]);
        }
        finally {
            setIsLoading(false);
        }
    }, [messages, currentConversationId, context, createConversation, loadConversations]);
    const deleteConversation = useCallback(async (conversationId) => {
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
    useEffect(() => { if (user)
        loadConversations(); }, [user, loadConversations]);
    return {
        messages, isLoading, conversations, currentConversationId,
        sendMessage, loadConversation, deleteConversation, newChat,
    };
}
