import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { vidimaFIRAsync, emissioneFir } from "@/lib/rentriVpsApi";
import { getTenantConfig } from "@/lib/rentriBlockCodes";
import {
  Upload, RefreshCw, Database, Package, CheckCircle, Clock, AlertTriangle,
  Zap, XCircle, ChevronLeft, ChevronRight, Search, UserPlus, Users, Printer
} from "lucide-react";
import { DevStampaFIREditor } from "./DevStampaFIREditor";

const PAGE_SIZE = 50;
const SHARED_POOL_USER_ID = "00000000-0000-0000-0000-000000000000";
const SOCIETA_ID = "multy";
type PoolFilter = "all" | "available" | "reserved" | "consumed" | "cartaceo";
type ProfileInfo = { user_id: string; nome: string; cognome: string };

export function DevGestioneFIRModule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [bulkInput, setBulkInput] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestQty, setRequestQty] = useState(5);
  const [isTesting, setIsTesting] = useState(false);
  const [poolFilter, setPoolFilter] = useState<PoolFilter>("all");
  const [poolPage, setPoolPage] = useState(0);
  const [poolSearch, setPoolSearch] = useState("");
  const [assignSearch, setAssignSearch] = useState("");
  const [assignUserId, setAssignUserId] = useState<string | null>(null);
  const [assignQty, setAssignQty] = useState(1);
  const [isAssigning, setIsAssigning] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);
  const [printFirNumber, setPrintFirNumber] = useState<string | null>(null);
  const [assignDropdownId, setAssignDropdownId] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dev-fir-pool-stats", SOCIETA_ID],
    queryFn: async () => {
      const [totalRes, disponibiliRes, inUsoRes, usatiRes, cartaceiRes] = await Promise.all([
        supabase.from("fir_number_pool").select("id", { count: "exact", head: true }).eq("societa_id", SOCIETA_ID),
        supabase.from("fir_number_pool").select("id", { count: "exact", head: true }).eq("societa_id", SOCIETA_ID).eq("status", "available"),
        supabase.from("fir_number_pool").select("id", { count: "exact", head: true }).eq("societa_id", SOCIETA_ID).eq("status", "reserved"),
        supabase.from("fir_number_pool").select("id", { count: "exact", head: true }).eq("societa_id", SOCIETA_ID).eq("status", "consumed"),
        supabase.from("fir_number_pool").select("id", { count: "exact", head: true }).eq("societa_id", SOCIETA_ID).eq("status", "cartaceo"),
      ]);
      return { total: totalRes.count ?? 0, disponibili: disponibiliRes.count ?? 0, inUso: inUsoRes.count ?? 0, usati: usatiRes.count ?? 0, cartacei: cartaceiRes.count ?? 0 };
    },
    refetchInterval: 10000,
  });

  const { data: poolData, isLoading: poolLoading } = useQuery({
    queryKey: ["dev-fir-pool-list", SOCIETA_ID, poolFilter, poolPage, poolSearch],
    queryFn: async () => {
      let q = supabase.from("fir_number_pool")
        .select("id, fir_number, status, user_id, created_at, assigned_at, consumed_at, suspended", { count: "exact" })
        .eq("societa_id", SOCIETA_ID)
        .order("created_at", { ascending: false })
        .range(poolPage * PAGE_SIZE, (poolPage + 1) * PAGE_SIZE - 1);
      if (poolFilter !== "all") q = q.eq("status", poolFilter);
      if (poolSearch.trim()) q = q.ilike("fir_number", `%${poolSearch.trim()}%`);
      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
    refetchInterval: 15000,
  });

  const { data: profiles } = useQuery({
    queryKey: ["dev-profiles-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, nome, cognome").order("cognome");
      if (error) throw error;
      return data as ProfileInfo[];
    },
    staleTime: 60000,
  });

  const profileMap = (profiles ?? []).reduce((acc, p) => { acc[p.user_id] = `${p.cognome} ${p.nome}`; return acc; }, {} as Record<string, string>);
  const filteredProfiles = (profiles ?? []).filter((p) => {
    if (!assignSearch.trim()) return false;
    const q = assignSearch.toLowerCase();
    return p.cognome.toLowerCase().includes(q) || p.nome.toLowerCase().includes(q);
  }).slice(0, 10);

  const invalidatePool = () => {
    queryClient.invalidateQueries({ queryKey: ["dev-fir-pool-stats"] });
    queryClient.invalidateQueries({ queryKey: ["dev-fir-pool-list"] });
  };

  const handleBulkImport = async () => {
    const numbers = bulkInput.split(/[,\n\r]+/).map(n => n.trim()).filter(n => n.length > 0);
    if (numbers.length === 0) { toast.error("Inserisci almeno un numero FIR"); return; }
    const unique = [...new Set(numbers)];
    const rows = unique.map(n => ({ fir_number: n, user_id: SHARED_POOL_USER_ID, status: "available" as const, societa_id: SOCIETA_ID }));
    const { error } = await supabase.from("fir_number_pool").insert(rows);
    if (error) { toast.error("Errore: " + error.message); return; }
    invalidatePool();
    toast.success(`✅ ${unique.length} numeri caricati`);
    setBulkInput("");
  };

  const handleRequestFromRentri = async () => {
    setIsRequesting(true);
    try {
      const cfg = getTenantConfig("multy");
      const blockCode = cfg?.primaryBlock || cfg?.blocks[0]?.code || "";
      const numIscrSito = cfg?.unitId;
      const result = await vidimaFIRAsync("multy", requestQty, blockCode, numIscrSito, (msg) => {
        toast.info(msg, { id: "vidimazione-progress" });
      });
      if (result.numeri.length > 0) {
        const realNumbers = result.numeri.filter((n: string) => n && !n.startsWith("FIR-") && !n.startsWith("TEST-"));
        if (realNumbers.length > 0) {
          const rows = realNumbers.map((n: string) => ({ fir_number: n, user_id: SHARED_POOL_USER_ID, status: "available" as const, societa_id: SOCIETA_ID }));
          const { error } = await supabase.from("fir_number_pool").insert(rows);
          if (error) throw error;
          invalidatePool();
          toast.success(`✅ ${realNumbers.length} nuovi numeri ricevuti da RENTRI`);
          if (result.partial) toast.warning(`Ricevuti solo ${realNumbers.length}/${requestQty} numeri (parziale)`);
        }
      } else if (result.pending) {
        toast.warning(`Richiesta accettata (transazione: ${result.transazione_id || "N/A"}) ma i numeri non sono ancora pronti.`);
      } else {
        toast.error("Nessun numero ricevuto dalla vidimazione");
      }
    } catch (err: any) {
      toast.error(`Errore richiesta RENTRI: ${err.message}`);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleTestEmissione = async () => {
    setIsTesting(true); setTestResult(null);
    const startTime = Date.now();
    try {
      const { data: poolNum } = await supabase.from("fir_number_pool").select("fir_number").eq("societa_id", SOCIETA_ID).eq("status", "available").limit(1).maybeSingle();
      if (!poolNum?.fir_number) {
        setTestResult({ success: false, message: "❌ NESSUN NUMERO DISPONIBILE" });
        setIsTesting(false);
        return;
      }
      const result = await emissioneFir("multy", {
        numero_fir: poolNum.fir_number,
        produttore: { denominazione: "Test Srl", codice_fiscale: "00000000000", indirizzo: "Via Test 1, 10100 Torino (TO)" },
        destinatario: { denominazione: "Impianto Test Srl", codice_fiscale: "11111111111", indirizzo: "Via Prova 2, 10100 Torino (TO)" },
        trasportatore: { denominazione: "Trasporto Test Srl", codice_fiscale: "22222222222", albo: "TO/00001" },
        rifiuto: { codice_eer: "150101", descrizione: "Imballaggi di carta e cartone", stato_fisico: "solido non pulverulento", quantita: 10, unita_misura: "kg" },
      });
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      setTestResult({ success: result.success, message: result.success ? `✅ TEST SUPERATO (${elapsed}s)` : `❌ TEST FALLITO (${elapsed}s)`, details: JSON.stringify(result.data, null, 2) });
      if (result.success) toast.success("Test RENTRI superato!"); else toast.error("Test fallito");
    } catch (err: any) {
      setTestResult({ success: false, message: "❌ TEST FALLITO", details: err.message });
      toast.error("Test fallito: " + err.message);
    } finally { setIsTesting(false); }
  };

  const handleAssign = async () => {
    if (!assignUserId || assignQty < 1) return;
    setIsAssigning(true);
    try {
      const { data: available, error: fetchErr } = await supabase.from("fir_number_pool")
        .select("id").eq("societa_id", SOCIETA_ID).eq("status", "available").eq("user_id", SHARED_POOL_USER_ID).limit(assignQty);
      if (fetchErr) throw fetchErr;
      if (!available || available.length === 0) { toast.error("Nessun numero disponibile"); setIsAssigning(false); return; }
      const ids = available.map(r => r.id);
      const { error: updateErr } = await supabase.from("fir_number_pool")
        .update({ user_id: assignUserId, assigned_by: user!.id, assigned_at: new Date().toISOString() }).in("id", ids);
      if (updateErr) throw updateErr;
      invalidatePool();
      toast.success(`✅ ${ids.length} numeri assegnati`);
      setAssignUserId(null); setAssignSearch(""); setAssignQty(1);
    } catch (err: any) {
      toast.error(`Errore: ${err.message}`);
    } finally { setIsAssigning(false); }
  };

  const handleInlineAssign = async (poolId: string, firNumber: string, targetUserId: string) => {
    try {
      const { error } = await supabase.from("fir_number_pool")
        .update({ user_id: targetUserId, assigned_by: user!.id, assigned_at: new Date().toISOString() })
        .eq("id", poolId);
      if (error) throw error;
      const targetName = profileMap[targetUserId] || targetUserId;
      toast.success(`✅ ${firNumber} assegnato a ${targetName}`);
      invalidatePool();
      setAssignDropdownId(null);
    } catch (err: any) {
      toast.error(`Errore: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={<Database className="h-5 w-5" />} label="Totale" value={stats?.total ?? 0} color="text-primary" loading={statsLoading} />
        <StatCard icon={<CheckCircle className="h-5 w-5" />} label="Disponibili" value={stats?.disponibili ?? 0} color="text-emerald-400" loading={statsLoading} />
        <StatCard icon={<Clock className="h-5 w-5" />} label="In Uso" value={stats?.inUso ?? 0} color="text-cyan-400" loading={statsLoading} />
        <StatCard icon={<Package className="h-5 w-5" />} label="Consumati" value={stats?.usati ?? 0} color="text-orange-400" loading={statsLoading} />
        <StatCard icon={<Printer className="h-5 w-5" />} label="Cartacei" value={stats?.cartacei ?? 0} color="text-violet-400" loading={statsLoading} />
      </div>

      {/* Bulk Import */}
      <div className="rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary"><Upload className="h-5 w-5" /><h3 className="font-display text-lg tracking-wider uppercase">Carica Numeri nel Serbatoio</h3></div>
        <textarea value={bulkInput} onChange={(e) => setBulkInput(e.target.value)} placeholder="ZRZXR 001234 TO&#10;ZRZXR 001235 TO" rows={4} className="w-full bg-background/80 border border-primary/15 rounded-xl px-4 py-3 text-foreground text-sm font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-mono">{bulkInput.split(/[,\n\r]+/).filter(n => n.trim()).length} numeri rilevati</span>
          <button onClick={handleBulkImport} disabled={!bulkInput.trim()} className="px-6 py-3 rounded-xl bg-primary/20 border border-primary/30 text-primary font-display text-sm tracking-wider hover:bg-primary/30 transition-colors disabled:opacity-50 flex items-center gap-2"><Upload className="h-4 w-4" /> CARICA</button>
        </div>
      </div>

      {/* RENTRI Request */}
      <div className="rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4">
        <div className="flex items-center gap-2 text-cyan-400"><RefreshCw className="h-5 w-5" /><h3 className="font-display text-lg tracking-wider uppercase">Richiedi Nuovi Numeri a RENTRI</h3></div>
        {(stats?.disponibili ?? 0) === 0 && <div className="flex items-center gap-2 text-amber-400 text-xs font-mono"><AlertTriangle className="h-4 w-4" /> Serbatoio vuoto!</div>}
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Quantità:</label>
          <div className="flex gap-2">
            {[5, 10, 50, 100].map((q) => (
              <button key={q} onClick={() => setRequestQty(q)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${requestQty === q ? "bg-cyan-500/30 text-cyan-400 border border-cyan-500/50" : "bg-secondary/50 text-muted-foreground hover:text-foreground border border-transparent"}`}
              >{q}</button>
            ))}
          </div>
        </div>
        <button onClick={handleRequestFromRentri} disabled={isRequesting} className="px-6 py-3 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-display text-sm tracking-wider hover:bg-cyan-500/30 transition-colors disabled:opacity-50 flex items-center gap-2">
          {isRequesting ? <div className="w-4 h-4 border-2 border-cyan-500/50 border-t-cyan-400 rounded-full animate-spin" /> : <RefreshCw className="h-4 w-4" />} RICHIEDI
        </button>
      </div>

      {/* Test RENTRI */}
      <div className="rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4">
        <div className="flex items-center gap-2 text-amber-400"><Zap className="h-5 w-5" /><h3 className="font-display text-lg tracking-wider uppercase">Test Invio RENTRI</h3></div>
        <button onClick={handleTestEmissione} disabled={isTesting} className="px-6 py-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-display text-sm tracking-wider hover:bg-amber-500/30 transition-colors disabled:opacity-50 flex items-center gap-2">
          {isTesting ? <div className="w-4 h-4 border-2 border-amber-500/50 border-t-amber-400 rounded-full animate-spin" /> : <Zap className="h-4 w-4" />}
          {isTesting ? "INVIO IN CORSO..." : "ESEGUI TEST"}
        </button>
        {testResult && (
          <div className={`rounded-xl border p-4 space-y-2 ${testResult.success ? "bg-emerald-500/5 border-emerald-500/30" : "bg-destructive/5 border-destructive/30"}`}>
            <div className="flex items-center gap-2">
              {testResult.success ? <CheckCircle className="h-5 w-5 text-emerald-400" /> : <XCircle className="h-5 w-5 text-destructive" />}
              <span className={`font-display text-sm ${testResult.success ? "text-emerald-400" : "text-destructive"}`}>{testResult.message}</span>
            </div>
            {testResult.details && (
              <details className="text-xs"><summary className="cursor-pointer text-muted-foreground font-mono">Log tecnico</summary>
                <pre className="mt-2 p-3 bg-background/80 rounded-lg overflow-x-auto text-muted-foreground font-mono text-[10px] max-h-60 overflow-y-auto">{testResult.details}</pre>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Assign */}
      <div className="rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary"><UserPlus className="h-5 w-5" /><h3 className="font-display text-lg tracking-wider uppercase">Assegna Numeri a Utente</h3></div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={assignSearch} onChange={(e) => { setAssignSearch(e.target.value); setAssignUserId(null); }} placeholder="Cerca utente..." className="w-full pl-9 pr-4 py-2 bg-background/80 border border-border/30 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary" />
            {filteredProfiles.length > 0 && !assignUserId && (
              <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-card border border-border/30 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {filteredProfiles.map(p => (
                  <button key={p.user_id} onClick={() => { setAssignUserId(p.user_id); setAssignSearch(`${p.cognome} ${p.nome}`); }} className="w-full text-left px-4 py-2 text-sm hover:bg-primary/10 text-foreground transition-colors">{p.cognome} {p.nome}</button>
                ))}
              </div>
            )}
          </div>
          <input type="number" min={1} value={assignQty} onChange={e => setAssignQty(Math.max(1, parseInt(e.target.value) || 1))} className="w-24 bg-background/80 border border-border/30 rounded-xl px-3 py-2 text-sm font-mono text-foreground text-center" />
          <button onClick={handleAssign} disabled={!assignUserId || isAssigning} className="px-6 py-2 rounded-xl bg-primary/20 border border-primary/30 text-primary font-display text-sm tracking-wider hover:bg-primary/30 disabled:opacity-50 flex items-center gap-2">
            {isAssigning ? <div className="w-4 h-4 border-2 border-primary/50 border-t-primary rounded-full animate-spin" /> : <UserPlus className="h-4 w-4" />} ASSEGNA
          </button>
        </div>
      </div>

      {/* Pool List */}
      <div className="rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary"><Database className="h-5 w-5" /><h3 className="font-display text-lg tracking-wider uppercase">Elenco Numeri</h3></div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={poolSearch} onChange={e => { setPoolSearch(e.target.value); setPoolPage(0); }} placeholder="Cerca numero FIR..." className="w-full pl-9 pr-4 py-2 bg-background/80 border border-border/30 rounded-xl text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="flex gap-1">
            {(["all", "available", "reserved", "consumed", "cartaceo"] as PoolFilter[]).map(f => (
              <button key={f} onClick={() => { setPoolFilter(f); setPoolPage(0); }} className={`px-3 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors ${poolFilter === f ? "bg-primary/20 text-primary border border-primary/30" : "bg-background/50 text-muted-foreground border border-border/20 hover:bg-primary/10"}`}>
                {f === "all" ? "Tutti" : f === "available" ? "Disponibili" : f === "reserved" ? "Assegnati" : f === "consumed" ? "Usati" : "Cartacei"}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
             <thead><tr className="border-b border-border/30 text-muted-foreground font-mono text-xs uppercase">
              <th className="text-left py-2 px-3">Numero FIR</th><th className="text-left py-2 px-3">Stato</th><th className="text-left py-2 px-3">Assegnato a</th><th className="text-left py-2 px-3 hidden md:table-cell">Creato il</th><th className="text-center py-2 px-3">Azioni</th>
            </tr></thead>
            <tbody>
              {poolLoading ? <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Caricamento...</td></tr>
              : (poolData?.rows.length ?? 0) === 0 ? <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Nessun numero trovato</td></tr>
              : poolData!.rows.map((row: any) => (
                <tr key={row.id} className="border-b border-border/10 hover:bg-primary/5 transition-colors">
                  <td className="py-2 px-3 font-mono text-foreground">{row.fir_number}</td>
                  <td className="py-2 px-3"><span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${row.status === "available" ? "bg-emerald-500/15 text-emerald-400" : row.status === "reserved" ? "bg-cyan-500/15 text-cyan-400" : row.status === "cartaceo" ? "bg-violet-500/15 text-violet-400" : "bg-orange-500/15 text-orange-400"}`}>{row.status === "available" ? "Disponibile" : row.status === "reserved" ? "Assegnato" : row.status === "cartaceo" ? "Cartaceo" : "Usato"}</span></td>
                  <td className="py-2 px-3 text-foreground text-xs">{row.status !== "available" ? (profileMap[row.user_id] || "—") : "—"}</td>
                  <td className="py-2 px-3 hidden md:table-cell text-muted-foreground font-mono text-xs">{new Date(row.created_at).toLocaleDateString("it-IT")}</td>
                   <td className="py-2 px-3 text-center">
                     <div className="flex items-center justify-center gap-1 relative">
                       {row.status === "available" && (
                         <>
                           <button onClick={() => setPrintFirNumber(row.fir_number)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-colors">
                             <Printer className="h-3 w-3" /> Stampa
                           </button>
                           <button onClick={() => setAssignDropdownId(assignDropdownId === row.id ? null : row.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-colors">
                             <UserPlus className="h-3 w-3" /> Assegna
                           </button>
                           {assignDropdownId === row.id && (
                             <div className="absolute z-30 top-full mt-1 right-0 bg-card border border-border/30 rounded-xl shadow-lg max-h-48 overflow-y-auto w-48">
                               {(profiles ?? []).map(p => (
                                 <button key={p.user_id} onClick={() => handleInlineAssign(row.id, row.fir_number, p.user_id)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-primary/10 text-foreground transition-colors">
                                   {p.cognome} {p.nome}
                                 </button>
                               ))}
                             </div>
                           )}
                         </>
                       )}
                     </div>
                   </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(poolData?.total ?? 0) > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-mono text-muted-foreground">{poolPage * PAGE_SIZE + 1}–{Math.min((poolPage + 1) * PAGE_SIZE, poolData!.total)} di {poolData!.total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPoolPage(p => Math.max(0, p - 1))} disabled={poolPage === 0} className="p-2 rounded-lg bg-background/50 border border-border/20 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => setPoolPage(p => p + 1)} disabled={(poolPage + 1) * PAGE_SIZE >= (poolData?.total ?? 0)} className="p-2 rounded-lg bg-background/50 border border-border/20 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Stampa FIR Editor Dialog */}
      {printFirNumber && (
        <DevStampaFIREditor
          firNumber={printFirNumber}
          open={!!printFirNumber}
          onClose={() => setPrintFirNumber(null)}
          onPrinted={async () => {
            // Mark as cartaceo
            const { error } = await supabase
              .from("fir_number_pool")
              .update({ status: "cartaceo", consumed_at: new Date().toISOString() })
              .eq("fir_number", printFirNumber)
              .eq("societa_id", SOCIETA_ID);
            if (error) {
              toast.error("Errore aggiornamento stato: " + error.message);
            } else {
              toast.success(`FIR ${printFirNumber} spostato in Cartacei`);
              invalidatePool();
            }
            setPrintFirNumber(null);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, loading }: { icon: React.ReactNode; label: string; value: number | string; color: string; loading: boolean }) {
  return (
    <div className="rounded-2xl bg-card/60 border border-border/30 p-4 flex flex-col items-center gap-2">
      <div className={`${color} opacity-70`}>{icon}</div>
      <span className={`text-2xl font-display font-bold ${color}`}>{loading ? "—" : value}</span>
      <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}
