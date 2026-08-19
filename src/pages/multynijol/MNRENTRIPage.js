import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useMNContextStore } from "@/stores/mnContextStore";
import { inviaOperazioneRentri, verificaConfigurazioneRentri, } from "@/lib/rentriVpsApi";
import { logRentriOperation } from "@/lib/rentriHistory";
import { RentriResultBanner } from "@/components/rentri/RentriResultBanner";
import { RentriHistoryPanel } from "@/components/rentri/RentriHistoryPanel";
import { Loader2, Send, FileText, Truck, ClipboardList, ShieldCheck, } from "lucide-react";
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
export default function MNRENTRIPage() {
    const { activeContext } = useMNContextStore();
    // Il bridge RENTRI ha certificati solo per Multyproget e Niyol:
    // "global" non è supportato e restituirebbe 400 "Cliente non supportato".
    const cliente = CONTEXT_TO_CLIENTE[activeContext.id] ?? "multy";
    const [tipoOperazione, setTipoOperazione] = useState("REGISTRO");
    const [payloadText, setPayloadText] = useState("{}");
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [historyKey, setHistoryKey] = useState(0);
    const [result, setResult] = useState(null);
    const parsePayload = () => {
        try {
            return JSON.parse(payloadText);
        }
        catch {
            setResult({
                success: false,
                status: 400,
                data: null,
                error: "JSON payload non valido",
                userMessage: "Dati della richiesta non validi o incompleti.",
                errorCode: "BAD_REQUEST",
                mode: "real",
            });
            return null;
        }
    };
    const registra = async (res, mode) => {
        await logRentriOperation({
            cliente,
            tipo_operazione: tipoOperazione,
            rentri_method: res.preview?.rentri_method ?? null,
            rentri_path: res.preview?.rentri_path ?? null,
            mode,
            http_status: res.status,
            success: res.success,
            error_code: res.errorCode ?? null,
            error_message: res.error ?? null,
        });
        setHistoryKey((k) => k + 1);
    };
    const handleVerifica = async () => {
        const payload = parsePayload();
        if (!payload)
            return;
        setVerifying(true);
        setResult(null);
        const res = await verificaConfigurazioneRentri(cliente, tipoOperazione, payload);
        setResult(res);
        setVerifying(false);
        await registra(res, "dry_run");
    };
    const handleInvia = async () => {
        const payload = parsePayload();
        if (!payload)
            return;
        setLoading(true);
        setResult(null);
        const res = await inviaOperazioneRentri({
            cliente,
            tipo_operazione: tipoOperazione,
            payload,
        });
        setResult(res);
        setLoading(false);
        await registra(res, "real");
    };
    return (_jsx(MNAdminLayout, { title: "RENTRI", subtitle: "Invio operazioni al server RENTRI", children: _jsxs("div", { className: "space-y-6", children: [_jsxs("a", { href: `/mn/admin/${activeContext.id}/rentri-console`, className: "flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-all", children: [_jsx(ShieldCheck, { size: 18, className: "text-primary" }), _jsxs("div", { children: [_jsx("div", { className: "text-sm font-semibold", children: "Apri Console RENTRI" }), _jsx("div", { className: "text-xs text-muted-foreground", children: "Stato bridge, numeri FIR, assegnazioni, invio registri e storico invii" })] })] }), _jsxs("div", { className: "flex items-center gap-3 p-4 rounded-xl bg-card/60 border border-border/30", children: [_jsx("div", { className: "h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse" }), _jsxs("span", { className: "text-sm text-muted-foreground", children: ["Bridge RENTRI: ", _jsx("strong", { className: "text-foreground", children: "rentri-bridge.dragonrifiuti.space" })] }), _jsx("span", { className: "ml-auto text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-semibold uppercase tracking-wider", children: cliente })] }), _jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/30 p-6 space-y-5", children: [_jsxs("h3", { className: "text-base font-display tracking-wider flex items-center gap-2", children: [_jsx(Send, { size: 16, className: "text-primary" }), "Invia Operazione"] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-xs text-muted-foreground font-medium", children: "Tipo Operazione" }), _jsx("div", { className: "flex gap-2 flex-wrap", children: TIPO_OPTIONS.map((opt) => (_jsxs("button", { onClick: () => setTipoOperazione(opt.value), className: `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${tipoOperazione === opt.value
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary"}`, children: [opt.icon, opt.label] }, opt.value))) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-xs text-muted-foreground font-medium", children: "Payload (JSON)" }), _jsx("textarea", { value: payloadText, onChange: (e) => setPayloadText(e.target.value), rows: 6, placeholder: '{"codice_eer": "170904", "quantita": 1.5, ...}', className: "w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" })] }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsxs("button", { disabled: verifying || loading, onClick: handleVerifica, "data-testid": "btn-verifica-config", className: "flex items-center gap-2 px-6 py-3 rounded-xl bg-secondary text-foreground border border-border font-semibold hover:bg-secondary/70 transition-all disabled:opacity-40", children: [verifying ? _jsx(Loader2, { size: 16, className: "animate-spin" }) : _jsx(ShieldCheck, { size: 16 }), "Verifica configurazione (nessun invio)"] }), _jsxs("button", { disabled: loading || verifying, onClick: handleInvia, className: "flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/80 transition-all disabled:opacity-40", children: [loading ? _jsx(Loader2, { size: 16, className: "animate-spin" }) : _jsx(Send, { size: 16 }), "Invia a RENTRI"] })] }), _jsx(RentriResultBanner, { result: result })] }), _jsx(RentriHistoryPanel, { defaultCliente: cliente }, historyKey)] }) }));
}
