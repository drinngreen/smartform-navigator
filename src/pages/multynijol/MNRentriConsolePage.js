import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useMNContextStore, MN_CONTEXTS } from "@/stores/mnContextStore";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { listaBlocchi, vidimaFIRAsync, registriDisponibili, rentriConfigKey, RENTRI_ISSUERS, RENTRI_UNITA_LOCALI, RENTRI_BLOCCO_CORRENTE, } from "@/lib/rentriVpsApi";
import { healthCheck as vpsHealthCheck } from "@/lib/rentriSuperApi";
import { caricaMovimentiCandidati, mapMovimentiToRentri, inviaRegistroRentri, aggiornaStatoInvio, } from "@/lib/rentriRegistroSync";
import { RentriFirDaFirmarePanel } from "@/components/rentri/RentriFirDaFirmarePanel";
import { RentriBozzePanel } from "@/components/rentri/RentriBozzePanel";
import { DevStampaFIREditor } from "@/components/multynijol/dev/DevStampaFIREditor";
import { RentriResultBanner } from "@/components/rentri/RentriResultBanner";
import { DarkLemonMNChat } from "@/components/ai/DarkLemonMNChat";
import { Activity, ClipboardList, Loader2, RefreshCw, Send, Sparkles, Ticket, Users, PenLine, Copy, ArrowLeft, FileText, Printer, } from "lucide-react";
const CONTEXT_TO_CLIENTE = {
    multyproget: "multy",
    "dev-multyproget": "multy",
    "multyproget-intermediario": "multy",
    "multyproget-impianto": "multy",
    niyol: "niyol",
};
const SHARED_POOL_USER_ID = "00000000-0000-0000-0000-000000000000";
/** Blocchi di vidimazione appartenenti a ciascuna società (fallback se il bridge non espone CF/U.L.). */
const ALLOWED_BLOCCHI = {
    multy: ["ZRZXR", "FRVKM"],
    niyol: ["BPJMG"],
};
/** Blocchi selezionabili in pesca (ZRZXR = Multyproget impianto, FRVKM = Multyproget dipendenti, BPJMG = Niyol). */
const BLOCCHI_PESCA = {
    multy: [
        { code: "ZRZXR", label: "Multyproget — Impianto (TO0001)", sito: "TO0001" },
        { code: "FRVKM", label: "Multyproget — Dipendenti", sito: null },
    ],
    niyol: [{ code: "BPJMG", label: "Niyol — TO0001", sito: "TO0001" }],
};
const validContexts = ["multyproget", "niyol", "dev-multyproget", "multyproget-impianto", "multyproget-intermediario"];
const TABS = [
    { id: "stato", label: "Stato RENTRI", icon: _jsx(Activity, { size: 14 }) },
    { id: "numeri", label: "Numeri FIR", icon: _jsx(Ticket, { size: 14 }) },
    { id: "bozze", label: "Bozze formulari", icon: _jsx(FileText, { size: 14 }) },
    { id: "dafirmare", label: "FIR da firmare", icon: _jsx(PenLine, { size: 14 }) },
    { id: "registri", label: "Invio Registri", icon: _jsx(ClipboardList, { size: 14 }) },
    { id: "invii", label: "Invii effettuati", icon: _jsx(Send, { size: 14 }) },
    { id: "lemon", label: "Dark Lemon", icon: _jsx(Sparkles, { size: 14 }) },
];
export default function MNRentriConsolePage() {
    const { context } = useParams();
    const navigate = useNavigate();
    const setActiveContext = useMNContextStore((s) => s.setActiveContext);
    const isValid = !!context && validContexts.includes(context);
    const mnCtx = MN_CONTEXTS.find((c) => c.id === context) ?? MN_CONTEXTS.find((c) => c.id === "multyproget") ?? MN_CONTEXTS[0];
    const [cliente, setCliente] = useState(CONTEXT_TO_CLIENTE[context ?? ""] ?? "multy");
    const configKey = rentriConfigKey(cliente);
    const societaId = configKey === "niyol" ? "niyol" : "multy";
    useEffect(() => {
        if (isValid)
            setActiveContext(mnCtx);
    }, [context, isValid]);
    const initialTab = (() => {
        const t = new URLSearchParams(window.location.search).get("tab");
        const ids = ["stato", "numeri", "bozze", "dafirmare", "registri", "invii", "lemon"];
        return ids.includes(t) ? t : "stato";
    })();
    const [tab, setTab] = useState(initialTab);
    /* ── Stato RENTRI ── */
    const [vpsUp, setVpsUp] = useState(null);
    const [blocchi, setBlocchi] = useState([]);
    const [loadingStato, setLoadingStato] = useState(false);
    const [result, setResult] = useState(null);
    /** Filtra i blocchi restituiti dal bridge tenendo solo quelli della società selezionata. */
    const filtraBlocchiPerCliente = (list, key) => {
        const cf = RENTRI_ISSUERS[key];
        const ul = RENTRI_UNITA_LOCALI[key];
        const allowed = ALLOWED_BLOCCHI[key] ?? [];
        return list.filter((b) => {
            const codice = String(b?.codice ?? b?.blocco ?? b?.identificativo ?? "").toUpperCase();
            const bCf = String(b?.identificativo_soggetto ?? b?.cf_soggetto ?? b?.codice_fiscale ?? b?.issuer ?? "");
            const bUl = String(b?.num_iscr_sito ?? b?.numero_iscrizione_sito ?? b?.unita_locale ?? "");
            if (bCf)
                return bCf.replace(/^IT/i, "") === cf;
            if (bUl)
                return bUl === ul;
            return allowed.length === 0 || allowed.includes(codice);
        });
    };
    const refreshStato = async () => {
        setLoadingStato(true);
        setResult(null);
        try {
            const health = await vpsHealthCheck();
            setVpsUp(!!health?.ok);
            const res = await listaBlocchi(cliente);
            setResult(res);
            const raw = res.data;
            const list = Array.isArray(raw) ? raw : raw?.blocchi ?? raw?.items ?? raw?.content ?? [];
            setBlocchi(Array.isArray(list) ? filtraBlocchiPerCliente(list, configKey) : []);
        }
        catch (e) {
            setVpsUp(false);
            toast.error(`Errore stato RENTRI: ${e.message}`);
        }
        finally {
            setLoadingStato(false);
        }
    };
    useEffect(() => {
        refreshStato();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cliente]);
    /* ── Numeri FIR ── */
    const [pool, setPool] = useState([]);
    const [personale, setPersonale] = useState([]);
    const [qty, setQty] = useState(5);
    const [pescando, setPescando] = useState(false);
    const [bloccoPesca, setBloccoPesca] = useState((BLOCCHI_PESCA[configKey] ?? [])[0]?.code ?? RENTRI_BLOCCO_CORRENTE[configKey] ?? "");
    useEffect(() => {
        setBloccoPesca((BLOCCHI_PESCA[configKey] ?? [])[0]?.code ?? RENTRI_BLOCCO_CORRENTE[configKey] ?? "");
    }, [configKey]);
    const [assegnando, setAssegnando] = useState(false);
    const [assignApp, setAssignApp] = useState(configKey === "niyol" ? "niyol" : "multyproget");
    useEffect(() => {
        setAssignApp(configKey === "niyol" ? "niyol" : "multyproget");
    }, [configKey]);
    const appDiProfilo = (u) => u.mn_context === "niyol" || u.tenant_id === "819c783e-78dd-4080-8265-802e75b0d813" ? "niyol" : "multyproget";
    const loadPool = async () => {
        const [{ data: poolRows }, { data: profs }] = await Promise.all([
            supabase
                .from("fir_number_pool")
                .select("id, fir_number, status, user_id, assigned_at")
                .eq("societa_id", societaId)
                .order("created_at", { ascending: false })
                .limit(200),
            supabase
                .from("profiles")
                .select("id, user_id, nome, cognome, mn_context, tenant_id")
                .or("mn_context.in.(multyproget,niyol),tenant_id.in.(77ec9a3d-602e-438f-97bf-1c69abd8f691,819c783e-78dd-4080-8265-802e75b0d813)")
                .order("cognome", { ascending: true }),
        ]);
        setPool((poolRows ?? []));
        setPersonale((profs ?? []));
    };
    useEffect(() => {
        loadPool();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [societaId]);
    const disponibili = useMemo(() => pool.filter((p) => p.status === "available"), [pool]);
    /** Mappa auth-uid → nome dipendente (profiles.user_id o profiles.id) */
    const nomeByUid = useMemo(() => {
        const map = {};
        for (const u of personale) {
            const label = [u.nome, u.cognome].filter(Boolean).join(" ").trim();
            if (!label)
                continue;
            if (u.user_id)
                map[u.user_id] = label;
            map[u.id] = map[u.id] ?? label;
        }
        return map;
    }, [personale]);
    const assegnati = useMemo(() => pool
        .filter((p) => p.status !== "available")
        .map((p) => ({
        ...p,
        assegnatario: p.user_id && p.user_id !== SHARED_POOL_USER_ID
            ? nomeByUid[p.user_id] ?? "🏢 Ufficio / admin"
            : "Serbatoio condiviso",
    })), [pool, nomeByUid]);
    const [releasing, setReleasing] = useState(null);
    /** Toglie l'assegnazione di un numero FIR e lo rimette tra i disponibili. */
    const liberaNumero = async (poolId, firNumber) => {
        if (!window.confirm(`Togliere l'assegnazione del FIR ${firNumber}? Il numero torna disponibile.`))
            return;
        setReleasing(poolId);
        try {
            const { data: drafts } = await supabase
                .from("fir_forms")
                .select("id")
                .eq("numero_fir", firNumber)
                .eq("status", "bozza")
                .eq("deleted_by_user", false);
            for (const d of drafts ?? []) {
                await supabase.functions.invoke("admin-user-manage", {
                    body: { action: "delete_fir_form", form_id: d.id },
                });
            }
            const { error } = await supabase
                .from("fir_number_pool")
                .update({ status: "available", user_id: SHARED_POOL_USER_ID, assigned_at: null })
                .eq("id", poolId);
            if (error)
                throw error;
            toast.success(`Numero ${firNumber} rimesso tra i FIR da assegnare`);
            await loadPool();
        }
        catch (e) {
            toast.error("Errore rimozione: " + (e?.message || ""));
        }
        finally {
            setReleasing(null);
        }
    };
    const handlePesca = async () => {
        setPescando(true);
        try {
            const opzione = (BLOCCHI_PESCA[configKey] ?? []).find((b) => b.code === bloccoPesca);
            const blocco = bloccoPesca || RENTRI_BLOCCO_CORRENTE[configKey] || "";
            const res = await vidimaFIRAsync(cliente, qty, blocco, opzione?.sito ? RENTRI_UNITA_LOCALI[configKey] : undefined, (m) => toast.info(m, { id: "vidimazione" }));
            const numeri = (res.numeri ?? []).filter((n) => n && !n.startsWith("TEST-"));
            if (numeri.length === 0) {
                toast.warning(res.pending ? "Richiesta accettata, numeri non ancora disponibili" : "Nessun numero ricevuto");
                return;
            }
            const rows = numeri.map((n) => ({
                fir_number: n,
                user_id: SHARED_POOL_USER_ID,
                status: "available",
                societa_id: societaId,
            }));
            const { error } = await supabase.from("fir_number_pool").insert(rows);
            if (error)
                throw error;
            toast.success(`${numeri.length} numeri FIR acquisiti da RENTRI`);
            loadPool();
        }
        catch (e) {
            toast.error(`Errore vidimazione: ${e.message}`);
        }
        finally {
            setPescando(false);
        }
    };
    const handleAssegna = async (firNumber, userId) => {
        setAssegnando(true);
        try {
            const tenantId = assignApp === "niyol" ? "819c783e-78dd-4080-8265-802e75b0d813" : "77ec9a3d-602e-438f-97bf-1c69abd8f691";
            const { error } = await supabase.rpc("create_manual_fir_draft_for_tenant", {
                p_user_id: userId,
                p_tenant_id: tenantId,
                p_numero_fir: firNumber,
            });
            if (error)
                throw error;
            toast.success(`FIR ${firNumber} assegnato (${assignApp})`);
            loadPool();
        }
        catch (e) {
            toast.error(`Errore assegnazione: ${e.message}`);
        }
        finally {
            setAssegnando(false);
        }
    };
    /** Contrassegna il numero come usato direttamente dall'ufficio (admin) */
    const [blankPrintFir, setBlankPrintFir] = useState(null);
    const handleAssegnaUfficio = async (firNumber) => {
        setAssegnando(true);
        try {
            const { data: auth } = await supabase.auth.getUser();
            const adminId = auth?.user?.id;
            if (!adminId)
                throw new Error("Sessione admin non valida");
            const tenantId = assignApp === "niyol" ? "819c783e-78dd-4080-8265-802e75b0d813" : "77ec9a3d-602e-438f-97bf-1c69abd8f691";
            const { error } = await supabase.rpc("create_manual_fir_draft_for_tenant", {
                p_user_id: adminId,
                p_tenant_id: tenantId,
                p_numero_fir: firNumber,
            });
            if (error)
                throw error;
            toast.success(`FIR ${firNumber} contrassegnato come UFFICIO (uso admin)`);
            loadPool();
        }
        catch (e) {
            toast.error(`Errore assegnazione ufficio: ${e.message}`);
        }
        finally {
            setAssegnando(false);
        }
    };
    const copyFir = async (firNumber) => {
        try {
            await navigator.clipboard.writeText(firNumber);
            toast.success(`Copiato: ${firNumber}`);
        }
        catch {
            toast.error("Copia non riuscita");
        }
    };
    /* ── Invio registri ── */
    const registri = registriDisponibili(cliente);
    const [registroId, setRegistroId] = useState(registri[0]?.id ?? "");
    const today = new Date().toISOString().slice(0, 10);
    const [dataDa, setDataDa] = useState(today);
    const [dataA, setDataA] = useState(today);
    const [movimenti, setMovimenti] = useState([]);
    const [caricando, setCaricando] = useState(false);
    const [inviando, setInviando] = useState(false);
    useEffect(() => {
        setRegistroId(registri[0]?.id ?? "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cliente]);
    const handleCarica = async () => {
        setCaricando(true);
        try {
            const rows = await caricaMovimentiCandidati(mnCtx.tenantId, dataDa, dataA);
            setMovimenti(rows);
            toast.success(`${rows.length} movimenti trovati`);
        }
        catch (e) {
            toast.error(`Errore caricamento: ${e.message}`);
        }
        finally {
            setCaricando(false);
        }
    };
    /* movimenti già inviati (riferimento_interno presente in rentri_invii_registri) */
    const [inviatiIds, setInviatiIds] = useState(new Set());
    const [selezione, setSelezione] = useState(new Set());
    const [movDetail, setMovDetail] = useState(null);
    const toggleSel = (id) => setSelezione((prev) => {
        const n = new Set(prev);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
    });
    const inviaMovimenti = async (rows) => {
        const payload = mapMovimentiToRentri(rows, cliente);
        if (payload.length === 0) {
            toast.error("Nessun movimento valido da inviare");
            return;
        }
        setInviando(true);
        setResult(null);
        try {
            const { response } = await inviaRegistroRentri({
                cliente,
                registroId,
                tenantId: mnCtx.tenantId,
                movimenti: payload,
            });
            setResult(response);
            if (response.success) {
                toast.success(`Registro inviato: ${payload.length} movimenti`);
                setSelezione(new Set());
            }
            else
                toast.error(response.userMessage ?? "Invio registro fallito");
            loadInvii();
        }
        catch (e) {
            toast.error(`Errore invio: ${e.message}`);
        }
        finally {
            setInviando(false);
        }
    };
    const handleInviaTutti = () => inviaMovimenti(movimenti.filter((m) => !inviatiIds.has(m.id)));
    const handleInviaSelezionati = () => inviaMovimenti(movimenti.filter((m) => selezione.has(m.id)));
    /* ── Invii effettuati ── */
    const [invii, setInvii] = useState([]);
    const loadInvii = async () => {
        const { data } = await supabase
            .from("rentri_invii_registri")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100);
        const rows = data ?? [];
        setInvii(rows);
        const ids = new Set();
        for (const r of rows) {
            if (r.stato === "ERRORE")
                continue;
            for (const m of (r.movimenti ?? [])) {
                if (m?.riferimento_interno)
                    ids.add(String(m.riferimento_interno));
            }
        }
        setInviatiIds(ids);
    };
    useEffect(() => {
        loadInvii();
    }, []);
    const handleAggiorna = async (row) => {
        if (!row.transazione_id)
            return;
        const res = await aggiornaStatoInvio(row.id, cliente, row.transazione_id, row.registro_id);
        setResult(res);
        loadInvii();
    };
    if (!isValid)
        return _jsx(Navigate, { to: "/mn/admin", replace: true });
    const label = configKey === "niyol" ? "Niyol" : "Multyproget";
    return (_jsx(MNAdminLayout, { title: `Console RENTRI — ${label}`, subtitle: "Stato, numeri FIR, registri e invii", children: _jsxs("div", { className: "space-y-6", children: [_jsxs("button", { type: "button", onClick: () => navigate("/mn/admin/dev-multyproget"), className: "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-border/60 bg-secondary/50 hover:bg-secondary", children: [_jsx(ArrowLeft, { size: 16 }), " Torna alla console centrale"] }), _jsx("div", { className: "flex flex-wrap items-center gap-2", children: ["multy", "niyol"].map((c) => (_jsx("button", { onClick: () => setCliente(c), className: `px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${configKey === c
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary"}`, children: c === "niyol" ? "Niyol" : "Multyproget" }, c))) }), _jsxs("div", { className: "flex flex-wrap items-center gap-3 p-4 rounded-xl bg-card/60 border border-border/30", children: [_jsx("span", { className: `h-2.5 w-2.5 rounded-full ${vpsUp === true ? "bg-green-400 animate-pulse" : vpsUp === false ? "bg-red-500" : "bg-yellow-400"}` }), _jsxs("span", { className: "text-sm text-muted-foreground", children: ["Bridge RENTRI: ", _jsx("strong", { className: "text-foreground", children: vpsUp === true ? "Online" : vpsUp === false ? "Offline" : "..." })] }), _jsxs("span", { className: "text-xs text-muted-foreground", children: ["CF: ", RENTRI_ISSUERS[configKey]] }), _jsxs("span", { className: "text-xs text-muted-foreground", children: ["U.L.: ", RENTRI_UNITA_LOCALI[configKey]] }), _jsxs("button", { onClick: refreshStato, className: "ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70", children: [loadingStato ? _jsx(Loader2, { size: 12, className: "animate-spin" }) : _jsx(RefreshCw, { size: 12 }), " Aggiorna"] })] }), _jsx("div", { className: "flex gap-2 flex-wrap", children: TABS.map((t) => (_jsxs("button", { onClick: () => setTab(t.id), className: `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${tab === t.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary"}`, children: [t.icon, t.label] }, t.id))) }), tab === "stato" && (_jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4", children: [_jsx("h3", { className: "text-base font-display tracking-wider", children: "Blocchi di vidimazione attivi" }), blocchi.length === 0 && _jsx("p", { className: "text-sm text-muted-foreground", children: "Nessun blocco disponibile." }), _jsx("div", { className: "grid gap-3 md:grid-cols-2", children: blocchi.map((b, i) => (_jsxs("div", { className: "p-4 rounded-xl bg-secondary/40 border border-border/30 text-sm space-y-1", children: [_jsx("div", { className: "font-mono font-bold text-primary", children: b.codice ?? b.blocco ?? b.identificativo }), _jsx("div", { className: "text-muted-foreground", children: b.descrizione ?? b.nome ?? "—" }), _jsxs("div", { className: "text-xs text-muted-foreground", children: ["FIR vidimati: ", b.numero_fir_vidimati ?? b.vidimati ?? "—"] })] }, i))) }), _jsxs("div", { className: "pt-2 border-t border-border/30", children: [_jsx("h4", { className: "text-sm font-semibold mb-2", children: "Registri configurati" }), _jsx("ul", { className: "text-sm text-muted-foreground space-y-1", children: registri.map((r) => (_jsxs("li", { children: [_jsx("span", { className: "font-mono text-foreground", children: r.id }), " \u2014 ", r.nome, " (", r.tipo, ")"] }, r.id))) })] }), _jsx(RentriResultBanner, { result: result })] })), tab === "numeri" && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4", children: [_jsx("h3", { className: "text-base font-display tracking-wider", children: "Pesca numeri FIR da RENTRI" }), _jsxs("div", { className: "flex flex-wrap items-end gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted-foreground", children: "Quantit\u00E0" }), _jsx("input", { type: "number", min: 1, max: 50, value: qty, onChange: (e) => setQty(Number(e.target.value)), className: "block w-28 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted-foreground", children: "Blocco" }), _jsx("select", { value: bloccoPesca, onChange: (e) => setBloccoPesca(e.target.value), className: "block rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm", children: (BLOCCHI_PESCA[configKey] ?? []).map((b) => (_jsxs("option", { value: b.code, children: [b.code, " \u2014 ", b.label] }, b.code))) })] }), _jsxs("button", { onClick: handlePesca, disabled: pescando, className: "flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-40", children: [pescando ? _jsx(Loader2, { size: 16, className: "animate-spin" }) : _jsx(Ticket, { size: 16 }), " Vidima e acquisisci"] }), _jsxs("span", { className: "text-sm text-muted-foreground", children: ["Disponibili in serbatoio: ", _jsx("strong", { className: "text-foreground", children: disponibili.length })] })] })] }), _jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4", children: [_jsxs("h3", { className: "text-base font-display tracking-wider flex items-center gap-2", children: [_jsx(Users, { size: 16 }), " Assegna numeri al personale"] }), _jsx("div", { className: "flex gap-2", children: ["multyproget", "niyol"].map((a) => (_jsxs("button", { onClick: () => setAssignApp(a), className: `px-4 py-2 rounded-lg text-sm font-semibold border ${assignApp === a
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-secondary/50 text-muted-foreground border-border/50"}`, children: ["App ", a === "niyol" ? "Niyol" : "Multyproget"] }, a))) }), personale.filter((u) => appDiProfilo(u) === assignApp).length === 0 && (_jsxs("p", { className: "text-xs text-amber-400", children: ["Nessun dipendente collegato all'app ", assignApp === "niyol" ? "Niyol" : "Multyproget", ": creane uno da Dashboard \u2192 Gestione utenti app."] })), _jsxs("div", { className: "space-y-2 max-h-[420px] overflow-auto", children: [disponibili.map((p) => (_jsxs("div", { className: "flex flex-wrap items-center gap-3 p-3 rounded-lg bg-secondary/40 border border-border/30", children: [_jsx("span", { className: "font-mono text-sm font-bold", children: p.fir_number }), _jsx("button", { type: "button", title: "Copia numero FIR", onClick: () => copyFir(p.fir_number), className: "rounded-md border border-border/60 bg-background/60 p-1.5 text-muted-foreground hover:text-foreground", children: _jsx(Copy, { size: 14 }) }), _jsx("button", { type: "button", title: "Stampa formulario vuoto con questo numero e assegnalo all'ufficio", onClick: () => setBlankPrintFir(p.fir_number), className: "rounded-md border border-violet-500/50 bg-violet-500/10 p-1.5 text-violet-300 hover:bg-violet-500/20", children: _jsx(Printer, { size: 14 }) }), _jsxs("select", { disabled: assegnando, value: "", onChange: (e) => {
                                                        const v = e.target.value;
                                                        if (!v)
                                                            return;
                                                        if (v === "__ufficio__")
                                                            handleAssegnaUfficio(p.fir_number);
                                                        else
                                                            handleAssegna(p.fir_number, v);
                                                        e.target.value = "";
                                                    }, className: "ml-auto rounded-lg border border-border bg-background px-3 py-1.5 text-sm", children: [_jsx("option", { value: "", children: "Assegna a\u2026" }), _jsx("option", { value: "__ufficio__", children: "\uD83C\uDFE2 Contrassegna come UFFICIO (uso admin)" }), personale
                                                            .filter((u) => appDiProfilo(u) === assignApp)
                                                            .map((u) => (_jsx("option", { value: u.user_id ?? u.id, children: [u.nome, u.cognome].filter(Boolean).join(" ") || u.id.slice(0, 8) }, u.id)))] })] }, p.id))), disponibili.length === 0 && (_jsx("p", { className: "text-sm text-muted-foreground", children: "Nessun numero disponibile: vidima nuovi numeri." }))] })] }), _jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/30 p-6 space-y-3", children: [_jsxs("h3", { className: "text-base font-display tracking-wider flex items-center gap-2", children: [_jsx(Users, { size: 16 }), " Numeri gi\u00E0 assegnati (", assegnati.length, ")"] }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Numeri scaricati da RENTRI e gi\u00E0 assegnati a un dipendente o all'ufficio." }), _jsxs("div", { className: "space-y-2 max-h-[420px] overflow-auto", children: [assegnati.map((p) => (_jsxs("div", { className: "flex flex-wrap items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/30", children: [_jsx("span", { className: "font-mono text-sm font-bold", children: p.fir_number }), _jsx("button", { type: "button", title: "Copia numero FIR", onClick: () => copyFir(p.fir_number), className: "rounded-md border border-border/60 bg-background/60 p-1.5 text-muted-foreground hover:text-foreground", children: _jsx(Copy, { size: 14 }) }), _jsx("span", { className: "text-sm text-foreground", children: p.assegnatario }), _jsx("span", { className: `ml-auto text-[11px] uppercase font-semibold px-2 py-1 rounded-full ${p.status === "consumed"
                                                        ? "bg-emerald-500/20 text-emerald-300"
                                                        : "bg-amber-500/20 text-amber-300"}`, children: p.status === "consumed" ? "utilizzato" : "assegnato" }), p.assigned_at && (_jsx("span", { className: "text-[11px] text-muted-foreground font-mono", children: new Date(p.assigned_at).toLocaleDateString("it-IT") })), _jsx("button", { type: "button", disabled: releasing === p.id, onClick: () => liberaNumero(p.id, p.fir_number), title: "Togli assegnazione e rimetti il numero nei FIR da assegnare", className: "text-[11px] underline text-destructive hover:opacity-80 disabled:opacity-40", children: releasing === p.id ? "…" : "togli" })] }, p.id))), assegnati.length === 0 && (_jsx("p", { className: "text-sm text-muted-foreground", children: "Nessun numero assegnato al momento." }))] })] })] })), tab === "registri" && (_jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4", children: [_jsx("h3", { className: "text-base font-display tracking-wider", children: "Invio movimenti al registro" }), _jsxs("div", { className: "flex flex-wrap items-end gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted-foreground", children: "Registro" }), _jsx("select", { value: registroId, onChange: (e) => setRegistroId(e.target.value), className: "block rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm", children: registri.map((r) => (_jsxs("option", { value: r.id, children: [r.nome, " (", r.id, ")"] }, r.id))) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted-foreground", children: "Dal" }), _jsx("input", { type: "date", value: dataDa, onChange: (e) => setDataDa(e.target.value), className: "block rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted-foreground", children: "Al" }), _jsx("input", { type: "date", value: dataA, onChange: (e) => setDataA(e.target.value), className: "block rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm" })] }), _jsxs("button", { onClick: handleCarica, disabled: caricando, className: "flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary font-semibold disabled:opacity-40", children: [caricando ? _jsx(Loader2, { size: 16, className: "animate-spin" }) : _jsx(RefreshCw, { size: 16 }), " Carica movimenti"] }), _jsxs("button", { onClick: handleInviaSelezionati, disabled: inviando || selezione.size === 0, className: "flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary border border-primary/50 font-semibold disabled:opacity-40", children: [inviando ? _jsx(Loader2, { size: 16, className: "animate-spin" }) : _jsx(Send, { size: 16 }), " Invia selezionati (", selezione.size, ")"] }), _jsxs("button", { onClick: handleInviaTutti, disabled: inviando || movimenti.filter((m) => !inviatiIds.has(m.id)).length === 0, className: "flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-40", children: [inviando ? _jsx(Loader2, { size: 16, className: "animate-spin" }) : _jsx(Send, { size: 16 }), " Invia tutti i non inviati"] })] }), _jsx("div", { className: "max-h-[420px] overflow-auto rounded-xl border border-border/30", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-secondary/60 text-xs uppercase text-muted-foreground", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2 w-8", children: _jsx("input", { type: "checkbox", checked: movimenti.length > 0 && selezione.size === movimenti.filter((m) => !inviatiIds.has(m.id)).length && selezione.size > 0, onChange: (e) => setSelezione(e.target.checked ? new Set(movimenti.filter((m) => !inviatiIds.has(m.id)).map((m) => m.id)) : new Set()) }) }), _jsx("th", { className: "text-left px-3 py-2", children: "Data" }), _jsx("th", { className: "text-left px-3 py-2", children: "Tipo" }), _jsx("th", { className: "text-left px-3 py-2", children: "CER" }), _jsx("th", { className: "text-right px-3 py-2", children: "Kg" }), _jsx("th", { className: "text-left px-3 py-2", children: "FIR" }), _jsx("th", { className: "text-left px-3 py-2", children: "Stato" }), _jsx("th", { className: "text-right px-3 py-2", children: "Azione" })] }) }), _jsxs("tbody", { children: [movimenti.map((m) => {
                                                const inviato = inviatiIds.has(m.id);
                                                return (_jsxs("tr", { className: `border-t border-border/20 ${inviato ? "bg-emerald-500/5" : ""}`, children: [_jsx("td", { className: "px-3 py-2", children: _jsx("input", { type: "checkbox", checked: selezione.has(m.id), onChange: () => toggleSel(m.id) }) }), _jsx("td", { className: "px-3 py-2", children: m.data_movimento }), _jsx("td", { className: "px-3 py-2", children: m.tipo_movimento }), _jsx("td", { className: "px-3 py-2 font-mono", children: m.cer }), _jsx("td", { className: "px-3 py-2 text-right", children: Number(m.quantita_kg ?? 0).toLocaleString("it-IT") }), _jsx("td", { className: "px-3 py-2 font-mono text-xs", children: m.numero_fir ?? "—" }), _jsx("td", { className: "px-3 py-2", children: inviato ? (_jsx("span", { className: "rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-400", children: "\u2713 INVIATO" })) : (_jsx("span", { className: "rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground", children: "Da inviare" })) }), _jsx("td", { className: "px-3 py-2 text-right", children: _jsxs("div", { className: "flex justify-end gap-1", children: [_jsx("button", { onClick: () => setMovDetail(m), className: "rounded-lg border border-border px-3 py-1 text-xs font-semibold", children: "Dettagli" }), _jsx("button", { onClick: () => inviaMovimenti([m]), disabled: inviando, className: "rounded-lg border border-primary/50 px-3 py-1 text-xs font-semibold disabled:opacity-40", children: inviato ? "Reinvia" : "Invia" })] }) })] }, m.id));
                                            }), movimenti.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 8, className: "px-3 py-6 text-center text-muted-foreground", children: "Nessun movimento caricato." }) }))] })] }) }), _jsx(RentriResultBanner, { result: result }), movDetail && (_jsx("div", { className: "fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4", onClick: () => setMovDetail(null), children: _jsxs("div", { className: "max-h-[85vh] w-full max-w-2xl overflow-auto rounded-xl border border-border bg-card p-4", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "mb-3 flex items-center justify-between", children: [_jsx("h3", { className: "font-bold", children: "Dettagli movimento" }), _jsx("button", { type: "button", onClick: () => setMovDetail(null), className: "rounded border border-border bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground", children: "\u2715 Chiudi" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground", children: "Data:" }), " ", movDetail.data_movimento] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground", children: "Tipo:" }), " ", movDetail.tipo_movimento] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground", children: "CER:" }), " ", movDetail.cer] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground", children: "Kg:" }), " ", Number(movDetail.quantita_kg ?? 0).toLocaleString("it-IT")] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground", children: "FIR:" }), " ", movDetail.numero_fir ?? "—"] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground", children: "Stato:" }), " ", inviatiIds.has(movDetail.id) ? "INVIATO" : "Da inviare"] }), _jsxs("div", { className: "col-span-2", children: [_jsx("span", { className: "text-muted-foreground", children: "Descrizione:" }), " ", movDetail.descrizione_rifiuto ?? "—"] }), _jsxs("div", { className: "col-span-2", children: [_jsx("span", { className: "text-muted-foreground", children: "Produttore:" }), " ", movDetail.produttore_denominazione ?? "—"] }), _jsxs("div", { className: "col-span-2", children: [_jsx("span", { className: "text-muted-foreground", children: "Destinatario:" }), " ", movDetail.destinatario_denominazione ?? "—"] })] })] }) }))] })), tab === "bozze" && (_jsx(RentriBozzePanel, { cliente: cliente, societaId: societaId, tenantId: configKey === "niyol"
                        ? "819c783e-78dd-4080-8265-802e75b0d813"
                        : "77ec9a3d-602e-438f-97bf-1c69abd8f691", mnContext: configKey === "niyol" ? "niyol" : "multyproget", onPoolChanged: loadPool })), tab === "dafirmare" && (_jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4", children: [_jsx("h3", { className: "text-base font-display tracking-wider", children: "Formulari su RENTRI da firmare come destinatario" }), _jsx(RentriFirDaFirmarePanel, { cliente: cliente })] })), tab === "invii" && (_jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4", children: [_jsx("h3", { className: "text-base font-display tracking-wider", children: "Invii registri effettuati" }), _jsx("div", { className: "max-h-[520px] overflow-auto rounded-xl border border-border/30", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-secondary/60 text-xs uppercase text-muted-foreground", children: _jsxs("tr", { children: [_jsx("th", { className: "text-left px-3 py-2", children: "Data" }), _jsx("th", { className: "text-left px-3 py-2", children: "Cliente" }), _jsx("th", { className: "text-left px-3 py-2", children: "Registro" }), _jsx("th", { className: "text-right px-3 py-2", children: "Mov." }), _jsx("th", { className: "text-left px-3 py-2", children: "Stato" }), _jsx("th", { className: "text-left px-3 py-2", children: "Transazione" }), _jsx("th", { className: "px-3 py-2" })] }) }), _jsxs("tbody", { children: [invii.map((r) => (_jsxs("tr", { className: "border-t border-border/20", children: [_jsx("td", { className: "px-3 py-2", children: new Date(r.created_at).toLocaleString("it-IT") }), _jsx("td", { className: "px-3 py-2", children: r.cliente }), _jsx("td", { className: "px-3 py-2", children: r.registro_nome ?? r.registro_id }), _jsx("td", { className: "px-3 py-2 text-right", children: r.num_movimenti }), _jsx("td", { className: "px-3 py-2", children: _jsx("span", { className: `px-2 py-0.5 rounded-md text-xs font-semibold ${r.stato === "CONFERMATO"
                                                                ? "bg-green-500/15 text-green-400"
                                                                : r.stato === "ERRORE"
                                                                    ? "bg-red-500/15 text-red-400"
                                                                    : "bg-amber-500/15 text-amber-400"}`, children: r.stato }) }), _jsx("td", { className: "px-3 py-2 font-mono text-xs", children: r.transazione_id ?? "—" }), _jsx("td", { className: "px-3 py-2 text-right", children: r.transazione_id && (_jsx("button", { onClick: () => handleAggiorna(r), className: "text-xs px-2 py-1 rounded-md bg-secondary hover:bg-secondary/70", children: "Aggiorna stato" })) })] }, r.id))), invii.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: "px-3 py-6 text-center text-muted-foreground", children: "Nessun invio registrato." }) }))] })] }) })] })), tab === "lemon" && _jsx(DarkLemonMNChat, { context: context, surface: "console" }), blankPrintFir && (_jsx(DevStampaFIREditor, { firNumber: blankPrintFir, blank: true, open: !!blankPrintFir, onClose: () => setBlankPrintFir(null), onPrinted: async () => { const num = blankPrintFir; setBlankPrintFir(null); if (num) await handleAssegnaUfficio(num); } }))] }) }));
}
