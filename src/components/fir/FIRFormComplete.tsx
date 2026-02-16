import { useState } from "react";
import { Save, Send, Plus } from "lucide-react";
import { useFIRForms, mapStoreToDatabaseFields } from "@/hooks/useFIRForms";
import { useFIRStore } from "@/stores/firStore";
import { toast } from "sonner";

export function FIRFormComplete() {
  const { createFIR, submitFIR } = useFIRForms();
  const store = useFIRStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveDraft = async () => {
    try {
      const dbFields = mapStoreToDatabaseFields(store.data);
      await createFIR.mutateAsync(dbFields);
      toast.success("Bozza salvata!");
    } catch {
      toast.error("Errore nel salvataggio");
    }
  };

  const handleNewFIR = () => {
    store.resetForm();
    toast.info("Nuovo FIR inizializzato");
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex gap-2">
        <button onClick={handleNewFIR} className="flex-1 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-display text-sm flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors">
          <Plus className="h-4 w-4" /> Nuovo FIR
        </button>
        <button onClick={handleSaveDraft} disabled={createFIR.isPending} className="flex-1 py-3 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan font-display text-sm flex items-center justify-center gap-2 hover:bg-neon-cyan/20 transition-colors">
          <Save className="h-4 w-4" /> Salva Bozza
        </button>
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-card/60 border border-border/30">
          <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-2 block">Produttore</label>
          <input type="text" value={store.data.produttoreDenominazione} onChange={(e) => store.updateField("produttoreDenominazione", e.target.value)} placeholder="Denominazione produttore" className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div className="p-4 rounded-2xl bg-card/60 border border-border/30">
          <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-2 block">Codice EER</label>
          <input type="text" value={store.data.codiceEER} onChange={(e) => store.updateField("codiceEER", e.target.value)} placeholder="es. 170405" className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-card/60 border border-border/30">
            <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-2 block">Quantità</label>
            <input type="text" value={store.data.quantita} onChange={(e) => store.updateField("quantita", e.target.value)} placeholder="0" className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="p-4 rounded-2xl bg-card/60 border border-border/30">
            <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-2 block">U.M.</label>
            <select value={store.data.unitaMisura} onChange={(e) => store.updateField("unitaMisura", e.target.value as "kg" | "l")} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="kg">kg</option>
              <option value="l">litri</option>
            </select>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-card/60 border border-border/30">
          <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-2 block">Descrizione Rifiuto</label>
          <textarea value={store.data.descrizione} onChange={(e) => store.updateField("descrizione", e.target.value)} placeholder="Descrizione del rifiuto..." rows={2} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
        </div>
        <div className="p-4 rounded-2xl bg-card/60 border border-border/30">
          <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-2 block">Destinatario</label>
          <input type="text" value={store.data.destinatarioDenominazione} onChange={(e) => store.updateField("destinatarioDenominazione", e.target.value)} placeholder="Denominazione destinatario" className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
      </div>
    </div>
  );
}
