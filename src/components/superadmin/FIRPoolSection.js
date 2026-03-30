import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Download, Loader2, Package } from "lucide-react";
import { richiestaVidimazioneNgrok } from "@/lib/rentriNgrokApi";
import { downloadCSV } from "@/lib/rentriSuperApi";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { getBlocksForTenant } from "@/lib/rentriBlockCodes";
const QUANTITIES = [5, 10, 50, 100, 500];
const FIR_NUMBER_REGEX = /^[A-Z]{5} [0-9]{6} [A-Z]{2}$/;
const normalizeFirNumber = (value) => value.trim().replace(/\s+/g, " ").toUpperCase();
export function FIRPoolSection({ tenant }) {
    const blocks = getBlocksForTenant(tenant);
    const [selectedBlock, setSelectedBlock] = useState(blocks[0]?.code ?? "");
    const [qty, setQty] = useState(5);
    const [loading, setLoading] = useState(false);
    const [lastNumbers, setLastNumbers] = useState([]);
    const handleRequest = async () => {
        setLoading(true);
        const company = tenant.toUpperCase() === "MULTYPROGET" ? "MULTY" : tenant.toUpperCase();
        const result = await richiestaVidimazioneNgrok(company, qty);
        if (result.ok && result.data?.numeri) {
            const rawNumbers = Array.isArray(result.data.numeri) ? result.data.numeri : [];
            const normalized = rawNumbers.map((n) => normalizeFirNumber(String(n)));
            const validNumbers = normalized.filter((n) => FIR_NUMBER_REGEX.test(n));
            const invalidCount = normalized.length - validNumbers.length;
            setLastNumbers(validNumbers);
            if (validNumbers.length === 0) {
                toast.error("Nessun numero FIR valido ricevuto dalla vidimazione");
                if (invalidCount > 0) {
                    toast.warning(`${invalidCount} numeri scartati per formato non valido`);
                }
                setLoading(false);
                return;
            }
            const rows = validNumbers.map((n) => ({
                fir_number: n,
                user_id: "00000000-0000-0000-0000-000000000000", // pool placeholder
                societa_id: tenant,
                status: "available",
            }));
            const { error } = await supabase.from("fir_number_pool").insert(rows);
            if (error) {
                toast.error("Numeri ricevuti ma errore nel salvataggio: " + error.message);
            }
            else {
                toast.success(`${validNumbers.length} numeri FIR validi caricati nel pool ${tenant}`);
                if (invalidCount > 0) {
                    toast.warning(`${invalidCount} numeri scartati per formato non valido`);
                }
            }
        }
        else {
            toast.error("Errore vidimazione: " + JSON.stringify(result.data));
        }
        setLoading(false);
    };
    return (_jsxs("div", { className: "bg-card rounded-xl p-6 border border-border", children: [_jsxs("h3", { className: "text-lg font-display text-foreground flex items-center gap-2 mb-4", children: [_jsx(Package, { size: 20 }), " Rifornimento FIR \u2014 ", tenant.toUpperCase()] }), _jsxs("div", { className: "flex items-center gap-4 mb-4 flex-wrap", children: [_jsx("label", { className: "text-sm text-muted-foreground", children: "Quantit\u00E0:" }), _jsx("div", { className: "flex gap-2", children: QUANTITIES.map((q) => (_jsx("button", { onClick: () => setQty(q), className: `px-4 py-2 rounded-lg text-sm font-semibold transition-all ${qty === q ? "bg-red-600 text-white" : "bg-secondary/50 text-muted-foreground hover:text-foreground"}`, children: q }, q))) }), blocks.length > 0 && (_jsx("select", { value: selectedBlock, onChange: e => setSelectedBlock(e.target.value), className: "px-3 py-2 rounded-lg text-sm bg-secondary/50 border border-border text-foreground", children: blocks.map(b => (_jsxs("option", { value: b.code, children: [b.code, " \u2014 ", b.label] }, b.code))) }))] }), _jsxs("div", { className: "flex gap-3", children: [_jsxs("button", { onClick: handleRequest, disabled: loading, className: "px-6 py-3 rounded-lg font-display font-semibold bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 flex items-center gap-2", children: [loading ? _jsx(Loader2, { className: "animate-spin", size: 18 }) : null, "RICHIEDI NUOVI NUMERI"] }), lastNumbers.length > 0 && (_jsxs("button", { onClick: () => downloadCSV(lastNumbers, `fir_${tenant}_${Date.now()}.csv`), className: "px-4 py-3 rounded-lg bg-secondary/50 text-foreground hover:bg-secondary flex items-center gap-2", children: [_jsx(Download, { size: 18 }), " CSV (", lastNumbers.length, ")"] }))] })] }));
}
