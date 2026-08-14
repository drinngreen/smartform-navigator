import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Users, RefreshCw, Loader2, FilePlus, Pencil, Trash2, ShieldCheck, ShieldAlert,
  Hash, Zap, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { vidimaFIRAsync } from "@/lib/rentriVpsApi";
import { getTenantConfig } from "@/lib/rentriBlockCodes";

const SHARED_POOL_USER_ID = "00000000-0000-0000-0000-000000000000";

type CompanyKey = "multy" | "niyol";

const COMPANIES: Record<CompanyKey, { label: string; tenantId: string; mnContext: string; accent: string }> = {
  multy: {
    label: "Multyproget",
    tenantId: "77ec9a3d-602e-438f-97bf-1c69abd8f691",
    mnContext: "multyproget",
    accent: "text-neon-green",
  },
  niyol: {
    label: "Niyol",
    tenantId: "819c783e-78dd-4080-8265-802e75b0d813",
    mnContext: "niyol",
    accent: "text-neon-cyan",
  },
};

const validContexts = ["multyproget", "dev-multyproget", "niyol"];

interface Employee {
  user_id: string;
  email: string;
  nome: string;
  cognome: string;
  codice_fiscale: string;
  targa: string | null;
  last_sign_in_at: string | null;
  deactivated_at: string | null;
}

interface DraftRow {
  id: string;
  user_id: string;
  numero_fir: string | null;
  status: string | null;
  updated_at: string | null;
}

function normalizeFirNumber(value: string) {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, " ");
  if (/^[A-Z]{5} [0-9]{6} [A-Z]{2}$/.test(normalized)) return normalized;
  const compact = normalized.replace(/[^A-Z0-9]/g, "");
  const match = compact.match(/([A-Z]{5})([0-9]{6})([A-Z]{2})/);
  return match ? `${match[1]} ${match[2]} ${match[3]}` : normalized;
}

