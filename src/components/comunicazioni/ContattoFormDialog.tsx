import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { CATEGORIE_SOGGETTO, upsertSoggetto } from "@/lib/anagraficaSync";

interface ContattoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  prefill?: { telefono?: string; cellulare?: string; email?: string };
  /** Contatto da modificare: se presente il dialog è in modalità modifica */
  contatto?: any | null;
  onSaved?: () => void;
}

const EMPTY = {
  nome: "",
  cognome: "",
  ragione_sociale: "",
  telefono: "",
  cellulare: "",
  email: "",
  pec: "",
  codice_sdi: "",
  codice_fiscale: "",
  partita_iva: "",
  indirizzo: "",
  cap: "",
  comune: "",
  provincia: "",
  autorizzazioni: "",
  note: "",
};

export function ContattoFormDialog({ open, onOpenChange, tenantId, prefill, contatto, onSaved }: ContattoFormDialogProps) {
  const isEdit = Boolean(contatto?.id);
  const [form, setForm] = useState({
    ...EMPTY,
    telefono: prefill?.telefono || "",
    cellulare: prefill?.cellulare || "",
    email: prefill?.email || "",
  });
  const [categoria, setCategoria] = useState("CLIENTE");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (contatto) {
      setForm({
        nome: contatto.nome || "",
        cognome: contatto.cognome || "",
        ragione_sociale: contatto.ragione_sociale || "",
        telefono: contatto.telefono || "",
        cellulare: contatto.cellulare || "",
        email: contatto.email || "",
        pec: contatto.pec || "",
        codice_sdi: contatto.codice_sdi || contatto.codice_destinatario || "",
        codice_fiscale: contatto.codice_fiscale || "",
        partita_iva: contatto.partita_iva || "",
        indirizzo: contatto.indirizzo || "",
        cap: contatto.cap || "",
        comune: contatto.comune || "",
        provincia: contatto.provincia || "",
        autorizzazioni: contatto.autorizzazioni || "",
        note: contatto.note || "",
      });
      setCategoria((contatto.categoria || "CLIENTE").toUpperCase());
    } else {
      setForm({
        ...EMPTY,
        telefono: prefill?.telefono || "",
        cellulare: prefill?.cellulare || "",
        email: prefill?.email || "",
      });
      setCategoria("CLIENTE");
    }
  }, [open, contatto, prefill?.telefono, prefill?.cellulare, prefill?.email]);

  const handleSave = async () => {
    const denominazione = (form.ragione_sociale || `${form.nome} ${form.cognome}`).trim();
    if (!denominazione) {
      toast.error("Inserisci nome o ragione sociale");
      return;
    }
    setSaving(true);
    try {
      // Salva/aggiorna in un colpo solo: rubrica + anagrafica aziende (tendine formulari)
      const res = await upsertSoggetto({
        tenantId,
        ragioneSociale: denominazione,
        codiceFiscale: form.codice_fiscale,
        partitaIva: form.partita_iva,
        indirizzo: form.indirizzo,
        comune: form.comune,
        provincia: form.provincia,
        cap: form.cap,
        telefono: form.telefono,
        cellulare: form.cellulare,
        email: form.email,
        pec: form.pec,
        codiceSdi: form.codice_sdi,
        categoria,
        autorizzazioni: form.autorizzazioni,
        note: form.note,
        contattoId: contatto?.id,
      });
      // Campi specifici della rubrica non gestiti dalla funzione condivisa
      const { error } = await supabase
        .from("rubrica_contatti")
        .update({
          nome: form.nome.trim() || denominazione,
          cognome: form.cognome.trim() || null,
          ragione_sociale: form.ragione_sociale.trim() || null,
          note: form.note.trim() || null,
          autorizzazioni: form.autorizzazioni.trim() || null,
        })
        .eq("id", res.contatto_id);
      if (error) throw error;
      toast.success(isEdit ? "Contatto aggiornato (rubrica e tendine)" : "Contatto salvato in rubrica e anagrafica");
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      toast.error("Errore salvataggio: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const f = (key: keyof typeof EMPTY, label: string) => (
    <div className="space-y-1" key={key}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} className="h-8 text-sm" />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto bg-card border-border">
        <DialogHeader><DialogTitle>{isEdit ? "Modifica contatto" : "Nuovo Contatto"}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">
          Le modifiche vengono riportate automaticamente anche nell'anagrafica usata dalle tendine dei formulari.
        </p>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Tipo soggetto</Label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            {CATEGORIE_SOGGETTO.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {f("nome", "Nome *")}
          {f("cognome", "Cognome")}
          {f("ragione_sociale", "Ragione Sociale")}
          {f("telefono", "Telefono (SMS)")}
          {f("cellulare", "Cellulare (WhatsApp)")}
          {f("email", "Email")}
          {f("pec", "PEC")}
          {f("codice_sdi", "Codice SDI (fatturazione)")}
          {f("codice_fiscale", "Codice Fiscale")}
          {f("partita_iva", "Partita IVA")}
          {f("indirizzo", "Indirizzo")}
          {f("cap", "CAP")}
          {f("comune", "Comune")}
          {f("provincia", "Provincia")}
        </div>
        {f("autorizzazioni", "Autorizzazioni")}
        {f("note", "Note")}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvataggio..." : "Salva"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
