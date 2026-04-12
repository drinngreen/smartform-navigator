import { useState, useRef, useCallback, useEffect } from "react";
import { X, Minimize2, Maximize2, Shrink, Bot, User, MessageSquare, Plus, Trash2, FileImage, ScanSearch } from "lucide-react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useZoliDarkLemonWidgetStore } from "@/stores/zoliDarkLemonWidgetStore";
import { useDarkLemonMN } from "@/hooks/useDarkLemonMN";
import { usePageContext } from "@/hooks/usePageContext";
import { DarkLemonInputBar } from "./DarkLemonInputBar";
import zoliLemonIcon from "@/assets/zoli-dark-lemon-icon.png";
import ReactMarkdown from "react-markdown";

const MIN_W = 300;
const MIN_H = 280;
const MAX_W = 900;
const MAX_H = 800;

export function ZoliDarkLemonWidget() {
  const { isOpen, setOpen, position, setPosition, size, setSize } = useZoliDarkLemonWidgetStore();
  const [minimized, setMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const savedPos = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const widgetRef = useRef(null);
  const messagesEndRef = useRef(null);
  const location = useLocation();

  const isMN = location.pathname.startsWith("/mn/admin");
  const ctxMatch = location.pathname.match(/\/mn\/admin\/([\w-]+)/);
  const context = isMN ? (ctxMatch?.[1] || "multyproget") : "multyproget";

  const { messages, isLoading, conversations, currentConversationId, sendMessage, loadConversation, deleteConversation, newChat } = useDarkLemonMN(context);
  const { pageTitle, capturePageContent } = usePageContext();

  const isResizing = useRef(null);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0, px: 0, py: 0 });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleMouseDown = useCallback((e) => {
    if (isFullscreen) return;
    if (e.target.closest("input, a, button")) return;
    if (e.target.dataset.resize) return;
    isDragging.current = true;
    hasDragged.current = false;
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    e.preventDefault();
  }, [position, isFullscreen]);

  const handleResizeDown = useCallback((dir) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    isResizing.current = dir;
    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.width, h: size.height, px: position.x, py: position.y };
  }, [size, position]);

  useEffect(() => {
    const onMove = (e) => {
      if (isResizing.current) {
        const dir = isResizing.current;
        const dx = e.clientX - resizeStart.current.x;
        const dy = e.clientY - resizeStart.current.y;
        let newW = resizeStart.current.w;
        let newH = resizeStart.current.h;
        let newX = resizeStart.current.px;
        let newY = resizeStart.current.py;

        if (dir.includes("e")) newW = Math.min(MAX_W, Math.max(MIN_W, resizeStart.current.w + dx));
        if (dir.includes("w")) {
          newW = Math.min(MAX_W, Math.max(MIN_W, resizeStart.current.w - dx));
          newX = resizeStart.current.px + (resizeStart.current.w - newW);
        }
        if (dir.includes("s")) newH = Math.min(MAX_H, Math.max(MIN_H, resizeStart.current.h + dy));
        if (dir.includes("n")) {
          newH = Math.min(MAX_H, Math.max(MIN_H, resizeStart.current.h - dy));
          newY = resizeStart.current.py + (resizeStart.current.h - newH);
        }

        setSize({ width: newW, height: newH });
        setPosition({ x: newX, y: newY });
        return;
      }

      if (!isDragging.current) return;
      hasDragged.current = true;
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 80, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 80, e.clientY - dragOffset.current.y)),
      });
    };

    const onUp = () => {
      isDragging.current = false;
      isResizing.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [setPosition, setSize]);

  const handleSend = useCallback((content, attachments) => {
    const ctx = capturePageContent();
    sendMessage(content, attachments, { route: ctx.route, pageTitle: ctx.pageTitle });
  }, [sendMessage, capturePageContent]);

  const handleAnalyzePage = useCallback(() => {
    if (isLoading) return;
    const ctx = capturePageContent();
    sendMessage("Analizza la pagina che sto visualizzando e dammi consigli utili.", undefined, ctx);
  }, [sendMessage, capturePageContent, isLoading]);

  const toggleFullscreen = () => {
    if (isFullscreen) {
      if (savedPos.current.w > 0) {
        setPosition({ x: savedPos.current.x, y: savedPos.current.y });
        setSize({ width: savedPos.current.w, height: savedPos.current.h });
      }
      setIsFullscreen(false);
    } else {
      savedPos.current = { x: position.x, y: position.y, w: size.width, h: size.height };
      setIsFullscreen(true);
    }
  };

  if (!isOpen) return null;

  if (minimized) {
    return (
      <div
        ref={widgetRef}
        onMouseDown={handleMouseDown}
        onMouseUp={() => { if (!hasDragged.current) setMinimized(false); }}
        className="fixed z-[9999] cursor-grab active:cursor-grabbing"
        style={{ left: position.x, top: position.y }}
      >
        <div
          className="relative w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, hsl(222 47% 10%), hsl(222 47% 6%))", boxShadow: "0 0 20px rgba(59,130,246,0.5), 0 0 40px rgba(236,72,153,0.3)" }}
        >
          <div
            className="absolute inset-0 rounded-full p-[2px] bg-gradient-to-r from-blue-500 via-pink-500 via-green-400 to-cyan-400 animate-gradient"
            style={{ WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }}
          />
          <img src={zoliLemonIcon} alt="Dark Lemon" className="h-8 w-8 relative z-10 pointer-events-none" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={widgetRef}
      onMouseDown={handleMouseDown}
      className="fixed z-[9999] select-none"
      style={isFullscreen
        ? { left: 0, top: 0, width: "100vw", height: "100vh" }
        : { left: position.x, top: position.y, width: size.width, height: size.height }}
    >
      {!isFullscreen && <>
        <div data-resize="n" onMouseDown={handleResizeDown("n")} className="absolute -top-1 left-3 right-3 h-2 cursor-n-resize z-[10000]" />
        <div data-resize="s" onMouseDown={handleResizeDown("s")} className="absolute -bottom-1 left-3 right-3 h-2 cursor-s-resize z-[10000]" />
        <div data-resize="e" onMouseDown={handleResizeDown("e")} className="absolute -right-1 top-3 bottom-3 w-2 cursor-e-resize z-[10000]" />
        <div data-resize="w" onMouseDown={handleResizeDown("w")} className="absolute -left-1 top-3 bottom-3 w-2 cursor-w-resize z-[10000]" />
        <div data-resize="nw" onMouseDown={handleResizeDown("nw")} className="absolute -top-1 -left-1 w-4 h-4 cursor-nw-resize z-[10001]" />
        <div data-resize="ne" onMouseDown={handleResizeDown("ne")} className="absolute -top-1 -right-1 w-4 h-4 cursor-ne-resize z-[10001]" />
        <div data-resize="sw" onMouseDown={handleResizeDown("sw")} className="absolute -bottom-1 -left-1 w-4 h-4 cursor-sw-resize z-[10001]" />
        <div data-resize="se" onMouseDown={handleResizeDown("se")} className="absolute -bottom-1 -right-1 w-4 h-4 cursor-se-resize z-[10001]" />
      </>}

      <div className="relative rounded-2xl p-[3px] overflow-hidden h-full">
        <div className="absolute inset-0 rounded-2xl animate-gradient" style={{ background: "linear-gradient(90deg, #3b82f6, #ec4899, #22c55e, #06b6d4, #a855f7, #f59e0b, #3b82f6)", backgroundSize: "300% 100%" }} />
        <div className="absolute inset-0 rounded-2xl blur-md opacity-60 animate-gradient" style={{ background: "linear-gradient(90deg, #3b82f6, #ec4899, #22c55e, #06b6d4, #a855f7, #f59e0b, #3b82f6)", backgroundSize: "300% 100%" }} />

        <div className="relative rounded-2xl bg-[hsl(222,47%,6%)] overflow-hidden h-full flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 bg-[hsl(222,47%,8%)] border-b border-white/10 cursor-grab active:cursor-grabbing shrink-0">
            <img src={zoliLemonIcon} alt="Dark Lemon" className="h-7 w-7" />
            <span className="text-white font-display text-sm tracking-wider flex-1">DARK LEMON AI</span>

            {!isFullscreen && (
              <button
                onClick={handleAnalyzePage}
                onMouseDown={(e) => e.stopPropagation()}
                className="p-1.5 rounded-md bg-green-500/15 text-green-400 hover:bg-green-500/25 hover:text-green-300 transition-colors"
                title={`🔍 Analizza: ${pageTitle}`}
                disabled={isLoading}
              >
                <ScanSearch className="h-4 w-4" />
              </button>
            )}

            {isFullscreen && (
              <button onClick={() => setShowHistory(!showHistory)} onMouseDown={(e) => e.stopPropagation()} className={cn("p-1 transition-colors", showHistory ? "text-cyan-400" : "text-white/60 hover:text-cyan-400")} title="Cronologia">
                <MessageSquare className="h-4 w-4" />
              </button>
            )}

            <button onClick={toggleFullscreen} onMouseDown={(e) => e.stopPropagation()} className="p-1 text-white/60 hover:text-cyan-400 transition-colors" title={isFullscreen ? "Riduci" : "Tutto schermo"}>
              {isFullscreen ? <Shrink className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button onClick={() => { setIsFullscreen(false); setMinimized(true); }} onMouseDown={(e) => e.stopPropagation()} className="p-1 text-white/60 hover:text-yellow-400 transition-colors" title="Minimizza">
              <Minimize2 className="h-4 w-4" />
            </button>
            <button onClick={() => { newChat(); setOpen(false); }} onMouseDown={(e) => e.stopPropagation()} className="p-1 text-white/60 hover:text-red-400 transition-colors" title="Chiudi">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {isFullscreen && showHistory && (
              <div className="w-64 shrink-0 border-r border-white/10 flex flex-col bg-[hsl(222,47%,5%)]" onMouseDown={(e) => e.stopPropagation()}>
                <div className="p-3 border-b border-white/10">
                  <button onClick={() => { newChat(); }} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs hover:bg-cyan-500/20 transition-colors">
                    <Plus className="h-3.5 w-3.5" /> Nuova Chat
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={cn(
                        "group flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs cursor-pointer transition-colors",
                        conv.id === currentConversationId ? "bg-white/10 text-white" : "text-white/50 hover:text-white hover:bg-white/5"
                      )}
                      onClick={() => loadConversation(conv.id)}
                    >
                      <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 truncate">{conv.title}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity p-0.5"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {conversations.length === 0 && (
                    <p className="text-white/25 text-xs text-center px-3 py-8">Nessuna conversazione</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3 space-y-3" onMouseDown={(e) => e.stopPropagation()}>
                {messages.length === 0 && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="h-3 w-3 text-cyan-400" />
                    </div>
                    <div className="max-w-[80%] rounded-xl px-3 py-2 text-xs bg-white/5 text-white/90 border border-cyan-500/20">
                      Ciao! Sono Dark Lemon AI 🍋 Chiedimi qualsiasi cosa sui dati aziendali!
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={msg.id || i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                    {msg.role === "assistant" && (
                      <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="h-3 w-3 text-cyan-400" />
                      </div>
                    )}

                    <div className={cn(
                      "max-w-[80%] rounded-xl px-3 py-2 text-xs prose prose-sm prose-invert max-w-none",
                      msg.role === "user"
                        ? "bg-blue-500/20 text-white border border-blue-500/30"
                        : "bg-white/5 text-white/90 border border-cyan-500/20"
                    )}>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex gap-1.5 mb-1.5 flex-wrap">
                          {msg.attachments.map((att, j) => (
                            att.type.startsWith("image/") ? (
                              <img key={j} src={att.dataUrl} alt={att.name} className="h-20 w-auto max-w-[200px] rounded-lg object-cover" />
                            ) : (
                              <div key={j} className="flex items-center gap-1 text-[10px] text-white/50 bg-white/5 rounded px-1.5 py-0.5">
                                <FileImage className="h-3 w-3" /> {att.name}
                              </div>
                            )
                          ))}
                        </div>
                      )}
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>

                    {msg.role === "user" && (
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="h-3 w-3 text-blue-400" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <Bot className="h-3 w-3 text-cyan-400 animate-pulse" />
                    </div>
                    <div className="rounded-xl px-3 py-2 bg-white/5 border border-cyan-500/20 text-white/60 text-xs">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <DarkLemonInputBar onSend={handleSend} isLoading={isLoading} />
            </div>
          </div>
        </div>
      </div>

      {!isFullscreen && (
        <div className="absolute bottom-0 right-0 w-3 h-3 pointer-events-none z-[10002]">
          <svg viewBox="0 0 12 12" className="w-full h-full opacity-40">
            <line x1="11" y1="3" x2="3" y2="11" stroke="white" strokeWidth="1" />
            <line x1="11" y1="7" x2="7" y2="11" stroke="white" strokeWidth="1" />
          </svg>
        </div>
      )}
    </div>
  );
}
