import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { Search, MessageCircle, Shield, User } from "lucide-react";

interface SocialMember {
  user_id: string;
  nome: string;
  cognome: string;
  avatar_url: string | null;
  is_social_only: boolean;
  social_bio: string | null;
}

interface SocialMembersProps {
  onOpenChat: (userId: string, userName: string) => void;
}

export function SocialMembers({ onOpenChat }: SocialMembersProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<SocialMember[]>([]);
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
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-7 h-7 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca membro..."
          className="w-full bg-secondary/50 border border-border/30 rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>

      {/* Count */}
      <p className="text-[11px] text-muted-foreground font-medium px-1">
        {filtered.length} membr{filtered.length === 1 ? "o" : "i"} della community
      </p>

      {/* Member list */}
      <div className="space-y-1.5">
        {filtered.map((member) => (
          <div
            key={member.user_id}
            className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/20 hover:border-border/40 transition-all"
          >
            {/* Avatar */}
            <div className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-br from-primary/50 to-accent/30 shrink-0">
              {member.avatar_url ? (
                <img src={member.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-xs font-bold text-primary">
                  {(member.nome?.[0] || "U").toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground truncate">
                  {member.nome} {member.cognome}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-md border font-semibold ${
                  member.is_social_only
                    ? "bg-accent/10 text-accent border-accent/20"
                    : "bg-primary/10 text-primary border-primary/20"
                }`}>
                  {member.is_social_only ? "Ospite" : "Driver"}
                </span>
              </div>
              {member.social_bio && (
                <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">{member.social_bio}</p>
              )}
            </div>

            {/* DM button */}
            <button
              onClick={() => onOpenChat(member.user_id, `${member.nome} ${member.cognome}`)}
              className="p-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-all"
              title="Invia messaggio"
            >
              <MessageCircle size={16} />
            </button>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <User size={28} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nessun membro trovato</p>
          </div>
        )}
      </div>
    </div>
  );
}
