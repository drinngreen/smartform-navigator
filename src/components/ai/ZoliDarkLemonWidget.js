import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef, useCallback, useEffect } from "react";
import { X, Minimize2, Maximize2, Shrink, Bot, User, MessageSquare, FileImage, ScanSearch, Check, XCircle, PanelRight, Camera } from "lucide-react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useZoliDarkLemonWidgetStore } from "@/stores/zoliDarkLemonWidgetStore";
import { useDarkLemonMN } from "@/hooks/useDarkLemonMN";
import { DarkLemonHistory } from "./DarkLemonHistory";
import { DarkLemonSupervisionBar } from "./DarkLemonSupervisionBar";
import { usePageContext } from "@/hooks/usePageContext";
import { useFormBridgeContext } from "@/contexts/FormBridgeContext";
import { DarkLemonInputBar } from "./DarkLemonInputBar";
import zoliLemonIcon from "@/assets/zoli-dark-lemon-icon.png";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { MessageCopyButton } from "./MessageCopyButton";
import { captureWorkspaceScreenshot } from "@/lib/captureWorkspace";
const MIN_W = 300;
const MIN_H = 280;
const MAX_W = 900;
const MAX_H = 800;
function parseFillFormTag(content) {
    const match = content.match(/<!--FILL_FORM:([\s\S]*?)-->/);
    if (!match)
        return { cleanContent: content, payload: null };
    try {
        const payload = JSON.parse(match[1]);
        const cleanContent = content.replace(/<!--FILL_FORM:[\s\S]*?-->/g, "").trim();
        return { cleanContent, payload };
    }
    catch {
        return { cleanContent: content, payload: null };
    }
}
export function ZoliDarkLemonWidget() {
    const { isOpen, setOpen, position, setPosition, size, setSize } = useZoliDarkLemonWidgetStore();
    const [minimized, setMinimized] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [pendingFill, setPendingFill] = useState(null);
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
    const { messages, isLoading, conversations, currentConversationId, sendMessage, loadConversation, deleteConversation, newChat } = useDarkLemonMN(context, "floating");
    const { pageTitle, capturePageContent } = usePageContext();
    const { fillFields, getRegisteredFields } = useFormBridgeContext();
    const isResizing = useRef(null);
    const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0, px: 0, py: 0 });
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);
    // Check for FILL_FORM in latest assistant message
    useEffect(() => {
        if (messages.length === 0)
            return;
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.role !== "assistant")
            return;
        const { payload } = parseFillFormTag(lastMsg.content);
        if (!payload)
            return;
        if (!payload.confirm) {
            // Direct mode: apply immediately
            const count = fillFields(payload.fields);
            if (count > 0)
                toast.success(`✅ ${count} campi compilati automaticamente`);
            else
                toast.error("Nessun campo compilato (campi non trovati nel form)");
        }
        else {
            setPendingFill(payload);
        }
    }, [messages, fillFields]);
    const handleApplyFill = useCallback(() => {
        if (!pendingFill)
            return;
        const count = fillFields(pendingFill.fields);
        if (count > 0)
            toast.success(`✅ ${count} campi compilati`);
        else
            toast.error("Nessun campo corrispondente trovato nel form");
        setPendingFill(null);
    }, [pendingFill, fillFields]);
    const handleMouseDown = useCallback((e) => {
        if (isFullscreen)
            return;
        if (e.target.closest("input, a, button"))
            return;
        if (e.target.dataset.resize)
            return;
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
                let newW = resizeStart.current.w, newH = resizeStart.current.h;
                let newX = resizeStart.current.px, newY = resizeStart.current.py;
                if (dir.includes("e"))
                    newW = Math.min(MAX_W, Math.max(MIN_W, resizeStart.current.w + dx));
                if (dir.includes("w")) {
                    newW = Math.min(MAX_W, Math.max(MIN_W, resizeStart.current.w - dx));
                    newX = resizeStart.current.px + (resizeStart.current.w - newW);
                }
                if (dir.includes("s"))
                    newH = Math.min(MAX_H, Math.max(MIN_H, resizeStart.current.h + dy));
                if (dir.includes("n")) {
                    newH = Math.min(MAX_H, Math.max(MIN_H, resizeStart.current.h - dy));
                    newY = resizeStart.current.py + (resizeStart.current.h - newH);
                }
                setSize({ width: newW, height: newH });
                setPosition({ x: newX, y: newY });
                return;
            }
            if (!isDragging.current)
                return;
            hasDragged.current = true;
            setPosition({
                x: Math.max(0, Math.min(window.innerWidth - 80, e.clientX - dragOffset.current.x)),
                y: Math.max(0, Math.min(window.innerHeight - 80, e.clientY - dragOffset.current.y)),
            });
        };
        const onUp = () => { isDragging.current = false; isResizing.current = null; };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    }, [setPosition, setSize]);
    const handleSend = useCallback((content, attachments) => {
        const ctx = capturePageContent();
        // Inject bridge fields into page context
        const bridgeFields = getRegisteredFields();
        const bridgeInfo = bridgeFields.length > 0
            ? `\n\n🔗 BRIDGE FIELDS REGISTRATI (compilabili via fill_form):\n${bridgeFields.map(f => `- ${f.id}: "${f.label}" [${f.type}] = "${f.value}"`).join("\n")}`
            : "";
        const enrichedCtx = {
            ...ctx,
            content: (ctx.content || "") + bridgeInfo,
        };
        sendMessage(content, attachments, { route: enrichedCtx.route, pageTitle: enrichedCtx.pageTitle, content: enrichedCtx.content });
    }, [sendMessage, capturePageContent, getRegisteredFields]);
    const buildContext = useCallback(() => {
        const ctx = capturePageContent();
        const bridgeFields = getRegisteredFields();
        const bridgeInfo = bridgeFields.length > 0
            ? `\n\n🔗 BRIDGE FIELDS REGISTRATI (compilabili via fill_form):\n${bridgeFields.map(f => `- ${f.id}: "${f.label}" [${f.type}] = "${f.value}"`).join("\n")}`
            : "";
        return { ...ctx, content: (ctx.content || "") + bridgeInfo };
    }, [capturePageContent, getRegisteredFields]);
    const handleAnalyzePage = useCallback(() => {
        if (isLoading)
            return;
        sendMessage("Analizza la pagina che sto visualizzando e dammi consigli utili.", undefined, buildContext());
    }, [sendMessage, buildContext, isLoading]);
    const handleScreenshot = useCallback(async () => {
        if (isLoading)
            return;
        const toastId = toast.loading("📸 Cattura schermata in corso...");
        const shot = await captureWorkspaceScreenshot();
        const ctx = buildContext();
        if (!shot) {
            toast.error("Screenshot non riuscito: analizzo la pagina come testo", { id: toastId });
            sendMessage("Analizza la pagina che sto visualizzando (screenshot non disponibile) e dimmi cosa vedi.", undefined, ctx);
            return;
        }
        toast.success("Screenshot catturato!", { id: toastId });
        sendMessage("Ecco lo screenshot della pagina attuale. Analizzalo e dimmi cosa vedi.", [{ type: shot.type, name: shot.name, dataUrl: shot.dataUrl }], ctx);
    }, [sendMessage, buildContext, isLoading]);
    const toggleFullscreen = () => {
        if (isFullscreen) {
            if (savedPos.current.w > 0) {
                setPosition({ x: savedPos.current.x, y: savedPos.current.y });
                setSize({ width: savedPos.current.w, height: savedPos.current.h });
            }
            setIsFullscreen(false);
        }
        else {
            savedPos.current = { x: position.x, y: position.y, w: size.width, h: size.height };
            setIsFullscreen(true);
        }
    };
    const renderMessageContent = (content) => {
        const { cleanContent } = parseFillFormTag(content);
        return _jsx(ReactMarkdown, { children: cleanContent });
    };
    if (!isOpen)
        return null;
    if (minimized) {
        return (_jsx("div", { ref: widgetRef, onMouseDown: handleMouseDown, onMouseUp: () => { if (!hasDragged.current)
                setMinimized(false); }, "data-dark-lemon": "true", className: "fixed z-[9999] cursor-grab active:cursor-grabbing", style: { left: position.x, top: position.y }, children: _jsxs("div", { className: "relative w-14 h-14 rounded-full flex items-center justify-center", style: { background: "linear-gradient(135deg, hsl(222 47% 10%), hsl(222 47% 6%))", boxShadow: "0 0 20px rgba(59,130,246,0.5), 0 0 40px rgba(236,72,153,0.3)" }, children: [_jsx("div", { className: "absolute inset-0 rounded-full p-[2px] bg-gradient-to-r from-blue-500 via-pink-500 via-green-400 to-cyan-400 animate-gradient", style: { WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" } }), _jsx("img", { src: zoliLemonIcon, alt: "Dark Lemon", className: "h-8 w-8 relative z-10 pointer-events-none" })] }) }));
    }
    return (_jsxs("div", { ref: widgetRef, onMouseDown: handleMouseDown, "data-dark-lemon": "true", className: "fixed z-[9999]", style: isFullscreen
            ? { left: 0, top: 0, width: "100vw", height: "100vh" }
            : { left: position.x, top: position.y, width: size.width, height: size.height }, children: [!isFullscreen && _jsxs(_Fragment, { children: [_jsx("div", { "data-resize": "n", onMouseDown: handleResizeDown("n"), className: "absolute -top-1 left-3 right-3 h-2 cursor-n-resize z-[10000]" }), _jsx("div", { "data-resize": "s", onMouseDown: handleResizeDown("s"), className: "absolute -bottom-1 left-3 right-3 h-2 cursor-s-resize z-[10000]" }), _jsx("div", { "data-resize": "e", onMouseDown: handleResizeDown("e"), className: "absolute -right-1 top-3 bottom-3 w-2 cursor-e-resize z-[10000]" }), _jsx("div", { "data-resize": "w", onMouseDown: handleResizeDown("w"), className: "absolute -left-1 top-3 bottom-3 w-2 cursor-w-resize z-[10000]" }), _jsx("div", { "data-resize": "nw", onMouseDown: handleResizeDown("nw"), className: "absolute -top-1 -left-1 w-4 h-4 cursor-nw-resize z-[10001]" }), _jsx("div", { "data-resize": "ne", onMouseDown: handleResizeDown("ne"), className: "absolute -top-1 -right-1 w-4 h-4 cursor-ne-resize z-[10001]" }), _jsx("div", { "data-resize": "sw", onMouseDown: handleResizeDown("sw"), className: "absolute -bottom-1 -left-1 w-4 h-4 cursor-sw-resize z-[10001]" }), _jsx("div", { "data-resize": "se", onMouseDown: handleResizeDown("se"), className: "absolute -bottom-1 -right-1 w-4 h-4 cursor-se-resize z-[10001]" })] }), _jsxs("div", { className: "relative rounded-2xl p-[3px] overflow-hidden h-full", children: [_jsx("div", { className: "absolute inset-0 rounded-2xl animate-gradient", style: { background: "linear-gradient(90deg, #3b82f6, #ec4899, #22c55e, #06b6d4, #a855f7, #f59e0b, #3b82f6)", backgroundSize: "300% 100%" } }), _jsx("div", { className: "absolute inset-0 rounded-2xl blur-md opacity-60 animate-gradient", style: { background: "linear-gradient(90deg, #3b82f6, #ec4899, #22c55e, #06b6d4, #a855f7, #f59e0b, #3b82f6)", backgroundSize: "300% 100%" } }), _jsxs("div", { className: "relative rounded-2xl bg-[hsl(222,47%,6%)] overflow-hidden h-full flex flex-col", children: [_jsxs("div", { className: "flex items-center gap-2 px-4 py-3 bg-[hsl(222,47%,8%)] border-b border-white/10 cursor-grab active:cursor-grabbing shrink-0 select-none", children: [_jsx("img", { src: zoliLemonIcon, alt: "Dark Lemon", className: "h-7 w-7" }), _jsx("span", { className: "text-white font-display text-sm tracking-wider flex-1", children: "DARK LEMON AI" }), !isFullscreen && (_jsx("button", { onClick: handleAnalyzePage, onMouseDown: e => e.stopPropagation(), className: "p-1.5 rounded-md bg-green-500/15 text-green-400 hover:bg-green-500/25 hover:text-green-300 transition-colors", title: `🔍 Analizza: ${pageTitle}`, disabled: isLoading, children: _jsx(ScanSearch, { className: "h-4 w-4" }) })), _jsx("button", { onClick: handleScreenshot, onMouseDown: e => e.stopPropagation(), className: "p-1.5 rounded-md bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors disabled:opacity-40", title: "\uD83D\uDCF8 Screenshot area di lavoro", disabled: isLoading, children: _jsx(Camera, { className: "h-4 w-4" }) }), _jsxs("button", { onClick: () => setShowHistory(!showHistory), onMouseDown: e => e.stopPropagation(), className: cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors shrink-0", showHistory
                                            ? "border-cyan-500/30 bg-cyan-500/15 text-cyan-400"
                                            : "border-white/10 bg-white/5 text-white/70 hover:border-cyan-500/20 hover:bg-cyan-500/10 hover:text-cyan-400"), title: "Cronologia", children: [_jsx(MessageSquare, { className: "h-3.5 w-3.5" }), _jsx("span", { children: "Cronologia" })] }), _jsx("button", { onClick: () => { const store = useZoliDarkLemonWidgetStore.getState(); store.setSidePanel(true); setOpen(false); }, onMouseDown: e => e.stopPropagation(), className: "p-1 text-white/60 hover:text-green-400 transition-colors", title: "Pannello laterale", children: _jsx(PanelRight, { className: "h-4 w-4" }) }), _jsx("button", { onClick: toggleFullscreen, onMouseDown: e => e.stopPropagation(), className: "p-1 text-white/60 hover:text-cyan-400 transition-colors", title: isFullscreen ? "Riduci" : "Tutto schermo", children: isFullscreen ? _jsx(Shrink, { className: "h-4 w-4" }) : _jsx(Maximize2, { className: "h-4 w-4" }) }), _jsx("button", { onClick: () => { setIsFullscreen(false); setMinimized(true); }, onMouseDown: e => e.stopPropagation(), className: "p-1 text-white/60 hover:text-yellow-400 transition-colors", title: "Minimizza", children: _jsx(Minimize2, { className: "h-4 w-4" }) }), _jsx("button", { onClick: () => { newChat(); setOpen(false); }, onMouseDown: e => e.stopPropagation(), className: "p-1 text-white/60 hover:text-red-400 transition-colors", title: "Chiudi", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("div", { className: "flex flex-1 overflow-hidden", children: [showHistory && (_jsx("div", { className: "w-64 shrink-0 border-r border-white/10", onMouseDown: e => e.stopPropagation(), children: _jsx(DarkLemonHistory, { conversations: conversations, currentConversationId: currentConversationId, onSelect: loadConversation, onDelete: deleteConversation, onNewChat: newChat }) })), _jsxs("div", { className: "flex-1 flex flex-col overflow-hidden", children: [_jsxs("div", { className: "flex-1 overflow-y-auto p-3 space-y-3", onMouseDown: e => e.stopPropagation(), children: [messages.length === 0 && (_jsxs("div", { className: "flex gap-2 justify-start", children: [_jsx("div", { className: "w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5", children: _jsx(Bot, { className: "h-3 w-3 text-cyan-400" }) }), _jsx("div", { className: "max-w-[80%] rounded-xl px-3 py-2 text-xs bg-white/5 text-white/90 border border-cyan-500/20", children: "Ciao! Sono Dark Lemon AI \uD83C\uDF4B Chiedimi qualsiasi cosa sui dati aziendali!" })] })), messages.map((msg, i) => (_jsxs("div", { className: cn("flex gap-2 group", msg.role === "user" ? "justify-end" : "justify-start"), children: [msg.role === "assistant" && (_jsx("div", { className: "w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5", children: _jsx(Bot, { className: "h-3 w-3 text-cyan-400" }) })), _jsxs("div", { className: cn("max-w-[80%] rounded-xl px-3 py-2 text-xs prose prose-sm prose-invert max-w-none select-text relative", msg.role === "user"
                                                                    ? "bg-blue-500/20 text-white border border-blue-500/30"
                                                                    : "bg-white/5 text-white/90 border border-cyan-500/20"), children: [msg.attachments && msg.attachments.length > 0 && (_jsx("div", { className: "flex gap-1.5 mb-1.5 flex-wrap", children: msg.attachments.map((att, j) => (att.type.startsWith("image/") ? (_jsx("img", { src: att.dataUrl, alt: att.name, className: "h-20 w-auto max-w-[200px] rounded-lg object-cover" }, j)) : (_jsxs("div", { className: "flex items-center gap-1 text-[10px] text-white/50 bg-white/5 rounded px-1.5 py-0.5", children: [_jsx(FileImage, { className: "h-3 w-3" }), " ", att.name] }, j)))) })), renderMessageContent(msg.content), msg.role === "assistant" && _jsx(MessageCopyButton, { content: msg.content, className: "absolute -top-1 -right-1" })] }), msg.role === "user" && (_jsx("div", { className: "w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5", children: _jsx(User, { className: "h-3 w-3 text-blue-400" }) }))] }, msg.id || i))), isLoading && (_jsxs("div", { className: "flex gap-2", children: [_jsx("div", { className: "w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center", children: _jsx(Bot, { className: "h-3 w-3 text-cyan-400 animate-pulse" }) }), _jsx("div", { className: "rounded-xl px-3 py-2 bg-white/5 border border-cyan-500/20 text-white/60 text-xs", children: _jsxs("div", { className: "flex gap-1", children: [_jsx("span", { className: "w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" }), _jsx("span", { className: "w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce", style: { animationDelay: "150ms" } }), _jsx("span", { className: "w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce", style: { animationDelay: "300ms" } })] }) })] })), _jsx("div", { ref: messagesEndRef })] }), pendingFill && (_jsxs("div", { className: "mx-3 mb-2 rounded-xl border border-green-500/30 bg-green-500/5 p-3", onMouseDown: e => e.stopPropagation(), children: [_jsx("p", { className: "text-green-400 text-xs font-semibold mb-2", children: "\uD83D\uDCDD Anteprima Compilazione" }), _jsx("div", { className: "space-y-1 max-h-32 overflow-y-auto mb-2", children: pendingFill.fields.map((f, i) => (_jsxs("div", { className: "flex items-center gap-2 text-[11px]", children: [_jsxs("span", { className: "text-white/50 min-w-[100px]", children: [f.label || f.id, ":"] }), _jsx("span", { className: "text-white font-mono", children: f.value })] }, i))) }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("button", { onClick: handleApplyFill, className: "flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 text-xs font-medium transition-colors", children: [_jsx(Check, { className: "h-3 w-3" }), " Applica"] }), _jsxs("button", { onClick: () => setPendingFill(null), className: "flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors", children: [_jsx(XCircle, { className: "h-3 w-3" }), " Annulla"] })] })] })), _jsx(DarkLemonSupervisionBar, {}), _jsx(DarkLemonInputBar, { onSend: handleSend, isLoading: isLoading })] })] })] })] }), !isFullscreen && (_jsx("div", { className: "absolute bottom-0 right-0 w-3 h-3 pointer-events-none z-[10002]", children: _jsxs("svg", { viewBox: "0 0 12 12", className: "w-full h-full opacity-40", children: [_jsx("line", { x1: "11", y1: "3", x2: "3", y2: "11", stroke: "white", strokeWidth: "1" }), _jsx("line", { x1: "11", y1: "7", x2: "7", y2: "11", stroke: "white", strokeWidth: "1" })] }) }))] }));
}
