import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Users, Trash2, Search, UserX, UserCheck } from "lucide-react";

interface SocialGuest {
  id: string;
  user_id: string;
  nome: string;
  cognome: string;
  codice_fiscale: string;
  created_at: string;
  social_warnings: number;
}

export function SocialGuestsPanel() {
  const [guests, setGuests] = useState<SocialGuest[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [promoting, setPromoting] = useState<string | null>(null);
  const fetchGuests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("tenant_id", "167d07ad-9184-484e-85a6-da5ceafa42a3")
      .eq("is_social_only", true)
      .order("created_at", { ascending: false });

    setGuests((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchGuests(); }, []);

  const handleDelete = async (guest: SocialGuest) => {
    if (!confirm(`Eliminare l'ospite ${guest.nome} ${guest.cognome}?`)) return;
    setDeleting(guest.user_id);

    // Use edge function to delete auth user
    await supabase.functions.invoke("admin-user-manage", {
      body: { action: "delete_user", userId: guest.user_id },
    });

    fetchGuests();
    setDeleting(null);
  };

  const handlePromote = async (guest: SocialGuest) => {
    if (!confirm(`Promuovere ${guest.nome} ${guest.cognome} a collaboratore con accesso completo all'app operativa?`)) return;
    setPromoting(guest.user_id);

    await supabase
      .from("profiles")
      .update({ is_social_only: false })
      .eq("user_id", guest.user_id);

    fetchGuests();
    setPromoting(null);
  };

  const filtered = guests.filter((g) => {
    const q = search.toLowerCase();
    return !q || g.nome?.toLowerCase().includes(q) || g.cognome?.toLowerCase().includes(q) || g.codice_fiscale?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-accent" />
          <h3 className="text-sm font-semibold">Ospiti Social ({guests.length})</h3>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca ospite..."
            className="pl-8 pr-3 py-2 text-xs bg-secondary border border-border rounded-lg w-48"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Caricamento...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8">
          <UserX size={32} className="mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nessun ospite social trovato</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((g) => (
              <div key={g.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{g.nome} {g.cognome}</span>
                    {g.social_warnings > 0 && (
                      <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded-full">
                        {g.social_warnings} ammonimenti
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{g.codice_fiscale}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePromote(g)}
                    disabled={promoting === g.user_id}
                    title="Promuovi a collaboratore operativo"
                    className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary disabled:opacity-50 transition-all"
                  >
                    <UserCheck size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(g)}
                    disabled={deleting === g.user_id}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-50 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
