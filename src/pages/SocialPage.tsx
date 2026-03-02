import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { SocialFeed } from "@/components/social/SocialFeed";
import { SocialHeader } from "@/components/social/SocialHeader";
import { SocialChat } from "@/components/social/SocialChat";
import { SocialGroupChat } from "@/components/social/SocialGroupChat";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileShell } from "@/components/layout/MobileShell";
import { Users, Bot, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function SocialPage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const isSocialOnly = (profile as any)?.is_social_only === true;
  const userName = (profile as any)?.nome || user?.email?.split("@")[0] || "Utente";
  const userInitial = (userName[0] || "U").toUpperCase();
  const userAvatar = (profile as any)?.avatar_url || null;

  const [chatPartner, setChatPartner] = useState<{ id: string; name: string } | null>(null);
  const [activeGroup, setActiveGroup] = useState<{ id: string; name: string } | null>(null);

  const handleOpenChat = (userId: string, userName: string) => {
    setChatPartner({ id: userId, name: userName });
  };

  const handleOpenGroup = (groupId: string, groupName: string) => {
    setActiveGroup({ id: groupId, name: groupName });
  };

  // Group chat view
  if (activeGroup) {
    return (
      <MobileShell>
        <SocialGroupChat
          groupId={activeGroup.id}
          groupName={activeGroup.name}
          onBack={() => setActiveGroup(null)}
        />
      </MobileShell>
    );
  }

  // DM chat view
  if (chatPartner) {
    return (
      <MobileShell>
        <SocialChat
          partnerId={chatPartner.id}
          partnerName={chatPartner.name}
          onBack={() => setChatPartner(null)}
        />
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <SocialHeader userName={userName} userInitial={userInitial} userAvatar={userAvatar} />
      <div className="flex-1 overflow-y-auto pb-20">
        <SocialFeed onOpenChat={handleOpenChat} onOpenGroup={handleOpenGroup} />
      </div>
      {isSocialOnly ? (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-3 flex justify-around max-w-lg mx-auto">
          <button onClick={() => navigate("/social")} className="flex flex-col items-center gap-1 text-primary">
            <Users size={20} />
            <span className="text-[10px] font-medium">Social</span>
          </button>
          <button onClick={() => navigate("/social/ai")} className="flex flex-col items-center gap-1 text-muted-foreground">
            <Bot size={20} />
            <span className="text-[10px]">AI</span>
          </button>
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate("/social/guest"); }}
            className="flex flex-col items-center gap-1 text-muted-foreground"
          >
            <LogOut size={20} />
            <span className="text-[10px]">Esci</span>
          </button>
        </div>
      ) : (
        <BottomNav />
      )}
    </MobileShell>
  );
}
