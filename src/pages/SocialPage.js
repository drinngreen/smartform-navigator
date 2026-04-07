import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    const isSocialOnly = profile?.is_social_only === true;
    const userName = profile?.nome || user?.email?.split("@")[0] || "Utente";
    const userInitial = (userName[0] || "U").toUpperCase();
    const userAvatar = profile?.avatar_url || null;
    const [chatPartner, setChatPartner] = useState(null);
    const [activeGroup, setActiveGroup] = useState(null);
    const handleOpenChat = (userId, userName) => {
        setChatPartner({ id: userId, name: userName });
    };
    const handleOpenGroup = (groupId, groupName) => {
        setActiveGroup({ id: groupId, name: groupName });
    };
    // Group chat view
    if (activeGroup) {
        return (_jsx(MobileShell, { children: _jsx(SocialGroupChat, { groupId: activeGroup.id, groupName: activeGroup.name, onBack: () => setActiveGroup(null) }) }));
    }
    // DM chat view
    if (chatPartner) {
        return (_jsx(MobileShell, { children: _jsx(SocialChat, { partnerId: chatPartner.id, partnerName: chatPartner.name, onBack: () => setChatPartner(null) }) }));
    }
    return (_jsxs(MobileShell, { children: [_jsx(SocialHeader, { userName: userName, userInitial: userInitial, userAvatar: userAvatar }), _jsx("div", { className: "flex-1 overflow-y-auto pb-20", children: _jsx(SocialFeed, { onOpenChat: handleOpenChat, onOpenGroup: handleOpenGroup }) }), isSocialOnly ? (_jsxs("div", { className: "fixed bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-3 flex justify-around max-w-lg mx-auto", children: [_jsxs("button", { onClick: () => navigate("/social"), className: "flex flex-col items-center gap-1 text-primary", children: [_jsx(Users, { size: 20 }), _jsx("span", { className: "text-[10px] font-medium", children: "Social" })] }), _jsxs("button", { onClick: () => navigate("/social/ai"), className: "flex flex-col items-center gap-1 text-muted-foreground", children: [_jsx(Bot, { size: 20 }), _jsx("span", { className: "text-[10px]", children: "AI" })] }), _jsxs("button", { onClick: async () => { await supabase.auth.signOut(); navigate("/social/guest"); }, className: "flex flex-col items-center gap-1 text-muted-foreground", children: [_jsx(LogOut, { size: 20 }), _jsx("span", { className: "text-[10px]", children: "Esci" })] })] })) : (_jsx(BottomNav, {}))] }));
}
