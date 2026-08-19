import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Copy, Check, Loader2, Fuel } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { emissioneFir, firmaRicezione } from "@/lib/rentriVpsApi";
import { toast } from "sonner";
const TENANT_MAP = {
    global: "global",
    multy: "multy",
    niyol: "niyol",
};
const COMPANY_MAP = {
    global: "GLOBAL",
    multy: "MULTY",
    niyol: "NIYOL",
};
export function FIRPoolTank({ tenant }) {
    const [numbers, setNumbers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState(null);
    const [signingId, setSigningId] = useState(null);
    const [signingType, setSigningType] = useState(null);
    const societaId = TENANT_MAP[tenant] ?? tenant;
    const company = COMPANY_MAP[tenant] ?? tenant.toUpperCase();
    const fetchNumbers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("fir_number_pool")
            .select("id, fir_number, status, societa_id, created_at")
            .eq("societa_id", societaId)
            .eq("status", "available")
            .eq("is_demo", false)
            .eq("suspended", false)
            .order("created_at", { ascending: true });
        if (error) {
            toast.error("Errore caricamento pool: " + error.message);
        }
        else {
            setNumbers(data ?? []);
        }
        setLoading(false);
    };
    useEffect(() => {
        fetchNumbers();
    }, [tenant]);
    const handleCopy = async (firNumber, id) => {
        await navigator.clipboard.writeText(firNumber);
        setCopiedId(id);
        toast.success("Numero FIR copiato!");
        setTimeout(() => setCopiedId(null), 2000);
    };
    const handleFirma = async (pool, tipo) => {
        setSigningId(pool.id);
        setSigningType(tipo);
        try {
            let result;
            const payload = { firNumber: pool.fir_number };
            const cliente = (tenant.toLowerCase());
            if (tipo === "produttore") {
                const r = await emissioneFir(cliente, payload);
                result = { ok: r.success, status: r.status, data: r.data };
            }
            else if (tipo === "trasportatore") {
                const r = await emissioneFir(cliente, { ...payload, tipo: "trasportatore" });
                result = { ok: r.success, status: r.status, data: r.data };
            }
            else {
                const r = await firmaRicezione(cliente, payload);
                result = { ok: r.success, status: r.status, data: r.data };
            }
            if (result.ok) {
                toast.success(`Firma ${tipo} completata per ${pool.fir_number}!`);
                // Mark as consumed in the pool
                const { error } = await supabase
                    .from("fir_number_pool")
                    .update({ status: "consumed", consumed_at: new Date().toISOString() })
                    .eq("id", pool.id);
                if (error) {
                    toast.error("Firma OK ma errore aggiornamento pool: " + error.message);
                }
                // Remove from local list
                setNumbers((prev) => prev.filter((n) => n.id !== pool.id));
            }
            else {
                toast.error(`Errore firma ${tipo}: ${JSON.stringify(result.data)}`);
            }
        }
        catch (err) {
            toast.error(`Errore firma ${tipo}: ${err.message}`);
        }
        setSigningId(null);
        setSigningType(null);
    };
    const firmaButtons = (pool) => {
        const isActive = signingId === pool.id;
        const btnBase = "px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 flex items-center gap-1 transition-all";
        return (_jsxs("div", { className: "flex gap-1.5 flex-wrap", children: [_jsxs("button", { onClick: () => handleFirma(pool, "produttore"), disabled: isActive, className: `${btnBase} bg-yellow-600/80 text-yellow-100 hover:bg-yellow-500`, children: [isActive && signingType === "produttore" ? _jsx(Loader2, { className: "animate-spin", size: 12 }) : null, "Produttore"] }), tenant === "multy" && (_jsxs("button", { onClick: () => handleFirma(pool, "trasportatore"), disabled: isActive, className: `${btnBase} bg-blue-600/80 text-blue-100 hover:bg-blue-500`, children: [isActive && signingType === "trasportatore" ? _jsx(Loader2, { className: "animate-spin", size: 12 }) : null, "Trasportatore"] })), _jsxs("button", { onClick: () => handleFirma(pool, "destinatario"), disabled: isActive, className: `${btnBase} bg-green-600/80 text-green-100 hover:bg-green-500`, children: [isActive && signingType === "destinatario" ? _jsx(Loader2, { className: "animate-spin", size: 12 }) : null, "Destinatario"] })] }));
    };
    return (_jsxs("div", { className: "bg-card rounded-xl p-6 border border-border", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("h3", { className: "text-lg font-display text-foreground flex items-center gap-2", children: [_jsx(Fuel, { size: 20, className: "text-red-400" }), "Serbatoio FIR \u2014 ", tenant.toUpperCase()] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "text-sm text-muted-foreground", children: loading ? "..." : `${numbers.length} disponibili` }), _jsx("button", { onClick: fetchNumbers, disabled: loading, className: "text-xs px-3 py-1.5 rounded-lg bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all", children: "Aggiorna" })] })] }), loading ? (_jsx("div", { className: "flex justify-center py-8", children: _jsx(Loader2, { className: "animate-spin text-muted-foreground", size: 24 }) })) : numbers.length === 0 ? (_jsxs("div", { className: "text-center py-8 text-muted-foreground text-sm", children: ["Nessun numero FIR disponibile per ", tenant.toUpperCase(), ". Usa \"Rifornimento FIR\" per aggiungerne."] })) : (_jsx("div", { className: "space-y-2 max-h-[400px] overflow-y-auto pr-1", children: numbers.map((pool) => (_jsxs("div", { className: "flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50 hover:bg-secondary/50 transition-all", children: [_jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [_jsx("button", { onClick: () => handleCopy(pool.fir_number, pool.id), className: "shrink-0 p-2 rounded-md bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all", title: "Copia numero FIR", children: copiedId === pool.id ? (_jsx(Check, { size: 14, className: "text-green-400" })) : (_jsx(Copy, { size: 14 })) }), _jsx("code", { className: "text-sm font-mono text-foreground truncate select-all", children: pool.fir_number })] }), firmaButtons(pool)] }, pool.id))) }))] }));
}
