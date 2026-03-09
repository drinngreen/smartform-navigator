import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Factory, Search, Shield, ShieldOff, Key, Eye, RefreshCw,
} from "lucide-react";

interface ImpiantoAccount {
  id: string;
  ragione_sociale: string;
  email: string;
  tenant_id: string | null;
  attivo: boolean;
  ultimo_accesso: string | null;
  created_at: string;
}

const TENANT_LABELS: Record<string, string> = {
  "167d07ad-9184-484e-85a6-da5ceafa42a3": "Global Reco",
  "77ec9a3d-a6d4-4235-8e68-1a6f345de57a": "Multyproget",
  "819c783e-4ecf-4774-85b7-7e7a1c5848fa": "Niyol",
};

interface Props {
  tenantFilter?: string; // tenant_id to filter, or undefined for all
}

export function AdminAreeRiservateImpianti({ tenantFilter }: Props) {
  const [accounts, setAccounts] = useState<ImpiantoAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pwDialog, setPwDialog] = useState<ImpiantoAccount | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [inboxDialog, setInboxDialog] = useState<ImpiantoAccount | null>(null);
  const [inbox, setInbox] = useState<any[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const { data, error } = await supabase.functions.invoke("impianto-auth", {
        body: { action: "admin_list" },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);

      let filtered = data.accounts || [];
      if (tenantFilter) {
        filtered = filtered.filter((a: ImpiantoAccount) => a.tenant_id === tenantFilter);
      }
      setAccounts(filtered);
    } catch (err: any) {
      toast.error("Errore caricamento: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAccounts(); }, [tenantFilter]);

  const toggleActive = async (account: ImpiantoAccount) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const { data, error } = await supabase.functions.invoke("impianto-auth", {
        body: { action: "admin_toggle_active", impianto_account_id: account.id },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);

      toast.success(data.attivo ? "Accesso riattivato" : "Accesso disabilitato");
      loadAccounts();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const changePassword = async () => {
    if (!pwDialog || !newPassword) return;
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const { data, error } = await supabase.functions.invoke("impianto-auth", {
        body: { action: "admin_change_password", impianto_account_id: pwDialog.id, new_password: newPassword },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);

      toast.success("Password aggiornata");
      setPwDialog(null);
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const viewInbox = async (account: ImpiantoAccount) => {
    setInboxDialog(account);
    setInboxLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const { data, error } = await supabase.functions.invoke("impianto-auth", {
        body: { action: "admin_view_inbox", impianto_account_id: account.id },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (error) throw error;
      setInbox(data?.inbox || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setInboxLoading(false);
    }
  };

  const filtered = accounts.filter((a) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return a.ragione_sociale.toLowerCase().includes(s) || a.email.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Factory className="h-5 w-5 text-blue-400" />
          <h2 className="text-lg font-bold text-foreground">Aree Riservate Impianti</h2>
          <Badge variant="outline" className="text-xs">{accounts.length} impianti</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={loadAccounts} className="border-border/50">
          <RefreshCw className="h-3 w-3 mr-1" /> Aggiorna
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca impianto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card/60 border-border/30"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-card/60 border border-border/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 text-muted-foreground text-xs uppercase">
                <th className="p-3 text-left">Ragione Sociale</th>
                <th className="p-3 text-left">Email</th>
                {!tenantFilter && <th className="p-3 text-left">Tenant</th>}
                <th className="p-3 text-center">Stato</th>
                <th className="p-3 text-left">Ultimo Accesso</th>
                <th className="p-3 text-center">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Caricamento...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nessun impianto</td></tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="border-b border-border/10 hover:bg-accent/5">
                    <td className="p-3 font-medium">{a.ragione_sociale}</td>
                    <td className="p-3 text-xs text-muted-foreground">{a.email}</td>
                    {!tenantFilter && (
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px]">
                          {a.tenant_id ? TENANT_LABELS[a.tenant_id] || "Altro" : "—"}
                        </Badge>
                      </td>
                    )}
                    <td className="p-3 text-center">
                      {a.attivo ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Attivo</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-300 border border-red-500/30">Disabilitato</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {a.ultimo_accesso ? new Date(a.ultimo_accesso).toLocaleString("it-IT") : "Mai"}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => viewInbox(a)}
                          className="h-7 px-2 text-xs border-blue-500/30 text-blue-300 hover:bg-blue-500/10">
                          <Eye className="h-3 w-3 mr-1" /> FIR
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setPwDialog(a); setNewPassword(""); }}
                          className="h-7 px-2 text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10">
                          <Key className="h-3 w-3 mr-1" /> PW
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => toggleActive(a)}
                          className={`h-7 px-2 text-xs ${a.attivo
                            ? "border-red-500/30 text-red-300 hover:bg-red-500/10"
                            : "border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                          }`}>
                          {a.attivo ? <ShieldOff className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password Dialog */}
      <Dialog open={!!pwDialog} onOpenChange={(open) => { if (!open) setPwDialog(null); }}>
        <DialogContent className="max-w-sm bg-card border-border/50">
          <DialogHeader>
            <DialogTitle>Cambia Password — {pwDialog?.ragione_sociale}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nuova password"
              className="bg-secondary/50 border-border"
            />
            <Button onClick={changePassword} disabled={!newPassword} className="w-full bg-amber-600 hover:bg-amber-500 text-white">
              <Key className="h-4 w-4 mr-1" /> Aggiorna Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inbox Dialog */}
      <Dialog open={!!inboxDialog} onOpenChange={(open) => { if (!open) setInboxDialog(null); }}>
        <DialogContent className="max-w-2xl bg-card border-border/50 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>FIR Ricevuti — {inboxDialog?.ragione_sociale}</DialogTitle>
          </DialogHeader>
          {inboxLoading ? (
            <p className="text-center text-muted-foreground py-8">Caricamento...</p>
          ) : inbox.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nessun FIR nell'area riservata</p>
          ) : (
            <div className="space-y-2">
              {inbox.map((item: any) => {
                const f = item.fir_forms;
                return (
                  <div key={item.id} className="p-3 rounded-lg bg-secondary/30 border border-border/20 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-blue-300">{f?.numero_fir || "N/A"}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        item.stato === "confermato" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                        item.stato === "contestato" ? "bg-red-500/20 text-red-300 border-red-500/30" :
                        "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      }`}>{item.stato}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-1 text-xs text-muted-foreground">
                      <span>CER: {f?.codice_eer || "—"}</span>
                      <span>Produttore: {f?.produttore_denominazione || "—"}</span>
                      <span>Quantità: {f?.quantita?.toLocaleString("it-IT") || "—"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
