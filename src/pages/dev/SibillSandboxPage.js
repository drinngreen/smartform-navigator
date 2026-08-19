import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, FlaskConical, Send, Sparkles, Webhook, ShieldAlert } from "lucide-react";
/**
 * SIBILL SANDBOX PLAYGROUND — pagina di test ISOLATA.
 *
 * ⚠️ Nessun dato viene letto o scritto sulle tabelle di produzione
 * (`fatture`, `anagrafica_aziende_mp`, `fatture_sibill_sync`).
 * Tutto vive nello stato React: credenziali, payload e risposte.
 */
const SANDBOX_FN = "sibill-sandbox";
const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const rnd = (n) => Math.floor(Math.random() * n);
function mockCounterpart() {
    const suffix = String(1000 + rnd(9000));
    return {
        company_name: `Azienda Test SRL ${suffix}`,
        vat_number: `${11111111111 + rnd(88888888)}`.slice(0, 11),
        tax_number: `${11111111111 + rnd(88888888)}`.slice(0, 11),
        address: `Via della Prova ${rnd(200) + 1}`,
        city: "Perugia",
        postal_code: "06100",
        province_code: "PG",
        country: "IT",
        destination_code: "SUBM19N",
        identity_type: "COMPANY",
    };
}
function mockInvoice(counterpartName, vat) {
    const imponibile = 1000.0;
    const aliquota = 22;
    return {
        format: "FPA12",
        document_type: "TD01",
        number: `TEST-2026-${String(rnd(99) + 1).padStart(2, "0")}`,
        date: new Date().toISOString().slice(0, 10),
        currency: "EUR",
        counterpart: { company_name: counterpartName, vat_number: vat, country: "IT" },
        lines: [
            {
                line_number: 1,
                description: "Servizio di smaltimento fittizio",
                quantity: 1,
                unit_of_measure: "n",
                unit_price: imponibile,
                total_price: imponibile,
                vat_rate: aliquota,
            },
        ],
        vat_summary: [
            { vat_rate: aliquota, taxable_amount: imponibile, tax_amount: +(imponibile * aliquota / 100).toFixed(2) },
        ],
        total_amount: +(imponibile * (1 + aliquota / 100)).toFixed(2),
        payment: { method: "MP05", due_date: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10) },
    };
}
function JsonBox({ title, value, tone }) {
    return (_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "text-[11px] uppercase tracking-widest text-muted-foreground mb-1", children: title }), _jsx("pre", { className: `h-72 overflow-auto rounded-xl border border-border/40 bg-black/80 p-3 text-[11px] leading-relaxed font-mono ${tone ?? "text-emerald-300"}`, children: value === null || value === undefined ? "—" : JSON.stringify(value, null, 2) })] }));
}
export default function SibillSandboxPage() {
    const [apiKey, setApiKey] = useState("");
    const [companyId, setCompanyId] = useState("");
    const [counterpart, setCounterpart] = useState(mockCounterpart());
    const [invoice, setInvoice] = useState(() => {
        const c = mockCounterpart();
        return mockInvoice(c.company_name, c.vat_number);
    });
    const [sentPayload, setSentPayload] = useState(null);
    const [apiResponse, setApiResponse] = useState(null);
    const [httpStatus, setHttpStatus] = useState(null);
    const [busy, setBusy] = useState(null);
    const [mock, setMock] = useState(true);
    const [scenario, setScenario] = useState("success");
    const [webhookDocId, setWebhookDocId] = useState("");
    const [webhookStatus, setWebhookStatus] = useState("PAID");
    const [webhookPreviewOnly, setWebhookPreviewOnly] = useState(true);
    const ready = mock || (apiKey.trim().length > 0 && companyId.trim().length > 0);
    const webhookPayload = useMemo(() => ({
        event: "document.updated",
        data: {
            id: webhookDocId || "doc_test_00000000",
            status: webhookStatus === "PAID" ? "DELIVERED" : webhookStatus,
            flows: [{ delivery_status: webhookStatus === "PAID" ? "DELIVERED" : webhookStatus, payment_status: webhookStatus }],
        },
    }), [webhookDocId, webhookStatus]);
    const callSandbox = async (label, path, payload, method = "POST") => {
        if (!ready) {
            toast.error("Inserisci Sandbox API Key e Company ID (oppure attiva la modalità MOCK)");
            return;
        }
        setBusy(label);
        setSentPayload({ method, url: `https://integration.dev.sibill.com${path}`, body: payload, mode: mock ? `MOCK (${scenario})` : "REALE" });
        setApiResponse(null);
        setHttpStatus(null);
        try {
            const res = await fetch(`${FUNCTIONS_BASE}/${SANDBOX_FN}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
                body: JSON.stringify({ api_key: apiKey.trim(), path, method, payload, mock, mock_scenario: scenario }),
            });
            const data = await res.json();
            setHttpStatus(data?.status ?? res.status);
            setApiResponse(data?.response ?? data);
            const docId = data?.response?.data?.id;
            if (docId && String(docId).startsWith("doc"))
                setWebhookDocId(docId);
            if (data?.ok)
                toast.success(`${label}${mock ? " (MOCK)" : ""}: ${data.status} OK (${data.elapsed_ms} ms)`);
            else
                toast.error(`${label}: HTTP ${data?.status ?? res.status}`);
        }
        catch (e) {
            setApiResponse({ error: e.message });
            toast.error("Errore rete: " + e.message);
        }
        finally {
            setBusy(null);
        }
    };
    const sendWebhook = async () => {
        if (webhookPreviewOnly) {
            setSentPayload({ method: "POST", url: `${FUNCTIONS_BASE}/sibill-webhook`, body: webhookPayload });
            setApiResponse({ info: "Solo anteprima: nessuna chiamata inviata. Togli la spunta per inviare davvero." });
            setHttpStatus(null);
            return;
        }
        setBusy("webhook");
        setSentPayload({ method: "POST", url: `${FUNCTIONS_BASE}/sibill-webhook`, body: webhookPayload });
        try {
            const res = await fetch(`${FUNCTIONS_BASE}/sibill-webhook`, {
                method: "POST",
                headers: { "Content-Type": "application/json", apikey: ANON_KEY },
                body: JSON.stringify(webhookPayload),
            });
            const text = await res.text();
            setHttpStatus(res.status);
            try {
                setApiResponse(JSON.parse(text));
            }
            catch {
                setApiResponse({ raw: text });
            }
            res.ok ? toast.success("Webhook locale inviato") : toast.error(`Webhook: HTTP ${res.status}`);
        }
        catch (e) {
            setApiResponse({ error: e.message });
            toast.error("Errore webhook: " + e.message);
        }
        finally {
            setBusy(null);
        }
    };
    return (_jsx("div", { className: "min-h-screen bg-background p-6", children: _jsxs("div", { className: "max-w-6xl mx-auto space-y-6", children: [_jsxs("header", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(FlaskConical, { className: "h-6 w-6 text-amber-400" }), _jsx("h1", { className: "text-2xl font-display tracking-wide", children: "Sibill Sandbox Playground" }), _jsx(Badge, { variant: "outline", className: "text-[10px] border-amber-500/40 text-amber-400", children: "AMBIENTE DI TEST" })] }), _jsxs("p", { className: "text-sm text-muted-foreground flex items-center gap-2", children: [_jsx(ShieldAlert, { className: "h-4 w-4 text-amber-400" }), "Pagina isolata: usa solo dati fittizi e non scrive nulla su fatture o anagrafiche reali. Endpoint: ", _jsx("code", { className: "font-mono", children: "https://integration.dev.sibill.com" })] })] }), _jsxs("section", { className: `rounded-2xl border p-5 space-y-3 ${mock ? "border-amber-500/40 bg-amber-500/10" : "border-emerald-500/40 bg-emerald-500/10"}`, children: [_jsxs("div", { className: "flex flex-wrap items-center gap-4", children: [_jsx("span", { className: "text-sm font-medium", children: "Ambiente:" }), _jsxs("label", { className: "flex items-center gap-2 text-sm cursor-pointer", children: [_jsx("input", { type: "radio", name: "sibill_sandbox_mode", checked: mock, onChange: () => setMock(true) }), _jsx("span", { className: mock ? "text-amber-300 font-medium" : "text-muted-foreground", children: "MOCK (nessuna chiamata reale a Sibill)" })] }), _jsxs("label", { className: "flex items-center gap-2 text-sm cursor-pointer", children: [_jsx("input", { type: "radio", name: "sibill_sandbox_mode", checked: !mock, onChange: () => setMock(false) }), _jsx("span", { className: !mock ? "text-emerald-300 font-medium" : "text-muted-foreground", children: "REALE (chiave Sandbox Sibill richiesta)" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Scenario simulato" }), _jsxs(Select, { value: scenario, onValueChange: setScenario, children: [_jsx(SelectTrigger, { className: "w-56 h-8 text-xs", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "success", children: "\u2705 Successo (201 Created)" }), _jsx(SelectItem, { value: "validation_error", children: "\u26A0\uFE0F Errore validazione (422)" }), _jsx(SelectItem, { value: "auth_error", children: "\uD83D\uDD12 Chiave non valida (401)" }), _jsx(SelectItem, { value: "rate_limit", children: "\u23F3 Rate limit (429)" })] })] })] })] }), _jsxs("p", { className: "text-[11px] text-muted-foreground", children: ["In MOCK le risposte hanno la stessa struttura di quelle reali Sibill (", _jsx("code", { className: "font-mono", children: "data.id" }), ", ", _jsx("code", { className: "font-mono", children: "status" }), ", ", _jsx("code", { className: "font-mono", children: "delivery_status" }), ", ", _jsx("code", { className: "font-mono", children: "errors[]" }), "). Seleziona ", _jsx("span", { className: "text-emerald-300 font-medium", children: "REALE" }), " per usare la chiave Sandbox Sibill; nessuna modifica al payload \u00E8 necessaria."] })] }), _jsxs("section", { className: "rounded-2xl border border-border/30 bg-card/60 p-5 grid gap-4 md:grid-cols-2", children: [_jsxs("div", { children: [_jsxs(Label, { className: "text-xs text-muted-foreground", children: ["Sandbox API Key (Bearer Token)", mock && " — non richiesta in MOCK"] }), _jsx(Input, { type: "password", value: apiKey, onChange: (e) => setApiKey(e.target.value), placeholder: mock ? "non necessaria in MOCK" : "sk_dev_...", className: "font-mono" })] }), _jsxs("div", { children: [_jsxs(Label, { className: "text-xs text-muted-foreground", children: ["Sandbox Company ID", mock && " — non richiesto in MOCK"] }), _jsx(Input, { value: companyId, onChange: (e) => setCompanyId(e.target.value), placeholder: mock ? "non necessario in MOCK" : "cmp_...", className: "font-mono" })] }), _jsx("p", { className: "md:col-span-2 text-[11px] text-muted-foreground", children: "Le credenziali restano solo in memoria per questa sessione: non vengono salvate n\u00E9 inviate al database." })] }), _jsxs(Tabs, { defaultValue: "counterpart", children: [_jsxs(TabsList, { children: [_jsx(TabsTrigger, { value: "counterpart", children: "Cliente Mock" }), _jsx(TabsTrigger, { value: "invoice", children: "Invia Fattura Mock" }), _jsx(TabsTrigger, { value: "webhook", children: "Simula Webhook" })] }), _jsx(TabsContent, { value: "counterpart", className: "space-y-4 pt-4", children: _jsxs("div", { className: "rounded-2xl border border-border/30 bg-card/60 p-5 space-y-3", children: [_jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsxs(Button, { variant: "outline", onClick: () => setCounterpart(mockCounterpart()), children: [_jsx(Sparkles, { className: "h-4 w-4 mr-2" }), " Genera Cliente Mock"] }), _jsxs(Button, { disabled: !ready || busy !== null, onClick: () => callSandbox("Counterpart", `/api/v1/companies/${companyId.trim()}/counterparts`, counterpart), children: [busy === "Counterpart" ? _jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }) : _jsx(Send, { className: "h-4 w-4 mr-2" }), "Invia a Sibill (POST /counterparts)"] })] }), _jsx(Textarea, { value: JSON.stringify(counterpart, null, 2), onChange: (e) => { try {
                                            setCounterpart(JSON.parse(e.target.value));
                                        }
                                        catch { /* json in modifica */ } }, className: "h-56 font-mono text-[11px]" })] }) }), _jsx(TabsContent, { value: "invoice", className: "space-y-4 pt-4", children: _jsxs("div", { className: "rounded-2xl border border-border/30 bg-card/60 p-5 space-y-3", children: [_jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsxs(Button, { variant: "outline", onClick: () => setInvoice(mockInvoice(counterpart.company_name, counterpart.vat_number)), children: [_jsx(Sparkles, { className: "h-4 w-4 mr-2" }), " Rigenera fattura FPA12 fittizia"] }), _jsxs(Button, { disabled: !ready || busy !== null, onClick: () => callSandbox("Documento", `/api/v1/companies/${companyId.trim()}/documents`, invoice), children: [busy === "Documento" ? _jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }) : _jsx(Send, { className: "h-4 w-4 mr-2" }), "Invia a Sibill (POST /documents)"] })] }), _jsx(Textarea, { value: JSON.stringify(invoice, null, 2), onChange: (e) => { try {
                                            setInvoice(JSON.parse(e.target.value));
                                        }
                                        catch { /* json in modifica */ } }, className: "h-72 font-mono text-[11px]" })] }) }), _jsx(TabsContent, { value: "webhook", className: "space-y-4 pt-4", children: _jsxs("div", { className: "rounded-2xl border border-border/30 bg-card/60 p-5 space-y-3", children: [_jsxs("div", { className: "grid gap-3 md:grid-cols-3", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Document ID Sibill" }), _jsx(Input, { value: webhookDocId, onChange: (e) => setWebhookDocId(e.target.value), placeholder: "doc_...", className: "font-mono" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Stato" }), _jsxs(Select, { value: webhookStatus, onValueChange: setWebhookStatus, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "PAID", children: "PAID" }), _jsx(SelectItem, { value: "DELIVERED", children: "DELIVERED" }), _jsx(SelectItem, { value: "REJECTED", children: "REJECTED" })] })] })] }), _jsx("div", { className: "flex items-end", children: _jsxs(Button, { onClick: sendWebhook, disabled: busy !== null, className: "w-full", children: [busy === "webhook" ? _jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }) : _jsx(Webhook, { className: "h-4 w-4 mr-2" }), "Invia Webhook Locale"] }) })] }), _jsxs("label", { className: "flex items-center gap-2 text-xs text-muted-foreground", children: [_jsx("input", { type: "checkbox", checked: webhookPreviewOnly, onChange: (e) => setWebhookPreviewOnly(e.target.checked) }), "Solo anteprima payload (non invia nulla). Togli la spunta per chiamare davvero il webhook: aggiorner\u00E0 lo stato della fattura collegata a questo document_id, se esiste."] })] }) })] }), _jsxs("section", { className: "rounded-2xl border border-border/30 bg-card/60 p-5 space-y-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("h2", { className: "font-display tracking-wide text-sm", children: "Ispettore richieste" }), httpStatus !== null && (_jsxs(Badge, { variant: httpStatus >= 200 && httpStatus < 300 ? "outline" : "destructive", className: "font-mono text-[10px]", children: ["HTTP ", httpStatus] }))] }), _jsxs("div", { className: "flex flex-col md:flex-row gap-4", children: [_jsx(JsonBox, { title: "Payload inviato", value: sentPayload, tone: "text-cyan-300" }), _jsx(JsonBox, { title: "Risposta API", value: apiResponse, tone: httpStatus !== null && httpStatus >= 400 ? "text-rose-300" : "text-emerald-300" })] })] })] }) }));
}
