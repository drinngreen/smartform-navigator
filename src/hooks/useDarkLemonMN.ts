import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useZoliDarkLemonWidgetStore } from "@/stores/zoliDarkLemonWidgetStore";
import { useAgentActivityStore, getRecentActivityPayload, logAgentActivity } from "@/stores/agentActivityStore";

import type { Database, Json } from "@/integrations/supabase/types";

export interface DLAttachment {
  type: string;
  name: string;
  dataUrl: string;
  preview?: string;
}

export interface DLMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: DLAttachment[];
  createdAt: Date;
}

export type DLSurface = "side" | "floating" | "console" | "page";

export const DL_SURFACE_LABELS: Record<DLSurface, string> = {
  side: "Vista laterale",
  floating: "Vista fluttuante",
  console: "Console RENTRI",
  page: "Pagina Dark Lemon",
};

export interface DLConversation {
  id: string;
  title: string;
  surface: DLSurface;
  createdAt: Date;
  updatedAt: Date;
}

type AIMessageInsert = Database["public"]["Tables"]["ai_messages"]["Insert"];

const TEXT_ATTACHMENT_EXTENSIONS = new Set([
  "txt", "md", "csv", "tsv", "json", "xml", "yaml", "yml", "log", "html", "htm", "css", "js", "jsx", "ts", "tsx",
]);

function normalizeMNContext(context?: string) {
  return context?.replace(/^dev-/, "");
}

function isDLAttachment(value: unknown): value is DLAttachment {
  if (!value || typeof value !== "object") return false;
  const attachment = value as Partial<DLAttachment>;
  return typeof attachment.name === "string"
    && typeof attachment.dataUrl === "string"
    && typeof attachment.type === "string";
}

function getAttachmentsFromMetadata(metadata: unknown): DLAttachment[] | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;

  const attachments = (metadata as { attachments?: unknown }).attachments;
  if (!Array.isArray(attachments)) return undefined;

  const validAttachments = attachments.filter(isDLAttachment);
  return validAttachments.length > 0 ? validAttachments : undefined;
}

function decodeAttachmentText(dataUrl: string) {
  try {
    const base64Content = dataUrl.split(",")[1];
    if (!base64Content) return null;
    const binary = atob(base64Content);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return null;
  }
}

function isTextAttachment(attachment: DLAttachment) {
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

function buildApiMessage(message: DLMessage) {
  if (!message.attachments || message.attachments.length === 0) {
    return { role: message.role, content: message.content };
  }

  const parts: any[] = [{ type: "text", text: message.content }];

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

export function useDarkLemonMN(context?: string, surface: DLSurface = "page") {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DLMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<DLConversation[]>([]);
  const normalizedContext = normalizeMNContext(context);

  // Shared conversation ID from zustand store
  const currentConversationId = useZoliDarkLemonWidgetStore((s) => s.currentConversationId);
  const setCurrentConversationId = useZoliDarkLemonWidgetStore((s) => s.setCurrentConversationId);

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
        .map(c => {
          const ctx = c.context as any;
          const raw = ctx?.surface as string | undefined;
          return {
            id: c.id,
            title: c.title,
            surface: (raw && ["side", "floating", "console", "page"].includes(raw) ? raw : "page") as DLSurface,
            createdAt: new Date(c.created_at),
            updatedAt: new Date(c.updated_at),
          };
        })
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
        context: {
          source: "dark-lemon-mn",
          surface,
          ...(normalizedContext ? { mn_context: normalizedContext } : {}),
        },
      })
      .select()
      .single();
    if (error) { console.error("Error creating conversation:", error); return null; }
    setCurrentConversationId(data.id);
    setMessages([]);
    await loadConversations();
    return data.id;
  }, [user, normalizedContext, surface, loadConversations, setCurrentConversationId]);


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
        attachments: getAttachmentsFromMetadata(m.metadata),
        createdAt: new Date(m.created_at),
      })));
      setCurrentConversationId(conversationId);
    }
  }, [setCurrentConversationId]);

  const sendMessage = useCallback(async (
    content: string,
    attachments?: DLAttachment[],
    pageContext?: { route: string; pageTitle: string; content?: string }
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
      const userMessageInsert: AIMessageInsert = {
        conversation_id: convId,
        role: "user",
        content,
        metadata: attachments && attachments.length > 0 ? ({ attachments } as unknown as Json) : null,
      };

      await supabase.from("ai_messages").insert(userMessageInsert);
    }

    setIsLoading(true);

    const apiMessages = [...messages.slice(-19), userMsg].map(buildApiMessage);

    try {
      if (pageContext?.content) {
        const contextMsg = {
          role: "user" as const,
          content: `[CONTESTO PAGINA ATTIVA]\n${pageContext.content}\n[/CONTESTO PAGINA ATTIVA]`,
        };
        apiMessages.splice(apiMessages.length - 1, 0, contextMsg);
      }

      const { data, error } = await supabase.functions.invoke("dark-lemon-mn", {
        body: {
          messages: apiMessages,
          context: normalizedContext,
          pageRoute: pageContext?.route,
          pageTitle: pageContext?.pageTitle,
          activity: getRecentActivityPayload(),
          autopilot: useAgentActivityStore.getState().autopilot,
        },
      });

      if (error) throw new Error(error.message || "Errore nella risposta");

      const steps = Array.isArray((data as any)?.steps) ? (data as any).steps : [];
      if (steps.length > 0) {
        const failed = steps.filter((s: any) => !s?.ok);
        useAgentActivityStore.getState().setSupervision({
          level: failed.length > 0 ? "error" : "ok",
          message: failed.length > 0
            ? `${failed.length}/${steps.length} operazioni fallite (${failed.map((s: any) => s.tool).join(", ")})`
            : `${steps.length} operazioni eseguite correttamente`,
          at: new Date().toISOString(),
        });
        logAgentActivity(
          "Dark Lemon: esecuzione strumenti",
          failed.length > 0 ? "error" : "ok",
          steps.map((s: any) => s.tool).join(", "),
          failed.length > 0 ? failed.map((s: any) => `${s.tool}: ${s.error}`).join(" | ") : undefined,
        );
      }

      const assistantContent = data.content || "Mi dispiace, non ho capito.";

      const assistantMsg: DLMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: assistantContent,
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (convId) {
        const assistantMessageInsert: AIMessageInsert = {
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
  }, [messages, currentConversationId, normalizedContext, createConversation, loadConversations]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    await supabase.from("ai_messages").delete().eq("conversation_id", conversationId);
    await supabase.from("ai_conversations").delete().eq("id", conversationId);
    if (currentConversationId === conversationId) {
      setCurrentConversationId(null);
      setMessages([]);
    }
    await loadConversations();
  }, [currentConversationId, loadConversations, setCurrentConversationId]);

  const newChat = useCallback(() => {
    setCurrentConversationId(null);
    setMessages([]);
  }, [setCurrentConversationId]);

  useEffect(() => { if (user) loadConversations(); }, [user, loadConversations]);

  return {
    messages, isLoading, conversations, currentConversationId,
    sendMessage, loadConversation, deleteConversation, newChat,
  };
}
