import { Bell, MessageCircle, Trophy, Users } from "lucide-react";
import logoDragon from "@/assets/logo-dragon.png";

interface SocialHeaderProps {
  userName?: string;
  userInitial?: string;
}

export function SocialHeader({ userName = "Utente", userInitial = "U" }: SocialHeaderProps) {
  return (
    <div className="bg-card border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-accent/30 border-2 border-primary/50 flex items-center justify-center text-sm font-bold text-primary shadow-[var(--glow-gold-subtle)]">
            {userInitial}
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-foreground leading-tight flex items-center gap-1.5">
              <Users size={16} className="text-accent shrink-0" />
              Social Global Reco
            </h1>
            <p className="text-[10px] text-muted-foreground">Comunità trasportatori</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="relative p-2 rounded-full hover:bg-secondary transition-colors">
            <Trophy size={18} className="text-primary" />
          </button>
          <button className="relative p-2 rounded-full hover:bg-secondary transition-colors">
            <MessageCircle size={18} className="text-muted-foreground" />
          </button>
          <button className="relative p-2 rounded-full hover:bg-secondary transition-colors">
            <Bell size={18} className="text-muted-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </button>
        </div>
      </div>
    </div>
  );
}
