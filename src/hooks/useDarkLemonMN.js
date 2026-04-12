import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
const TEXT_ATTACHMENT_EXTENSIONS = new Set([
    "txt", "md", "csv", "tsv", "json", "xml", "yaml", "yml", "log", "html", "htm", "css", "js", "jsx", "ts", "tsx",
]);
function normalizeMNContext(context) {
    return context?.replace(/^dev-/, "");
}
function isDLAttachment(value) {
    if (!value || typeof value !== "object")
        return false;
    const attachment = value;
    return typeof attachment.name === "string"
        && typeof attachment.dataUrl === "string"
        && typeof attachment.type === "string";
}
function getAttachmentsFromMetadata(metadata) {
    if (!metadata || typeof metadata !== "object")
        return undefined;
    const attachments = metadata.attachments;
    if (!Array.isArray(attachments))
        return undefined;
    const validAttachments = attachments.filter(isDLAttachment);
    return validAttachments.length > 0 ? validAttachments : undefined;
}
function decodeAttachmentText(dataUrl) {
    try {
        const base64Content = dataUrl.split(",")[1];
        if (!base64Content)
            return null;
        const binary = atob(base64Content);
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    }
    catch {
        return null;
    }
}
function isTextAttachment(attachment) {
    const type = attachment.type.toLowerCase();
    const extension = attachment.name.split(".").pop()?.toLowerCase() || "";
    return type.startsWith("text/")
        || type.includes("json")
        || type.includes("xml")
        || type.includes("csv")
        || type === "application/javascript"
        || type === "application/x-javascript"
        || TEXT_ATTACHMENT_EXTENSIONS.has(extension);
}
function buildApiMessage(message) {
    if (!message.attachments || message.attachments.length === 0) {
        return { role: message.role, content: message.content };
    }
    const parts = [{ type: "text", text: message.content }];
    for (const attachment of message.attachments) {
        if (attachment.type.startsWith("image/") || attachment.type === "application/pdf") {
            parts.push({
                type: "image_url",
                image_url: { url: attachment.dataUrl },
            });
            continue;
        }
        if (isTextAttachment(attachment)) {
            const decoded = decodeAttachmentText(attachment.dataUrl);
            parts.push({
                type: "text",
                text: decoded
                    ? `--- CONTENUTO FILE: ${attachment.name} ---\n${decoded}\n--- FINE FILE ---`
                    : `[Allegato testuale non leggibile: ${attachment.name} (${attachment.type})]`,
            });
            continue;
        }
        parts.push({
            type: "text",
            text: `[Allegato disponibile: ${attachment.name} (${attachment.type || "tipo sconosciuto"})]`,
        });
    }
    return { role: message.role, content: parts };
}
export function useDarkLemonMN(context) {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentConversationId, setCurrentConversationId] = useState(null);
    const [conversations, setConversations] = useState([]);
    const normalizedContext = normalizeMNContext(context);
    const loadConversations = useCallback(async () => {
        if (!user)
            return;
        const { data } = await supabase
            .from("ai_conversations")
            .select("*")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false });
        if (data) {
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
            context: { source: "dark-lemon-mn", ...(normalizedContext ? { mn_context: normalizedContext } : {}) },
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
    }, [user, normalizedContext, loadConversations]);
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
                attachments: getAttachmentsFromMetadata(m.metadata),
                createdAt: new Date(m.created_at),
            })));
            setCurrentConversationId(conversationId);
        }
    }, []);
    const sendMessage = useCallback(async (content, attachments) => {
        let convId = currentConversationId;
        if (!convId) {
            convId = await createConversation(content.substring(0, 50) + "...");
        }
        const userMsg = {
            id: crypto.randomUUID(),
            role: "user",
            content,
            attachments,
            createdAt: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);
        if (convId) {
            const userMessageInsert = {
                conversation_id: convId,
                role: "user",
                content,
                metadata: attachments && attachments.length > 0 ? { attachments } : null,
            };
            await supabase.from("ai_messages").insert(userMessageInsert);
        }
        setIsLoading(true);
        const apiMessages = [...messages.slice(-19), userMsg].map(buildApiMessage);
        try {
            const { data, error } = await supabase.functions.invoke("dark-lemon-mn", {
                body: { messages: apiMessages, context: normalizedContext },
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
                const assistantMessageInsert = {
                    conversation_id: convId,
                    role: "assistant",
                    content: assistantContent,
                };
                await supabase.from("ai_messages").insert(assistantMessageInsert);
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
    }, [messages, currentConversationId, normalizedContext, createConversation, loadConversations]);
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
