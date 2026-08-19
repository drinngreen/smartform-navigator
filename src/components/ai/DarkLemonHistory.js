import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MessageSquare, Plus, Trash2, PanelRight, Move, Radio, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { DL_SURFACE_LABELS } from "@/hooks/useDarkLemonMN";
const SURFACE_STYLE = {
    side: { className: "bg-green-500/15 text-green-300 border-green-500/25", Icon: PanelRight },
    floating: { className: "bg-blue-500/15 text-blue-300 border-blue-500/25", Icon: Move },
    console: { className: "bg-violet-500/15 text-violet-300 border-violet-500/25", Icon: Radio },
    page: { className: "bg-white/10 text-white/60 border-white/15", Icon: LayoutDashboard },
};
export function DarkLemonHistory({ conversations, currentConversationId, onSelect, onDelete, onNewChat, className, }) {
    return (_jsxs("div", { className: cn("flex flex-col h-full bg-[hsl(222,47%,5%)]", className), children: [_jsxs("div", { className: "p-3 border-b border-white/10", children: [_jsxs("button", { onClick: onNewChat, className: "flex items-center gap-2 w-full px-3 py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs hover:bg-cyan-500/20 transition-colors", children: [_jsx(Plus, { className: "h-3.5 w-3.5" }), " Nuova Chat"] }), _jsx("p", { className: "mt-2 text-[10px] text-white/30", children: "Cronologia di tutte le viste Dark Lemon" })] }), _jsxs("div", { className: "flex-1 overflow-y-auto px-2 py-2 space-y-1", children: [conversations.map((conv) => {
                        const style = SURFACE_STYLE[conv.surface] ?? SURFACE_STYLE.page;
                        const Icon = style.Icon;
                        return (_jsxs("div", { className: cn("group flex items-start gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors", conv.id === currentConversationId
                                ? "bg-white/10 text-white"
                                : "text-white/50 hover:text-white hover:bg-white/5"), onClick: () => onSelect(conv.id), children: [_jsx(MessageSquare, { className: "h-3.5 w-3.5 shrink-0 mt-0.5" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "truncate", children: conv.title }), _jsxs("span", { className: cn("mt-1 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-medium", style.className), children: [_jsx(Icon, { className: "h-2.5 w-2.5" }), DL_SURFACE_LABELS[conv.surface] ?? DL_SURFACE_LABELS.page] }), _jsx("span", { className: "ml-1.5 text-[9px] text-white/25", children: conv.updatedAt.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }) })] }), _jsx("button", { onClick: (e) => {
                                        e.stopPropagation();
                                        if (confirm("Eliminare questa conversazione?"))
                                            onDelete(conv.id);
                                    }, className: "opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity p-0.5 shrink-0", title: "Elimina conversazione", children: _jsx(Trash2, { className: "h-3 w-3" }) })] }, conv.id));
                    }), conversations.length === 0 && (_jsx("p", { className: "text-white/25 text-xs text-center px-3 py-8", children: "Nessuna conversazione" }))] })] }));
}
