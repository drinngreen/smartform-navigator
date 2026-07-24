import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FilePlus2, Layers } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  contextLabel: string;
  onCreated?: () => void;
}

type DriverOption = { id: string; label: string };

const CATEGORIE = [
  { value: "conto_proprio", label: "Conto Proprio" },
  { value: "miol", label: "MIOL" },
  { value: "multy", label: "MULTY" },
];

export function MassiveFirGeneratorDialog({ open, onClose, tenantId, contextLabel, onCreated }: Props) {
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [driverId, setDriverId] = useState<string>("");
  const [categoria, setCategoria] = useState<string>("multy");
  const [numeriRaw, setNumeriRaw] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoadingDrivers(true);
      try {
        const { data, error } = await supabase.functions.invoke("admin-user-manage", { body: { action: "list_users" } });
        if (error) throw error;
        const list: DriverOption[] = (data?.users || [])
          .filter((u: any) => !u.profile?.tenant_id || u.profile?.tenant_id === tenantId)
          .map((u: any) => ({
            id: u.id,
            label: u.profile ? `${u.profile.nome ?? ""} ${u.profile.cognome ?? ""} (${u.profile.codice_fiscale ?? u.email})`.trim() : u.email,
          }));
        setDrivers(list);
      } catch (e: any) {
        toast.error("Errore caricamento utenti: " + e.message);
      } finally {
        setLoadingDrivers(false);
      }
    })();
  }, [open, tenantId]);

  const numeri = useMemo(
    () =>
      numeriRaw
        .split(/[\n,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [numeriRaw]
  );

  const handleGenerate = async () => {
    if (!driverId) return toast.error("Seleziona un'anagrafica destinataria");
    if (numeri.length === 0) return toast.error("Inserisci almeno un numero FIR");
    setBusy(true);
    let ok = 0;
    let ko = 0;
    for (const n of numeri) {
      try {
        const { data, error } = await supabase.rpc("create_manual_fir_draft_for_tenant", {
          p_user_id: driverId,
          p_tenant_id: tenantId,
          p_numero_fir: n,
        });
        if (error) throw error;
        const formId = data as string;
        if (formId) {
          await supabase.functions.invoke("admin-user-manage", {
            body: {
              action: "update_fir_form",
              form_id: formId,
              updates: {
                form_data: { numero_fir: n, numero_formulario: n, categoria_vidimazione: categoria },
              },
            },
          });
        }
        ok++;
      } catch (e: any) {
        console.warn("[MassiveFIR] failed for", n, e?.message);
        ko++;
      }
    }
    setBusy(false);
    toast.success(`Generati ${ok} FIR (${ko} errori)`);
    if (ok > 0) {
      onCreated?.();
      onClose();
      setNumeriRaw("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display tracking-wider">
            <Layers className="h-5 w-5 text-primary" /> Generazione Massiva FIR — {contextLabel}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase font-mono">Anagrafica / Autista</Label>
            <Select value={driverId} onValueChange={setDriverId} disabled={loadingDrivers}>
              <SelectTrigger className="bg-background/60 border-border/40 mt-1">
                <SelectValue placeholder={loadingDrivers ? "Caricamento…" : "Seleziona anagrafica"} />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase font-mono">Categoria di vidimazione</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="bg-background/60 border-border/40 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIE.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase font-mono">
              Numeri FIR (uno per riga, virgola o spazio) — {numeri.length} rilevati
            </Label>
            <textarea
              value={numeriRaw}
              onChange={(e) => setNumeriRaw(e.target.value)}
              placeholder="es.\nABCDE 000123 AB\nABCDE 000124 AB\n..."
              rows={7}
              className="mt-1 w-full bg-sky-400/10 border border-sky-400/40 rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-sky-300"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Incolla i numeri pescati dal pool RENTRI o generati manualmente. Ogni numero diventa una bozza intestata all'anagrafica scelta.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
            <Button variant="ghost" onClick={onClose} disabled={busy}>Annulla</Button>
            <Button onClick={handleGenerate} disabled={busy || numeri.length === 0 || !driverId} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
              Genera {numeri.length || ""} FIR
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
