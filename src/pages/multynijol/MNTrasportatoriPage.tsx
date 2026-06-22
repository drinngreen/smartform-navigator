import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Users, Search, RefreshCw, Loader2, UserPlus, Trash2, Pencil, FilePlus, UserCog, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateTransporterDialog, type TenantConfig } from "@/components/admin/CreateTransporterDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const CONTEXT_MAP: Record<string, TenantConfig> = {
  multyproget: {
    label: "Multyproget",
    tenantId: "77ec9a3d-602e-438f-97bf-1c69abd8f691",
    mnContext: "multyproget",
    orgId: "0d9cd11c-4ca8-4e5f-90ab-1529899124b5",
  },
  "dev-multyproget": {
    label: "Multyproget",
    tenantId: "77ec9a3d-602e-438f-97bf-1c69abd8f691",
    mnContext: "multyproget",
    orgId: "0d9cd11c-4ca8-4e5f-90ab-1529899124b5",
  },
  niyol: {
    label: "Niyol",
    tenantId: "819c783e-78dd-4080-8265-802e75b0d813",
    mnContext: "niyol",
    orgId: "b3eae77a-e973-425d-b7fb-283007583e72",
  },
};

const APP_TENANT_OPTIONS: TenantConfig[] = [CONTEXT_MAP.multyproget, CONTEXT_MAP.niyol];

interface UserEntry {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  profile: {
    nome: string;
    cognome: string;
    codice_fiscale: string;
    targa_automezzo: string | null;
    mn_context: string | null;
    deactivated_at?: string | null;
  } | null;
  role: string;
  online_status: string;
}

interface AccessForm {
  nome: string;
  cognome: string;
  codiceFiscale: string;
  password: string;
  targaAutomezzo: string;
  mnContext: string;
}

interface MNTrasportatoriPageProps {
  embedded?: boolean;
  context?: string;
}

function normalizeFirNumber(value: string) {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, " ");
  if (/^[A-Z]{5} [0-9]{6} [A-Z]{2}$/.test(normalized)) return normalized;
  const compact = normalized.replace(/[^A-Z0-9]/g, "");
  const match = compact.match(/([A-Z]{5})([0-9]{6})([A-Z]{2})/);
  return match ? `${match[1]} ${match[2]} ${match[3]}` : normalized;
}

