import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Send, Loader2, CheckCircle2, XCircle, QrCode, FileSearch, Truck } from "lucide-react";
import { emissioneFir, dettaglioFir, ricercaFir, statoTransazioneFir, firmaRicezione } from "@/lib/rentriVpsApi";
import { mapFormToRentriPayload } from "@/lib/rentriFormMapper";
import { toast } from "sonner";
export function FIRRentriActions({ cliente, formData, numeroFir, firmaComeProduttore = true, onEmissioneSuccess, templateFields }) {
    const [loading, setLoading] = useState(null);
    const [result, setResult] = useState(null);
    const [qrCodeUrl, setQrCodeUrl] = useState(null);
    const [firUuid, setFirUuid] = useState(null);
    const handleEmissione = async () => {
        setLoading("emissione");
        setResult(null);
        setQrCodeUrl(null);
        try {
            // Map form fields to RENTRI-structured payload
            const payload = mapFormToRentriPayload(cliente, formData, {
                firmaComeProduttore,
                templateFields,
            });
            console.log("[RENTRI] Payload emissione:", JSON.stringify(payload, null, 2));
            const res = await emissioneFir(cliente, payload);
            setResult(res);
            if (res.success && res.data) {
                const data = res.data;
                // Extract UUID and QR code from response
                const uuid = data.uuid ?? data.id ?? data.uuid_fir ?? data.firId;
                if (uuid)
                    setFirUuid(String(uuid));
                const qr = data.qrCode ?? data.qr_code ?? data.qrcode ?? data.qr;
                if (qr && typeof qr === "string") {
                    setQrCodeUrl(qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`);
                }
                toast.success("FIR emesso con successo su RENTRI!");
                onEmissioneSuccess?.(res);
            }
            else {
                toast.error("Errore emissione FIR: " + (res.error || "Risposta non valida"));
            }
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            toast.error("Errore: " + msg);
        }
        finally {
            setLoading(null);
        }
    };
    const handleDettaglio = async () => {
        if (!firUuid && !numeroFir) {
            toast.error("Nessun UUID o numero FIR disponibile");
            return;
        }
        setLoading("dettaglio");
        setResult(null);
        try {
            let res;
            if (firUuid) {
                res = await dettaglioFir(cliente, firUuid);
            }
            else {
                res = await ricercaFir(cliente, numeroFir);
            }
            setResult(res);
            if (res.success && res.data) {
                const data = res.data;
                const qr = data.qrCode ?? data.qr_code ?? data.qrcode ?? data.qr;
                if (qr && typeof qr === "string") {
                    setQrCodeUrl(qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`);
                }
            }
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            toast.error("Errore: " + msg);
        }
        finally {
            setLoading(null);
        }
    };
    const handleTransazione = async () => {
        if (!firUuid) {
            toast.error("UUID FIR non disponibile per verifica transazione");
            return;
        }
        setLoading("transazione");
        setResult(null);
        try {
            const res = await statoTransazioneFir(cliente, firUuid);
            setResult(res);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            toast.error("Errore: " + msg);
        }
        finally {
            setLoading(null);
        }
    };
    const handleFirmaRicezione = async () => {
        if (!firUuid) {
            toast.error("UUID FIR necessario per firma ricezione");
            return;
        }
        setLoading("firma");
        setResult(null);
        try {
            const res = await firmaRicezione(cliente, { uuid_fir: firUuid, ...formData });
            setResult(res);
            if (res.success)
                toast.success("Firma ricezione registrata!");
            else
                toast.error("Errore firma: " + (res.error || ""));
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            toast.error("Errore: " + msg);
        }
        finally {
            setLoading(null);
        }
    };
    return (_jsxs("div", { className: "space-y-3 mt-4", children: [_jsx("div", { className: `flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono font-semibold ${firmaComeProduttore
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-300"}`, children: firmaComeProduttore ? "✍️ FIRMA: PRODUTTORE + TRASPORTATORE" : "🚛 FIRMA: SOLO TRASPORTATORE" }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(ActionButton, { icon: _jsx(Send, { size: 14 }), label: "Emetti FIR", onClick: handleEmissione, loading: loading === "emissione", variant: "primary" }), _jsx(ActionButton, { icon: _jsx(FileSearch, { size: 14 }), label: "Dettaglio", onClick: handleDettaglio, loading: loading === "dettaglio", disabled: !firUuid && !numeroFir }), _jsx(ActionButton, { icon: _jsx(QrCode, { size: 14 }), label: "Stato Transazione", onClick: handleTransazione, loading: loading === "transazione", disabled: !firUuid }), _jsx(ActionButton, { icon: _jsx(Truck, { size: 14 }), label: "Firma Ricezione", onClick: handleFirmaRicezione, loading: loading === "firma", disabled: !firUuid })] }), qrCodeUrl && (_jsxs("div", { className: "flex flex-col items-center gap-2 p-3 rounded-xl bg-white border border-border/30", children: [_jsx("img", { src: qrCodeUrl, alt: "QR Code FIR", className: "w-40 h-40 object-contain" }), _jsx("span", { className: "text-[10px] font-mono text-gray-500", children: "QR Code FIR RENTRI" }), firUuid && (_jsxs("span", { className: "text-[9px] font-mono text-gray-400 break-all max-w-[200px] text-center", children: ["UUID: ", firUuid] }))] })), result && (_jsxs("div", { className: `rounded-xl p-3 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-auto border ${result.success
                    ? "bg-green-500/10 border-green-500/30 text-green-300"
                    : "bg-red-500/10 border-red-500/30 text-red-300"}`, children: [_jsxs("div", { className: "flex items-center gap-2 mb-1 font-semibold text-sm font-sans", children: [result.success ? (_jsx(CheckCircle2, { size: 14, className: "text-green-400" })) : (_jsx(XCircle, { size: 14, className: "text-red-400" })), result.success ? "Operazione riuscita" : "Errore", result.status > 0 && (_jsxs("span", { className: "text-muted-foreground ml-auto text-[10px]", children: ["HTTP ", result.status] }))] }), result.error && _jsx("p", { className: "text-red-400 mb-1", children: result.error }), result.data && (_jsx("pre", { className: "text-[10px] leading-tight", children: JSON.stringify(result.data, null, 2) }))] }))] }));
}
function ActionButton({ icon, label, onClick, loading, disabled, variant = "default", }) {
    return (_jsxs("button", { onClick: onClick, disabled: loading || disabled, className: `flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all border disabled:opacity-40 ${variant === "primary"
            ? "bg-primary text-primary-foreground border-primary hover:bg-primary/80"
            : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary hover:text-foreground"}`, children: [loading ? _jsx(Loader2, { size: 14, className: "animate-spin" }) : icon, label] }));
}
