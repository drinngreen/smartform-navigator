import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { supabase } from "@/lib/supabaseClient";
import { useMNContextStore, MN_CONTEXTS } from "@/stores/mnContextStore";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { vidimaFIRAsync, emissioneFir } from "@/lib/rentriVpsApi";
import { getTenantConfig } from "@/lib/rentriBlockCodes";
import { Upload, RefreshCw, Database, Package, CheckCircle, Clock, AlertTriangle, Zap, XCircle, ChevronLeft, ChevronRight, Search, UserPlus, Users } from "lucide-react";
const PAGE_SIZE = 50;
const SHARED_POOL_USER_ID = "00000000-0000-0000-0000-000000000000";
const validContexts = ["multyproget", "niyol"];
export default function MNGestioneFIRPage() {
    const { context } = useParams();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const setActiveContext = useMNContextStore((s) => s.setActiveContext);
    const isValid = !!context && validContexts.includes(context);
    const mnCtx = MN_CONTEXTS.find((c) => c.id === context) || MN_CONTEXTS[0];
    const societaId = context === "multyproget" ? "multy" : "niyol";
    useEffect(() => { if (isValid)
        setActiveContext(mnCtx); }, [context, isValid]);
    const [bulkInput, setBulkInput] = useState("");
    const [isRequesting, setIsRequesting] = useState(false);
    const [requestQty, setRequestQty] = useState(5);
    const [isTesting, setIsTesting] = useState(false);
    const [poolFilter, setPoolFilter] = useState("all");
    const [poolPage, setPoolPage] = useState(0);
    const [poolSearch, setPoolSearch] = useState("");
    const [assignSearch, setAssignSearch] = useState("");
    const [assignUserId, setAssignUserId] = useState(null);
    const [assignQty, setAssignQty] = useState(1);
    const [isAssigning, setIsAssigning] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ["mn-fir-pool-stats", societaId],
        queryFn: async () => {
            const [totalRes, disponibiliRes, inUsoRes, usatiRes] = await Promise.all([
                supabase.from("fir_number_pool").select("id", { count: "exact", head: true }).eq("societa_id", societaId),
                supabase.from("fir_number_pool").select("id", { count: "exact", head: true }).eq("societa_id", societaId).eq("status", "available"),
                supabase.from("fir_number_pool").select("id", { count: "exact", head: true }).eq("societa_id", societaId).eq("status", "reserved"),
                supabase.from("fir_number_pool").select("id", { count: "exact", head: true }).eq("societa_id", societaId).eq("status", "consumed"),
            ]);
            return { total: totalRes.count ?? 0, disponibili: disponibiliRes.count ?? 0, inUso: inUsoRes.count ?? 0, usati: usatiRes.count ?? 0 };
        },
        refetchInterval: 10000,
    });
    const { data: poolData, isLoading: poolLoading } = useQuery({
        queryKey: ["mn-fir-pool-list", societaId, poolFilter, poolPage, poolSearch],
        queryFn: async () => {
            let q = supabase.from("fir_number_pool")
                .select("id, fir_number, status, user_id, created_at, assigned_at, consumed_at, suspended", { count: "exact" })
                .eq("societa_id", societaId)
                .order("created_at", { ascending: false })
                .range(poolPage * PAGE_SIZE, (poolPage + 1) * PAGE_SIZE - 1);
            if (poolFilter !== "all")
                q = q.eq("status", poolFilter);
            if (poolSearch.trim())
                q = q.ilike("fir_number", `%${poolSearch.trim()}%`);
            const { data, count, error } = await q;
            if (error)
                throw error;
            return { rows: data ?? [], total: count ?? 0 };
        },
        refetchInterval: 15000,
    });
    const { data: profiles } = useQuery({
        queryKey: ["mn-profiles", mnCtx?.orgId],
        queryFn: async () => {
            const { data, error } = await supabase.from("profiles").select("user_id, nome, cognome").order("cognome");
            if (error)
                throw error;
            return data;
        },
        staleTime: 60000,
    });
    const profileMap = (profiles ?? []).reduce((acc, p) => { acc[p.user_id] = `${p.cognome} ${p.nome}`; return acc; }, {});
    const filteredProfiles = (profiles ?? []).filter((p) => {
        if (!assignSearch.trim())
            return false;
        const q = assignSearch.toLowerCase();
        return p.cognome.toLowerCase().includes(q) || p.nome.toLowerCase().includes(q);
    }).slice(0, 10);
    if (!isValid)
        return _jsx(Navigate, { to: "/mn/admin", replace: true });
    const contextLabel = context === "multyproget" ? "Multyproget" : "Niyol";
    const handleBulkImport = () => {
        const numbers = bulkInput.split(/[,\n\r]+/).map(n => n.trim()).filter(n => n.length > 0);
        if (numbers.length === 0) {
            toast.error("Inserisci almeno un numero FIR");
            return;
        }
        const unique = [...new Set(numbers)];
        const rows = unique.map(n => ({ fir_number: n, user_id: SHARED_POOL_USER_ID, status: "available", societa_id: societaId }));
        supabase.from("fir_number_pool").insert(rows).then(({ error }) => {
            if (error) {
                toast.error("Errore: " + error.message);
                return;
            }
            queryClient.invalidateQueries({ queryKey: ["mn-fir-pool-stats"] });
            queryClient.invalidateQueries({ queryKey: ["mn-fir-pool-list"] });
            toast.success(`✅ ${unique.length} numeri caricati`);
            setBulkInput("");
        });
    };
    const handleRequestFromRentri = async () => {
        setIsRequesting(true);
        const company = context === "multyproget" ? "multy" : "niyol";
        try {
            const cfg = getTenantConfig(company);
            const blockCode = cfg?.primaryBlock || cfg?.blocks[0]?.code || "";
            const numIscrSito = cfg?.unitId;
            const result = await vidimaFIRAsync(company, requestQty, blockCode, numIscrSito, (msg) => {
                toast.info(msg, { id: "vidimazione-progress" });
            });
            console.log("[RENTRI VIDIMAZIONE MN] Async result:", JSON.stringify(result));
            if (result.numeri.length > 0) {
                const realNumbers = result.numeri.filter((n) => n && !n.startsWith("FIR-") && !n.startsWith("TEST-"));
                if (realNumbers.length > 0) {
                    const rows = realNumbers.map((n) => ({ fir_number: n, user_id: SHARED_POOL_USER_ID, status: "available", societa_id: societaId }));
                    const { error } = await supabase.from("fir_number_pool").insert(rows);
                    if (error)
                        throw error;
                    queryClient.invalidateQueries({ queryKey: ["mn-fir-pool-stats"] });
                    toast.success(`✅ ${realNumbers.length} nuovi numeri ricevuti da RENTRI`);
                    if (result.partial) {
                        toast.warning(`Ricevuti solo ${realNumbers.length}/${requestQty} numeri (parziale)`);
                    }
                }
            }
            else if (result.pending) {
                toast.warning(`Richiesta accettata (transazione: ${result.transazione_id || "N/A"}) ma i numeri non sono ancora pronti. Riprova tra qualche minuto.`);
            }
            else {
                toast.error("Nessun numero ricevuto dalla vidimazione");
            }
        }
        catch (err) {
            toast.error(`Errore richiesta RENTRI: ${err.message}`);
        }
        finally {
            setIsRequesting(false);
        }
    };
    const handleAssign = async () => {
        if (!assignUserId || assignQty < 1)
            return;
        setIsAssigning(true);
        try {
            const { data: available, error: fetchErr } = await supabase.from("fir_number_pool")
                .select("id").eq("societa_id", societaId).eq("status", "available").eq("user_id", SHARED_POOL_USER_ID).limit(assignQty);
            if (fetchErr)
                throw fetchErr;
            if (!available || available.length === 0) {
                toast.error("Nessun numero disponibile");
                setIsAssigning(false);
                return;
            }
            const ids = available.map(r => r.id);
            const { error: updateErr } = await supabase.from("fir_number_pool")
                .update({ user_id: assignUserId, assigned_by: user.id, assigned_at: new Date().toISOString() }).in("id", ids);
            if (updateErr)
                throw updateErr;
            queryClient.invalidateQueries({ queryKey: ["mn-fir-pool-stats"] });
            queryClient.invalidateQueries({ queryKey: ["mn-fir-pool-list"] });
            toast.success(`✅ ${ids.length} numeri assegnati`);
            setAssignUserId(null);
            setAssignSearch("");
            setAssignQty(1);
        }
        catch (err) {
            toast.error(`Errore: ${err.message}`);
        }
        finally {
            setIsAssigning(false);
        }
    };
    return (_jsx(MNAdminLayout, { title: `Gestione FIR — ${contextLabel}`, subtitle: "Serbatoio Numeri Formulario", children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsx(StatCard, { icon: _jsx(Database, { className: "h-5 w-5" }), label: "Totale", value: stats?.total ?? 0, color: "text-primary", loading: statsLoading }), _jsx(StatCard, { icon: _jsx(CheckCircle, { className: "h-5 w-5" }), label: "Disponibili", value: stats?.disponibili ?? 0, color: "text-neon-green", loading: statsLoading }), _jsx(StatCard, { icon: _jsx(Clock, { className: "h-5 w-5" }), label: "In Uso", value: stats?.inUso ?? 0, color: "text-neon-cyan", loading: statsLoading }), _jsx(StatCard, { icon: _jsx(Package, { className: "h-5 w-5" }), label: "Consumati", value: stats?.usati ?? 0, color: "text-orange-400", loading: statsLoading })] }), _jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2 text-primary", children: [_jsx(Upload, { className: "h-5 w-5" }), _jsx("h3", { className: "font-display text-lg tracking-wider uppercase", children: "Carica Numeri nel Serbatoio" })] }), _jsx("textarea", { value: bulkInput, onChange: (e) => setBulkInput(e.target.value), placeholder: "FMGWB001234\nFMGWB001235", rows: 4, className: "w-full bg-background/80 border border-primary/15 rounded-xl px-4 py-3 text-foreground text-sm font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary resize-none" }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "text-xs text-muted-foreground font-mono", children: [bulkInput.split(/[,\n\r]+/).filter(n => n.trim()).length, " numeri rilevati"] }), _jsxs("button", { onClick: handleBulkImport, disabled: !bulkInput.trim(), className: "px-6 py-3 rounded-xl bg-primary/20 border border-primary/30 text-primary font-display text-sm tracking-wider hover:bg-primary/30 transition-colors disabled:opacity-50 flex items-center gap-2", children: [_jsx(Upload, { className: "h-4 w-4" }), " CARICA"] })] })] }), _jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2 text-neon-cyan", children: [_jsx(RefreshCw, { className: "h-5 w-5" }), _jsx("h3", { className: "font-display text-lg tracking-wider uppercase", children: "Richiedi Nuovi Numeri a RENTRI" })] }), (stats?.disponibili ?? 0) === 0 && _jsxs("div", { className: "flex items-center gap-2 text-amber-400 text-xs font-mono", children: [_jsx(AlertTriangle, { className: "h-4 w-4" }), " Serbatoio vuoto!"] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("label", { className: "text-sm text-muted-foreground", children: "Quantit\u00E0:" }), _jsx("div", { className: "flex gap-2", children: [5, 10, 50, 100].map((q) => (_jsx("button", { onClick: () => setRequestQty(q), className: `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${requestQty === q ? "bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/50" : "bg-secondary/50 text-muted-foreground hover:text-foreground border border-transparent"}`, children: q }, q))) })] }), _jsxs("button", { onClick: handleRequestFromRentri, disabled: isRequesting, className: "px-6 py-3 rounded-xl bg-neon-cyan/20 border border-neon-cyan/30 text-neon-cyan font-display text-sm tracking-wider hover:bg-neon-cyan/30 transition-colors disabled:opacity-50 flex items-center gap-2", children: [isRequesting ? _jsx("div", { className: "w-4 h-4 border-2 border-neon-cyan/50 border-t-neon-cyan rounded-full animate-spin" }) : _jsx(RefreshCw, { className: "h-4 w-4" }), " RICHIEDI"] })] }), _jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2 text-amber-400", children: [_jsx(Zap, { className: "h-5 w-5" }), _jsx("h3", { className: "font-display text-lg tracking-wider uppercase", children: "Test Invio RENTRI" })] }), _jsxs("button", { onClick: async () => {
                                setIsTesting(true);
                                setTestResult(null);
                                const startTime = Date.now();
                                try {
                                    const { data: poolNum } = await supabase.from("fir_number_pool").select("fir_number").eq("societa_id", societaId).eq("status", "available").limit(1).maybeSingle();
                                    if (!poolNum?.fir_number) {
                                        setTestResult({ success: false, message: "❌ NESSUN NUMERO FIR REALE DISPONIBILE", details: "Richiedere nuovi numeri tramite vidimazione RENTRI." });
                                        toast.error("Nessun numero FIR reale disponibile per il test");
                                        setIsTesting(false);
                                        return;
                                    }
                                    const testFirNumber = poolNum.fir_number;
                                    const company = context === "multyproget" ? "multy" : "niyol";
                                    const result = await emissioneFir(company, {
                                        numero_fir: testFirNumber,
                                        produttore: { denominazione: "Test Srl", codice_fiscale: "00000000000", indirizzo: "Via Test 1, 10100 Torino (TO)" },
                                        destinatario: { denominazione: "Impianto Test Srl", codice_fiscale: "11111111111", indirizzo: "Via Prova 2, 10100 Torino (TO)" },
                                        trasportatore: { denominazione: "Trasporto Test Srl", codice_fiscale: "22222222222", albo: "TO/00001" },
                                        rifiuto: { codice_eer: "150101", descrizione: "Imballaggi di carta e cartone", stato_fisico: "solido non pulverulento", quantita: 10, unita_misura: "kg" },
                                    });
                                    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                                    const responseData = (result.data ?? {});
                                    setTestResult({
                                        success: result.success,
                                        message: result.success ? `✅ TEST SUPERATO (${elapsed}s)` : `❌ TEST FALLITO (${elapsed}s)`,
                                        details: JSON.stringify(result.data, null, 2),
                                        qrCode: responseData.qr_code || responseData.qrCodeBytes || "",
                                        numeroFir: responseData.numero_fir || responseData.firNumber || "",
                                    });
                                    if (result.success)
                                        toast.success("Test RENTRI superato!");
                                    else
                                        toast.error(`Test fallito: ${result.error ?? "verifica log tecnico"}`);
                                }
                                catch (err) {
                                    setTestResult({ success: false, message: `❌ TEST FALLITO`, details: err.message });
                                    toast.error("Test fallito: " + err.message);
                                }
                                finally {
                                    setIsTesting(false);
                                }
                            }, disabled: isTesting, className: "px-6 py-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-display text-sm tracking-wider hover:bg-amber-500/30 transition-colors disabled:opacity-50 flex items-center gap-2", children: [isTesting ? _jsx("div", { className: "w-4 h-4 border-2 border-amber-500/50 border-t-amber-400 rounded-full animate-spin" }) : _jsx(Zap, { className: "h-4 w-4" }), isTesting ? "INVIO IN CORSO..." : "ESEGUI TEST"] }), testResult && (_jsxs("div", { className: `rounded-xl border p-4 space-y-2 ${testResult.success ? "bg-neon-green/5 border-neon-green/30" : "bg-destructive/5 border-destructive/30"}`, children: [_jsxs("div", { className: "flex items-center gap-2", children: [testResult.success ? _jsx(CheckCircle, { className: "h-5 w-5 text-neon-green" }) : _jsx(XCircle, { className: "h-5 w-5 text-destructive" }), _jsx("span", { className: `font-display text-sm ${testResult.success ? "text-neon-green" : "text-destructive"}`, children: testResult.message })] }), _jsxs("details", { className: "text-xs", children: [_jsx("summary", { className: "cursor-pointer text-muted-foreground font-mono", children: "Log tecnico" }), _jsx("pre", { className: "mt-2 p-3 bg-background/80 rounded-lg overflow-x-auto text-muted-foreground font-mono text-[10px] max-h-60 overflow-y-auto", children: testResult.details })] })] }))] }), _jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2 text-primary", children: [_jsx(UserPlus, { className: "h-5 w-5" }), _jsx("h3", { className: "font-display text-lg tracking-wider uppercase", children: "Assegna Numeri a Utente" })] }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-3", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Users, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx("input", { value: assignSearch, onChange: (e) => { setAssignSearch(e.target.value); setAssignUserId(null); }, placeholder: "Cerca utente...", className: "w-full pl-9 pr-4 py-2 bg-background/80 border border-border/30 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary" }), filteredProfiles.length > 0 && !assignUserId && (_jsx("div", { className: "absolute z-20 top-full mt-1 left-0 right-0 bg-card border border-border/30 rounded-xl shadow-lg max-h-48 overflow-y-auto", children: filteredProfiles.map(p => (_jsxs("button", { onClick: () => { setAssignUserId(p.user_id); setAssignSearch(`${p.cognome} ${p.nome}`); }, className: "w-full text-left px-4 py-2 text-sm hover:bg-primary/10 text-foreground transition-colors", children: [p.cognome, " ", p.nome] }, p.user_id))) }))] }), _jsx("input", { type: "number", min: 1, value: assignQty, onChange: e => setAssignQty(Math.max(1, parseInt(e.target.value) || 1)), className: "w-24 bg-background/80 border border-border/30 rounded-xl px-3 py-2 text-sm font-mono text-foreground text-center" }), _jsxs("button", { onClick: handleAssign, disabled: !assignUserId || isAssigning, className: "px-6 py-2 rounded-xl bg-primary/20 border border-primary/30 text-primary font-display text-sm tracking-wider hover:bg-primary/30 disabled:opacity-50 flex items-center gap-2", children: [isAssigning ? _jsx("div", { className: "w-4 h-4 border-2 border-primary/50 border-t-primary rounded-full animate-spin" }) : _jsx(UserPlus, { className: "h-4 w-4" }), " ASSEGNA"] })] })] }), _jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2 text-primary", children: [_jsx(Database, { className: "h-5 w-5" }), _jsx("h3", { className: "font-display text-lg tracking-wider uppercase", children: "Elenco Numeri" })] }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-3", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx("input", { value: poolSearch, onChange: e => { setPoolSearch(e.target.value); setPoolPage(0); }, placeholder: "Cerca numero FIR...", className: "w-full pl-9 pr-4 py-2 bg-background/80 border border-border/30 rounded-xl text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary" })] }), _jsx("div", { className: "flex gap-1", children: ["all", "available", "reserved", "consumed"].map(f => (_jsx("button", { onClick: () => { setPoolFilter(f); setPoolPage(0); }, className: `px-3 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors ${poolFilter === f ? "bg-primary/20 text-primary border border-primary/30" : "bg-background/50 text-muted-foreground border border-border/20 hover:bg-primary/10"}`, children: f === "all" ? "Tutti" : f === "available" ? "Disponibili" : f === "reserved" ? "Assegnati" : "Usati" }, f))) })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30 text-muted-foreground font-mono text-xs uppercase", children: [_jsx("th", { className: "text-left py-2 px-3", children: "Numero FIR" }), _jsx("th", { className: "text-left py-2 px-3", children: "Stato" }), _jsx("th", { className: "text-left py-2 px-3", children: "Assegnato a" }), _jsx("th", { className: "text-left py-2 px-3 hidden md:table-cell", children: "Creato il" })] }) }), _jsx("tbody", { children: poolLoading ? _jsx("tr", { children: _jsx("td", { colSpan: 4, className: "py-8 text-center text-muted-foreground", children: "Caricamento..." }) })
                                            : (poolData?.rows.length ?? 0) === 0 ? _jsx("tr", { children: _jsx("td", { colSpan: 4, className: "py-8 text-center text-muted-foreground", children: "Nessun numero trovato" }) })
                                                : poolData.rows.map((row) => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-primary/5 transition-colors", children: [_jsx("td", { className: "py-2 px-3 font-mono text-foreground", children: row.fir_number }), _jsx("td", { className: "py-2 px-3", children: _jsx("span", { className: `inline-block px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${row.status === "available" ? "bg-green-500/15 text-green-400" : row.status === "reserved" ? "bg-cyan-500/15 text-cyan-400" : "bg-orange-500/15 text-orange-400"}`, children: row.status === "available" ? "Disponibile" : row.status === "reserved" ? "Assegnato" : "Usato" }) }), _jsx("td", { className: "py-2 px-3 text-foreground text-xs", children: row.status !== "available" ? (profileMap[row.user_id] || "—") : "—" }), _jsx("td", { className: "py-2 px-3 hidden md:table-cell text-muted-foreground font-mono text-xs", children: new Date(row.created_at).toLocaleDateString("it-IT") })] }, row.id))) })] }) }), (poolData?.total ?? 0) > PAGE_SIZE && (_jsxs("div", { className: "flex items-center justify-between pt-2", children: [_jsxs("span", { className: "text-xs font-mono text-muted-foreground", children: [poolPage * PAGE_SIZE + 1, "\u2013", Math.min((poolPage + 1) * PAGE_SIZE, poolData.total), " di ", poolData.total] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setPoolPage(p => Math.max(0, p - 1)), disabled: poolPage === 0, className: "p-2 rounded-lg bg-background/50 border border-border/20 text-muted-foreground hover:text-foreground disabled:opacity-30", children: _jsx(ChevronLeft, { className: "h-4 w-4" }) }), _jsx("button", { onClick: () => setPoolPage(p => p + 1), disabled: (poolPage + 1) * PAGE_SIZE >= (poolData?.total ?? 0), className: "p-2 rounded-lg bg-background/50 border border-border/20 text-muted-foreground hover:text-foreground disabled:opacity-30", children: _jsx(ChevronRight, { className: "h-4 w-4" }) })] })] }))] })] }) }));
}
function StatCard({ icon, label, value, color, loading }) {
    return (_jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/30 p-4 flex flex-col items-center gap-2", children: [_jsx("div", { className: `${color} opacity-70`, children: icon }), _jsx("span", { className: `text-2xl font-display font-bold ${color}`, children: loading ? "—" : value }), _jsx("span", { className: "text-xs font-mono uppercase tracking-wider text-muted-foreground", children: label })] }));
}
