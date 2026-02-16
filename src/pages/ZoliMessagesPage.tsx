import { BottomNav } from "@/components/layout/BottomNav";
import { MobileShell } from "@/components/layout/MobileShell";
import { MessageCircle } from "lucide-react";

export default function ZoliMessagesPage() {
  return (
    <MobileShell>
      <div className="px-4 pt-4 pb-2" style={{ borderBottom: '1px solid rgba(192, 173, 103, 0.15)' }}>
        <h1 className="text-xl font-display font-bold text-foreground tracking-wider">Zoli Messages</h1>
        <p className="text-muted-foreground text-xs font-mono mt-1">Messaggistica interna</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center pb-20">
        <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground text-sm">Nessun messaggio</p>
      </div>

      <BottomNav />
    </MobileShell>
  );
}
