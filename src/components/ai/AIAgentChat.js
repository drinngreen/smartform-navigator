import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Send, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
export function AIAgentChat({ showSidebar = true, className }) {
    const [messages, setMessages] = useState([
        { role: "assistant", content: "Ciao! Sono Zoli Dragon AI, il tuo assistente per i FIR e la gestione rifiuti. Come posso aiutarti?" }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const handleSend = async () => {
        if (!input.trim() || isLoading)
            return;
        const userMsg = input.trim();
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
        setIsLoading(true);
        // Simulate AI response
        setTimeout(() => {
            setMessages((prev) => [...prev, { role: "assistant", content: "Sto elaborando la tua richiesta... L'assistente AI è in fase di configurazione." }]);
            setIsLoading(false);
        }, 1500);
    };
    return (_jsxs("div", { className: cn("flex flex-col", className), children: [_jsxs("div", { className: "flex-1 overflow-y-auto p-4 space-y-4", children: [messages.map((msg, i) => (_jsxs("div", { className: cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start"), children: [msg.role === "assistant" && (_jsx("div", { className: "w-8 h-8 rounded-full bg-neon-cyan/20 flex items-center justify-center shrink-0", children: _jsx(Bot, { className: "h-4 w-4 text-neon-cyan" }) })), _jsx("div", { className: cn("max-w-[80%] rounded-2xl px-4 py-3 text-sm", msg.role === "user"
                                    ? "bg-primary/20 text-foreground rounded-br-md"
                                    : "bg-card border border-neon-cyan/20 text-foreground rounded-bl-md"), children: msg.content }), msg.role === "user" && (_jsx("div", { className: "w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0", children: _jsx(User, { className: "h-4 w-4 text-primary" }) }))] }, i))), isLoading && (_jsxs("div", { className: "flex gap-3", children: [_jsx("div", { className: "w-8 h-8 rounded-full bg-neon-cyan/20 flex items-center justify-center", children: _jsx(Bot, { className: "h-4 w-4 text-neon-cyan animate-pulse" }) }), _jsx("div", { className: "rounded-2xl px-4 py-3 bg-card border border-neon-cyan/20 text-muted-foreground text-sm", children: "Sto pensando..." })] }))] }), _jsx("div", { className: "p-3 border-t border-border/30", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "text", value: input, onChange: (e) => setInput(e.target.value), onKeyDown: (e) => e.key === "Enter" && !e.shiftKey && handleSend(), placeholder: "Chiedi qualcosa...", className: "flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-neon-cyan" }), _jsx("button", { onClick: handleSend, disabled: !input.trim() || isLoading, className: "p-2.5 rounded-xl bg-neon-cyan/20 text-neon-cyan disabled:opacity-50 hover:bg-neon-cyan/30 transition-all", children: _jsx(Send, { className: "h-4 w-4" }) })] }) })] }));
}
