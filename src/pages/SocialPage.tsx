import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { SocialFeed } from "@/components/social/SocialFeed";
import { SocialHeader } from "@/components/social/SocialHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileShell } from "@/components/layout/MobileShell";
import { Users } from "lucide-react";

export default function SocialPage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const isSocialOnly = (profile as any)?.is_social_only === true;
  const userName = (profile as any)?.nome || user?.email?.split("@")[0] || "Utente";
  const userInitial = (userName[0] || "U").toUpperCase();
  const userAvatar = (profile as any)?.avatar_url || null;

  return (
    <MobileShell>
      {/* Social Header */}
      <SocialHeader userName={userName} userInitial={userInitial} userAvatar={userAvatar} />

      {/* Feed */}
      <div className="flex-1 overflow-y-auto pb-20">
        <SocialFeed />
      </div>

      {/* Bottom nav */}
      {isSocialOnly ? (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-3 flex justify-around max-w-lg mx-auto">
          <button onClick={() => navigate("/social")} className="flex flex-col items-center gap-1 text-primary">
            <Users size={20} />
            <span className="text-[10px] font-medium">Social</span>
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
