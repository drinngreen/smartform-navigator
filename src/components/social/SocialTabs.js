import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
const tabs = [
    { id: "feed", label: "Feed", emoji: "🏠" },
    { id: "safety", label: "Safety", emoji: "🛡️" },
    { id: "annunci", label: "Annunci", emoji: "📢" },
    { id: "gruppi", label: "Gruppi", emoji: "💬" },
    { id: "membri", label: "Membri", emoji: "👥" },
];
export function SocialTabs({ activeTab, onTabChange }) {
    return (_jsx("div", { className: "flex gap-2 px-4 py-2.5 bg-card/50 border-b border-border/30", children: tabs.map((tab) => (_jsxs("button", { onClick: () => onTabChange(tab.id), className: `flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${activeTab === tab.id
                ? "bg-gradient-to-r from-primary/20 to-accent/10 text-primary border border-primary/30 shadow-[var(--glow-gold-subtle)]"
                : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70 hover:text-foreground border border-transparent"}`, children: [tab.emoji, " ", tab.label] }, tab.id))) }));
}