export default function MNCentroAppFirPage() {
  const params = useParams<{ context: string }>();
  const navigate = useNavigate();
  const context = params.context ?? "dev-multyproget";
  const isValid = validContexts.includes(context);

  const [company, setCompany] = useState<CompanyKey>(context === "niyol" ? "niyol" : "multy");
  const cfg = COMPANIES[company];

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [poolFree, setPoolFree] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [vidimaBusy, setVidimaBusy] = useState(false);
  const [vidimaQty, setVidimaQty] = useState(10);
  const [manualDialog, setManualDialog] = useState<{ open: boolean; emp: Employee | null }>({ open: false, emp: null });
  const [manualNumber, setManualNumber] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, draftsRes, poolRes] = await Promise.all([
        supabase.functions.invoke("admin-user-manage", { body: { action: "list_users" } }),
        supabase
          .from("fir_forms")
          .select("id, user_id, numero_fir, status, updated_at")
          .eq("tenant_id", cfg.tenantId)
          .eq("status", "bozza")
          .eq("deleted_by_user", false)
          .order("updated_at", { ascending: false }),
        supabase
          .from("fir_number_pool")
          .select("id", { count: "exact", head: true })
          .eq("societa_id", company)
          .eq("status", "available"),
      ]);

      if (usersRes.error) throw usersRes.error;
      const all = (usersRes.data?.users ?? []) as any[];
      const list: Employee[] = all
        .filter((u) => {
          const p = u.profile;
          if (!p) return false;
          return p.mn_context === cfg.mnContext || p.tenant_id === cfg.tenantId;
        })
        .filter((u) => u.role !== "admin")
        .map((u) => ({
          user_id: u.id,
          email: u.email,
          nome: u.profile?.nome ?? "",
          cognome: u.profile?.cognome ?? "",
          codice_fiscale: u.profile?.codice_fiscale ?? "",
          targa: u.profile?.targa_automezzo ?? null,
          last_sign_in_at: u.last_sign_in_at ?? null,
          deactivated_at: u.profile?.deactivated_at ?? null,
        }))
        .sort((a, b) => `${a.cognome}${a.nome}`.localeCompare(`${b.cognome}${b.nome}`));

      setEmployees(list);
      setDrafts((draftsRes.data as DraftRow[]) ?? []);
      setPoolFree(poolRes.count ?? 0);
    } catch (e: any) {
      toast.error("Errore caricamento: " + (e.message || ""));
    } finally {
      setLoading(false);
    }
  }, [cfg.tenantId, cfg.mnContext, company]);

  useEffect(() => { if (isValid) load(); }, [load, isValid]);

  const draftByUser = useMemo(() => {
    const map: Record<string, DraftRow> = {};
    for (const d of drafts) {
      const current = map[d.user_id];
      if (!current || (d.numero_fir && !current.numero_fir)) map[d.user_id] = d;
    }
    return map;
  }, [drafts]);

  const pronti = employees.filter((e) => draftByUser[e.user_id]?.numero_fir).length;
  const scoperti = employees.length - pronti;

  if (!isValid) return <Navigate to="/mn/admin" replace />;

  const takePoolNumber = async (): Promise<string | null> => {
    const { data } = await supabase
      .from("fir_number_pool")
      .select("fir_number")
      .eq("societa_id", company)
      .eq("status", "available")
      .eq("suspended", false)
      .in("user_id", [SHARED_POOL_USER_ID])
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    return data?.fir_number ?? null;
  };

  const assignNumber = async (emp: Employee, numero?: string) => {
    setBusy(emp.user_id);
    try {
      const firNumber = numero ?? (await takePoolNumber());
      if (!firNumber) {
        toast.error("Serbatoio vuoto: vidima nuovi numeri da RENTRI o inserisci un numero manuale.");
        return;
      }
      const { error } = await supabase.rpc("create_manual_fir_draft_for_tenant" as any, {
        p_user_id: emp.user_id,
        p_tenant_id: cfg.tenantId,
        p_numero_fir: normalizeFirNumber(firNumber),
      });
      if (error) throw error;
      toast.success(`FIR ${normalizeFirNumber(firNumber)} pronto per ${emp.cognome} ${emp.nome}`);
      await load();
    } catch (e: any) {
      toast.error("Errore assegnazione: " + (e.message || ""));
    } finally {
      setBusy(null);
    }
  };

  const removeDraft = async (emp: Employee) => {
    const draft = draftByUser[emp.user_id];
    if (!draft) return;
    if (!window.confirm(`Rimuovere la bozza ${draft.numero_fir ?? ""} di ${emp.cognome} ${emp.nome}?`)) return;
    setBusy(emp.user_id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-manage", {
        body: { action: "delete_fir_form", form_id: draft.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Bozza rimossa, numero rilasciato nel serbatoio");
      await load();
    } catch (e: any) {
      toast.error("Errore rimozione: " + (e.message || ""));
    } finally {
      setBusy(null);
    }
  };

  const prepareAll = async () => {
    const missing = employees.filter((e) => !draftByUser[e.user_id]?.numero_fir && !e.deactivated_at);
    if (missing.length === 0) { toast.info("Tutti i dipendenti hanno già un FIR pronto."); return; }
    if (poolFree < missing.length) {
      toast.error(`Servono ${missing.length} numeri ma nel serbatoio ce ne sono ${poolFree}. Vidima nuovi numeri da RENTRI.`);
      return;
    }
    setBulkBusy(true);
    let ok = 0;
    try {
      for (const emp of missing) {
        const numero = await takePoolNumber();
        if (!numero) break;
        const { error } = await supabase.rpc("create_manual_fir_draft_for_tenant" as any, {
          p_user_id: emp.user_id,
          p_tenant_id: cfg.tenantId,
          p_numero_fir: normalizeFirNumber(numero),
        });
        if (error) { toast.error(`${emp.cognome}: ${error.message}`); continue; }
        ok += 1;
      }
      toast.success(`${ok} formulari pronti assegnati`);
      await load();
    } finally {
      setBulkBusy(false);
    }
  };

  const vidimaFromRentri = async () => {
    setVidimaBusy(true);
    try {
      const tenantCfg = getTenantConfig(company);
      const blockCode = tenantCfg?.primaryBlock || tenantCfg?.blocks[0]?.code || "";
      const result = await vidimaFIRAsync(company as any, vidimaQty, blockCode, tenantCfg?.unitId, (msg) => {
        toast.info(msg, { id: "vidimazione-centro" });
      });
      const numeri = (result.numeri ?? []).filter((n: string) => n && !n.startsWith("FIR-") && !n.startsWith("TEST-"));
      if (numeri.length === 0) {
        toast.error("Nessun numero ricevuto da RENTRI");
        return;
      }
      const rows = numeri.map((n: string) => ({
        fir_number: normalizeFirNumber(n),
        user_id: SHARED_POOL_USER_ID,
        status: "available" as const,
        societa_id: company,
      }));
      const { error } = await supabase.from("fir_number_pool").insert(rows);
      if (error) throw error;
      toast.success(`${numeri.length} numeri vidimati e caricati nel serbatoio ${cfg.label}`);
      await load();
    } catch (e: any) {
      toast.error("Errore vidimazione: " + (e.message || ""));
    } finally {
      setVidimaBusy(false);
    }
  };

  const openForm = (draftId: string) => {
    const routeCtx = company === "niyol" ? "niyol" : "multyproget";
    navigate(`/mn/admin/${routeCtx}/formulari?fir=${draftId}`);
  };

  return (
    <MNAdminLayout title="Centro App & FIR" subtitle="Accessi app dipendenti e formulari sempre pronti">
      <div className="space-y-6">
        {/* Switch società */}
        <div className="flex flex-wrap items-center gap-3">
          {(Object.keys(COMPANIES) as CompanyKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setCompany(key)}
              className={`px-5 py-2.5 rounded-xl border text-sm font-display tracking-wider transition-colors ${
                company === key
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "bg-card/40 border-border/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              {COMPANIES[key].label}
            </button>
          ))}
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="ml-auto">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Aggiorna</span>
          </Button>
        </div>

        {/* Stat */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatBox icon={<Users className="h-5 w-5" />} label="Dipendenti con app" value={employees.length} />
          <StatBox icon={<CheckCircle2 className="h-5 w-5" />} label="FIR pronti" value={pronti} tone="text-neon-green" />
          <StatBox icon={<AlertTriangle className="h-5 w-5" />} label="Senza FIR" value={scoperti} tone={scoperti > 0 ? "text-amber-400" : "text-muted-foreground"} />
          <StatBox icon={<Hash className="h-5 w-5" />} label="Numeri in serbatoio" value={poolFree} tone={poolFree > 0 ? "text-neon-cyan" : "text-destructive"} />
        </div>

        {/* Azioni globali */}
        <div className="rounded-2xl bg-card/60 border border-border/30 p-5 flex flex-wrap items-center gap-3">
          <Button onClick={prepareAll} disabled={bulkBusy || scoperti === 0}>
            {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FilePlus className="h-4 w-4 mr-2" />}
            Prepara un FIR per tutti ({scoperti})
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">Vidima da RENTRI:</span>
            <Input
              type="number"
              min={1}
              max={100}
              value={vidimaQty}
              onChange={(e) => setVidimaQty(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
              className="w-20 h-9"
            />
            <Button variant="outline" onClick={vidimaFromRentri} disabled={vidimaBusy}>
              {vidimaBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              Vidima numeri {cfg.label}
            </Button>
          </div>
        </div>

        {/* Elenco */}
        <div className="rounded-2xl bg-card/60 border border-border/30 overflow-hidden">
          {loading ? (
            <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : employees.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Nessun dipendente con accesso app per {cfg.label}. Creali da Dashboard → Personale.
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {employees.map((emp) => {
                const draft = draftByUser[emp.user_id];
                const pronto = !!draft?.numero_fir;
                return (
                  <div key={emp.user_id} className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display text-sm tracking-wide">{emp.cognome} {emp.nome}</span>
                        {emp.deactivated_at ? (
                          <Badge variant="destructive" className="text-[10px]"><ShieldAlert className="h-3 w-3 mr-1" />Disattivato</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]"><ShieldCheck className="h-3 w-3 mr-1" />App attiva</Badge>
                        )}
                        {emp.targa && <Badge variant="secondary" className="text-[10px] font-mono">{emp.targa}</Badge>}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono truncate">
                        {emp.codice_fiscale || emp.email}
                        {emp.last_sign_in_at && ` · ultimo accesso ${new Date(emp.last_sign_in_at).toLocaleDateString("it-IT")}`}
                      </div>
                    </div>

                    <div className="lg:w-64">
                      {pronto ? (
                        <div className="text-xs font-mono text-neon-green flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" /> {draft?.numero_fir}
                        </div>
                      ) : (
                        <div className="text-xs font-mono text-amber-400 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" /> Nessun formulario pronto
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === emp.user_id || pronto}
                        onClick={() => assignNumber(emp)}
                      >
                        {busy === emp.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Hash className="h-3.5 w-3.5" />}
                        <span className="ml-1.5">Assegna numero</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === emp.user_id}
                        onClick={() => { setManualNumber(""); setManualDialog({ open: true, emp }); }}
                      >
                        <FilePlus className="h-3.5 w-3.5 mr-1.5" /> Numero manuale
                      </Button>
                      <Button size="sm" disabled={!draft} onClick={() => draft && openForm(draft.id)}>
                        <Pencil className="h-3.5 w-3.5 mr-1.5" /> Compila
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        disabled={!draft || busy === emp.user_id}
                        onClick={() => removeDraft(emp)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={manualDialog.open} onOpenChange={(o) => setManualDialog({ open: o, emp: o ? manualDialog.emp : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Numero FIR manuale</DialogTitle>
            <DialogDescription>
              Assegna un numero specifico a {manualDialog.emp?.cognome} {manualDialog.emp?.nome}. Il formulario resta compilabile
              sia in modulo standard che alternativo.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={manualNumber}
            onChange={(e) => setManualNumber(e.target.value)}
            placeholder="ZRZXR 000123 AB"
            className="font-mono"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualDialog({ open: false, emp: null })}>Annulla</Button>
            <Button
              disabled={!manualNumber.trim()}
              onClick={async () => {
                const emp = manualDialog.emp;
                if (!emp) return;
                setManualDialog({ open: false, emp: null });
                await assignNumber(emp, manualNumber);
              }}
            >
              Assegna
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MNAdminLayout>
  );
}

function StatBox({ icon, label, value, tone = "text-primary" }: { icon: React.ReactNode; label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-2xl bg-card/60 border border-border/30 p-4">
      <div className={`flex items-center gap-2 ${tone}`}>{icon}<span className="text-2xl font-display">{value}</span></div>
      <div className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wider">{label}</div>
    </div>
  );
}
