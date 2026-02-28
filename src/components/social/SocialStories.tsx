import { Plus } from "lucide-react";

interface Story {
  id: string;
  name: string;
  initial: string;
  isOwn?: boolean;
  hasNew?: boolean;
  gradientFrom: string;
  gradientTo: string;
}

const demoStories: Story[] = [
  { id: "own", name: "Tu", initial: "+", isOwn: true, gradientFrom: "from-primary", gradientTo: "to-accent", hasNew: false },
  { id: "1", name: "Safety", initial: "🛡️", gradientFrom: "from-destructive", gradientTo: "to-destructive/60", hasNew: true },
  { id: "2", name: "Annunci", initial: "📢", gradientFrom: "from-primary", gradientTo: "to-primary/60", hasNew: true },
  { id: "3", name: "Tips", initial: "💡", gradientFrom: "from-accent", gradientTo: "to-accent/60", hasNew: true },
  { id: "4", name: "News", initial: "🔥", gradientFrom: "from-destructive/80", gradientTo: "to-primary", hasNew: false },
];

export function SocialStories() {
  return (
    <div className="px-4 py-3 border-b border-border/30">
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
        {demoStories.map((story) => (
          <button key={story.id} className="flex flex-col items-center gap-1.5 shrink-0">
            <div className={`w-[62px] h-[62px] rounded-full p-[2.5px] bg-gradient-to-br ${
              story.hasNew 
                ? `${story.gradientFrom} ${story.gradientTo}` 
                : story.isOwn 
                  ? "from-muted to-muted" 
                  : "from-border to-border"
            }`}>
              <div className="w-full h-full rounded-full bg-card flex items-center justify-center relative">
                {story.isOwn ? (
                  <div className="w-full h-full rounded-full bg-secondary/60 flex items-center justify-center">
                    <Plus size={20} className="text-primary" />
                  </div>
                ) : (
                  <span className="text-lg">{story.initial}</span>
                )}
              </div>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground max-w-[60px] truncate">
              {story.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
