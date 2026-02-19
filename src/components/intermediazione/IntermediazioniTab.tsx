import { useState } from "react";
import { Plus, Search, ArrowRightLeft, FileText, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useIntermediazioni, useDeleteIntermediazione, Intermediazione } from "@/hooks/useIntermediazioni";
import { IntermediazioneFormDialog } from "./IntermediazioneFormDialog";

const statoColors: Record<string, string> = {
  bozza: "bg-yellow-500/20 text-yellow-400",
  attiva: "bg-blue-500/20 text-blue-400",
  completata: "bg-emerald-500/20 text-emerald-400",
  fatturata: "bg-purple-500/20 text-purple-400",
  annullata: "bg-destructive/20 text-destructive",
};

const tipoProvvigioneLabels: Record<string, string> = {
  percentuale: "%",
  euro_ton: "€/ton",
  forfait: "Forfait",
};

export function IntermediazioniTab() {
  const { data: items = [], isLoading } = useIntermediazioni();
  const deleteMut = useDeleteIntermediazione();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Intermediazione | null>(null);

  const filtered = items.filter(i => {
    const text = `${i.intermediario?.ragione_sociale} ${i.produttore?.name} ${i.destinatario?.name} ${i.cer} ${i.stato}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  // Stats
  const totale = items.length;
  const attive = items.filter(i => i.stato === "attiva").length;
  const completate = items.filter(i => i.stato === "completata").length;
  const daFatturare = items.filter(i => i.stato === "completata" && !i.fatturata).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Totale", value: totale, color: "text-foreground" },
          { label: "Attive", value: attive, color: "text-blue-400" },
          { label: "Completate", value: completate, color: "text-emerald-400" },
          { label: "Da Fatturare", value: daFatturare, color: "text-yellow-400" },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl bg-card/60 border border-border/30 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cerca intermediazioni..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-card/60 border-border/30" />
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Nuova Intermediazione
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Caricamento...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ArrowRightLeft className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nessuna intermediazione trovata</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <div key={item.id} className="p-4 rounded-xl bg-card/60 border border-border/30 backdrop-blur-xl">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={statoColors[item.stato] || ""}>
                      {item.stato.toUpperCase()}
                    </Badge>
                    {item.cer && <span className="text-xs font-mono text-muted-foreground">CER {item.cer}</span>}
                    {item.fatturata && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                  </div>
                  <div className="text-sm text-foreground font-medium">
                    {item.intermediario?.ragione_sociale || "—"}
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                    <span>Prod: {item.produttore?.name || "—"}</span>
                    <span>Dest: {item.destinatario?.name || "—"}</span>
                    <span>Trasp: {item.trasportatore?.name || "—"}</span>
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                    <span>Qty: {item.quantita_effettiva_kg ?? item.quantita_stimata_kg ?? "—"} kg</span>
                    <span>Fee: {item.valore_provvigione} {tipoProvvigioneLabels[item.tipo_provvigione]}</span>
                    {item.importo_provvigione != null && <span className="text-primary font-medium">Provv: €{item.importo_provvigione.toFixed(2)}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(item); setShowForm(true); }}>
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Eliminare?")) deleteMut.mutate(item.id); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <IntermediazioneFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        intermediazione={editing}
        onSave={async () => setShowForm(false)}
      />
    </div>
  );
}
