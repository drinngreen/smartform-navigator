import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface AnagraficaModificata {
  id: string;
  ragione_sociale: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  codice_fiscale: string;
  partita_iva: string;
}

const CAMPI: { key: string; label: string; wide?: boolean }[] = [
  { key: "ragione_sociale", label: "Ragione sociale", wide: true },
  { key: "indirizzo", label: "Indirizzo (via e civico)", wide: true },
  { key: "cap", label: "CAP" },
  { key: "citta", label: "Comune" },
  { key: "provincia", label: "Provincia" },
  { key: "nazione", label: "Nazione" },
  { key: "codice_fiscale", label: "Codice fiscale" },
  { key: "partita_iva", label: "Partita IVA" },
  { key: "telefono", label: "Telefono" },
  { key: "email", label: "Email" },
  { key: "pec", label: "PEC" },
  { key: "codice_destinatario", label: "Codice SDI" },
  { key: "note", label: "Note", wide: true },
];

/** Modifica della scheda azienda in anagrafica, apribile direttamente dal formulario. */
export function ModificaAnagraficaDialog({ aziendaId, open, onOpenChange, onSaved }: {
  aziendaId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: (a: AnagraficaModificata) => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !aziendaId) return;
    setLoading(true);
    void (async () => {
      const { data, error } = await supabase.from("anagrafica_aziende_mp" as any).select("*").eq("id", aziendaId).maybeSingle();
      setLoading(false);
      if (error || !data) { toast.error("Scheda anagrafica non trovata"); onOpenChange(false); return; }
      const r = data as unknown as Record<string, unknown>;
      setForm(Object.fromEntries(CAMPI.map((c) => [c.key, r[c.key] == null ? "" : String(r[c.key])])));
    })();
  }, [open, aziendaId]);

  const salva = async () => {
    if (!aziendaId) return;
    if (!form.ragione_sociale?.trim()) { toast.error("Ragione sociale obbligatoria"); return; }
    setSaving(true);
    const payload = Object.fromEntries(CAMPI.map((c) => [c.key, (form[c.key] ?? "").trim() || null]));
    const { error } = await supabase.from("anagrafica_aziende_mp" as any).update(payload as any).eq("id", aziendaId);
    setSaving(false);
    if (error) { toast.error("Anagrafica non aggiornata: " + error.message); return; }
    toast.success("Anagrafica aggiornata");
    onSaved?.({
      id: aziendaId,
      ragione_sociale: form.ragione_sociale?.trim() ?? "",
      indirizzo: form.indirizzo?.trim() ?? "",
      cap: form.cap?.trim() ?? "",
      citta: form.citta?.trim() ?? "",
      provincia: form.provincia?.trim() ?? "",
      codice_fiscale: form.codice_fiscale?.trim() ?? "",
      partita_iva: form.partita_iva?.trim() ?? "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Modifica anagrafica</DialogTitle></DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {CAMPI.map((c) => (
              <div key={c.key} className={c.wide ? "col-span-2" : ""}>
                <Label className="text-xs">{c.label}</Label>
                <Input value={form[c.key] ?? ""} onChange={(e) => setForm((p) => ({ ...p, [c.key]: e.target.value }))} />
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annulla</Button>
          <Button onClick={() => void salva()} disabled={saving || loading}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Salva e aggiorna il formulario</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
