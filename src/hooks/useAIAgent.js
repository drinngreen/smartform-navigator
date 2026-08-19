import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useFIRStore } from "@/stores/firStore";
export function useAIAgent() {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [currentConversationId, setCurrentConversationId] = useState(null);
    const [conversations, setConversations] = useState([]);
    const abortControllerRef = useRef(null);
    const firStore = useFIRStore();
    const loadConversations = useCallback(async () => {
        if (!user)
            return;
        const { data, error } = await supabase.from("ai_conversations").select("*").order("updated_at", { ascending: false });
        if (!error && data) {
            setConversations(data.map(c => ({ id: c.id, title: c.title, createdAt: new Date(c.created_at), updatedAt: new Date(c.updated_at) })));
        }
    }, [user]);
    const createConversation = useCallback(async (title = "Nuova conversazione") => {
        if (!user)
            return null;
        const { data, error } = await supabase.from("ai_conversations").insert({ user_id: user.id, title }).select().single();
        if (error) {
            console.error("Error creating conversation:", error);
            return null;
        }
        setCurrentConversationId(data.id);
        setMessages([]);
        await loadConversations();
        return data.id;
    }, [user, loadConversations]);
    const loadConversation = useCallback(async (conversationId) => {
        const { data, error } = await supabase.from("ai_messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
        if (!error && data) {
            setMessages(data.map(m => ({ id: m.id, role: m.role, content: m.content, createdAt: new Date(m.created_at), metadata: m.metadata })));
            setCurrentConversationId(conversationId);
        }
    }, []);
    const sendMessage = useCallback(async (content) => {
        let convId = currentConversationId;
        if (!convId && user) {
            convId = await createConversation(content.substring(0, 50) + "...");
        }
        const userMessage = { id: crypto.randomUUID(), role: "user", content, createdAt: new Date() };
        setMessages(prev => [...prev, userMessage]);
        if (convId) {
            await supabase.from("ai_messages").insert({ conversation_id: convId, role: "user", content });
        }
        setIsLoading(true);
        const apiMessages = [...messages.slice(-19), userMessage].map(m => ({ role: m.role, content: m.content }));
        const currentFirData = firStore.data;
        try {
            const { data, error } = await supabase.functions.invoke("ai-agent", { body: { messages: apiMessages, conversation_id: convId, currentFirData, stream: false } });
            if (error)
                throw new Error(error.message || "Errore nella risposta");
            const assistantContent = data.content || data.choices?.[0]?.message?.content || "Mi dispiace, non ho capito.";
            // Handle firUpdates from tool-calling response
            if (data.firUpdates) {
                if (data.firUpdates.__reset) {
                    firStore.resetForm();
                }
                else {
                    firStore.setFromAgent(data.firUpdates);
                }
            }
            const assistantMessage = { id: crypto.randomUUID(), role: "assistant", content: assistantContent, createdAt: new Date(), firUpdates: data.firUpdates };
            setMessages(prev => [...prev, assistantMessage]);
            if (convId) {
                await supabase.from("ai_messages").insert({ conversation_id: convId, role: "assistant", content: assistantContent, metadata: data.firUpdates ? { firUpdates: data.firUpdates } : undefined });
                if (messages.length === 0) {
                    await supabase.from("ai_conversations").update({ title: content.substring(0, 100), updated_at: new Date().toISOString() }).eq("id", convId);
                    await loadConversations();
                }
            }
        }
        catch (error) {
            if (error.name !== "AbortError") {
                console.error("AI Agent error:", error);
                setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", content: `❌ Errore: ${error.message}`, createdAt: new Date() }]);
            }
        }
        finally {
            setIsLoading(false);
            setIsStreaming(false);
            abortControllerRef.current = null;
        }
    }, [messages, currentConversationId, user, createConversation, firStore, loadConversations]);
    const stopStreaming = useCallback(() => { if (abortControllerRef.current)
        abortControllerRef.current.abort(); }, []);
    const deleteConversation = useCallback(async (conversationId) => {
        await supabase.from("ai_messages").delete().eq("conversation_id", conversationId);
        await supabase.from("ai_conversations").delete().eq("id", conversationId);
        if (currentConversationId === conversationId) {
            setCurrentConversationId(null);
            setMessages([]);
        }
        await loadConversations();
    }, [currentConversationId, loadConversations]);
    const newChat = useCallback(() => { setCurrentConversationId(null); setMessages([]); }, []);
    useEffect(() => { if (user)
        loadConversations(); }, [user, loadConversations]);
    return {
        messages, isLoading, isStreaming, conversations, currentConversationId,
        sendMessage, stopStreaming, loadConversations, loadConversation, createConversation, deleteConversation, newChat,
        firData: firStore.data, firPendingFromAgent: firStore.pendingFromAgent, confirmFirUpdates: firStore.confirmAgentUpdates, rejectFirUpdates: firStore.rejectAgentUpdates,
    };
}
