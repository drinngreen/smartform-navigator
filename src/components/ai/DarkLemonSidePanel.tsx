import { useRef, useEffect, useCallback } from "react";
import { X, Bot, User, Camera, PanelLeftClose, ScanSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { useZoliDarkLemonWidgetStore } from "@/stores/zoliDarkLemonWidgetStore";
import { useDarkLemonMN } from "@/hooks/useDarkLemonMN";
import { usePageContext } from "@/hooks/usePageContext";
import { useFormBridgeContext } from "@/contexts/FormBridgeContext";
import { DarkLemonInputBar } from "./DarkLemonInputBar";
import { MessageCopyButton } from "./MessageCopyButton";
import { FillFormAction, parseFillFormTag, stripFillFormTag } from "./FillFormAction";
import zoliLemonIcon from "@/assets/zoli-dark-lemon-icon.png";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { captureWorkspaceScreenshot } from "@/lib/captureWorkspace";

interface DarkLemonSidePanelProps {
  context?: string;
}

export function DarkLemonSidePanel({ context = "multyproget" }: DarkLemonSidePanelProps) {
  const { setSidePanel, setWorking } = useZoliDarkLemonWidgetStore();
  const { messages, isLoading, sendMessage, newChat } = useDarkLemonMN(context);
  const { pageTitle, capturePageContent } = usePageContext();
  const { fillFields, getRegisteredFields } = useFormBridgeContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Sync isWorking with isLoading
  useEffect(() => {
    setWorking(isLoading);
  }, [isLoading, setWorking]);

  const handleScreenshot = useCallback(async () => {
    // Capture the workspace area - find the main content area
    const workspaceEl = document.querySelector("[data-admin-layout] main") as HTMLElement
      || document.querySelector("main") as HTMLElement
      || document.querySelector("[data-admin-layout] > div:first-child") as HTMLElement;

    if (!workspaceEl) {
      toast.error("Area di lavoro non disponibile");
      return;
    }
    try {
      toast.info("📸 Cattura in corso...");
      const canvas = await html2canvas(workspaceEl, {
        scale: 1,
        useCORS: true,
        logging: false,
        backgroundColor: null,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const ctx = capturePageContent();
      const bridgeFields = getRegisteredFields();
      const bridgeInfo = bridgeFields.length > 0
        ? `\n\n🔗 BRIDGE FIELDS:\n${bridgeFields.map(f => `- ${f.id}: "${f.label}" [${f.type}] = "${f.value}"`).join("\n")}`
        : "";
      sendMessage(
        "Ecco lo screenshot della pagina attuale. Analizzalo e dimmi cosa vedi.",
        [{ type: "image/png", name: "screenshot.png", dataUrl }],
        { ...ctx, content: (ctx.content || "") + bridgeInfo }
      );
      toast.success("Screenshot catturato!");
    } catch (err) {
      toast.error("Errore nella cattura dello screenshot");
    }
  }, [sendMessage, capturePageContent, getRegisteredFields]);

  const handleSend = useCallback((content: string, attachments?: { type: string; name: string; dataUrl: string }[]) => {
    const ctx = capturePageContent();
    const bridgeFields = getRegisteredFields();
    const bridgeInfo = bridgeFields.length > 0
      ? `\n\n🔗 BRIDGE FIELDS:\n${bridgeFields.map(f => `- ${f.id}: "${f.label}" [${f.type}] = "${f.value}"`).join("\n")}`
      : "";
    sendMessage(content, attachments, { ...ctx, content: (ctx.content || "") + bridgeInfo });
  }, [sendMessage, capturePageContent, getRegisteredFields]);

  const handleAnalyzePage = useCallback(() => {
    if (isLoading) return;
    const ctx = capturePageContent();
    const bridgeFields = getRegisteredFields();
    const bridgeInfo = bridgeFields.length > 0
      ? `\n\n🔗 BRIDGE FIELDS:\n${bridgeFields.map(f => `- ${f.id}: "${f.label}" [${f.type}] = "${f.value}"`).join("\n")}`
      : "";
    sendMessage("Analizza la pagina che sto visualizzando e dammi consigli utili.", undefined, { ...ctx, content: (ctx.content || "") + bridgeInfo });
  }, [sendMessage, capturePageContent, isLoading, getRegisteredFields]);

  return (
    <div className="fixed top-0 right-0 h-full w-[20vw] min-w-[280px] flex flex-col bg-[hsl(222,47%,6%)] border-l border-white/10 z-[60] animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-[hsl(222,47%,8%)] border-b border-white/10 shrink-0">
        <img src={zoliLemonIcon} alt="Dark Lemon" className="h-6 w-6" />
        <span className="text-white font-display text-xs tracking-wider flex-1">DARK LEMON</span>
        <button onClick={handleAnalyzePage} disabled={isLoading} className="p-1 rounded-md bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors" title="Analizza pagina">
          <ScanSearch className="h-3.5 w-3.5" />
        </button>
        <button onClick={handleScreenshot} className="p-1 rounded-md bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors" title="Screenshot area di lavoro">
          <Camera className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setSidePanel(false)} className="p-1 text-white/40 hover:text-white transition-colors" title="Chiudi pannello">
          <PanelLeftClose className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.length === 0 && (
          <div className="flex gap-2 justify-start">
            <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="h-2.5 w-2.5 text-cyan-400" />
            </div>
            <div className="rounded-lg px-2.5 py-1.5 text-[11px] bg-white/5 text-white/90 border border-cyan-500/20 select-text">
              Ciao! Sono in modalità pannello laterale 🍋
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={msg.id || i} className={cn("flex gap-1.5 group", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-2.5 w-2.5 text-cyan-400" />
              </div>
            )}
            <div className={cn(
              "max-w-[90%] rounded-lg px-2.5 py-1.5 text-[11px] prose prose-xs prose-invert max-w-none select-text relative",
              msg.role === "user"
                ? "bg-blue-500/20 text-white border border-blue-500/30"
                : "bg-white/5 text-white/90 border border-cyan-500/20"
            )}>
              <ReactMarkdown>{msg.role === "assistant" ? stripFillFormTag(msg.content) : msg.content}</ReactMarkdown>
              {msg.role === "assistant" && (() => {
                const fillData = parseFillFormTag(msg.content);
                return fillData ? <FillFormAction data={fillData} /> : null;
              })()}
              {msg.role === "assistant" && (
                <MessageCopyButton content={msg.content} className="absolute -top-1 -right-1" />
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-2.5 w-2.5 text-blue-400" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-1.5">
            <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <Bot className="h-2.5 w-2.5 text-cyan-400 animate-pulse" />
            </div>
            <div className="rounded-lg px-2.5 py-1.5 bg-white/5 border border-cyan-500/20">
              <div className="flex gap-1">
                <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" />
                <span className="w-1 h-1 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <DarkLemonInputBar onSend={handleSend} isLoading={isLoading} />
    </div>
  );
}
