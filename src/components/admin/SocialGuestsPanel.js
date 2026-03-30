import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Users, Trash2, Search, UserX, UserCheck } from "lucide-react";
export function SocialGuestsPanel() {
    const [guests, setGuests] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(null);
    const [promoting, setPromoting] = useState(null);
    const fetchGuests = async () => {
        setLoading(true);
        const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("tenant_id", "167d07ad-9184-484e-85a6-da5ceafa42a3")
            .eq("is_social_only", true)
            .order("created_at", { ascending: false });
        setGuests(data || []);
        setLoading(false);
    };
    useEffect(() => { fetchGuests(); }, []);
    const handleDelete = async (guest) => {
        if (!confirm(`Eliminare l'ospite ${guest.nome} ${guest.cognome}?`))
            return;
        setDeleting(guest.user_id);
        // Use edge function to delete auth user
        await supabase.functions.invoke("admin-user-manage", {
            body: { action: "delete_user", userId: guest.user_id },
        });
        fetchGuests();
        setDeleting(null);
    };
    const handlePromote = async (guest) => {
        if (!confirm(`Promuovere ${guest.nome} ${guest.cognome} a collaboratore con accesso completo all'app operativa?`))
            return;
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
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Users, { size: 18, className: "text-accent" }), _jsxs("h3", { className: "text-sm font-semibold", children: ["Ospiti Social (", guests.length, ")"] })] }), _jsxs("div", { className: "relative", children: [_jsx(Search, { size: 14, className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" }), _jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Cerca ospite...", className: "pl-8 pr-3 py-2 text-xs bg-secondary border border-border rounded-lg w-48" })] })] }), loading ? (_jsx("div", { className: "text-center py-8 text-sm text-muted-foreground", children: "Caricamento..." })) : filtered.length === 0 ? (_jsxs("div", { className: "text-center py-8", children: [_jsx(UserX, { size: 32, className: "mx-auto mb-2 text-muted-foreground/30" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Nessun ospite social trovato" })] })) : (_jsx("div", { className: "bg-card border border-border rounded-xl overflow-hidden", children: _jsx("div", { className: "divide-y divide-border", children: filtered.map((g) => (_jsxs("div", { className: "px-4 py-3 flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "text-sm font-semibold", children: [g.nome, " ", g.cognome] }), g.social_warnings > 0 && (_jsxs("span", { className: "text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded-full", children: [g.social_warnings, " ammonimenti"] }))] }), _jsx("span", { className: "text-xs text-muted-foreground font-mono", children: g.codice_fiscale })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => handlePromote(g), disabled: promoting === g.user_id, title: "Promuovi a collaboratore operativo", className: "p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary disabled:opacity-50 transition-all", children: _jsx(UserCheck, { size: 16 }) }), _jsx("button", { onClick: () => handleDelete(g), disabled: deleting === g.user_id, className: "p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-50 transition-all", children: _jsx(Trash2, { size: 16 }) })] })] }, g.id))) }) }))] }));
}
