import { useState } from "react";
import { useSocialGroups, SocialGroup } from "@/hooks/useSocialGroups";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Users, MessageCircle, X, Check, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useEffect } from "react";

interface SocialGroupListProps {
  onOpenGroup: (groupId: string, groupName: string) => void;
}

interface MemberOption {
  user_id: string;
  nome: string;
  cognome: string;
  avatar_url: string | null;
}

export function SocialGroupList({ onOpenGroup }: SocialGroupListProps) {
  const { groups, loading, createGroup } = useSocialGroups();
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [allMembers, setAllMembers] = useState<MemberOption[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!showCreate) return;
    async function fetchMembers() {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, nome, cognome, avatar_url")
        .eq("tenant_id", "167d07ad-9184-484e-85a6-da5ceafa42a3");
      setAllMembers((data || []).filter((m) => m.user_id !== user?.id));
    }
    fetchMembers();
  }, [showCreate, user]);

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim()) { toast.error("Inserisci un nome per il gruppo"); return; }
    if (selectedMembers.length === 0) { toast.error("Seleziona almeno un membro"); return; }
    setCreating(true);
    const result = await createGroup(groupName.trim(), groupDesc.trim(), selectedMembers);
    if (result) {
      toast.success("Gruppo creato!");
      setShowCreate(false);
      setGroupName("");
      setGroupDesc("");
      setSelectedMembers([]);
    } else {
      toast.error("Errore nella creazione del gruppo");
    }
    setCreating(false);
  };

  const filteredMembers = allMembers.filter((m) =>
    `${m.nome} ${m.cognome}`.toLowerCase().includes(memberSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-7 h-7 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {/* Create group button */}
      <button
        onClick={() => setShowCreate(true)}
        className="w-full flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all text-primary"
      >
        <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center">
          <Plus size={20} />
        </div>
        <span className="text-sm font-semibold">Crea nuovo gruppo</span>
      </button>

      {/* Group list */}
      {groups.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users size={28} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nessun gruppo ancora</p>
          <p className="text-xs mt-1 opacity-50">Crea un gruppo per chattare con più persone!</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => onOpenGroup(group.id, group.name)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/20 hover:border-border/40 transition-all text-left"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/40 to-accent/30 flex items-center justify-center shrink-0">
                <Users size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">{group.name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground">
                    {group.member_count} 👥
                  </span>
                </div>
                {group.last_message && (
                  <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">{group.last_message}</p>
                )}
              </div>
              {group.last_message_time && (
                <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                  {format(new Date(group.last_message_time), "HH:mm", { locale: it })}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Create group modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="w-full max-w-lg bg-card border border-border rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
              <h3 className="text-base font-semibold text-foreground">Crea Gruppo</h3>
              <button onClick={() => setShowCreate(false)} className="p-2 rounded-xl hover:bg-secondary/60 text-muted-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Group info */}
              <div className="space-y-3">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Nome del gruppo..."
                  className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <input
                  type="text"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  placeholder="Descrizione (opzionale)..."
                  className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>

              {/* Member selection */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  Aggiungi membri ({selectedMembers.length} selezionati)
                </p>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Cerca..."
                    className="w-full bg-secondary/50 border border-border/30 rounded-xl pl-8 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {filteredMembers.map((m) => {
                    const selected = selectedMembers.includes(m.user_id);
                    return (
                      <button
                        key={m.user_id}
                        onClick={() => toggleMember(m.user_id)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${
                          selected ? "bg-primary/15 border border-primary/30" : "bg-secondary/30 border border-transparent hover:bg-secondary/50"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            (m.nome?.[0] || "U").toUpperCase()
                          )}
                        </div>
                        <span className="flex-1 text-sm text-foreground truncate">{m.nome} {m.cognome}</span>
                        {selected && <Check size={16} className="text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border/30">
              <button
                onClick={handleCreate}
                disabled={creating || !groupName.trim() || selectedMembers.length === 0}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 hover:brightness-110 transition-all"
              >
                {creating ? "Creazione..." : "Crea Gruppo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
