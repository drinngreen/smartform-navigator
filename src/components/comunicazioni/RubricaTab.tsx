import { useMemo, useState } from "react";
import { useRubricaContatti } from "@/hooks/useRubricaContatti";
import { ContattoFormDialog } from "./ContattoFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Trash2, MessageSquare, Phone, Mail, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface RubricaTabProps {
  basePath?: string; // e.g. "/admin" or "/mn/admin/multyproget"
  tenantId?: string;
}

/** Ordine di visualizzazione delle categorie (dal ruolo più operativo). */
const ORDINE_CATEGORIE = [
  "DESTINATARIO",
  "TRASPORTATORE",
  "INTERMEDIARIO",
  "PRODUTTORE",
  "CLIENTE",
  "FORNITORE",
  "PRIVATO",
  "ALTRO",
];

const COLORI_CATEGORIA: Record<string, string> = {
  DESTINATARIO: "bg-emerald-500/20 text-emerald-400",
  TRASPORTATORE: "bg-cyan-500/20 text-cyan-400",
  INTERMEDIARIO: "bg-violet-500/20 text-violet-400",
  PRODUTTORE: "bg-amber-500/20 text-amber-400",
  CLIENTE: "bg-blue-500/20 text-blue-400",
  FORNITORE: "bg-orange-500/20 text-orange-400",
  PRIVATO: "bg-pink-500/20 text-pink-400",
  ALTRO: "bg-muted text-muted-foreground",
};

const rank = (c?: string | null) => {
  const i = ORDINE_CATEGORIE.indexOf((c || "ALTRO").toUpperCase());
  return i === -1 ? ORDINE_CATEGORIE.length : i;
};

export function RubricaTab({ basePath = "/admin", tenantId: tenantIdOverride }: RubricaTabProps) {
  const { data: contatti, isLoading, tenantId, deleteContatto, refetch } = useRubricaContatti(tenantIdOverride);
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState<string>("TUTTI");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const navigate = useNavigate();

  const lista = useMemo(() => (contatti || []) as any[], [contatti]);

  const conteggi = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of lista) {
      const k = (c.categoria || "ALTRO").toUpperCase();
      m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => rank(a[0]) - rank(b[0]));
  }, [lista]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return lista
      .filter((c) => categoria === "TUTTI" || (c.categoria || "ALTRO").toUpperCase() === categoria)
      .filter((c) =>
        !s ||
        [c.nome, c.cognome, c.ragione_sociale, c.telefono, c.cellulare, c.email,
         c.codice_fiscale, c.partita_iva, c.comune, c.autorizzazioni, c.ruoli]
          .some((v: string | null) => v?.toLowerCase().includes(s)),
      )
      .sort(
        (a, b) =>
          rank(a.categoria) - rank(b.categoria) ||
          (a.ragione_sociale || a.nome || "").localeCompare(b.ragione_sociale || b.nome || ""),
      );
  }, [lista, search, categoria]);

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminare questo contatto?")) return;
    try { await deleteContatto(id); toast.success("Contatto eliminato"); } catch { toast.error("Errore eliminazione"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cerca per nome, CF, P.IVA, comune, autorizzazione..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Button size="sm" onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-1" /> Nuovo</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoria("TUTTI")}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${categoria === "TUTTI" ? "border-primary bg-primary/20 text-foreground" : "border-border/40 text-muted-foreground hover:bg-card/60"}`}
        >
          Tutti ({lista.length})
        </button>
        {conteggi.map(([cat, n]) => (
          <button
            key={cat}
            onClick={() => setCategoria(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${categoria === cat ? "border-primary bg-primary/20 text-foreground" : "border-border/40 text-muted-foreground hover:bg-card/60"}`}
          >
            {cat} ({n})
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Caricamento...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nessun contatto trovato</p>
      ) : (
        <div className="rounded-xl border border-border/30 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-card/80">
              <tr className="text-left text-muted-foreground text-xs uppercase">
                <th className="p-3">Tipo</th>
                <th className="p-3">Nominativo</th>
                <th className="p-3">CF / P.IVA</th>
                <th className="p-3">Sede</th>
                <th className="p-3">Telefono</th>
                <th className="p-3">Cellulare</th>
                <th className="p-3">Email</th>
                <th className="p-3">Autorizzazioni</th>
                <th className="p-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {filtered.map((c) => {
                const cat = (c.categoria || "ALTRO").toUpperCase();
                return (
                  <tr key={c.id} className="hover:bg-card/40 align-top">
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${COLORI_CATEGORIA[cat] || COLORI_CATEGORIA.ALTRO}`}>{cat}</span>
                      {c.ruoli && c.ruoli !== cat && (
                        <div className="text-[10px] text-muted-foreground mt-1">{c.ruoli}</div>
                      )}
                    </td>
                    <td className="p-3 font-medium text-foreground">
                      {c.ragione_sociale || `${c.nome} ${c.cognome || ""}`.trim()}
                      {c.ragione_sociale && c.cognome && (
                        <div className="text-xs text-muted-foreground">{c.nome} {c.cognome}</div>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">{c.codice_fiscale || c.partita_iva || "—"}</td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {[c.indirizzo, [c.cap, c.comune].filter(Boolean).join(" "), c.provincia].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">{c.telefono || "—"}</td>
                    <td className="p-3 text-muted-foreground">{c.cellulare || "—"}</td>
                    <td className="p-3 text-muted-foreground text-xs">{c.email || "—"}</td>
                    <td className="p-3 text-muted-foreground text-xs max-w-[260px]">{c.autorizzazioni || "—"}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {c.telefono && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`${basePath}/sms?to=${encodeURIComponent(c.telefono!)}`)}><Phone className="h-3.5 w-3.5" /></Button>}
                        {c.cellulare && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`${basePath}/whatsapp?to=${encodeURIComponent(c.cellulare!)}`)}><MessageSquare className="h-3.5 w-3.5" /></Button>}
                        {c.email && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`${basePath}/email?to=${encodeURIComponent(c.email!)}`)}><Mail className="h-3.5 w-3.5" /></Button>}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" title="Modifica contatto" onClick={() => setEditing(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tenantId && <ContattoFormDialog open={showNew} onOpenChange={setShowNew} tenantId={tenantId} onSaved={() => refetch()} />}
      {tenantId && (
        <ContattoFormDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          tenantId={tenantId}
          contatto={editing}
          onSaved={() => { setEditing(null); refetch(); }}
        />
      )}
    </div>
  );
}
