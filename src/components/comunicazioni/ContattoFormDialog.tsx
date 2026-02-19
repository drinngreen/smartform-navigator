import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

interface ContattoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  prefill?: { telefono?: string; cellulare?: string; email?: string };
  onSaved?: () => void;
}

export function ContattoFormDialog({ open, onOpenChange, tenantId, prefill, onSaved }: ContattoFormDialogProps) {
  const [form, setForm] = useState({
    nome: "",
    cognome: "",
    ragione_sociale: "",
    telefono: prefill?.telefono || "",
    cellulare: prefill?.cellulare || "",
    email: prefill?.email || "",
    pec: "",
    codice_fiscale: "",
    partita_iva: "",
    indirizzo: "",
    comune: "",
    provincia: "",
    note: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error("Il nome è obbligatorio"); return; }
    setSaving(true);
    const { error } = await supabase.from("rubrica_contatti").insert({
      tenant_id: tenantId,
      ...form,
      origine: "manuale",
    });
    setSaving(false);
    if (error) { toast.error("Errore salvataggio: " + error.message); return; }
    toast.success("Contatto salvato in rubrica");
    onOpenChange(false);
    onSaved?.();
    setForm({ nome: "", cognome: "", ragione_sociale: "", telefono: "", cellulare: "", email: "", pec: "", codice_fiscale: "", partita_iva: "", indirizzo: "", comune: "", provincia: "", note: "" });
  };

  const f = (key: keyof typeof form, label: string) => (
    <div className="space-y-1" key={key}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} className="h-8 text-sm" />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto bg-card border-border">
        <DialogHeader><DialogTitle>Nuovo Contatto</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {f("nome", "Nome *")}
          {f("cognome", "Cognome")}
          {f("ragione_sociale", "Ragione Sociale")}
          {f("telefono", "Telefono (SMS)")}
          {f("cellulare", "Cellulare (WhatsApp)")}
          {f("email", "Email")}
          {f("pec", "PEC")}
          {f("codice_fiscale", "Codice Fiscale")}
          {f("partita_iva", "Partita IVA")}
          {f("indirizzo", "Indirizzo")}
          {f("comune", "Comune")}
          {f("provincia", "Provincia")}
        </div>
        {f("note", "Note")}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvataggio..." : "Salva"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
