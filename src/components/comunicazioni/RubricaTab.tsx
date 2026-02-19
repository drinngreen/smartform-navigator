import { useState } from "react";
import { useRubricaContatti } from "@/hooks/useRubricaContatti";
import { ContattoFormDialog } from "./ContattoFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Trash2, MessageSquare, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface RubricaTabProps {
  basePath?: string; // e.g. "/admin" or "/mn/admin/multyproget"
}

export function RubricaTab({ basePath = "/admin" }: RubricaTabProps) {
  const { data: contatti, isLoading, tenantId, deleteContatto, refetch } = useRubricaContatti();
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const navigate = useNavigate();

  const filtered = (contatti || []).filter((c) => {
    const s = search.toLowerCase();
    return !s || [c.nome, c.cognome, c.ragione_sociale, c.telefono, c.cellulare, c.email].some((v) => v?.toLowerCase().includes(s));
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminare questo contatto?")) return;
    try { await deleteContatto(id); toast.success("Contatto eliminato"); } catch { toast.error("Errore eliminazione"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cerca contatto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Button size="sm" onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-1" /> Nuovo</Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Caricamento...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nessun contatto trovato</p>
      ) : (
        <div className="rounded-xl border border-border/30 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card/80">
              <tr className="text-left text-muted-foreground text-xs uppercase">
                <th className="p-3">Nome</th>
                <th className="p-3">Ragione Sociale</th>
                <th className="p-3">Telefono</th>
                <th className="p-3">Cellulare</th>
                <th className="p-3">Email</th>
                <th className="p-3">Origine</th>
                <th className="p-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-card/40">
                  <td className="p-3 font-medium text-foreground">{c.nome} {c.cognome}</td>
                  <td className="p-3 text-muted-foreground">{c.ragione_sociale || "—"}</td>
                  <td className="p-3 text-muted-foreground">{c.telefono || "—"}</td>
                  <td className="p-3 text-muted-foreground">{c.cellulare || "—"}</td>
                  <td className="p-3 text-muted-foreground">{c.email || "—"}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${c.origine === "anagrafica" ? "bg-cyan-500/20 text-cyan-400" : "bg-emerald-500/20 text-emerald-400"}`}>{c.origine}</span></td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {c.telefono && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`${basePath}/sms?to=${encodeURIComponent(c.telefono!)}`)}><Phone className="h-3.5 w-3.5" /></Button>}
                      {c.cellulare && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`${basePath}/whatsapp?to=${encodeURIComponent(c.cellulare!)}`)}><MessageSquare className="h-3.5 w-3.5" /></Button>}
                      {c.email && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`${basePath}/email?to=${encodeURIComponent(c.email!)}`)}><Mail className="h-3.5 w-3.5" /></Button>}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tenantId && <ContattoFormDialog open={showNew} onOpenChange={setShowNew} tenantId={tenantId} onSaved={() => refetch()} />}
    </div>
  );
}
