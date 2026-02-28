import { MessageCircle, Send } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface SocialHeaderProps {
  userName?: string;
  userInitial?: string;
  userAvatar?: string | null;
}

export function SocialHeader({ userName = "Utente", userInitial = "U", userAvatar }: SocialHeaderProps) {
  return (
    <div className="relative bg-gradient-to-r from-card via-card to-secondary/50 border-b border-border/50 px-4 py-3">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-br from-primary via-accent to-primary">
              {userAvatar ? (
                <img src={userAvatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-sm font-bold text-primary">
                  {userInitial}
                </div>
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-success border-2 border-card" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-foreground leading-tight tracking-wide">
              Social Global Reco
            </h1>
            <p className="text-[10px] text-muted-foreground font-medium">Comunità trasportatori</p>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <button className="relative p-2.5 rounded-xl hover:bg-secondary/80 transition-all group">
            <Send size={18} className="text-muted-foreground group-hover:text-accent transition-colors" />
          </button>
          <button className="relative p-2.5 rounded-xl hover:bg-secondary/80 transition-all group">
            <MessageCircle size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
          <NotificationBell
            className="relative p-2.5 rounded-xl hover:bg-secondary/80 transition-all group"
            iconClassName="h-[18px] w-[18px] text-muted-foreground group-hover:text-primary transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
