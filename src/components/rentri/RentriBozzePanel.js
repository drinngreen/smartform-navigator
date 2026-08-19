import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { emissioneFir } from "@/lib/rentriVpsApi";
import { MNFIRFormComplete } from "@/components/fir/MNFIRFormComplete";
import { FileText, Loader2, PenLine, RefreshCw, Search, Send, X } from "lucide-react";
const SHARED_POOL_USER_ID = "00000000-0000-0000-0000-000000000000";
export function RentriBozzePanel({ cliente, societaId, tenantId, mnContext, onPoolChanged }) {
    const [drafts, setDrafts] = useState([]);
    const [pool, setPool] = useState([]);
    const [nomeByUid, setNomeByUid] = useState({});
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState("");
    const load = async () => {
        setLoading(true);
        try {
            const [{ data: forms }, { data: poolRows }, { data: profs }] = await Promise.all([
                supabase
                    .from("fir_forms")
                    .select("id, numero_fir, status, user_id, codice_eer, quantita, produttore_denominazione, destinatario_denominazione, trasportatore_denominazione, produttore_codice_fiscale, destinatario_codice_fiscale, trasportatore_codice_fiscale, trasportatore_iscrizione_albo, descrizione_rifiuto, stato_fisico, unita_misura, produttore_indirizzo, destinatario_indirizzo, created_at")
                    .eq("tenant_id", tenantId)
                    .eq("status", "bozza")
                    .eq("deleted_by_user", false)
                    .order("created_at", { ascending: false })
                    .limit(300),
                supabase
                    .from("fir_number_pool")
                    .select("id, fir_number, status, user_id")
                    .eq("societa_id", societaId)
                    .order("fir_number", { ascending: true })
                    .limit(500),
                supabase.from("profiles").select("id, user_id, nome, cognome").limit(1000),
            ]);
            setDrafts((forms ?? []));
            setPool((poolRows ?? []));
            const map = {};
            for (const u of (profs ?? [])) {
                const label = [u.nome, u.cognome].filter(Boolean).join(" ").trim();
                if (!label)
                    continue;
                if (u.user_id)
                    map[u.user_id] = label;
                map[u.id] = map[u.id] ?? label;
            }
            setNomeByUid(map);
        }
        catch (e) {
            toast.error("Errore caricamento bozze: " + (e?.message || ""));
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tenantId, societaId]);
    /** Numeri selezionabili: liberi + già assegnati a dipendenti/ufficio */
    const opzioniNumeri = useMemo(() => {
        return pool.map((p) => {
            const assegnatoA = p.status !== "available" && p.user_id && p.user_id !== SHARED_POOL_USER_ID
                ? nomeByUid[p.user_id] ?? "Ufficio / admin"
                : null;
            return {
                value: p.fir_number,
                libero: !assegnatoA,
                label: assegnatoA
                    ? `⚠️ ${p.fir_number} — assegnato a ${assegnatoA} (l'assegnazione verrà tolta al dipendente)`
                    : `${p.fir_number} — libero`,
            };
        });
    }, [pool, nomeByUid]);
    const draftsFiltrate = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q)
            return drafts;
        const terms = q.split(/\s+/);
        return drafts.filter((d) => {
            const hay = [
                d.numero_fir,
                d.codice_eer,
                d.descrizione_rifiuto,
                d.produttore_denominazione,
                d.destinatario_denominazione,
                d.trasportatore_denominazione,
                d.produttore_codice_fiscale,
                d.destinatario_codice_fiscale,
                d.trasportatore_codice_fiscale,
                new Date(d.created_at).toLocaleDateString("it-IT"),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return terms.every((t) => hay.includes(t));
        });
    }, [drafts, search]);
    const cambiaNumero = async (draft, numero) => {
        const opt = opzioniNumeri.find((o) => o.value === numero);
        const msg = opt?.libero
            ? `Assegnare il numero ${numero} a questa bozza?`
            : `Il numero ${numero} è già assegnato a un dipendente.\nProseguendo l'assegnazione verrà TOLTA al dipendente (la sua bozza sarà archiviata) e il numero passerà a questa bozza.\n\nConfermi?`;
        if (!window.confirm(msg))
            return;
        setBusyId(draft.id);
        try {
            const { error } = await supabase.rpc("admin_set_fir_number", {
                p_form_id: draft.id,
                p_numero_fir: numero,
            });
            if (error)
                throw error;
            toast.success(`Numero ${numero} assegnato alla bozza`);
            await load();
            onPoolChanged?.();
        }
        catch (e) {
            toast.error("Errore assegnazione numero: " + (e?.message || ""));
        }
        finally {
            setBusyId(null);
        }
    };
    const inviaARentri = async (d) => {
        if (!d.numero_fir) {
            toast.error("Assegna prima un numero FIR alla bozza");
            return;
        }
        if (!window.confirm(`Inviare a RENTRI il formulario ${d.numero_fir}? L'operazione è definitiva.`))
            return;
        setBusyId(d.id);
        try {
            const res = await emissioneFir(cliente, {
                numero_fir: d.numero_fir,
                produttore: {
                    denominazione: d.produttore_denominazione ?? "",
                    codice_fiscale: d.produttore_codice_fiscale ?? "",
                    indirizzo: d.produttore_indirizzo ?? "",
                },
                destinatario: {
                    denominazione: d.destinatario_denominazione ?? "",
                    codice_fiscale: d.destinatario_codice_fiscale ?? "",
                    indirizzo: d.destinatario_indirizzo ?? "",
                },
                trasportatore: {
                    denominazione: d.trasportatore_denominazione ?? "",
                    codice_fiscale: d.trasportatore_codice_fiscale ?? "",
                    albo: d.trasportatore_iscrizione_albo ?? "",
                },
                rifiuto: {
                    codice_eer: d.codice_eer ?? "",
                    descrizione: d.descrizione_rifiuto ?? "",
                    stato_fisico: d.stato_fisico ?? "",
                    quantita: Number(d.quantita ?? 0),
                    unita_misura: d.unita_misura ?? "kg",
                },
            });
            if (!res.success) {
                toast.error(res.userMessage ?? "Invio a RENTRI fallito");
                return;
            }
            await supabase
                .from("fir_forms")
                .update({ status: "inviato", submitted_at: new Date().toISOString() })
                .eq("id", d.id);
            toast.success(`Formulario ${d.numero_fir} inviato a RENTRI`);
            await load();
            onPoolChanged?.();
        }
        catch (e) {
            toast.error("Errore invio: " + (e?.message || ""));
        }
        finally {
            setBusyId(null);
        }
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsxs("h3", { className: "text-base font-display tracking-wider flex items-center gap-2", children: [_jsx(FileText, { size: 16 }), " Bozze formulari (", draftsFiltrate.length, search.trim() ? ` / ${drafts.length}` : "", ")"] }), _jsxs("button", { onClick: load, className: "ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70", children: [loading ? _jsx(Loader2, { size: 12, className: "animate-spin" }) : _jsx(RefreshCw, { size: 12 }), " Aggiorna"] })] }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Modifica la bozza, assegna o cambia il numero FIR pescando dai numeri scaricati da RENTRI (compresi quelli gi\u00E0 assegnati ai dipendenti) e invia direttamente da qui." }), _jsxs("div", { className: "relative", children: [_jsx(Search, { size: 14, className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" }), _jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Cerca per numero FIR, CER, produttore, destinatario, trasportatore, data\u2026", className: "w-full rounded-lg border border-border bg-background pl-9 pr-9 py-2 text-sm" }), search && (_jsx("button", { onClick: () => setSearch(""), "aria-label": "Pulisci ricerca", className: "absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-secondary text-muted-foreground", children: _jsx(X, { size: 14 }) }))] }), _jsxs("div", { className: "space-y-2 max-h-[560px] overflow-auto", children: [search.trim() && draftsFiltrate.length === 0 && (_jsxs("p", { className: "text-xs text-muted-foreground py-4 text-center", children: ["Nessuna bozza trovata per \u00AB", search, "\u00BB"] })), draftsFiltrate.map((d) => (_jsxs("div", { className: "rounded-lg bg-secondary/30 border border-border/30 p-3 space-y-2", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsx("span", { className: `font-mono text-sm font-bold ${d.numero_fir ? "text-foreground" : "text-amber-400"}`, children: d.numero_fir || "SENZA NUMERO" }), _jsxs("span", { className: "text-xs text-muted-foreground", children: [d.codice_eer || "—", " \u00B7 ", Number(d.quantita ?? 0).toLocaleString("it-IT"), " ", d.unita_misura || "kg"] }), _jsxs("span", { className: "text-xs text-muted-foreground", children: [d.produttore_denominazione || "—", " \u2192 ", d.destinatario_denominazione || "—"] }), _jsx("span", { className: "ml-auto text-[11px] text-muted-foreground font-mono", children: new Date(d.created_at).toLocaleDateString("it-IT") })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs("select", { disabled: busyId === d.id, value: "", onChange: (e) => {
                                                    const v = e.target.value;
                                                    e.target.value = "";
                                                    if (v)
                                                        void cambiaNumero(d, v);
                                                }, className: "rounded-lg border border-border bg-background px-3 py-1.5 text-sm min-w-[280px]", children: [_jsx("option", { value: "", children: d.numero_fir ? "Cambia numero FIR…" : "Assegna numero FIR…" }), opzioniNumeri.map((o) => (_jsx("option", { value: o.value, children: o.label }, o.value)))] }), _jsxs("button", { onClick: () => setEditing(d), className: "flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold", children: [_jsx(PenLine, { size: 14 }), " Modifica"] }), _jsxs("button", { onClick: () => inviaARentri(d), disabled: busyId === d.id, className: "flex items-center gap-2 rounded-lg bg-yellow-600 px-3 py-1.5 text-xs font-semibold text-background disabled:opacity-40", children: [busyId === d.id ? _jsx(Loader2, { size: 14, className: "animate-spin" }) : _jsx(Send, { size: 14 }), " Invia a RENTRI"] })] })] }, d.id))), drafts.length === 0 && !loading && (_jsx("p", { className: "text-sm text-muted-foreground", children: "Nessuna bozza presente per questa societ\u00E0." }))] })] }), editing && (_jsx("div", { className: "fixed inset-0 z-[9999] flex items-start justify-center bg-black/70 p-4 overflow-auto", onClick: () => setEditing(null), children: _jsxs("div", { className: "w-full max-w-6xl rounded-xl border border-border bg-card p-4 my-6", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "mb-3 flex items-center justify-between", children: [_jsxs("h3", { className: "font-bold", children: ["Modifica bozza ", editing.numero_fir || "senza numero"] }), _jsx("button", { type: "button", onClick: () => {
                                        setEditing(null);
                                        void load();
                                    }, className: "rounded border border-border bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground", children: "\u2715 Chiudi" })] }), _jsx(MNFIRFormComplete, { firFormId: editing.id, tenantId: tenantId, mnContext: mnContext, enableFatturazione: true }, editing.id)] }) }))] }));
}
