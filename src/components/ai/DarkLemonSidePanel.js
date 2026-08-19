import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useEffect, useCallback, useState } from "react";
import { Bot, User, Camera, PanelLeftClose, ScanSearch, MessageSquare, Maximize2 } from "lucide-react";
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
export function DarkLemonSidePanel({ context = "multyproget" }) {
    const { setSidePanel, setWorking } = useZoliDarkLemonWidgetStore();
    const { messages, isLoading, conversations, currentConversationId, sendMessage, loadConversation, deleteConversation, newChat } = useDarkLemonMN(context, "side");
    const [showHistory, setShowHistory] = useState(false);
    const { pageTitle, capturePageContent } = usePageContext();
    const { fillFields, getRegisteredFields } = useFormBridgeContext();
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const handleOpenFullscreen = useCallback(() => {
        const isMnAdmin = location.pathname.startsWith("/mn/admin");
        if (isMnAdmin) {
            navigate(`/mn/admin/${context}/dark-lemon`);
        }
        else {
            navigate("/admin/dark-lemon");
        }
        setSidePanel(false);
    }, [navigate, location.pathname, context, setSidePanel]);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);
    useEffect(() => {
        if (messages.length === 0)
            return;
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.role !== "assistant")
            return;
        const payload = parseFillFormTag(lastMsg.content);
        if (!payload?.fields?.length)
            return;
        const count = fillFields(payload.fields);
        if (count > 0)
            toast.success(`✅ ${count} campi compilati in tempo reale`);
        else
            toast.error("Nessun campo compilato (campi non trovati nel form aperto)");
    }, [messages, fillFields]);
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
    const handleSend = useCallback((content, attachments) => {
        sendMessage(content, attachments, buildContext());
    }, [sendMessage, buildContext]);
    const handleAnalyzePage = useCallback(() => {
        if (isLoading)
            return;
        sendMessage("Analizza la pagina che sto visualizzando e dammi consigli utili.", undefined, buildContext());
    }, [sendMessage, buildContext, isLoading]);
    return (_jsxs("div", { "data-dark-lemon": "true", className: "fixed top-0 right-0 h-full w-[20vw] min-w-[280px] flex flex-col bg-[hsl(222,47%,6%)] border-l border-white/10 z-[60] animate-slide-in-right", children: [_jsxs("div", { className: "flex items-center gap-2 px-3 py-2.5 bg-[hsl(222,47%,8%)] border-b border-white/10 shrink-0", children: [_jsx("img", { src: zoliLemonIcon, alt: "Dark Lemon", className: "h-6 w-6" }), _jsx("span", { className: "text-white font-display text-xs tracking-wider flex-1", children: "DARK LEMON" }), _jsx("button", { onClick: handleAnalyzePage, disabled: isLoading, className: "p-1 rounded-md bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors", title: "Analizza pagina", children: _jsx(ScanSearch, { className: "h-3.5 w-3.5" }) }), _jsx("button", { onClick: handleScreenshot, className: "p-1 rounded-md bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors", title: "Screenshot area di lavoro", children: _jsx(Camera, { className: "h-3.5 w-3.5" }) }), _jsx("button", { onClick: () => setShowHistory(v => !v), className: "p-1 rounded-md transition-colors " + (showHistory ? "bg-cyan-500/25 text-cyan-300" : "bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25"), title: "Cronologia", children: _jsx(MessageSquare, { className: "h-3.5 w-3.5" }) }), _jsx("button", { onClick: handleOpenFullscreen, className: "p-1 rounded-md bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors", title: "Apri a tutto schermo", children: _jsx(Maximize2, { className: "h-3.5 w-3.5" }) }), _jsx("button", { onClick: () => setSidePanel(false), className: "p-1 text-white/40 hover:text-white transition-colors", title: "Chiudi pannello", children: _jsx(PanelLeftClose, { className: "h-3.5 w-3.5" }) })] }), showHistory && (_jsx("div", { className: "h-1/2 border-b border-white/10 overflow-hidden shrink-0", children: _jsx(DarkLemonHistory, { conversations: conversations, currentConversationId: currentConversationId, onSelect: (id) => { loadConversation(id); setShowHistory(false); }, onDelete: deleteConversation, onNewChat: () => { newChat(); setShowHistory(false); } }) })), _jsxs("div", { className: "flex-1 overflow-y-auto p-3 space-y-2.5", children: [messages.length === 0 && (_jsxs("div", { className: "flex gap-2 justify-start", children: [_jsx("div", { className: "w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5", children: _jsx(Bot, { className: "h-2.5 w-2.5 text-cyan-400" }) }), _jsx("div", { className: "rounded-lg px-2.5 py-1.5 text-[11px] bg-white/5 text-white/90 border border-cyan-500/20 select-text", children: "Ciao! Sono in modalit\u00E0 pannello laterale \uD83C\uDF4B" })] })), messages.map((msg, i) => (_jsxs("div", { className: cn("flex gap-1.5 group", msg.role === "user" ? "justify-end" : "justify-start"), children: [msg.role === "assistant" && (_jsx("div", { className: "w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5", children: _jsx(Bot, { className: "h-2.5 w-2.5 text-cyan-400" }) })), _jsxs("div", { className: cn("max-w-[90%] rounded-lg px-2.5 py-1.5 text-[11px] prose prose-xs prose-invert max-w-none select-text relative", msg.role === "user"
                                    ? "bg-blue-500/20 text-white border border-blue-500/30"
                                    : "bg-white/5 text-white/90 border border-cyan-500/20"), children: [_jsx(ReactMarkdown, { children: msg.role === "assistant" ? stripFillFormTag(msg.content) : msg.content }), msg.role === "assistant" && (() => {
                                        const fillData = parseFillFormTag(msg.content);
                                        return fillData ? _jsx(FillFormAction, { data: fillData }) : null;
                                    })(), msg.role === "assistant" && (_jsx(MessageCopyButton, { content: msg.content, className: "absolute -top-1 -right-1" }))] }), msg.role === "user" && (_jsx("div", { className: "w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5", children: _jsx(User, { className: "h-2.5 w-2.5 text-blue-400" }) }))] }, msg.id || i))), isLoading && (_jsxs("div", { className: "flex gap-1.5", children: [_jsx("div", { className: "w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center", children: _jsx(Bot, { className: "h-2.5 w-2.5 text-cyan-400 animate-pulse" }) }), _jsx("div", { className: "rounded-lg px-2.5 py-1.5 bg-white/5 border border-cyan-500/20", children: _jsxs("div", { className: "flex gap-1", children: [_jsx("span", { className: "w-1 h-1 bg-cyan-400 rounded-full animate-bounce" }), _jsx("span", { className: "w-1 h-1 bg-pink-400 rounded-full animate-bounce", style: { animationDelay: "150ms" } }), _jsx("span", { className: "w-1 h-1 bg-green-400 rounded-full animate-bounce", style: { animationDelay: "300ms" } })] }) })] })), _jsx("div", { ref: messagesEndRef })] }), _jsx(DarkLemonSupervisionBar, {}), _jsx(DarkLemonInputBar, { onSend: handleSend, isLoading: isLoading })] }));
}
