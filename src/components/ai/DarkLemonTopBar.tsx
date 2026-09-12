import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Maximize2, Bot, Camera, ScanSearch } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDarkLemonMN } from "@/hooks/useDarkLemonMN";
import { usePageContext } from "@/hooks/usePageContext";
import { useFormBridgeContext } from "@/contexts/FormBridgeContext";
import { captureWorkspaceScreenshot } from "@/lib/captureWorkspace";
import { DarkLemonInputBar } from "./DarkLemonInputBar";
import { MessageCopyButton } from "./MessageCopyButton";
import zoliLemonIcon from "@/assets/zoli-dark-lemon-icon.png";

interface Props {
  /** Contesto MN (es. "dev-multyproget") */
  context?: string;
  /** Pagina a schermo intero della chat */
  fullPagePath?: string;
}

/**
 * Barra compatta di Dark Lemon in cima alla dashboard.
 * Condivide la stessa conversazione del widget e del pannello laterale
 * (conversation id nello store globale), quindi la cronologia è unica.
 */
export function DarkLemonTopBar({ context = "dev-multyproget", fullPagePath }: Props) {
  const navigate = useNavigate();
  const { messages, isLoading, sendMessage, newChat } = useDarkLemonMN(context, "floating");
  const { capturePageContent } = usePageContext();
  const { getRegisteredFields } = useFormBridgeContext();
  const [open, setOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Contesto pagina + campi form registrati (compilazione in tempo reale su ogni pagina)
  const buildContext = useCallback(() => {
    const ctx = capturePageContent();
    const bridgeFields = getRegisteredFields();
    const bridgeInfo = bridgeFields.length > 0
      ? `\n\n🔗 BRIDGE FIELDS:\n${bridgeFields.map((f) => `- ${f.id}: "${f.label}" [${f.type}] = "${f.value}"`).join("\n")}`
      : "";
    return { ...ctx, content: (ctx.content || "") + bridgeInfo };
  }, [capturePageContent, getRegisteredFields]);

  const handleSend = (content: string, attachments?: any[]) => {
    setOpen(true);
    sendMessage(content, attachments, buildContext());
  };

  const handleAnalyzePage = useCallback(() => {
    if (isLoading) return;
    setOpen(true);
    sendMessage("Analizza la pagina che sto visualizzando e dammi consigli utili.", undefined, buildContext());
  }, [isLoading, sendMessage, buildContext]);

  const handleScreenshot = useCallback(async () => {
    if (isLoading) return;
    setOpen(true);
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
  }, [isLoading, sendMessage, buildContext]);


  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <div data-dark-lemon="true" className="sticky top-0 z-30 mb-4 rounded-xl border border-cyan-500/30 bg-card/90 backdrop-blur-xl overflow-hidden shadow-lg">
      {/* Riga compatta */}
      <div className="flex items-center gap-3 px-3 py-2">
        <img src={zoliLemonIcon} alt="Dark Lemon" className="h-7 w-7 shrink-0" />
        <div className="hidden sm:block shrink-0">
          <div className="text-xs font-semibold text-cyan-300 leading-tight">DARK LEMON</div>
          <div className="text-[10px] text-muted-foreground leading-tight">Assistente operativo</div>
        </div>

        <div className="flex-1 min-w-0">
          <DarkLemonInputBar onSend={handleSend} isLoading={isLoading} />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleScreenshot}
            disabled={isLoading}
            title="Fotografa la pagina e analizzala"
            className="p-2 rounded-lg border border-border/50 hover:bg-cyan-500/10 hover:border-cyan-500/40 transition-colors disabled:opacity-50"
          >
            <Camera className="h-4 w-4 text-cyan-300" />
          </button>
          <button
            onClick={handleAnalyzePage}
            disabled={isLoading}
            title="Analizza il contenuto della pagina"
            className="p-2 rounded-lg border border-border/50 hover:bg-cyan-500/10 hover:border-cyan-500/40 transition-colors disabled:opacity-50"
          >
            <ScanSearch className="h-4 w-4 text-cyan-300" />
          </button>
          <button
            onClick={newChat}
            title="Nuova conversazione"
            className="p-2 rounded-lg border border-border/50 hover:bg-cyan-500/10 hover:border-cyan-500/40 transition-colors"
          >
            <Plus className="h-4 w-4 text-cyan-300" />
          </button>
          {fullPagePath && (
            <button
              onClick={() => navigate(fullPagePath)}
              title="Apri chat a schermo intero"
              className="p-2 rounded-lg border border-border/50 hover:bg-cyan-500/10 hover:border-cyan-500/40 transition-colors"
            >
              <Maximize2 className="h-4 w-4 text-cyan-300" />
            </button>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            title={open ? "Riduci conversazione" : "Mostra conversazione"}
            className="p-2 rounded-lg border border-border/50 hover:bg-cyan-500/10 hover:border-cyan-500/40 transition-colors"
          >
            {open ? <ChevronUp className="h-4 w-4 text-cyan-300" /> : <ChevronDown className="h-4 w-4 text-cyan-300" />}
          </button>
        </div>
      </div>

      {/* Anteprima ultima risposta quando chiusa */}
      {!open && (isLoading || lastAssistant) && (
        <button
          onClick={() => setOpen(true)}
          className="w-full text-left px-3 pb-2 -mt-1 flex items-start gap-2"
        >
          <Bot className={cn("h-3.5 w-3.5 mt-0.5 shrink-0 text-cyan-400", isLoading && "animate-pulse")} />
          <span className="text-xs text-muted-foreground line-clamp-1">
            {isLoading ? "Dark Lemon sta lavorando…" : lastAssistant?.content}
          </span>
        </button>
      )}

      {/* Conversazione espansa */}
      {open && (
        <div className="border-t border-border/40 max-h-[40vh] overflow-y-auto px-3 py-3 space-y-3">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Scrivi qui: Dark Lemon vede la pagina aperta e può cercare dati, inserire blocchi di record,
              compilare formulari, aggiornare anagrafiche e registri.
            </p>
          )}
          {messages.map((msg, i) => (
            <div key={msg.id || i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "relative max-w-[85%] rounded-xl px-3 py-2 text-xs prose prose-xs prose-invert",
                  msg.role === "user" ? "bg-primary/15 border border-primary/30" : "bg-muted/40 border border-border/40"
                )}
              >
                <ReactMarkdown>{msg.content}</ReactMarkdown>
                {msg.role === "assistant" && <MessageCopyButton content={msg.content} className="absolute top-0.5 right-0.5" />}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-1 items-center text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
}
