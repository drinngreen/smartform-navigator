import { MessageSquare, Plus, Trash2, PanelRight, Move, Radio, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { DL_SURFACE_LABELS, type DLConversation, type DLSurface } from "@/hooks/useDarkLemonMN";

const SURFACE_STYLE: Record<DLSurface, { className: string; Icon: typeof PanelRight }> = {
  side: { className: "bg-green-500/15 text-green-300 border-green-500/25", Icon: PanelRight },
  floating: { className: "bg-blue-500/15 text-blue-300 border-blue-500/25", Icon: Move },
  console: { className: "bg-violet-500/15 text-violet-300 border-violet-500/25", Icon: Radio },
  page: { className: "bg-white/10 text-white/60 border-white/15", Icon: LayoutDashboard },
};

interface Props {
  conversations: DLConversation[];
  currentConversationId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
  className?: string;
}

export function DarkLemonHistory({
  conversations,
  currentConversationId,
  onSelect,
  onDelete,
  onNewChat,
  className,
}: Props) {
  return (
    <div className={cn("flex flex-col h-full bg-[hsl(222,47%,5%)]", className)}>
      <div className="p-3 border-b border-white/10">
        <button
          onClick={onNewChat}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs hover:bg-cyan-500/20 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Nuova Chat
        </button>
        <p className="mt-2 text-[10px] text-white/30">Cronologia di tutte le viste Dark Lemon</p>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {conversations.map((conv) => {
          const style = SURFACE_STYLE[conv.surface] ?? SURFACE_STYLE.page;
          const Icon = style.Icon;
          return (
            <div
              key={conv.id}
              className={cn(
                "group flex items-start gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors",
                conv.id === currentConversationId
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
              onClick={() => onSelect(conv.id)}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="truncate">{conv.title}</p>
                <span
                  className={cn(
                    "mt-1 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-medium",
                    style.className
                  )}
                >
                  <Icon className="h-2.5 w-2.5" />
                  {DL_SURFACE_LABELS[conv.surface] ?? DL_SURFACE_LABELS.page}
                </span>
                <span className="ml-1.5 text-[9px] text-white/25">
                  {conv.updatedAt.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Eliminare questa conversazione?")) onDelete(conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity p-0.5 shrink-0"
                title="Elimina conversazione"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          );
        })}
        {conversations.length === 0 && (
          <p className="text-white/25 text-xs text-center px-3 py-8">Nessuna conversazione</p>
        )}
      </div>
    </div>
  );
}
