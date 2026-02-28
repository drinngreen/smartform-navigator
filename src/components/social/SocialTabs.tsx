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
    <div className="flex bg-card border-b border-border overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 min-w-0 py-3 px-2 text-xs font-semibold transition-all border-b-2 ${
            activeTab === tab.id
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          }`}
        >
          <span className="block text-center">
            {tab.emoji} {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}
