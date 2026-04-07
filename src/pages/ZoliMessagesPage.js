import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileShell } from "@/components/layout/MobileShell";
import { MessageCircle } from "lucide-react";
export default function ZoliMessagesPage() {
    return (_jsxs(MobileShell, { children: [_jsxs("div", { className: "px-4 pt-4 pb-2", style: { borderBottom: '1px solid rgba(192, 173, 103, 0.15)' }, children: [_jsx("h1", { className: "text-xl font-display font-bold text-foreground tracking-wider", children: "Zoli Messages" }), _jsx("p", { className: "text-muted-foreground text-xs font-mono mt-1", children: "Messaggistica interna" })] }), _jsxs("div", { className: "flex-1 flex flex-col items-center justify-center pb-20", children: [_jsx(MessageCircle, { className: "h-12 w-12 text-muted-foreground/30 mb-3" }), _jsx("p", { className: "text-muted-foreground text-sm", children: "Nessun messaggio" })] }), _jsx(BottomNav, {})] }));
}
