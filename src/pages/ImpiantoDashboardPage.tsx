import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Factory, LogOut, Search, Package, CheckCircle, AlertTriangle,
  FileText, Eye, Check, XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import logoDragon from "@/assets/dragon-logo-gold.png";

interface ImpiantoSession {
  account: { id: string; ragione_sociale: string; email: string; tenant_id: string };
  token: string;
}

interface FirInboxItem {
  id: string;
  stato: string;
  peso_verificato: number | null;
  note_impianto: string | null;
  data_conferma: string | null;
  created_at: string;
  fir_forms: {
    id: string;
    numero_fir: string | null;
    codice_eer: string | null;
    descrizione_rifiuto: string | null;
    quantita: number | null;
    unita_misura: string | null;
    produttore_denominazione: string | null;
    trasportatore_denominazione: string | null;
    destinatario_denominazione: string | null;
    data_partenza: string | null;
    data_arrivo: string | null;
    completed_at: string | null;
    status: string;
    tenant_id: string;
  } | null;
}

const ACCENT = "59, 130, 246";

export default function ImpiantoDashboardPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<ImpiantoSession | null>(null);
  const [inbox, setInbox] = useState<FirInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [detailItem, setDetailItem] = useState<FirInboxItem | null>(null);
  const [confirmForm, setConfirmForm] = useState({ peso: "", note: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("impianto_session");
    if (!raw) { navigate("/area-impianto"); return; }
    try {
      const s = JSON.parse(raw);
      const payload = JSON.parse(atob(s.token));
      if (payload.exp < Date.now()) {
        localStorage.removeItem("impianto_session");
        navigate("/area-impianto");
        return;
      }
      setSession(s);
    } catch {
      navigate("/area-impianto");
    }
  }, [navigate]);

  const loadInbox = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("impianto-auth", {
        body: { action: "get_inbox", impianto_account_id: session.account.id },
      });
      if (error) throw error;
      if (data?.success) setInbox(data.inbox || []);
    } catch (err: any) {
      toast.error("Errore caricamento: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { loadInbox(); }, [loadInbox]);

  const handleLogout = () => {
    localStorage.removeItem("impianto_session");
    navigate("/area-impianto");
  };

  const handleConfirm = async (stato: "confermato" | "contestato") => {
    if (!detailItem) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("impianto-auth", {
        body: {
          action: "update_fir_status",
          fir_inbox_id: detailItem.id,
          stato,
          peso_verificato: confirmForm.peso ? parseFloat(confirmForm.peso) : undefined,
          note_impianto: confirmForm.note || undefined,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);
      toast.success(stato === "confermato" ? "Ricezione confermata" : "FIR contestato");
      setDetailItem(null);
      setConfirmForm({ peso: "", note: "" });
      loadInbox();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = inbox.filter((item) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const f = item.fir_forms;
    return f?.numero_fir?.toLowerCase().includes(s) ||
      f?.codice_eer?.toLowerCase().includes(s) ||
      f?.produttore_denominazione?.toLowerCase().includes(s) ||
      f?.trasportatore_denominazione?.toLowerCase().includes(s);
  });

  const ricevuti = inbox.filter(i => i.stato === "ricevuto").length;
  const confermati = inbox.filter(i => i.stato === "confermato").length;
  const contestati = inbox.filter(i => i.stato === "contestato").length;

  if (!session) return null;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden relative">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 50% 30%, rgba(${ACCENT}, 0.22) 0%, rgba(${ACCENT}, 0.12) 25%, rgba(${ACCENT}, 0.04) 55%, transparent 80%),
            radial-gradient(ellipse at 85% 15%, rgba(${ACCENT}, 0.17) 0%, rgba(${ACCENT}, 0.07) 25%, transparent 55%),
            radial-gradient(ellipse at 15% 75%, rgba(${ACCENT}, 0.05) 0%, transparent 50%)
          `,
        }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(192, 173, 103, 0.18) 1px, transparent 1px),
            linear-gradient(90deg, rgba(192, 173, 103, 0.18) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
        }}
      />

      {/* Header */}
      <header className="relative z-20 border-b border-border/30 bg-card/40 backdrop-blur-xl px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoDragon} alt="Logo" className="h-10 w-10" style={{ filter: "drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))" }} />
            <div>
              <h1 className="font-display font-bold text-foreground text-lg tracking-wider">{session.account.ragione_sociale}</h1>
              <p className="text-xs text-muted-foreground">{session.account.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground border border-border/50 hover:border-border transition-colors">
            <LogOut className="h-4 w-4" /> Esci
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 relative z-10">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Package} label="Totale FIR" value={inbox.length} color={ACCENT} />
            <StatCard icon={FileText} label="Da confermare" value={ricevuti} color="249, 115, 22" />
            <StatCard icon={CheckCircle} label="Confermati" value={confermati} color="34, 197, 94" />
            <StatCard icon={AlertTriangle} label="Contestati" value={contestati} color="239, 68, 68" />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Cerca FIR, CER, produttore, trasportatore..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-3 rounded-lg bg-card/60 border border-border/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Table */}
          <div className="rounded-2xl bg-card/60 border border-border/30 overflow-hidden" style={{ boxShadow: `0 0 1px rgba(${ACCENT}, 0.3), 0 0 8px rgba(${ACCENT}, 0.1)` }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-muted-foreground text-xs uppercase">
                    <th className="p-3 text-left">Data Ricezione</th>
                    <th className="p-3 text-left">N° FIR</th>
                    <th className="p-3 text-left">CER</th>
                    <th className="p-3 text-left">Produttore</th>
                    <th className="p-3 text-left">Trasportatore</th>
                    <th className="p-3 text-right">Quantità</th>
                    <th className="p-3 text-center">Stato</th>
                    <th className="p-3 text-center">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Caricamento...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nessun FIR ricevuto</td></tr>
                  ) : (
                    filtered.map((item) => {
                      const f = item.fir_forms;
                      return (
                        <tr key={item.id} className="border-b border-border/10 hover:bg-accent/5">
                          <td className="p-3 font-mono text-xs">
                            {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: it })}
                          </td>
                          <td className="p-3 font-mono text-xs font-bold text-blue-400">{f?.numero_fir || "—"}</td>
                          <td className="p-3 font-mono">{f?.codice_eer || "—"}</td>
                          <td className="p-3 text-xs max-w-[150px] truncate">{f?.produttore_denominazione || "—"}</td>
                          <td className="p-3 text-xs max-w-[150px] truncate">{f?.trasportatore_denominazione || "—"}</td>
                          <td className="p-3 text-right font-bold">
                            {f?.quantita ? Number(f.quantita).toLocaleString("it-IT") : "—"}
                            {f?.unita_misura ? ` ${f.unita_misura}` : ""}
                          </td>
                          <td className="p-3 text-center"><StatoBadge stato={item.stato} /></td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => { setDetailItem(item); setConfirmForm({ peso: "", note: "" }); }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-colors"
                            >
                              <Eye className="h-3 w-3" /> Dettagli
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Detail / Confirm Dialog */}
      <Dialog open={!!detailItem} onOpenChange={(open) => { if (!open) setDetailItem(null); }}>
        <DialogContent className="max-w-lg bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display tracking-wider">
              <FileText className="h-5 w-5 text-blue-400" />
              Dettaglio FIR — {detailItem?.fir_forms?.numero_fir || "N/A"}
            </DialogTitle>
          </DialogHeader>

          {detailItem?.fir_forms && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground text-xs">CER:</span><br/><strong>{detailItem.fir_forms.codice_eer || "—"}</strong></div>
                <div><span className="text-muted-foreground text-xs">Quantità:</span><br/><strong>{detailItem.fir_forms.quantita?.toLocaleString("it-IT")} {detailItem.fir_forms.unita_misura}</strong></div>
                <div><span className="text-muted-foreground text-xs">Produttore:</span><br/>{detailItem.fir_forms.produttore_denominazione || "—"}</div>
                <div><span className="text-muted-foreground text-xs">Trasportatore:</span><br/>{detailItem.fir_forms.trasportatore_denominazione || "—"}</div>
                <div><span className="text-muted-foreground text-xs">Data partenza:</span><br/>{detailItem.fir_forms.data_partenza ? format(new Date(detailItem.fir_forms.data_partenza), "dd/MM/yyyy", { locale: it }) : "—"}</div>
                <div><span className="text-muted-foreground text-xs">Descrizione:</span><br/>{detailItem.fir_forms.descrizione_rifiuto || "—"}</div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">Stato attuale:</span>
                <StatoBadge stato={detailItem.stato} />
              </div>

              {detailItem.stato === "ricevuto" && (
                <div className="space-y-3 mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <p className="text-sm text-blue-300 font-display font-semibold tracking-wider">Conferma ricezione</p>
                  <div>
                    <label className="text-xs text-muted-foreground">Peso verificato (kg)</label>
                    <input
                      type="number"
                      value={confirmForm.peso}
                      onChange={(e) => setConfirmForm(prev => ({ ...prev, peso: e.target.value }))}
                      placeholder="Peso effettivo alla bilancia"
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Note</label>
                    <Textarea
                      value={confirmForm.note}
                      onChange={(e) => setConfirmForm(prev => ({ ...prev, note: e.target.value }))}
                      rows={2}
                      className="bg-secondary/50 border-border"
                      placeholder="Eventuali osservazioni"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConfirm("confermato")}
                      disabled={saving}
                      className="flex-1 py-2.5 rounded-lg font-display font-semibold tracking-wider bg-emerald-600 text-white hover:bg-emerald-500 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <Check className="h-4 w-4" /> Conferma
                    </button>
                    <button
                      onClick={() => handleConfirm("contestato")}
                      disabled={saving}
                      className="flex-1 py-2.5 rounded-lg font-display font-semibold tracking-wider border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="h-4 w-4" /> Contesta
                    </button>
                  </div>
                </div>
              )}

              {detailItem.stato !== "ricevuto" && (
                <div className="p-3 rounded-lg bg-card/80 border border-border/30 text-sm space-y-1">
                  {detailItem.peso_verificato && (
                    <p><span className="text-muted-foreground">Peso verificato:</span> <strong>{Number(detailItem.peso_verificato).toLocaleString("it-IT")} kg</strong></p>
                  )}
                  {detailItem.note_impianto && (
                    <p><span className="text-muted-foreground">Note:</span> {detailItem.note_impianto}</p>
                  )}
                  {detailItem.data_conferma && (
                    <p><span className="text-muted-foreground">Data conferma:</span> {format(new Date(detailItem.data_conferma), "dd/MM/yyyy HH:mm", { locale: it })}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatoBadge({ stato }: { stato: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ricevuto: { label: "Da confermare", cls: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
    confermato: { label: "Confermato", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
    contestato: { label: "Contestato", cls: "bg-red-500/20 text-red-300 border-red-500/30" },
  };
  const m = map[stato] || { label: stato, cls: "bg-muted text-muted-foreground" };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${m.cls}`}>{m.label}</span>;
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl" style={{ boxShadow: `0 0 1px rgba(${color}, 0.3), 0 0 6px rgba(${color}, 0.1)` }}>
      <div className="p-2 rounded-xl" style={{ background: `rgba(${color}, 0.15)` }}>
        <Icon className="h-5 w-5" style={{ color: `rgb(${color})` }} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-mono uppercase">{label}</p>
        <p className="text-lg font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
