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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TENANT_OPTIONS = [
  {
    label: "Global Reco",
    tenantId: "167d07ad-9184-484e-85a6-da5ceafa42a3",
    mnContext: null,
    orgId: null,
  },
  {
    label: "Multyproget",
    tenantId: "dc2a6046-d9a8-4549-8e45-82367d695ac6",
    mnContext: "multyproget",
    orgId: "0d9cd11c-4ca8-4e5f-90ab-1529899124b5",
  },
  {
    label: "Niyol",
    tenantId: "dc2a6046-d9a8-4549-8e45-82367d695ac6",
    mnContext: "niyol",
    orgId: "b3eae77a-e973-425d-b7fb-283007583e72",
  },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateTransporterDialog({ open, onOpenChange, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    cognome: "",
    codiceFiscale: "",
    password: "",
    targaAutomezzo: "",
    tenant: "",
  });

  const selectedTenant = TENANT_OPTIONS.find((t) => t.label === form.tenant);

  const isValid =
    form.nome.length >= 2 &&
    form.cognome.length >= 2 &&
    form.codiceFiscale.length === 16 &&
    form.password.length >= 6 &&
    !!selectedTenant;

  const handleCreate = async () => {
    if (!isValid || !selectedTenant) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-manage", {
        body: {
          action: "create_user",
          nome: form.nome.trim(),
          cognome: form.cognome.trim(),
          codice_fiscale: form.codiceFiscale.toUpperCase().trim(),
          password: form.password,
          tenant_id: selectedTenant.tenantId,
          mn_context: selectedTenant.mnContext,
          org_id: selectedTenant.orgId,
          targa_automezzo: form.targaAutomezzo.trim() || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Trasportatore ${form.nome} ${form.cognome} creato con successo`);
      setForm({ nome: "", cognome: "", codiceFiscale: "", password: "", targaAutomezzo: "", tenant: "" });
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
            Crea Trasportatore
          </DialogTitle>
          <DialogDescription>
            Registra un nuovo autista/trasportatore assegnandogli le credenziali di accesso.
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
          <Select value={form.tenant} onValueChange={(v) => setForm((f) => ({ ...f, tenant: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Assegna a società *" />
            </SelectTrigger>
            <SelectContent>
              {TENANT_OPTIONS.map((t) => (
                <SelectItem key={t.label} value={t.label}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
