import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { SocialFeed } from "@/components/social/SocialFeed";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileShell } from "@/components/layout/MobileShell";
import { Users, ArrowLeft } from "lucide-react";
import logoDragon from "@/assets/logo-dragon.png";

export default function SocialPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isSocialOnly = (profile as any)?.is_social_only === true;

  return (
    <MobileShell>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          {!isSocialOnly && (
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-secondary transition-all">
              <ArrowLeft size={18} className="text-muted-foreground" />
            </button>
          )}
          <img src={logoDragon} alt="" className="h-8 w-8" style={{ filter: 'drop-shadow(0 0 8px rgba(192, 173, 103, 0.5))' }} />
          <div>
            <h1 className="text-lg font-mono tracking-wider text-foreground flex items-center gap-2">
              <Users size={18} className="text-accent" /> Social Global Reco
            </h1>
            <p className="text-[10px] text-muted-foreground">Comunità trasportatori</p>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto pb-20 px-4 pt-4">
        <SocialFeed />
      </div>

      {/* Bottom nav: full for app users, minimal for social-only guests */}
      {isSocialOnly ? (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-3 flex justify-around max-w-lg mx-auto">
          <button onClick={() => navigate("/social")} className="flex flex-col items-center gap-1 text-primary">
            <Users size={20} />
            <span className="text-[10px]">Social</span>
          </button>
          <button onClick={() => navigate("/app/profilo")} className="flex flex-col items-center gap-1 text-muted-foreground">
            <Users size={20} />
            <span className="text-[10px]">Profilo</span>
          </button>
        </div>
      ) : (
        <BottomNav />
      )}
    </MobileShell>
  );
}
