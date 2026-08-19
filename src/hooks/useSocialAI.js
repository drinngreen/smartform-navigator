import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
export function useSocialAI() {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const sendMessage = useCallback(async (content) => {
        const userMessage = { id: crypto.randomUUID(), role: "user", content, createdAt: new Date() };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);
        const apiMessages = [...messages.slice(-19), userMessage].map(m => ({ role: m.role, content: m.content }));
        try {
            const { data, error } = await supabase.functions.invoke("social-ai-agent", {
                body: { messages: apiMessages },
            });
            if (error)
                throw new Error(error.message || "Errore nella risposta");
            const assistantContent = data.content || "Mi dispiace, non ho capito.";
            const assistantMessage = {
                id: crypto.randomUUID(), role: "assistant", content: assistantContent, createdAt: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
        }
        catch (error) {
            console.error("Social AI error:", error);
            setMessages(prev => [...prev, {
                    id: crypto.randomUUID(), role: "assistant",
                    content: `❌ Errore: ${error.message}`, createdAt: new Date()
                }]);
        }
        finally {
            setIsLoading(false);
        }
    }, [messages]);
    const clearChat = useCallback(() => setMessages([]), []);
    return { messages, isLoading, sendMessage, clearChat };
}
