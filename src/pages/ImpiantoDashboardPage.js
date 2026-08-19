import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LogOut, Search, Package, CheckCircle, AlertTriangle, FileText, Eye, Check, XCircle, } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import logoDragon from "@/assets/dragon-logo-gold.png";
const TENANT_MAP = {
    global: { id: "167d07ad-9184-484e-85a6-da5ceafa42a3", label: "GLOBAL RECO", color: "59, 130, 246" },
    multyproget: { id: "77ec9a3d-602e-438f-97bf-1c69abd8f691", label: "MULTYPROGET", color: "249, 115, 22" },
    niyol: { id: "819c783e-78dd-4080-8265-802e75b0d813", label: "NIYOL", color: "6, 182, 212" },
};
export default function ImpiantoDashboardPage() {
    const navigate = useNavigate();
    const { tenant } = useParams();
    const ctx = TENANT_MAP[tenant || "global"] || TENANT_MAP.global;
    const sessionKey = `impianto_session_${tenant || "global"}`;
    const [session, setSession] = useState(null);
    const [inbox, setInbox] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [detailItem, setDetailItem] = useState(null);
    const [confirmForm, setConfirmForm] = useState({ peso: "", note: "" });
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        const raw = localStorage.getItem(sessionKey);
        if (!raw) {
            navigate(`/area-impianto/${tenant || "global"}`);
            return;
        }
        try {
            const s = JSON.parse(raw);
            const payload = JSON.parse(atob(s.token));
            if (payload.exp < Date.now()) {
                localStorage.removeItem(sessionKey);
                navigate(`/area-impianto/${tenant || "global"}`);
                return;
            }
            setSession(s);
        }
        catch {
            navigate(`/area-impianto/${tenant || "global"}`);
        }
    }, [navigate, tenant, sessionKey]);
    const loadInbox = useCallback(async () => {
        if (!session)
            return;
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("impianto-auth", {
                body: { action: "get_inbox", impianto_account_id: session.account.id },
            });
            if (error)
                throw error;
            if (data?.success)
                setInbox(data.inbox || []);
        }
        catch (err) {
            toast.error("Errore caricamento: " + err.message);
        }
        finally {
            setLoading(false);
        }
    }, [session]);
    useEffect(() => { loadInbox(); }, [loadInbox]);
    const handleLogout = () => {
        localStorage.removeItem(sessionKey);
        navigate(`/area-impianto/${tenant || "global"}`);
    };
    const handleConfirm = async (stato) => {
        if (!detailItem)
            return;
        setSaving(true);
        try {
            const { data, error } = await supabase.functions.invoke("impianto-auth", {
                body: {
                    action: "update_fir_status",
                    fir_inbox_id: detailItem.id,
                    stato,
                    peso_verificato: confirmForm.peso ? parseFloat(confirmForm.peso) : undefined,
                    note_impianto: confirmForm.note || undefined,
                },
            });
            if (error)
                throw error;
            if (!data?.success)
                throw new Error(data?.error);
            toast.success(stato === "confermato" ? "Ricezione confermata" : "FIR contestato");
            setDetailItem(null);
            setConfirmForm({ peso: "", note: "" });
            loadInbox();
        }
        catch (err) {
            toast.error(err.message);
        }
        finally {
            setSaving(false);
        }
    };
    const filtered = inbox.filter((item) => {
        if (!search)
            return true;
        const s = search.toLowerCase();
        const f = item.fir_forms;
        return f?.numero_fir?.toLowerCase().includes(s) ||
            f?.codice_eer?.toLowerCase().includes(s) ||
            f?.produttore_denominazione?.toLowerCase().includes(s) ||
            f?.trasportatore_denominazione?.toLowerCase().includes(s);
    });
    const ricevuti = inbox.filter(i => i.stato === "ricevuto").length;
    const confermati = inbox.filter(i => i.stato === "confermato").length;
    const contestati = inbox.filter(i => i.stato === "contestato").length;
    if (!session)
        return null;
    return (_jsxs("div", { className: "flex flex-col h-screen bg-background overflow-hidden relative", children: [_jsx("div", { className: "absolute inset-0 pointer-events-none", style: {
                    background: `
            radial-gradient(ellipse at 50% 30%, rgba(${ctx.color}, 0.22) 0%, rgba(${ctx.color}, 0.12) 25%, rgba(${ctx.color}, 0.04) 55%, transparent 80%),
            radial-gradient(ellipse at 85% 15%, rgba(${ctx.color}, 0.17) 0%, rgba(${ctx.color}, 0.07) 25%, transparent 55%),
            radial-gradient(ellipse at 15% 75%, rgba(${ctx.color}, 0.05) 0%, transparent 50%)
          `,
                } }), _jsx("div", { className: "absolute inset-0 pointer-events-none z-[1]", style: {
                    backgroundImage: `
            linear-gradient(rgba(192, 173, 103, 0.18) 1px, transparent 1px),
            linear-gradient(90deg, rgba(192, 173, 103, 0.18) 1px, transparent 1px)
          `,
                    backgroundSize: '30px 30px',
                } }), _jsx("header", { className: "relative z-20 border-b border-border/30 bg-card/40 backdrop-blur-xl px-4 py-3", children: _jsxs("div", { className: "max-w-7xl mx-auto flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("img", { src: logoDragon, alt: "Logo", className: "h-10 w-10", style: { filter: `drop-shadow(0 0 8px rgba(${ctx.color}, 0.5))` } }), _jsxs("div", { children: [_jsx("h1", { className: "font-display font-bold text-foreground text-lg tracking-wider", children: session.account.ragione_sociale }), _jsxs("p", { className: "text-xs text-muted-foreground", children: [session.account.email, " \u00B7 ", _jsx("span", { style: { color: `rgb(${ctx.color})` }, children: ctx.label })] })] })] }), _jsxs("button", { onClick: handleLogout, className: "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground border border-border/50 hover:border-border transition-colors", children: [_jsx(LogOut, { className: "h-4 w-4" }), " Esci"] })] }) }), _jsx("main", { className: "flex-1 overflow-y-auto p-4 relative z-10", children: _jsxs("div", { className: "max-w-7xl mx-auto space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: [_jsx(StatCard, { icon: Package, label: "Totale FIR", value: inbox.length, color: ctx.color }), _jsx(StatCard, { icon: FileText, label: "Da confermare", value: ricevuti, color: "249, 115, 22" }), _jsx(StatCard, { icon: CheckCircle, label: "Confermati", value: confermati, color: "34, 197, 94" }), _jsx(StatCard, { icon: AlertTriangle, label: "Contestati", value: contestati, color: "239, 68, 68" })] }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx("input", { placeholder: "Cerca FIR, CER, produttore, trasportatore...", value: search, onChange: (e) => setSearch(e.target.value), className: "w-full pl-9 pr-4 py-3 rounded-lg bg-card/60 border border-border/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2", style: { ["--tw-ring-color"]: `rgba(${ctx.color}, 0.5)` } })] }), _jsx("div", { className: "rounded-2xl bg-card/60 border border-border/30 overflow-hidden", style: { boxShadow: `0 0 1px rgba(${ctx.color}, 0.3), 0 0 8px rgba(${ctx.color}, 0.1)` }, children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30 text-muted-foreground text-xs uppercase", children: [_jsx("th", { className: "p-3 text-left", children: "Data Ricezione" }), _jsx("th", { className: "p-3 text-left", children: "N\u00B0 FIR" }), _jsx("th", { className: "p-3 text-left", children: "CER" }), _jsx("th", { className: "p-3 text-left", children: "Produttore" }), _jsx("th", { className: "p-3 text-left", children: "Trasportatore" }), _jsx("th", { className: "p-3 text-right", children: "Quantit\u00E0" }), _jsx("th", { className: "p-3 text-center", children: "Stato" }), _jsx("th", { className: "p-3 text-center", children: "Azioni" })] }) }), _jsx("tbody", { children: loading ? (_jsx("tr", { children: _jsx("td", { colSpan: 8, className: "p-8 text-center text-muted-foreground", children: "Caricamento..." }) })) : filtered.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 8, className: "p-8 text-center text-muted-foreground", children: "Nessun FIR ricevuto" }) })) : (filtered.map((item) => {
                                                const f = item.fir_forms;
                                                return (_jsxs("tr", { className: "border-b border-border/10 hover:bg-accent/5", children: [_jsx("td", { className: "p-3 font-mono text-xs", children: format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: it }) }), _jsx("td", { className: "p-3 font-mono text-xs font-bold", style: { color: `rgb(${ctx.color})` }, children: f?.numero_fir || "—" }), _jsx("td", { className: "p-3 font-mono", children: f?.codice_eer || "—" }), _jsx("td", { className: "p-3 text-xs max-w-[150px] truncate", children: f?.produttore_denominazione || "—" }), _jsx("td", { className: "p-3 text-xs max-w-[150px] truncate", children: f?.trasportatore_denominazione || "—" }), _jsxs("td", { className: "p-3 text-right font-bold", children: [f?.quantita ? Number(f.quantita).toLocaleString("it-IT") : "—", f?.unita_misura ? ` ${f.unita_misura}` : ""] }), _jsx("td", { className: "p-3 text-center", children: _jsx(StatoBadge, { stato: item.stato }) }), _jsx("td", { className: "p-3 text-center", children: _jsxs("button", { onClick: () => { setDetailItem(item); setConfirmForm({ peso: "", note: "" }); }, className: "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors", style: { borderColor: `rgba(${ctx.color}, 0.3)`, color: `rgb(${ctx.color})` }, children: [_jsx(Eye, { className: "h-3 w-3" }), " Dettagli"] }) })] }, item.id));
                                            })) })] }) }) })] }) }), _jsx(Dialog, { open: !!detailItem, onOpenChange: (open) => { if (!open)
                    setDetailItem(null); }, children: _jsxs(DialogContent, { className: "max-w-lg bg-card border-border/50", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { className: "flex items-center gap-2 font-display tracking-wider", children: [_jsx(FileText, { className: "h-5 w-5", style: { color: `rgb(${ctx.color})` } }), "Dettaglio FIR \u2014 ", detailItem?.fir_forms?.numero_fir || "N/A"] }) }), detailItem?.fir_forms && (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground text-xs", children: "CER:" }), _jsx("br", {}), _jsx("strong", { children: detailItem.fir_forms.codice_eer || "—" })] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground text-xs", children: "Quantit\u00E0:" }), _jsx("br", {}), _jsxs("strong", { children: [detailItem.fir_forms.quantita?.toLocaleString("it-IT"), " ", detailItem.fir_forms.unita_misura] })] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground text-xs", children: "Produttore:" }), _jsx("br", {}), detailItem.fir_forms.produttore_denominazione || "—"] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground text-xs", children: "Trasportatore:" }), _jsx("br", {}), detailItem.fir_forms.trasportatore_denominazione || "—"] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground text-xs", children: "Data partenza:" }), _jsx("br", {}), detailItem.fir_forms.data_partenza ? format(new Date(detailItem.fir_forms.data_partenza), "dd/MM/yyyy", { locale: it }) : "—"] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground text-xs", children: "Descrizione:" }), _jsx("br", {}), detailItem.fir_forms.descrizione_rifiuto || "—"] })] }), _jsxs("div", { className: "flex items-center gap-2 mt-2", children: [_jsx("span", { className: "text-xs text-muted-foreground", children: "Stato attuale:" }), _jsx(StatoBadge, { stato: detailItem.stato })] }), detailItem.stato === "ricevuto" && (_jsxs("div", { className: "space-y-3 mt-4 p-3 rounded-lg border", style: { backgroundColor: `rgba(${ctx.color}, 0.1)`, borderColor: `rgba(${ctx.color}, 0.3)` }, children: [_jsx("p", { className: "text-sm font-display font-semibold tracking-wider", style: { color: `rgb(${ctx.color})` }, children: "Conferma ricezione" }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted-foreground", children: "Peso verificato (kg)" }), _jsx("input", { type: "number", value: confirmForm.peso, onChange: (e) => setConfirmForm(prev => ({ ...prev, peso: e.target.value })), placeholder: "Peso effettivo alla bilancia", className: "w-full mt-1 px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted-foreground", children: "Note" }), _jsx(Textarea, { value: confirmForm.note, onChange: (e) => setConfirmForm(prev => ({ ...prev, note: e.target.value })), rows: 2, className: "bg-secondary/50 border-border", placeholder: "Eventuali osservazioni" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("button", { onClick: () => handleConfirm("confermato"), disabled: saving, className: "flex-1 py-2.5 rounded-lg font-display font-semibold tracking-wider bg-emerald-600 text-white hover:bg-emerald-500 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5", children: [_jsx(Check, { className: "h-4 w-4" }), " Conferma"] }), _jsxs("button", { onClick: () => handleConfirm("contestato"), disabled: saving, className: "flex-1 py-2.5 rounded-lg font-display font-semibold tracking-wider border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5", children: [_jsx(XCircle, { className: "h-4 w-4" }), " Contesta"] })] })] })), detailItem.stato !== "ricevuto" && (_jsxs("div", { className: "p-3 rounded-lg bg-card/80 border border-border/30 text-sm space-y-1", children: [detailItem.peso_verificato && (_jsxs("p", { children: [_jsx("span", { className: "text-muted-foreground", children: "Peso verificato:" }), " ", _jsxs("strong", { children: [Number(detailItem.peso_verificato).toLocaleString("it-IT"), " kg"] })] })), detailItem.note_impianto && (_jsxs("p", { children: [_jsx("span", { className: "text-muted-foreground", children: "Note:" }), " ", detailItem.note_impianto] })), detailItem.data_conferma && (_jsxs("p", { children: [_jsx("span", { className: "text-muted-foreground", children: "Data conferma:" }), " ", format(new Date(detailItem.data_conferma), "dd/MM/yyyy HH:mm", { locale: it })] }))] }))] }))] }) })] }));
}
function StatoBadge({ stato }) {
    const map = {
        ricevuto: { label: "Da confermare", cls: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
        confermato: { label: "Confermato", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
        contestato: { label: "Contestato", cls: "bg-red-500/20 text-red-300 border-red-500/30" },
    };
    const m = map[stato] || { label: stato, cls: "bg-muted text-muted-foreground" };
    return _jsx("span", { className: `px-2 py-0.5 rounded-full text-[10px] font-semibold border ${m.cls}`, children: m.label });
}
function StatCard({ icon: Icon, label, value, color }) {
    return (_jsxs("div", { className: "flex items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", style: { boxShadow: `0 0 1px rgba(${color}, 0.3), 0 0 6px rgba(${color}, 0.1)` }, children: [_jsx("div", { className: "p-2 rounded-xl", style: { background: `rgba(${color}, 0.15)` }, children: _jsx(Icon, { className: "h-5 w-5", style: { color: `rgb(${color})` } }) }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground font-mono uppercase", children: label }), _jsx("p", { className: "text-lg font-bold text-foreground", children: value })] })] }));
}
