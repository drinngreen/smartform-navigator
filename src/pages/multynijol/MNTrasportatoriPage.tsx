import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Users, Search, RefreshCw, Loader2, UserPlus, Trash2, Pencil, FilePlus } from "lucide-react";
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
  } | null;
  role: string;
  online_status: string;
}

interface MNTrasportatoriPageProps {
  embedded?: boolean;
  context?: string;
}

export default function MNTrasportatoriPage({ embedded, context: contextProp }: MNTrasportatoriPageProps = {}) {
  const params = useParams<{ context: string }>();
  const contextKey = contextProp || params.context || "multyproget";
  const tenant = CONTEXT_MAP[contextKey] || CONTEXT_MAP.multyproget;

  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createDialog, setCreateDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: UserEntry | null }>({ open: false, user: null });
  const [passwordDialog, setPasswordDialog] = useState<{ open: boolean; user: UserEntry | null }>({ open: false, user: null });
  const [newPassword, setNewPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-manage", {
        body: { action: "list_users" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      // Filter to only show transporters for this mn_context
      const filtered = (data.users || []).filter(
        (u: UserEntry) => u.role === "user" && u.profile?.mn_context === tenant.mnContext
      );
      setUsers(filtered);
    } catch (e: any) {
      toast.error("Errore caricamento: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [contextKey]);

  const handleCreateFir = async (user: UserEntry) => {
    setActionLoading(true);
    try {
      const { data: draftId, error } = await supabase.rpc("create_extra_fir_draft" as any, {
        p_user_id: user.id,
      });
      if (error) throw error;
      if (!draftId) throw new Error("Nessun numero FIR disponibile nel serbatoio");
      
      const { data: draft } = await supabase
        .from("fir_forms")
        .select("numero_fir")
        .eq("id", draftId)
        .maybeSingle();
      
      toast.success(`✅ Bozza FIR ${draft?.numero_fir || ""} creata per ${user.profile?.nome} ${user.profile?.cognome}`);
    } catch (e: any) {
      toast.error("Errore creazione FIR: " + e.message);
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
      {!embedded && <div className="mb-4"><h2 className="text-lg font-semibold">Trasportatori {tenant.label}</h2></div>}
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
          <span className="hidden sm:inline">Crea Trasportatore</span>
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
                          onClick={() => handleCreateFir(user)}
                          disabled={actionLoading}
                        >
                          <FilePlus className="h-3.5 w-3.5" />
                          Crea FIR
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          onClick={() => { setPasswordDialog({ open: true, user }); setNewPassword(""); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Password
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
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Nessun trasportatore trovato per {tenant.label}
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
      />

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
