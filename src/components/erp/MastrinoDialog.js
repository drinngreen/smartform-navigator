import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { X, Download } from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";
export function MastrinoDialog({ contoId, tenantId, onClose }) {
    const { data: conto } = useQuery({
        queryKey: ["erp-conto-detail", contoId],
        queryFn: async () => {
            const { data, error } = await supabase.from("erp_piano_conti").select("*").eq("id", contoId).single();
            if (error)
                throw error;
            return data;
        },
    });
    const { data: righe = [], isLoading } = useQuery({
        queryKey: ["erp-mastrino", contoId, tenantId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("erp_prima_nota_righe")
                .select("*, prima_nota:erp_prima_nota!erp_prima_nota_righe_prima_nota_id_fkey(data_registrazione, numero_registro, descrizione, tenant_id)")
                .eq("conto_id", contoId)
                .order("created_at", { ascending: true });
            if (error)
                throw error;
            let filtered = data;
            if (tenantId) {
                filtered = filtered.filter((r) => r.prima_nota?.tenant_id === tenantId);
            }
            return filtered;
        },
    });
    const formatCurrency = (v) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v);
    // Calculate progressive balance
    let saldoProgressivo = 0;
    const rows = righe.map((r) => {
        const dare = r.segno === "DARE" ? Number(r.importo) : 0;
        const avere = r.segno === "AVERE" ? Number(r.importo) : 0;
        saldoProgressivo += dare - avere;
        return { ...r, dare, avere, saldo: saldoProgressivo };
    });
    const handleExport = () => {
        exportToExcel(rows, [
            { header: "Data", key: "prima_nota", width: 12, format: (_, row) => row.prima_nota?.data_registrazione || "" },
            { header: "N. Reg.", key: "prima_nota", width: 8, format: (_, row) => String(row.prima_nota?.numero_registro || "") },
            { header: "Descrizione", key: "prima_nota", width: 35, format: (_, row) => row.prima_nota?.descrizione || "" },
            { header: "Dare", key: "dare", width: 14, format: (v) => v > 0 ? v.toFixed(2) : "" },
            { header: "Avere", key: "avere", width: 14, format: (v) => v > 0 ? v.toFixed(2) : "" },
            { header: "Saldo", key: "saldo", width: 14, format: (v) => v.toFixed(2) },
        ], `mastrino-${conto?.codice || "conto"}`, "Mastrino");
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4", children: _jsxs("div", { className: "w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-card border border-border/30 rounded-2xl shadow-2xl", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-border/30", children: [_jsxs("div", { children: [_jsxs("h2", { className: "text-lg font-semibold text-foreground", children: ["Mastrino: ", conto?.codice, " \u2014 ", conto?.descrizione] }), _jsxs("p", { className: "text-xs text-muted-foreground", children: ["Saldo finale: ", formatCurrency(saldoProgressivo)] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: handleExport, className: "p-2 rounded-lg hover:bg-muted/20 text-muted-foreground", title: "Esporta", children: _jsx(Download, { className: "h-4 w-4" }) }), _jsx("button", { onClick: onClose, className: "p-2 rounded-lg hover:bg-muted/20 text-muted-foreground", children: _jsx(X, { className: "h-5 w-5" }) })] })] }), _jsx("div", { className: "p-4", children: isLoading ? (_jsx("div", { className: "p-8 text-center text-muted-foreground", children: "Caricamento..." })) : rows.length === 0 ? (_jsx("div", { className: "p-8 text-center text-muted-foreground", children: "Nessun movimento per questo conto" })) : (_jsx("div", { className: "overflow-x-auto rounded-xl border border-border/30", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30 bg-muted/10", children: [_jsx("th", { className: "px-3 py-2 text-left text-xs font-mono uppercase text-muted-foreground", children: "Data" }), _jsx("th", { className: "px-3 py-2 text-left text-xs font-mono uppercase text-muted-foreground", children: "N." }), _jsx("th", { className: "px-3 py-2 text-left text-xs font-mono uppercase text-muted-foreground", children: "Descrizione" }), _jsx("th", { className: "px-3 py-2 text-right text-xs font-mono uppercase text-blue-400", children: "Dare" }), _jsx("th", { className: "px-3 py-2 text-right text-xs font-mono uppercase text-green-400", children: "Avere" }), _jsx("th", { className: "px-3 py-2 text-right text-xs font-mono uppercase text-muted-foreground", children: "Saldo" })] }) }), _jsx("tbody", { children: rows.map((r, i) => (_jsxs("tr", { className: `border-b border-border/10 ${i % 2 === 0 ? "" : "bg-muted/5"}`, children: [_jsx("td", { className: "px-3 py-2 text-muted-foreground", children: r.prima_nota?.data_registrazione }), _jsx("td", { className: "px-3 py-2 font-mono text-foreground", children: r.prima_nota?.numero_registro }), _jsx("td", { className: "px-3 py-2 text-foreground", children: r.descrizione_riga || r.prima_nota?.descrizione || "—" }), _jsx("td", { className: "px-3 py-2 text-right font-mono text-blue-400", children: r.dare > 0 ? formatCurrency(r.dare) : "" }), _jsx("td", { className: "px-3 py-2 text-right font-mono text-green-400", children: r.avere > 0 ? formatCurrency(r.avere) : "" }), _jsx("td", { className: `px-3 py-2 text-right font-mono font-semibold ${r.saldo >= 0 ? "text-foreground" : "text-destructive"}`, children: formatCurrency(r.saldo) })] }, r.id))) })] }) })) })] }) }));
}