export default function MNTrasportatoriPage({ embedded, context: contextProp }: MNTrasportatoriPageProps = {}) {
  const params = useParams<{ context: string }>();
  const navigate = useNavigate();
  const contextKey = contextProp || params.context || "multyproget";
  const tenant = CONTEXT_MAP[contextKey] || CONTEXT_MAP.multyproget;

  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createDialog, setCreateDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: UserEntry | null }>({ open: false, user: null });
  const [passwordDialog, setPasswordDialog] = useState<{ open: boolean; user: UserEntry | null }>({ open: false, user: null });
  const [accessDialog, setAccessDialog] = useState<{ open: boolean; user: UserEntry | null }>({ open: false, user: null });
  const [manualFirDialog, setManualFirDialog] = useState<{ open: boolean; user: UserEntry | null }>({ open: false, user: null });
  const [manualFirNumber, setManualFirNumber] = useState("");
  const [manualFirContext, setManualFirContext] = useState(tenant.mnContext || "multyproget");
  const [accessForm, setAccessForm] = useState<AccessForm>({
    nome: "",
    cognome: "",
    codiceFiscale: "",
    password: "",
    targaAutomezzo: "",
    mnContext: tenant.mnContext || "multyproget",
  });
  const [newPassword, setNewPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const isDevHub = contextKey === "dev-multyproget";
  const assignTenant = APP_TENANT_OPTIONS.find((option) => option.mnContext === manualFirContext) || tenant;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-manage", {
        body: { action: "list_users" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      // Mostra solo trasportatori attivi del contesto corrente (esclude soft-deleted)
      const filtered = (data.users || []).filter(
        (u: UserEntry) =>
          u.role === "user" &&
          (isDevHub ? ["multyproget", "niyol"].includes(u.profile?.mn_context || "") : u.profile?.mn_context === tenant.mnContext) &&
          !(u.profile as any)?.deactivated_at,
      );
      setUsers(filtered);
    } catch (e: any) {
      toast.error("Errore caricamento: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [contextKey]);

  const handleCreateFir = async () => {
    if (!manualFirDialog.user) return;
    const normalized = normalizeFirNumber(manualFirNumber);
    if (!normalized) {
      toast.error("Inserisci il numero FIR");
      return;
    }
    setActionLoading(true);
    try {
      const { data: draftId, error } = await supabase.rpc("create_manual_fir_draft_for_tenant" as any, {
        p_user_id: manualFirDialog.user.id,
        p_tenant_id: assignTenant.tenantId,
        p_numero_fir: normalized,
      });
      if (error) throw error;
      if (!draftId) throw new Error("Formulario non creato");
      toast.success(`Formulario ${normalized} assegnato su app ${assignTenant.label} a ${manualFirDialog.user.profile?.nome || "trasportatore"}`);
      setManualFirDialog({ open: false, user: null });
      setManualFirNumber("");
      if (!embedded) {
        const targetContext = assignTenant.mnContext || contextKey;
        navigate(`/mn/admin/${targetContext}/formulari?fir=${draftId}`);
      }
    } catch (e: any) {
      toast.error("Errore creazione FIR: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openAccessDialog = (user: UserEntry) => {
    setAccessForm({
      nome: user.profile?.nome || "",
      cognome: user.profile?.cognome || "",
      codiceFiscale: user.profile?.codice_fiscale || "",
      password: "",
      targaAutomezzo: user.profile?.targa_automezzo || "",
      mnContext: user.profile?.mn_context || tenant.mnContext || "multyproget",
    });
    setAccessDialog({ open: true, user });
  };

  const handleUpdateAccess = async () => {
    if (!accessDialog.user) return;
    const targetTenant = APP_TENANT_OPTIONS.find((option) => option.mnContext === accessForm.mnContext) || tenant;
    if (accessForm.nome.trim().length < 2 || accessForm.cognome.trim().length < 2 || accessForm.codiceFiscale.trim().length !== 16) {
      toast.error("Nome, cognome e codice fiscale sono obbligatori");
      return;
    }
    if (accessForm.password && accessForm.password.length < 6) {
      toast.error("La nuova password deve avere almeno 6 caratteri");
      return;
    }
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-manage", {
        body: {
          action: "update_user_access",
          user_id: accessDialog.user.id,
          nome: accessForm.nome.trim(),
          cognome: accessForm.cognome.trim(),
          codice_fiscale: accessForm.codiceFiscale.toUpperCase().trim(),
          password: accessForm.password || undefined,
          tenant_id: targetTenant.tenantId,
          mn_context: targetTenant.mnContext,
          org_id: targetTenant.orgId,
          targa_automezzo: accessForm.targaAutomezzo.trim().toUpperCase() || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Accessi aggiornati per app ${targetTenant.label}`);
      setAccessDialog({ open: false, user: null });
      fetchUsers();
    } catch (e: any) {
      toast.error("Errore modifica accessi: " + (e.message || "operazione fallita"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordDialog.user || !newPassword) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-manage", {
        body: { action: "reset_password", user_id: passwordDialog.user.id, new_password: newPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Password aggiornata");
      setPasswordDialog({ open: false, user: null });
      setNewPassword("");
    } catch (e: any) {
      toast.error("Errore: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteDialog.user) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-manage", {
        body: { action: "delete_user", user_id: deleteDialog.user.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Trasportatore eliminato");
      setDeleteDialog({ open: false, user: null });
      fetchUsers();
    } catch (e: any) {
      toast.error("Errore: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.profile?.nome?.toLowerCase().includes(q) ||
      u.profile?.cognome?.toLowerCase().includes(q) ||
      u.profile?.codice_fiscale?.toLowerCase().includes(q) ||
      u.profile?.targa_automezzo?.toLowerCase().includes(q)
    );
  });

  const statusColor: Record<string, string> = {
    online: "bg-green-500",
    offline: "bg-zinc-500",
    busy: "bg-red-500",
    away: "bg-yellow-500",
  };

  const content = (
    <>
      {!embedded && <div className="mb-4"><h2 className="text-lg font-semibold">Ragazzi App {isDevHub ? "Multyproget / Niyol" : tenant.label}</h2></div>}
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Totale", value: users.length, icon: Users, color: "text-primary" },
          { label: "Online", value: users.filter((u) => u.online_status === "online").length, icon: Users, color: "text-green-400" },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-xs text-muted-foreground font-mono uppercase">{s.label}</span>
            </div>
            <span className="text-2xl font-display text-foreground">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per nome, CF, targa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card/60 border-border/30"
          />
        </div>
        <Button onClick={() => setCreateDialog(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Crea Login App</span>
        </Button>
        <Button variant="outline" size="icon" onClick={fetchUsers} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-2xl border border-border/30 bg-card/60 backdrop-blur-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase">Stato</th>
                  <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase">Nome</th>
                  <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase">App</th>
                  <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase">CF</th>
                  <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase">Targa</th>
                  <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase">Ultimo Login</th>
                  <th className="text-right p-3 font-mono text-xs text-muted-foreground uppercase">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                    <td className="p-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${statusColor[user.online_status] || "bg-zinc-500"}`} />
                    </td>
                    <td className="p-3 font-medium text-foreground">
                      {user.profile ? `${user.profile.nome} ${user.profile.cognome}` : "—"}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className={user.profile?.mn_context === "niyol" ? "border-cyan-500/40 text-cyan-400" : "border-emerald-500/40 text-emerald-400"}>
                        {user.profile?.mn_context === "niyol" ? "Niyol" : "Multyproget"}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground font-mono text-xs">{user.profile?.codice_fiscale || "—"}</td>
                    <td className="p-3 text-muted-foreground font-mono text-xs">{user.profile?.targa_automezzo || "—"}</td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("it-IT") : "Mai"}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                          onClick={() => {
                            setManualFirDialog({ open: true, user });
                            setManualFirNumber("");
                            setManualFirContext(user.profile?.mn_context || tenant.mnContext || "multyproget");
                          }}
                        >
                          <FilePlus className="h-3.5 w-3.5" />
                          Assegna FIR all'app
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          onClick={() => openAccessDialog(user)}
                        >
                          <UserCog className="h-3.5 w-3.5" />
                          Modifica accessi
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1.5 text-xs"
                          onClick={() => setDeleteDialog({ open: true, user })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Elimina
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      Nessun ragazzo app trovato per {isDevHub ? "Multyproget / Niyol" : tenant.label}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <CreateTransporterDialog
        open={createDialog}
        onOpenChange={setCreateDialog}
        onCreated={fetchUsers}
        tenant={tenant}
        tenantOptions={isDevHub ? APP_TENANT_OPTIONS : undefined}
      />

      <Dialog open={manualFirDialog.open} onOpenChange={(o) => setManualFirDialog({ open: o, user: o ? manualFirDialog.user : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assegna FIR all'app autista</DialogTitle>
            <DialogDescription>
              Scegli Multyproget o Niyol: il FIR comparirà solo nell'app scelta per <strong>{manualFirDialog.user?.profile?.nome} {manualFirDialog.user?.profile?.cognome}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="mb-1 block text-xs font-mono uppercase text-muted-foreground">App di destinazione</label>
            <select
              value={manualFirContext}
              onChange={(e) => setManualFirContext(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              {APP_TENANT_OPTIONS.map((option) => (
                <option key={option.mnContext || option.label} value={option.mnContext || ""}>{option.label}</option>
              ))}
            </select>
          </div>
          <Input
            value={manualFirNumber}
            onChange={(e) => setManualFirNumber(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreateFir();
            }}
            placeholder="ZRZXR 000566 LG"
            className="font-mono mt-3"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualFirDialog({ open: false, user: null })}>Annulla</Button>
            <Button onClick={handleCreateFir} disabled={actionLoading || !manualFirNumber.trim()} className="gap-2">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus className="h-4 w-4" />}
              Assegna questo FIR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={accessDialog.open} onOpenChange={(o) => setAccessDialog({ open: o, user: o ? accessDialog.user : null })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              Modifica accessi app
            </DialogTitle>
            <DialogDescription>
              Cambia dati login, password, targa e app abilitata per <strong>{accessDialog.user?.profile?.nome} {accessDialog.user?.profile?.cognome}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-mono uppercase text-muted-foreground">App abilitata</label>
              <select
                value={accessForm.mnContext}
                onChange={(e) => setAccessForm((f) => ({ ...f, mnContext: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                {APP_TENANT_OPTIONS.map((option) => (
                  <option key={option.mnContext || option.label} value={option.mnContext || ""}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Nome" value={accessForm.nome} onChange={(e) => setAccessForm((f) => ({ ...f, nome: e.target.value }))} />
              <Input placeholder="Cognome" value={accessForm.cognome} onChange={(e) => setAccessForm((f) => ({ ...f, cognome: e.target.value }))} />
            </div>
            <Input
              placeholder="Codice Fiscale"
              value={accessForm.codiceFiscale}
              maxLength={16}
              onChange={(e) => setAccessForm((f) => ({ ...f, codiceFiscale: e.target.value.toUpperCase() }))}
              className="font-mono"
            />
            <Input
              placeholder="Nuova password (lascia vuoto per non cambiarla)"
              type="password"
              value={accessForm.password}
              onChange={(e) => setAccessForm((f) => ({ ...f, password: e.target.value }))}
            />
            <Input
              placeholder="Targa automezzo"
              value={accessForm.targaAutomezzo}
              onChange={(e) => setAccessForm((f) => ({ ...f, targaAutomezzo: e.target.value.toUpperCase() }))}
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccessDialog({ open: false, user: null })}>Annulla</Button>
            <Button onClick={handleUpdateAccess} disabled={actionLoading} className="gap-2">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              Salva accessi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={passwordDialog.open} onOpenChange={(o) => setPasswordDialog({ open: o, user: o ? passwordDialog.user : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambia Password</DialogTitle>
            <DialogDescription>
              Nuova password per <strong>{passwordDialog.user?.profile?.nome} {passwordDialog.user?.profile?.cognome}</strong>
            </DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            placeholder="Nuova password (min 6 caratteri)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialog({ open: false, user: null })}>Annulla</Button>
            <Button onClick={handleResetPassword} disabled={actionLoading || newPassword.length < 6}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Conferma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(o) => setDeleteDialog({ open: o, user: o ? deleteDialog.user : null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare Trasportatore?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare <strong>{deleteDialog.user?.profile?.nome} {deleteDialog.user?.profile?.cognome}</strong>. Azione irreversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  if (embedded) return content;

  return (
    <MNAdminLayout title={`Trasportatori ${tenant.label}`} subtitle={`Gestione trasportatori ${tenant.label}`}>
      {content}
    </MNAdminLayout>
  );
}
