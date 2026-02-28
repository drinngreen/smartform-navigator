interface SocialTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "feed", label: "Feed", emoji: "🏠" },
  { id: "safety", label: "Safety", emoji: "🛡️" },
  { id: "annunci", label: "Annunci", emoji: "📢" },
];

export function SocialTabs({ activeTab, onTabChange }: SocialTabsProps) {
  return (
    <div className="flex gap-2 px-4 py-2.5 bg-card/50 border-b border-border/30">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
            activeTab === tab.id
              ? "bg-gradient-to-r from-primary/20 to-accent/10 text-primary border border-primary/30 shadow-[var(--glow-gold-subtle)]"
              : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70 hover:text-foreground border border-transparent"
          }`}
        >
          {tab.emoji} {tab.label}
        </button>
      ))}
    </div>
  );
}
