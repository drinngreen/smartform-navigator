import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useMNContextStore } from "@/stores/mnContextStore";
import { inviaOperazioneRentri, } from "@/lib/rentriVpsApi";
import { Loader2, Send, CheckCircle2, XCircle, FileText, Truck, ClipboardList, } from "lucide-react";
const CONTEXT_TO_CLIENTE = {
    multyproget: "multy",
    "multyproget-intermediario": "multy",
    "multyproget-impianto": "multy",
    niyol: "niyol",
};
const TIPO_OPTIONS = [
    { value: "REGISTRO", label: "Registro", icon: _jsx(ClipboardList, { size: 14 }) },
    { value: "FIR_EMISSIONE", label: "Emissione FIR", icon: _jsx(Truck, { size: 14 }) },
    { value: "VIDIMAZIONE", label: "Vidimazione", icon: _jsx(FileText, { size: 14 }) },
    { value: "LOTTO", label: "Lotto FIR", icon: _jsx(FileText, { size: 14 }) },
    { value: "LISTA_BLOCCHI", label: "Lista Blocchi", icon: _jsx(ClipboardList, { size: 14 }) },
    { value: "DETTAGLIO_FIR", label: "Dettaglio FIR", icon: _jsx(FileText, { size: 14 }) },
    { value: "FIRMA_RICEZIONE", label: "Firma Ricezione", icon: _jsx(Truck, { size: 14 }) },
];
function ResultBanner({ result }) {
    if (!result)
        return null;
    return (_jsxs("div", { className: `mt-4 rounded-xl p-4 text-xs font-mono whitespace-pre-wrap max-h-64 overflow-auto border ${result.success
            ? "bg-green-500/10 border-green-500/30 text-green-300"
            : "bg-red-500/10 border-red-500/30 text-red-300"}`, children: [_jsxs("div", { className: "flex items-center gap-2 mb-2 font-semibold text-sm font-sans", children: [result.success ? (_jsx(CheckCircle2, { size: 16, className: "text-green-400" })) : (_jsx(XCircle, { size: 16, className: "text-red-400" })), result.success ? "Invio riuscito" : "Errore", result.status > 0 && (_jsxs("span", { className: "text-muted-foreground ml-auto", children: ["HTTP ", result.status] }))] }), result.error && _jsx("p", { className: "text-red-400 mb-2", children: result.error }), result.data && JSON.stringify(result.data, null, 2)] }));
}
export default function MNRENTRIPage() {
    const { activeContext } = useMNContextStore();
    const cliente = CONTEXT_TO_CLIENTE[activeContext.id] ?? "global";
    const [tipoOperazione, setTipoOperazione] = useState("REGISTRO");
    const [payloadText, setPayloadText] = useState("{}");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const handleInvia = async () => {
        setLoading(true);
        setResult(null);
        let payload;
        try {
            payload = JSON.parse(payloadText);
        }
        catch {
            setResult({ success: false, status: 0, data: null, error: "JSON payload non valido" });
            setLoading(false);
            return;
        }
        const res = await inviaOperazioneRentri({
            cliente,
            tipo_operazione: tipoOperazione,
            payload,
        });
        setResult(res);
        setLoading(false);
    };
    return (_jsx(MNAdminLayout, { title: "RENTRI", subtitle: "Invio operazioni al server RENTRI", children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center gap-3 p-4 rounded-xl bg-card/60 border border-border/30", children: [_jsx("div", { className: "h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse" }), _jsxs("span", { className: "text-sm text-muted-foreground", children: ["Server VPS: ", _jsx("strong", { className: "text-foreground", children: "178.104.22.197:3000" })] }), _jsx("span", { className: "ml-auto text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-semibold uppercase tracking-wider", children: cliente })] }), _jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/30 p-6 space-y-5", children: [_jsxs("h3", { className: "text-base font-display tracking-wider flex items-center gap-2", children: [_jsx(Send, { size: 16, className: "text-primary" }), "Invia Operazione"] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-xs text-muted-foreground font-medium", children: "Tipo Operazione" }), _jsx("div", { className: "flex gap-2 flex-wrap", children: TIPO_OPTIONS.map((opt) => (_jsxs("button", { onClick: () => setTipoOperazione(opt.value), className: `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${tipoOperazione === opt.value
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary"}`, children: [opt.icon, opt.label] }, opt.value))) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-xs text-muted-foreground font-medium", children: "Payload (JSON)" }), _jsx("textarea", { value: payloadText, onChange: (e) => setPayloadText(e.target.value), rows: 6, placeholder: '{"codice_eer": "170904", "quantita": 1.5, ...}', className: "w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" })] }), _jsxs("button", { disabled: loading, onClick: handleInvia, className: "flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/80 transition-all disabled:opacity-40", children: [loading ? _jsx(Loader2, { size: 16, className: "animate-spin" }) : _jsx(Send, { size: 16 }), "Invia a RENTRI"] }), _jsx(ResultBanner, { result: result })] })] }) }));
}
