import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CATEGORIE_SOGGETTO, upsertSoggetto, type SoggettoResult } from "@/lib/anagraficaSync";

export interface NuovoSoggettoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  /** Categoria proposta in base alla sezione del formulario */
  categoriaIniziale?: string;
  /** Denominazione già digitata nel campo di ricerca */
  denominazioneIniziale?: string;
  /** Ritorna il soggetto creato: la sezione del formulario si autocompila */
  onCreated?: (
    soggetto: SoggettoResult & {
      ragioneSociale: string;
      indirizzoCompleto: string;
      codiceFiscale: string;
      partitaIva: string;
      autorizzazioni: string;
    },
  ) => void;
}

const EMPTY = {
  ragioneSociale: "",
  codiceFiscale: "",
  partitaIva: "",
  indirizzo: "",
  cap: "",
  comune: "",
  provincia: "",
  telefono: "",
  cellulare: "",
  email: "",
  pec: "",
  autorizzazioni: "",
  note: "",
};

/**
 * Inserimento di un nuovo soggetto direttamente dal formulario.
 * Il soggetto finisce automaticamente in anagrafica aziende (tendine) e in rubrica contatti.
 */
export function NuovoSoggettoDialog({
  open,
  onOpenChange,
  tenantId,
  categoriaIniziale = "CLIENTE",
  denominazioneIniziale = "",
  onCreated,
}: NuovoSoggettoDialogProps) {
  const [form, setForm] = useState({ ...EMPTY, ragioneSociale: denominazioneIniziale });
  const [categoria, setCategoria] = useState(categoriaIniziale.toUpperCase());
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof EMPTY, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.ragioneSociale.trim()) {
      toast.error("La denominazione è obbligatoria");
      return;
    }
    setSaving(true);
    try {
      const res = await upsertSoggetto({
        tenantId,
        ragioneSociale: form.ragioneSociale.trim(),
        codiceFiscale: form.codiceFiscale.trim(),
        partitaIva: form.partitaIva.trim(),
        indirizzo: form.indirizzo.trim(),
        comune: form.comune.trim(),
        provincia: form.provincia.trim(),
        cap: form.cap.trim(),
        telefono: form.telefono.trim(),
        cellulare: form.cellulare.trim(),
        email: form.email.trim(),
        pec: form.pec.trim(),
        categoria,
        autorizzazioni: form.autorizzazioni.trim(),
        note: form.note.trim(),
      });
      const indirizzoCompleto = [
        form.indirizzo.trim(),
        [form.cap.trim(), form.comune.trim(), form.provincia.trim() ? `(${form.provincia.trim()})` : ""]
          .filter(Boolean)
          .join(" "),
      ]
        .filter(Boolean)
        .join(" - ");
      toast.success("Soggetto salvato in anagrafica e in rubrica");
      onCreated?.({
        ...res,
        ragioneSociale: form.ragioneSociale.trim(),
        indirizzoCompleto,
        codiceFiscale: form.codiceFiscale.trim(),
        partitaIva: form.partitaIva.trim(),
        autorizzazioni: form.autorizzazioni.trim(),
      });
      onOpenChange(false);
      setForm({ ...EMPTY });
    } catch (e: any) {
      toast.error("Errore salvataggio: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const f = (key: keyof typeof EMPTY, label: string) => (
    <div className="space-y-1" key={key}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={form[key]} onChange={(e) => set(key, e.target.value)} className="h-8 text-sm" />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle>Nuovo soggetto in anagrafica</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Il soggetto viene salvato in anagrafica (tendine dei formulari) e in rubrica contatti, e compila subito questa
          sezione del formulario.
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
          {f("ragioneSociale", "Denominazione *")}
          {f("codiceFiscale", "Codice Fiscale")}
          {f("partitaIva", "Partita IVA")}
          {f("indirizzo", "Indirizzo")}
          {f("cap", "CAP")}
          {f("comune", "Comune")}
          {f("provincia", "Provincia")}
          {f("telefono", "Telefono")}
          {f("cellulare", "Cellulare")}
          {f("email", "Email")}
          {f("pec", "PEC")}
        </div>
        {f("autorizzazioni", "Autorizzazioni")}
        {f("note", "Note")}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvataggio..." : "Salva e compila"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
