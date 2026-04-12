import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { Search, MessageCircle, User } from "lucide-react";
import { SocialCallButton } from "./SocialCallButton";
export function SocialMembers({ onOpenChat }) {
    const { user } = useAuth();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    useEffect(() => {
        async function fetchMembers() {
            const { data, error } = await supabase
                .from("profiles")
                .select("user_id, nome, cognome, avatar_url, is_social_only, social_bio")
                .eq("tenant_id", "167d07ad-9184-484e-85a6-da5ceafa42a3");
            if (!error && data) {
                setMembers(data.filter((m) => m.user_id !== user?.id));
            }
            setLoading(false);
        }
        fetchMembers();
    }, [user]);
    const filtered = members.filter((m) => {
        const fullName = `${m.nome} ${m.cognome}`.toLowerCase();
        return fullName.includes(search.toLowerCase());
    });
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center py-16", children: _jsx("div", { className: "w-7 h-7 border-2 border-primary/20 border-t-primary rounded-full animate-spin" }) }));
    }
    return (_jsxs("div", { className: "p-4 space-y-3", children: [_jsxs("div", { className: "relative", children: [_jsx(Search, { size: 15, className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" }), _jsx("input", { type: "text", value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Cerca membro...", className: "w-full bg-secondary/50 border border-border/30 rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50" })] }), _jsxs("p", { className: "text-[11px] text-muted-foreground font-medium px-1", children: [filtered.length, " membr", filtered.length === 1 ? "o" : "i", " della community"] }), _jsxs("div", { className: "space-y-1.5", children: [filtered.map((member) => (_jsxs("div", { className: "flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/20 hover:border-border/40 transition-all", children: [_jsx("div", { className: "w-11 h-11 rounded-full p-[2px] bg-gradient-to-br from-primary/50 to-accent/30 shrink-0", children: member.avatar_url ? (_jsx("img", { src: member.avatar_url, alt: "", className: "w-full h-full rounded-full object-cover" })) : (_jsx("div", { className: "w-full h-full rounded-full bg-card flex items-center justify-center text-xs font-bold text-primary", children: (member.nome?.[0] || "U").toUpperCase() })) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsxs("span", { className: "text-sm font-semibold text-foreground truncate", children: [member.nome, " ", member.cognome] }), _jsx("span", { className: `text-[9px] px-1.5 py-0.5 rounded-md border font-semibold ${member.is_social_only
                                                    ? "bg-accent/10 text-accent border-accent/20"
                                                    : "bg-primary/10 text-primary border-primary/20"}`, children: member.is_social_only ? "Ospite" : "Driver" })] }), member.social_bio && (_jsx("p", { className: "text-[11px] text-muted-foreground/70 truncate mt-0.5", children: member.social_bio }))] }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx(SocialCallButton, { targetUserId: member.user_id, targetUserName: `${member.nome} ${member.cognome}` }), _jsx("button", { onClick: () => onOpenChat(member.user_id, `${member.nome} ${member.cognome}`), className: "p-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-all", title: "Invia messaggio", children: _jsx(MessageCircle, { size: 16 }) })] })] }, member.user_id))), filtered.length === 0 && (_jsxs("div", { className: "text-center py-12 text-muted-foreground", children: [_jsx(User, { size: 28, className: "mx-auto mb-3 opacity-30" }), _jsx("p", { className: "text-sm", children: "Nessun membro trovato" })] }))] })] }));
}
