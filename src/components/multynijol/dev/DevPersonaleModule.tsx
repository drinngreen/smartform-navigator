import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Users, Shield, Eye, Pencil, Trash2, Search, RefreshCw, Loader2, UserPlus, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreateTransporterDialog } from "@/components/admin/CreateTransporterDialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

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
    avatar_url: string | null;
    tenant_id: string | null;
  } | null;
  role: string;
  online_status: string;
}

const MULTY_TENANT_ID = "77ec9a3d-a6d4-4235-8e68-1a6f345de57a";
const MULTY_ORG_ID = "0d9cd11c-4ca8-4e5f-90ab-1529899124b5";

const STAFF_LIST = [
  { nome: "NICOLAS", cognome: "JUSSI", cf: "JSSNLS89A25L219M", targa: "AY063NA" },
  { nome: "GIANLUCA", cognome: "PIRAMIDE", cf: "PRMGLC98A09C665H", targa: "BS602BK" },
  { nome: "SABATO", cognome: "HALILOVIC", cf: "HLLSBT88T09H501V", targa: "BY805YT" },
  { nome: "SABATO", cognome: "SALKANOVIC", cf: "SLKSBT79R02Z110Y", targa: "CA089VE" },
  { nome: "SEBASTIAN", cognome: "SALKANOVIC", cf: "SLKSST05R30F443N", targa: "CM996GA" },
  { nome: "VICTOR", cognome: "SALKANOVIC", cf: "SLKVTR00C25L359M", targa: "CN175FX" },
  { nome: "FAICAL", cognome: "ENNAAME", cf: "NNMFCL82R20Z330K", targa: "CR614BR" },
  { nome: "SATKO", cognome: "SALKANOVIC", cf: "SLKSTK81R07I472L", targa: "CX587NK" },
  { nome: "KEVIN", cognome: "AHMETOVIC", cf: "HMTKVN01P21L219R", targa: "DA274DW" },
  { nome: "ANDREA", cognome: "SALKANOVIC", cf: "SLKNDR01H05F443P", targa: "DE311MN" },
  { nome: "MUHAREM", cognome: "HALILOVIC", cf: "HLLMRM81A10L219V", targa: "DR328GP" },
  { nome: "SEJIK", cognome: "SALKANOVIC", cf: "SLKSJK93H16F443A", targa: "EV224WN" },
  { nome: "CIRO", cognome: "FERRARA", cf: "FRRCRI72E25L219H", targa: "EW615YL" },
  { nome: "ALESSANDRO", cognome: "VAILATTI", cf: "VLTLSN62D30F335X", targa: "DA313DD" },
  { nome: "BRUNO", cognome: "DELLAGAREN", cf: "DLLBRN76R20L219N", targa: "ER930NP" },
  { nome: "VITTORIO DAVID", cognome: "BORELLO", cf: "BRLVTR97T05L219K", targa: "ER930NP" },
];

