import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Plus } from "lucide-react";
const demoStories = [
    { id: "own", name: "Tu", initial: "+", isOwn: true, gradientFrom: "from-primary", gradientTo: "to-accent", hasNew: false },
    { id: "1", name: "Safety", initial: "🛡️", gradientFrom: "from-destructive", gradientTo: "to-destructive/60", hasNew: true },
    { id: "2", name: "Annunci", initial: "📢", gradientFrom: "from-primary", gradientTo: "to-primary/60", hasNew: true },
    { id: "3", name: "Tips", initial: "💡", gradientFrom: "from-accent", gradientTo: "to-accent/60", hasNew: true },
    { id: "4", name: "News", initial: "🔥", gradientFrom: "from-destructive/80", gradientTo: "to-primary", hasNew: false },
];
export function SocialStories() {
    return (_jsx("div", { className: "px-4 py-3 border-b border-border/30", children: _jsx("div", { className: "flex gap-3 overflow-x-auto pb-1 scrollbar-none", children: demoStories.map((story) => (_jsxs("button", { className: "flex flex-col items-center gap-1.5 shrink-0", children: [_jsx("div", { className: `w-[62px] h-[62px] rounded-full p-[2.5px] bg-gradient-to-br ${story.hasNew
                            ? `${story.gradientFrom} ${story.gradientTo}`
                            : story.isOwn
                                ? "from-muted to-muted"
                                : "from-border to-border"}`, children: _jsx("div", { className: "w-full h-full rounded-full bg-card flex items-center justify-center relative", children: story.isOwn ? (_jsx("div", { className: "w-full h-full rounded-full bg-secondary/60 flex items-center justify-center", children: _jsx(Plus, { size: 20, className: "text-primary" }) })) : (_jsx("span", { className: "text-lg", children: story.initial })) }) }), _jsx("span", { className: "text-[10px] font-medium text-muted-foreground max-w-[60px] truncate", children: story.name })] }, story.id))) }) }));
}
