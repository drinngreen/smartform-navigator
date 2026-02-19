import { useState } from "react";
import { Plus, Pencil, Trash2, Search, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useIntermediari } from "@/hooks/useIntermediari";
import { ListinoFormDialog } from "./ListinoFormDialog";

export interface Listino {
  id: string;
  intermediario_id: string;
  produttore_id: string | null;
  cer: string | null;
  tipo_provvigione: string;
  valore_provvigione: number;
  fee_minimo: number | null;
  descrizione: string | null;
  valido_dal: string | null;
  valido_al: string | null;
  attivo: boolean;
  intermediario?: { ragione_sociale: string };
  produttore?: { name: string };
}

export function ListiniTab() {
  const qc = useQueryClient();
  const { data: intermediari = [] } = useIntermediari();
  const { data: listini = [], isLoading } = useQuery({
    queryKey: ["listini_intermediazione"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listini_intermediazione" as any)
        .select(`*, intermediario:intermediari(ragione_sociale), produttore:organizations!listini_intermediazione_produttore_id_fkey(name)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Listino[];
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listini_intermediazione" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["listini_intermediazione"] }); toast.success("Listino eliminato"); },
  });

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Listino | null>(null);

  const filtered = listini.filter(l =>
    `${l.intermediario?.ragione_sociale} ${l.produttore?.name} ${l.cer} ${l.descrizione}`.toLowerCase().includes(search.toLowerCase())
  );

  const tipoLabels: Record<string, string> = { percentuale: "%", euro_ton: "€/ton", forfait: "Forfait" };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cerca listini..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-card/60 border-border/30" />
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Nuovo Listino
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Caricamento...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ListChecks className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nessun listino trovato</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(item => (
            <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl bg-card/60 border border-border/30">
              <div className="flex-1">
                <div className="font-medium text-foreground">{item.intermediario?.ragione_sociale || "—"}</div>
                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                  {item.produttore?.name && <span>Prod: {item.produttore.name}</span>}
                  {item.cer && <span>CER: {item.cer}</span>}
                  <span>Fee: {item.valore_provvigione} {tipoLabels[item.tipo_provvigione]}</span>
                  {item.fee_minimo != null && <span>Min: €{item.fee_minimo}</span>}
                  {item.valido_dal && <span>Dal: {item.valido_dal}</span>}
                  {item.valido_al && <span>Al: {item.valido_al}</span>}
                </div>
                {item.descrizione && <p className="text-xs text-muted-foreground mt-1">{item.descrizione}</p>}
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(item); setShowForm(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Eliminare?")) deleteMut.mutate(item.id); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ListinoFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        listino={editing}
        intermediari={intermediari}
        onSaved={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ["listini_intermediazione"] }); }}
      />
    </div>
  );
}
