import { useState } from "react";
import { Plus, Pencil, Trash2, Search, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIntermediari, useCreateIntermediario, useUpdateIntermediario, useDeleteIntermediario, Intermediario } from "@/hooks/useIntermediari";
import { IntermediarioFormDialog } from "./IntermediarioFormDialog";

export function IntermediariTab() {
  const { data: intermediari = [], isLoading } = useIntermediari();
  const createMut = useCreateIntermediario();
  const updateMut = useUpdateIntermediario();
  const deleteMut = useDeleteIntermediario();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Intermediario | null>(null);
  const [showForm, setShowForm] = useState(false);

  const filtered = intermediari.filter(i =>
    `${i.ragione_sociale} ${i.codice_fiscale} ${i.partita_iva} ${i.comune}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca intermediari..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-card/60 border-border/30"
          />
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Nuovo Intermediario
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Caricamento...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nessun intermediario trovato</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(item => (
            <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl bg-card/60 border border-border/30 backdrop-blur-xl">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-foreground truncate">{item.ragione_sociale}</h3>
                  {item.attivo ? (
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-400">Attivo</span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-destructive/20 text-destructive">Inattivo</span>
                  )}
                </div>
                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                  {item.partita_iva && <span>P.IVA: {item.partita_iva}</span>}
                  {item.numero_iscrizione_albo && <span>Albo Cat.8: {item.numero_iscrizione_albo}</span>}
                  {item.comune && <span>{item.comune} ({item.provincia})</span>}
                  {item.cer_autorizzati?.length > 0 && <span>{item.cer_autorizzati.length} CER autorizzati</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(item); setShowForm(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Eliminare?")) deleteMut.mutate(item.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <IntermediarioFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        intermediario={editing}
        onSave={async (values) => {
          if (editing) {
            await updateMut.mutateAsync({ id: editing.id, ...values });
          } else {
            await createMut.mutateAsync(values);
          }
          setShowForm(false);
        }}
      />
    </div>
  );
}
