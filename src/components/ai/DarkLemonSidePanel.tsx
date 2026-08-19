import { useRef, useEffect, useCallback, useState } from "react";
import { X, Bot, User, Camera, PanelLeftClose, ScanSearch, MessageSquare, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useZoliDarkLemonWidgetStore } from "@/stores/zoliDarkLemonWidgetStore";
import { useDarkLemonMN } from "@/hooks/useDarkLemonMN";
import { DarkLemonHistory } from "./DarkLemonHistory";
import { usePageContext } from "@/hooks/usePageContext";
import { useFormBridgeContext } from "@/contexts/FormBridgeContext";
import { DarkLemonInputBar } from "./DarkLemonInputBar";
import { DarkLemonSupervisionBar } from "./DarkLemonSupervisionBar";

import { MessageCopyButton } from "./MessageCopyButton";
import { FillFormAction, parseFillFormTag, stripFillFormTag } from "./FillFormAction";
import zoliLemonIcon from "@/assets/zoli-dark-lemon-icon.png";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { captureWorkspaceScreenshot } from "@/lib/captureWorkspace";
import { useNavigate, useLocation } from "react-router-dom";

interface DarkLemonSidePanelProps {
  context?: string;
}

export function DarkLemonSidePanel({ context = "multyproget" }: DarkLemonSidePanelProps) {
  const { setSidePanel, setWorking } = useZoliDarkLemonWidgetStore();
  const { messages, isLoading, conversations, currentConversationId, sendMessage, loadConversation, deleteConversation, newChat } = useDarkLemonMN(context, "side");
  const [showHistory, setShowHistory] = useState(false);
  const { pageTitle, capturePageContent } = usePageContext();
  const { fillFields, getRegisteredFields } = useFormBridgeContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleOpenFullscreen = useCallback(() => {
    const isMnAdmin = location.pathname.startsWith("/mn/admin");
    if (isMnAdmin) {
      navigate(`/mn/admin/${context}/zoli-dark-lemon`);
    } else {
      navigate("/admin/zoli-dark-lemon");
    }
    setSidePanel(false);
  }, [navigate, location.pathname, context, setSidePanel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Sync isWorking with isLoading
  useEffect(() => {
    setWorking(isLoading);
  }, [isLoading, setWorking]);

  const buildContext = useCallback(() => {
    const ctx = capturePageContent();
    const bridgeFields = getRegisteredFields();
    const bridgeInfo = bridgeFields.length > 0
      ? `\n\n🔗 BRIDGE FIELDS:\n${bridgeFields.map(f => `- ${f.id}: "${f.label}" [${f.type}] = "${f.value}"`).join("\n")}`
      : "";
    return { ...ctx, content: (ctx.content || "") + bridgeInfo };
  }, [capturePageContent, getRegisteredFields]);

  const handleScreenshot = useCallback(async () => {
    if (isLoading) return;
    const toastId = toast.loading("📸 Cattura schermata in corso...");
    const shot = await captureWorkspaceScreenshot();
    const ctx = buildContext();

    if (!shot) {
      toast.error("Screenshot non riuscito: analizzo la pagina come testo", { id: toastId });
      sendMessage("Analizza la pagina che sto visualizzando (screenshot non disponibile) e dimmi cosa vedi.", undefined, ctx);
      return;
    }

    toast.success("Screenshot catturato!", { id: toastId });
    sendMessage(
      "Ecco lo screenshot della pagina attuale. Analizzalo e dimmi cosa vedi.",
      [{ type: shot.type, name: shot.name, dataUrl: shot.dataUrl }],
      ctx
    );
  }, [sendMessage, buildContext, isLoading]);


  const handleSend = useCallback((content: string, attachments?: { type: string; name: string; dataUrl: string }[]) => {
    sendMessage(content, attachments, buildContext());
  }, [sendMessage, buildContext]);

  const handleAnalyzePage = useCallback(() => {
    if (isLoading) return;
    sendMessage("Analizza la pagina che sto visualizzando e dammi consigli utili.", undefined, buildContext());
  }, [sendMessage, buildContext, isLoading]);

  return (
    <div data-dark-lemon="true" className="fixed top-0 right-0 h-full w-[20vw] min-w-[280px] flex flex-col bg-[hsl(222,47%,6%)] border-l border-white/10 z-[60] animate-slide-in-right">

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
        <button onClick={() => setShowHistory(v => !v)} className={"p-1 rounded-md transition-colors " + (showHistory ? "bg-cyan-500/25 text-cyan-300" : "bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25")} title="Cronologia">
          <MessageSquare className="h-3.5 w-3.5" />
        </button>
        <button onClick={handleOpenFullscreen} className="p-1 rounded-md bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors" title="Apri a tutto schermo">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setSidePanel(false)} className="p-1 text-white/40 hover:text-white transition-colors" title="Chiudi pannello">
          <PanelLeftClose className="h-3.5 w-3.5" />
        </button>
      </div>

      {showHistory && (
        <div className="h-1/2 border-b border-white/10 overflow-hidden shrink-0">
          <DarkLemonHistory
            conversations={conversations}
            currentConversationId={currentConversationId}
            onSelect={(id) => { loadConversation(id); setShowHistory(false); }}
            onDelete={deleteConversation}
            onNewChat={() => { newChat(); setShowHistory(false); }}
          />
        </div>
      )}

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

      {/* Supervisione + Autopilot */}
      <DarkLemonSupervisionBar />

      {/* Input */}
      <DarkLemonInputBar onSend={handleSend} isLoading={isLoading} />

    </div>
  );
}
