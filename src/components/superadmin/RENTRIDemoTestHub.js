import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Loader2, FlaskConical, Truck, Factory, FileSignature, Package, CheckCircle, XCircle, RefreshCw, Copy, Check, Fuel } from "lucide-react";
import { inviaOperazioneRentri } from "@/lib/rentriVpsApi";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { getBlocksForTenant } from "@/lib/rentriBlockCodes";
const QUANTITIES = [5, 10, 50, 100];
const TENANT_MAP = {
    global: { id: "global", label: "Global Reco", cliente: "global", canProduttore: true, canTrasportatore: true, canImpianto: false },
    multy: { id: "multy", label: "Multy Proget", cliente: "multy", canProduttore: true, canTrasportatore: true, canImpianto: true },
    niyol: { id: "niyol", label: "Niyol", cliente: "niyol", canProduttore: false, canTrasportatore: true, canImpianto: false },
};
const FIR_NUMBER_REGEX = /^[A-Z]{5} [0-9]{6} [A-Z]{2}$/;
const normalizeFirNumber = (v) => v.trim().replace(/\s+/g, " ").toUpperCase();
export function RENTRIDemoTestHub({ tenant }) {
    const cfg = TENANT_MAP[tenant] ?? TENANT_MAP.global;
    const blocks = getBlocksForTenant(cfg.id);
    const [selectedBlock, setSelectedBlock] = useState(blocks[0]?.code ?? "");
    const [qty, setQty] = useState(5);
    const [loading, setLoading] = useState(null);
    const [results, setResults] = useState([]);
    const [demoNumbers, setDemoNumbers] = useState([]);
    const [copiedId, setCopiedId] = useState(null);
    const [signingId, setSigningId] = useState(null);
    const [signingType, setSigningType] = useState(null);
    const fetchDemoPool = async () => {
        const { data, error } = await supabase
            .from("fir_number_pool")
            .select("id, fir_number")
            .eq("societa_id", cfg.id)
            .eq("is_demo", true)
            .eq("status", "available")
            .eq("suspended", false)
            .order("created_at", { ascending: true });
        if (error) {
            toast.error("Errore caricamento pool demo: " + error.message);
        }
        else {
            setDemoNumbers(data ?? []);
        }
    };
    useEffect(() => { fetchDemoPool(); }, [cfg.id]);
    const addResult = (operation, res) => {
        setResults(prev => [{
                id: crypto.randomUUID(),
                operation,
                success: res.success,
                status: res.status,
                data: res.data,
                timestamp: new Date(),
            }, ...prev].slice(0, 20));
    };
    // --- VIDIMAZIONE DEMO ---
    const handleVidimazione = async () => {
        setLoading("vidimazione");
        const blockInfo = blocks.find(b => b.code === selectedBlock);
        const res = await inviaOperazioneRentri({
            cliente: cfg.cliente,
            tipo_operazione: "VIDIMAZIONE",
            payload: {
                quantita: qty,
                codice_blocco: selectedBlock || undefined,
                num_iscr_sito: blockInfo?.sito || undefined,
            },
        });
        addResult(`VIDIMAZIONE (${qty})`, res);
        if (res.success && res.data) {
            const raw = res.data?.numeri;
            const rawNumbers = Array.isArray(raw) ? raw : [];
            const normalized = rawNumbers.map(n => normalizeFirNumber(String(n)));
            const valid = normalized.filter(n => FIR_NUMBER_REGEX.test(n));
            if (valid.length > 0) {
                const rows = valid.map(n => ({
                    fir_number: n,
                    user_id: "00000000-0000-0000-0000-000000000000",
                    societa_id: cfg.id,
                    status: "available",
                    is_demo: true,
                }));
                const { error } = await supabase.from("fir_number_pool").insert(rows);
                if (error) {
                    toast.error("Errore salvataggio pool demo: " + error.message);
                }
                else {
                    toast.success(`${valid.length} numeri FIR demo caricati per ${cfg.label}`);
                    fetchDemoPool();
                }
            }
            else {
                toast.warning("Nessun numero FIR valido ricevuto");
            }
        }
        else {
            toast.error("Vidimazione fallita: " + (res.error ?? "errore sconosciuto"));
        }
        setLoading(null);
    };
    // --- COPY ---
    const handleCopy = async (firNumber, id) => {
        await navigator.clipboard.writeText(firNumber);
        setCopiedId(id);
        toast.success("Numero FIR demo copiato!");
        setTimeout(() => setCopiedId(null), 2000);
    };
    // --- FIRMA DA SERBATOIO ---
    const handleFirmaFromPool = async (pool, tipo) => {
        setSigningId(pool.id);
        setSigningType(tipo);
        try {
            const tipoOperazione = tipo === "impianto" ? "REGISTRO" : "FIR_EMISSIONE";
            const res = await inviaOperazioneRentri({
                cliente: cfg.cliente,
                tipo_operazione: tipoOperazione,
                payload: { firNumber: pool.fir_number, ruolo: tipo },
            });
            const label = tipo === "impianto" ? "REGISTRO IMPIANTO" : `FIRMA ${tipo.toUpperCase()}`;
            addResult(label, res);
            if (res.success) {
                toast.success(`${label} completata per ${pool.fir_number}!`);
                // Mark as consumed
                await supabase
                    .from("fir_number_pool")
                    .update({ status: "consumed", consumed_at: new Date().toISOString() })
                    .eq("id", pool.id);
                // Remove from local list
                setDemoNumbers(prev => prev.filter(n => n.id !== pool.id));
            }
            else {
                toast.error(`Errore ${label}: ${JSON.stringify(res.data)}`);
            }
        }
        catch (err) {
            toast.error(`Errore firma ${tipo}: ${err.message}`);
        }
        setSigningId(null);
        setSigningType(null);
    };
    const isLoading = !!loading;
    return (_jsxs("div", { className: "bg-card rounded-xl border border-amber-500/30 overflow-hidden", children: [_jsxs("div", { className: "bg-amber-500/10 border-b border-amber-500/30 px-6 py-4 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(FlaskConical, { size: 22, className: "text-amber-400" }), _jsxs("div", { children: [_jsxs("h3", { className: "text-lg font-display text-foreground", children: ["RENTRI Demo Test Hub \u2014 ", cfg.label.toUpperCase()] }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Certificati DEMO \u00B7 Pool isolato \u00B7 Nessun impatto su produzione" })] })] }), _jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx(Package, { size: 16, className: "text-amber-400" }), _jsx("span", { className: "text-amber-300 font-semibold", children: demoNumbers.length }), _jsx("span", { className: "text-muted-foreground", children: "FIR demo disponibili" }), _jsx("button", { onClick: fetchDemoPool, className: "ml-1 p-1 rounded hover:bg-secondary/50", children: _jsx(RefreshCw, { size: 14 }) })] })] }), _jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("section", { children: [_jsxs("h4", { className: "text-sm font-semibold text-foreground flex items-center gap-2 mb-3", children: [_jsx(Package, { size: 16, className: "text-amber-400" }), " Rifornimento Serbatoio Demo (Vidimazione)"] }), _jsxs("div", { className: "flex items-center gap-4 flex-wrap", children: [_jsx("div", { className: "flex gap-2", children: QUANTITIES.map(q => (_jsx("button", { onClick: () => setQty(q), className: `px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${qty === q ? "bg-amber-600 text-white" : "bg-secondary/50 text-muted-foreground hover:text-foreground"}`, children: q }, q))) }), blocks.length > 0 && (_jsx("select", { value: selectedBlock, onChange: e => setSelectedBlock(e.target.value), className: "px-3 py-1.5 rounded-lg text-sm bg-secondary/50 border border-border text-foreground", children: blocks.map(b => (_jsxs("option", { value: b.code, children: [b.code, " \u2014 ", b.label] }, b.code))) })), _jsxs("button", { onClick: handleVidimazione, disabled: isLoading, className: "px-5 py-2 rounded-lg font-semibold bg-amber-600 text-black hover:bg-amber-500 disabled:opacity-50 flex items-center gap-2 text-sm", children: [loading === "vidimazione" ? _jsx(Loader2, { className: "animate-spin", size: 16 }) : null, "RICHIEDI NUMERI DEMO"] })] })] }), _jsxs("section", { children: [_jsxs("h4", { className: "text-sm font-semibold text-foreground flex items-center gap-2 mb-3", children: [_jsx(Fuel, { size: 16, className: "text-amber-400" }), " Serbatoio Demo \u2014 ", cfg.label.toUpperCase()] }), demoNumbers.length === 0 ? (_jsx("div", { className: "text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-lg", children: "Nessun FIR demo disponibile. Usa \"Rifornimento\" sopra per richiederne." })) : (_jsx("div", { className: "space-y-2 max-h-[350px] overflow-y-auto pr-1", children: demoNumbers.map(pool => {
                                    const isActive = signingId === pool.id;
                                    const btnBase = "px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 flex items-center gap-1 transition-all";
                                    return (_jsxs("div", { className: "flex items-center justify-between gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 transition-all", children: [_jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [_jsx("button", { onClick: () => handleCopy(pool.fir_number, pool.id), className: "shrink-0 p-2 rounded-md bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all", title: "Copia numero FIR", children: copiedId === pool.id ? _jsx(Check, { size: 14, className: "text-green-400" }) : _jsx(Copy, { size: 14 }) }), _jsx("code", { className: "text-sm font-mono text-foreground truncate select-all", children: pool.fir_number })] }), _jsxs("div", { className: "flex gap-1.5 flex-wrap", children: [cfg.canProduttore && (_jsxs("button", { onClick: () => handleFirmaFromPool(pool, "produttore"), disabled: isActive, className: `${btnBase} bg-yellow-600/80 text-yellow-100 hover:bg-yellow-500`, children: [isActive && signingType === "produttore" ? _jsx(Loader2, { className: "animate-spin", size: 12 }) : _jsx(FileSignature, { size: 12 }), "Produttore"] })), cfg.canTrasportatore && (_jsxs("button", { onClick: () => handleFirmaFromPool(pool, "trasportatore"), disabled: isActive, className: `${btnBase} bg-blue-600/80 text-blue-100 hover:bg-blue-500`, children: [isActive && signingType === "trasportatore" ? _jsx(Loader2, { className: "animate-spin", size: 12 }) : _jsx(Truck, { size: 12 }), "Trasportatore"] })), cfg.canImpianto && (_jsxs("button", { onClick: () => handleFirmaFromPool(pool, "impianto"), disabled: isActive, className: `${btnBase} bg-green-600/80 text-green-100 hover:bg-green-500`, children: [isActive && signingType === "impianto" ? _jsx(Loader2, { className: "animate-spin", size: 12 }) : _jsx(Factory, { size: 12 }), "Impianto"] }))] })] }, pool.id));
                                }) }))] }), results.length > 0 && (_jsxs("section", { children: [_jsxs("h4", { className: "text-sm font-semibold text-foreground flex items-center gap-2 mb-3", children: ["Risultati (", results.length, ")"] }), _jsx("div", { className: "max-h-64 overflow-y-auto space-y-2 font-mono text-xs", children: results.map(r => (_jsxs("div", { className: `p-3 rounded-lg border ${r.success ? "border-green-800/30 bg-green-950/20" : "border-red-800/30 bg-red-950/20"}`, children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [r.success ? _jsx(CheckCircle, { size: 14, className: "text-green-400" }) : _jsx(XCircle, { size: 14, className: "text-red-400" }), _jsx("span", { className: "text-foreground font-semibold", children: r.operation }), _jsxs("span", { className: r.success ? "text-green-400" : "text-red-400", children: ["HTTP ", r.status] })] }), _jsx("span", { className: "text-muted-foreground", children: r.timestamp.toLocaleTimeString() })] }), _jsx("pre", { className: "text-muted-foreground whitespace-pre-wrap break-all max-h-20 overflow-hidden", children: JSON.stringify(r.data, null, 1) })] }, r.id))) })] }))] })] }));
}
