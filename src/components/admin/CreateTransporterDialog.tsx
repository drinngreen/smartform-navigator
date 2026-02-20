import { useState } from "react";
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
}

export function CreateTransporterDialog({ open, onOpenChange, onCreated, tenant }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    cognome: "",
    codiceFiscale: "",
    password: "",
    targaAutomezzo: "",
  });

  const isValid =
    form.nome.length >= 2 &&
    form.cognome.length >= 2 &&
    form.codiceFiscale.length === 16 &&
    form.password.length >= 6;

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
          tenant_id: tenant.tenantId,
          mn_context: tenant.mnContext,
          org_id: tenant.orgId,
          targa_automezzo: form.targaAutomezzo.trim() || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Trasportatore ${form.nome} ${form.cognome} creato per ${tenant.label}`);
      setForm({ nome: "", cognome: "", codiceFiscale: "", password: "", targaAutomezzo: "" });
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
            Crea Trasportatore — {tenant.label}
          </DialogTitle>
          <DialogDescription>
            Registra un nuovo autista/trasportatore per {tenant.label}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Nome *"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            />
            <Input
              placeholder="Cognome *"
              value={form.cognome}
              onChange={(e) => setForm((f) => ({ ...f, cognome: e.target.value }))}
            />
          </div>
          <Input
            placeholder="Codice Fiscale (16 caratteri) *"
            value={form.codiceFiscale}
            maxLength={16}
            onChange={(e) => setForm((f) => ({ ...f, codiceFiscale: e.target.value.toUpperCase() }))}
            className="font-mono"
          />
          <Input
            type="password"
            placeholder="Password (min 6 caratteri) *"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          <Input
            placeholder="Targa automezzo (opzionale)"
            value={form.targaAutomezzo}
            onChange={(e) => setForm((f) => ({ ...f, targaAutomezzo: e.target.value.toUpperCase() }))}
            className="font-mono"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleCreate} disabled={loading || !isValid}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
            Crea Trasportatore
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