export function DevPersonaleModule() {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [passwordDialog, setPasswordDialog] = useState<{ open: boolean; user: UserEntry | null }>({ open: false, user: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: UserEntry | null }>({ open: false, user: null });
  const [newPassword, setNewPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [importing, setImporting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-manage", {
        body: { action: "list_users" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const all: UserEntry[] = data.users || [];
      // Filter to Multyproget tenant users only
      const multyUsers = all.filter(
        (u) => u.profile?.tenant_id === MULTY_TENANT_ID || u.email?.endsWith("@zoli.internal") && u.profile?.tenant_id === MULTY_TENANT_ID
      );
      setUsers(multyUsers);
    } catch (e: any) {
      toast.error("Errore caricamento utenti: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleResetPassword = async () => {
    if (!passwordDialog.user || !newPassword) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-manage", {
        body: { action: "reset_password", user_id: passwordDialog.user.id, new_password: newPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Password aggiornata per " + (passwordDialog.user.profile?.nome || passwordDialog.user.email));
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
      toast.success("Utente eliminato");
      setDeleteDialog({ open: false, user: null });
      fetchUsers();
    } catch (e: any) {
      toast.error("Errore: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchImport = async () => {
    setImporting(true);
    let created = 0;
    let skipped = 0;
    for (const person of STAFF_LIST) {
      try {
        const { data, error } = await supabase.functions.invoke("admin-user-manage", {
          body: {
            action: "create_user",
            nome: person.nome,
            cognome: person.cognome,
            codice_fiscale: person.cf,
            password: "123stella",
            tenant_id: MULTY_TENANT_ID,
            mn_context: "multyproget",
            org_id: MULTY_ORG_ID,
            targa_automezzo: person.targa,
          },
        });
        if (error || data?.error) {
          const msg = data?.error || error?.message || "";
          if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("exists")) {
            skipped++;
          } else {
            toast.error(`Errore per ${person.nome} ${person.cognome}: ${msg}`);
          }
        } else {
          created++;
        }
      } catch (e: any) {
        toast.error(`Errore per ${person.nome} ${person.cognome}: ${e.message}`);
      }
    }
    toast.success(`Importazione completata: ${created} creati, ${skipped} già esistenti`);
    setImporting(false);
    fetchUsers();
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.profile?.nome?.toLowerCase().includes(q) ||
      u.profile?.cognome?.toLowerCase().includes(q) ||
      u.profile?.codice_fiscale?.toLowerCase().includes(q) ||
      u.profile?.targa_automezzo?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    drivers: users.filter((u) => u.role === "user").length,
    online: users.filter((u) => u.online_status === "online").length,
  };

  const statusColor: Record<string, string> = {
    online: "bg-green-500",
    offline: "bg-zinc-500",
    busy: "bg-red-500",
    away: "bg-yellow-500",
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Totale", value: stats.total, icon: Users, color: "text-primary" },
          { label: "Admin", value: stats.admins, icon: Shield, color: "text-pink-400" },
          { label: "Autisti", value: stats.drivers, icon: Users, color: "text-cyan-400" },
          { label: "Online", value: stats.online, icon: Eye, color: "text-green-400" },
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
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per nome, CF, targa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card/60 border-border/30"
          />
        </div>
        <Button onClick={handleBatchImport} disabled={importing} variant="outline" className="gap-2 border-amber-500/40 text-amber-400 hover:bg-amber-500/10">
          {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Importa Elenco
        </Button>
        <Button onClick={() => setCreateDialog(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Crea</span>
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
                  <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase">Ruolo</th>
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
                    <td className="p-3">
                      <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-xs">
                        {user.role}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("it-IT") : "Mai"}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-medium border border-cyan-400 hover:bg-cyan-500 transition-colors"
                          onClick={() => { setPasswordDialog({ open: true, user }); setNewPassword(""); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Password
                        </button>
                        <button
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium border border-red-400 hover:bg-red-500 transition-colors"
                          onClick={() => setDeleteDialog({ open: true, user })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Elimina
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      Nessun utente trovato. Clicca "Importa Elenco" per creare gli account.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Password Dialog */}
      <Dialog open={passwordDialog.open} onOpenChange={(o) => setPasswordDialog({ open: o, user: o ? passwordDialog.user : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambia Password</DialogTitle>
            <DialogDescription>
              Imposta una nuova password per{" "}
              <strong>{passwordDialog.user?.profile?.nome} {passwordDialog.user?.profile?.cognome}</strong>
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
            <AlertDialogTitle>Eliminare Utente?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare definitivamente l'account di{" "}
              <strong>{deleteDialog.user?.profile?.nome} {deleteDialog.user?.profile?.cognome}</strong>. Questa azione è irreversibile.
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

      {/* Create Dialog */}
      <CreateTransporterDialog
        open={createDialog}
        onOpenChange={setCreateDialog}
        onCreated={fetchUsers}
        tenant={{ label: "Multyproget", tenantId: MULTY_TENANT_ID, mnContext: "multyproget", orgId: MULTY_ORG_ID }}
      />
    </div>
  );
}
