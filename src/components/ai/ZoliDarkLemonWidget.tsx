import { useState, useRef, useCallback, useEffect } from "react";
import { Send, X, Minimize2, Maximize2, ExternalLink, Bot, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useZoliDarkLemonWidgetStore } from "@/stores/zoliDarkLemonWidgetStore";
import zoliLemonIcon from "@/assets/zoli-dark-lemon-icon.png";

export function ZoliDarkLemonWidget() {
  const { isOpen, setOpen, position, setPosition } = useZoliDarkLemonWidgetStore();
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Ciao! Sono Dark Lemon AI 🍋 Come posso aiutarti?" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, input, a")) return;
    isDragging.current = true;
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    e.preventDefault();
  }, [position]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newX = Math.max(0, Math.min(window.innerWidth - 80, e.clientX - dragOffset.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 80, e.clientY - dragOffset.current.y));
      setPosition({ x: newX, y: newY });
    };
    const onUp = () => { isDragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [setPosition]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sto elaborando... L'integrazione AI è in fase di configurazione." }]);
      setIsLoading(false);
    }, 1200);
  };

  const openFullChat = () => {
    const isAdmin = location.pathname.startsWith("/admin");
    const isMN = location.pathname.startsWith("/mn/admin");
    if (isMN) {
      const match = location.pathname.match(/\/mn\/admin\/(\w+)/);
      const ctx = match?.[1] || "multyproget";
      navigate(`/mn/admin/${ctx}/zoli-dark-lemon`);
    } else if (isAdmin) {
      navigate("/admin/zoli-dark-lemon");
    }
  };

  if (!isOpen) return null;

  // Minimized: floating icon
  if (minimized) {
    return (
      <div
        ref={widgetRef}
        onMouseDown={handleMouseDown}
        className="fixed z-[9999] cursor-grab active:cursor-grabbing"
        style={{ left: position.x, top: position.y }}
      >
        <button
          onClick={() => setMinimized(false)}
          className="relative w-14 h-14 rounded-full flex items-center justify-center animate-led-border-spin"
          style={{
            background: "linear-gradient(135deg, hsl(222 47% 10%), hsl(222 47% 6%))",
            boxShadow: "0 0 20px rgba(59,130,246,0.5), 0 0 40px rgba(236,72,153,0.3), 0 0 60px rgba(34,197,94,0.2)",
          }}
        >
          <div className="absolute inset-0 rounded-full p-[2px] bg-gradient-to-r from-blue-500 via-pink-500 via-green-400 to-cyan-400 animate-gradient" style={{ WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }} />
          <img src={zoliLemonIcon} alt="Dark Lemon" className="h-8 w-8 relative z-10" />
        </button>
      </div>
    );
  }

  // Full widget
  return (
    <div
      ref={widgetRef}
      onMouseDown={handleMouseDown}
      className="fixed z-[9999] cursor-grab active:cursor-grabbing select-none"
      style={{ left: position.x, top: position.y, width: 380 }}
    >
      {/* LED border wrapper */}
      <div className="relative rounded-2xl p-[3px] overflow-hidden">
        {/* Animated LED border */}
        <div
          className="absolute inset-0 rounded-2xl animate-gradient"
          style={{
            background: "linear-gradient(90deg, #3b82f6, #ec4899, #22c55e, #06b6d4, #a855f7, #f59e0b, #3b82f6)",
            backgroundSize: "300% 100%",
          }}
        />
        {/* Extra glow layers */}
        <div className="absolute inset-0 rounded-2xl blur-md opacity-60 animate-gradient" style={{ background: "linear-gradient(90deg, #3b82f6, #ec4899, #22c55e, #06b6d4, #a855f7, #f59e0b, #3b82f6)", backgroundSize: "300% 100%" }} />

        {/* Inner content */}
        <div className="relative rounded-2xl bg-[hsl(222,47%,6%)] overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-[hsl(222,47%,8%)] border-b border-white/10">
            <img src={zoliLemonIcon} alt="Dark Lemon" className="h-7 w-7" />
            <span className="text-white font-display text-sm tracking-wider flex-1">DARK LEMON AI</span>
            <button onClick={openFullChat} className="p-1 text-white/60 hover:text-cyan-400 transition-colors" title="Chat completa">
              <ExternalLink className="h-4 w-4" />
            </button>
            <button onClick={() => setMinimized(true)} className="p-1 text-white/60 hover:text-yellow-400 transition-colors" title="Minimizza">
              <Minimize2 className="h-4 w-4" />
            </button>
            <button onClick={() => setOpen(false)} className="p-1 text-white/60 hover:text-red-400 transition-colors" title="Chiudi">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Chat area */}
          <div className="h-64 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3 w-3 text-cyan-400" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[80%] rounded-xl px-3 py-2 text-xs",
                  msg.role === "user"
                    ? "bg-blue-500/20 text-white border border-blue-500/30"
                    : "bg-white/5 text-white/90 border border-cyan-500/20"
                )}>
                  {msg.content}
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
                  Sto pensando...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder="Chiedi qualcosa..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 disabled:opacity-30 hover:bg-cyan-500/30 transition-all"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
