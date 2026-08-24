import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export interface TenantConfig {
  label: string;
  tenantId: string;
  mnContext: string | null;
  orgId: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  tenant: TenantConfig;
  tenantOptions?: TenantConfig[];
}

export function CreateTransporterDialog({ open, onOpenChange, onCreated, tenant, tenantOptions }: Props) {
  const [loading, setLoading] = useState(false);
  const availableTenants = tenantOptions?.length ? tenantOptions : [tenant];
  const [selectedContext, setSelectedContext] = useState(tenant.mnContext || "");
  const activeTenant = availableTenants.find((option) => option.mnContext === selectedContext) || tenant;
  const [form, setForm] = useState({
    nome: "",
    cognome: "",
    codiceFiscale: "",
    password: "",
    targaAutomezzo: "",
    targaRimorchio: "",
  });

  const CF_REGEX = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/;
  const cfValid = CF_REGEX.test(form.codiceFiscale.toUpperCase().trim());

  const isValid =
    form.nome.length >= 2 &&
    form.cognome.length >= 2 &&
    cfValid &&
    form.password.length >= 6;

  useEffect(() => {
    if (open) setSelectedContext(tenant.mnContext || "");
  }, [open, tenant.mnContext]);

  const handleCreate = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-manage", {
        body: {
          action: "create_user",
          nome: form.nome.trim(),
          cognome: form.cognome.trim(),
          codice_fiscale: form.codiceFiscale.toUpperCase().trim(),
          password: form.password,
          tenant_id: activeTenant.tenantId,
          mn_context: activeTenant.mnContext,
          org_id: activeTenant.orgId,
          targa_automezzo: form.targaAutomezzo.trim() || null,
          targa_rimorchio: form.targaRimorchio.trim() || null,
        },
      });
      if (error) {
        let detail = error.message;
        try {
          const ctx: any = (error as any).context;
          const body = ctx && typeof ctx.json === "function" ? await ctx.json() : null;
          if (body?.message || body?.error) detail = body.message || body.error;
        } catch { /* ignore */ }
        throw new Error(detail);
      }
      if (data?.error) throw new Error(data.message || data.error);
      toast.success(`Trasportatore ${form.nome} ${form.cognome} creato per ${activeTenant.label}`);
      setForm({ nome: "", cognome: "", codiceFiscale: "", password: "", targaAutomezzo: "", targaRimorchio: "" });
      onOpenChange(false);
      onCreated();
    } catch (e: any) {
      toast.error("Errore: " + (e.message || "Creazione fallita"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Crea Login App — {availableTenants.length > 1 ? "Multyproget / Niyol" : activeTenant.label}
          </DialogTitle>
          <DialogDescription>
            Registra un nuovo ragazzo/autista e scegli l'app a cui abilitarlo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {availableTenants.length > 1 && (
            <div>
              <label className="mb-1 block text-xs font-mono uppercase text-muted-foreground">App / società</label>
              <select
                value={selectedContext}
                onChange={(e) => setSelectedContext(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                {availableTenants.map((option) => (
                  <option key={option.mnContext || option.label} value={option.mnContext || ""}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Nome *"
              value={form.nome}
              name="nuovo-nome"
              autoComplete="off"
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            />
            <Input
              placeholder="Cognome *"
              value={form.cognome}
              name="nuovo-cognome"
              autoComplete="off"
              onChange={(e) => setForm((f) => ({ ...f, cognome: e.target.value }))}
            />
          </div>
          <Input
            placeholder="Codice Fiscale (16 caratteri) *"
            value={form.codiceFiscale}
            maxLength={16}
            name="nuovo-cf"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => setForm((f) => ({ ...f, codiceFiscale: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))}
            className="font-mono"
          />
          {form.codiceFiscale.length > 0 && !cfValid && (
            <p className="text-xs text-destructive font-mono">
              Codice fiscale non valido: 16 caratteri nel formato RSSMRA80A01H501U (niente email o spazi).
            </p>
          )}
          <Input
            type="password"
            placeholder="Password (min 6 caratteri) *"
            value={form.password}
            name="nuova-password-app"
            autoComplete="new-password"
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          <Input
            placeholder="Targa automezzo (opzionale)"
            value={form.targaAutomezzo}
            name="nuova-targa"
            autoComplete="off"
            onChange={(e) => setForm((f) => ({ ...f, targaAutomezzo: e.target.value.toUpperCase() }))}
            className="font-mono"
          />
          <Input
            placeholder="Targa rimorchio (opzionale)"
            value={form.targaRimorchio}
            name="nuovo-rimorchio"
            autoComplete="off"
            onChange={(e) => setForm((f) => ({ ...f, targaRimorchio: e.target.value.toUpperCase() }))}
            className="font-mono"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleCreate} disabled={loading || !isValid}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
            Crea Login App
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
