import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Plus, Trash2, Search, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { AZIENDE_PRESETS, TIPI_AUTORIZZAZIONE, getAutorizzazioni, addAutorizzazione, removeAutorizzazione, } from "@/data/multyPresets";
const fmtIndirizzo = (r) => [r.indirizzo, [r.cap, r.citta ?? r.comune, r.provincia ? `(${r.provincia})` : ""].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(" - ");
export function PresetAziendaSelector({ label = "Preset azienda", ruolo, initialCf, onSelectAzienda, onSelectAutorizzazione, onSelectCantiere, onSelectTarga, onSelectConducente, onSelectPartnerDefault, }) {
    const [aziendaKey, setAziendaKey] = useState("");
    const [clienteId, setClienteId] = useState(null);
    const [clienteIds, setClienteIds] = useState([]);
    const [clienteNome, setClienteNome] = useState("");
    const [dbAuts, setDbAuts] = useState([]);
    const [cantieri, setCantieri] = useState([]);
    const [targhe, setTarghe] = useState([]);
    const [conducenti, setConducenti] = useState([]);
    const [partnerDefaults, setPartnerDefaults] = useState([]);
    const [loadingDeps, setLoadingDeps] = useState(false);
    const [auts, setAuts] = useState([]);
    const [autId, setAutId] = useState("");
    const [adding, setAdding] = useState(false);
    const [nuovo, setNuovo] = useState({ numero: "", tipo: TIPI_AUTORIZZAZIONE[0], data: "" });
    const [query, setQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState([]);
    const [roleCompanies, setRoleCompanies] = useState([]);
    const [loadingRoleCompanies, setLoadingRoleCompanies] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [allCompanies, setAllCompanies] = useState([]);
    const [loadingAll, setLoadingAll] = useState(false);
    // Tendina con TUTTA l'anagrafica (in aggiunta alla ricerca testuale)
    useEffect(() => {
        let cancelled = false;
        setLoadingAll(true);
        (async () => {
            const rows = [];
            for (let page = 0; page < 20; page++) {
                const { data, error } = await supabase
                    .from("anagrafica_aziende_mp")
                    .select("id,ragione_sociale,indirizzo,citta,provincia,cap,codice_fiscale,partita_iva")
                    .order("ragione_sociale")
                    .range(page * 1000, page * 1000 + 999);
                if (error)
                    break;
                rows.push(...(data || []));
                if (!data || data.length < 1000)
                    break;
            }
            if (cancelled)
                return;
            const seen = new Set();
            setAllCompanies(rows.filter((r) => {
                const k = `${r.codice_fiscale || r.partita_iva || r.id}|${r.ragione_sociale || ""}`.toUpperCase();
                if (seen.has(k))
                    return false;
                seen.add(k);
                return true;
            }));
            setLoadingAll(false);
        })();
        return () => {
            cancelled = true;
        };
    }, []);
    // Precarica i dati collegati per l'azienda già presente nel form (es. Multy/Niyol produttore)
    useEffect(() => {
        const cf = (initialCf || "").trim();
        if (!cf || cf.length < 5 || clienteId)
            return;
        let cancelled = false;
        (async () => {
            const { data } = await supabase
                .from("anagrafica_aziende_mp")
                .select("id,ragione_sociale,codice_fiscale,partita_iva")
                .or(`codice_fiscale.eq.${cf},partita_iva.eq.${cf}`)
                .limit(200);
            if (cancelled || !data || data.length === 0)
                return;
            setClienteId(data[0].id);
            setClienteNome(data[0].ragione_sociale || "");
            setClienteIds(data.map((x) => x.id));
        })();
        return () => {
            cancelled = true;
        };
    }, [initialCf, clienteId]);
    /** Le anagrafiche importate contengono righe duplicate per la stessa azienda
     *  (stesso CF / P.IVA su indirizzi diversi): i dati collegati (autorizzazioni,
     *  cantieri, targhe, conducenti) vanno quindi raccolti su TUTTI i duplicati. */
    const resolveClienteIds = async (r) => {
        const keys = [r.codice_fiscale, r.partita_iva].filter((v) => v && String(v).trim().length > 3);
        if (keys.length === 0)
            return [r.id];
        const filters = keys
            .flatMap((k) => [`codice_fiscale.eq.${k}`, `partita_iva.eq.${k}`])
            .join(",");
        const { data } = await supabase.from("anagrafica_aziende_mp").select("id").or(filters).limit(200);
        const ids = Array.from(new Set([r.id, ...(data || []).map((x) => x.id)]));
        return ids;
    };
    // I file Prometeo classificano destinatari/trasportatori/intermediari tramite
    // le rispettive autorizzazioni. Le vecchie flag dell'anagrafica non sono
    // affidabili, quindi la tendina viene costruita dai collegamenti importati.
    useEffect(() => {
        if (!ruolo || ruolo === "PRODUTTORE") {
            setRoleCompanies([]);
            return;
        }
        let cancelled = false;
        setLoadingRoleCompanies(true);
        setLoadError("");
        (async () => {
            const { data: links, error: linksError } = await supabase
                .from("cliente_autorizzazioni")
                .select("cliente_id")
                .eq("tipo", ruolo)
                .limit(1000);
            if (linksError) {
                if (!cancelled)
                    setLoadError("Impossibile caricare i preset autorizzati");
                if (!cancelled)
                    setLoadingRoleCompanies(false);
                return;
            }
            const ids = Array.from(new Set((links || []).map((x) => x.cliente_id).filter(Boolean)));
            const chunks = [];
            for (let i = 0; i < ids.length; i += 150)
                chunks.push(ids.slice(i, i + 150));
            const responses = await Promise.all(chunks.map((chunk) => supabase
                .from("anagrafica_aziende_mp")
                .select("id,ragione_sociale,indirizzo,citta,provincia,cap,codice_fiscale,partita_iva")
                .in("id", chunk)
                .order("ragione_sociale")));
            if (cancelled)
                return;
            const failed = responses.find((response) => response.error);
            if (failed) {
                setLoadError("Impossibile leggere l'anagrafica dei preset");
                setLoadingRoleCompanies(false);
                return;
            }
            const seen = new Set();
            const rows = responses
                .flatMap((response) => response.data || [])
                .filter((row) => {
                const key = `${row.codice_fiscale || row.partita_iva || row.id}|${row.ragione_sociale || ""}`.toUpperCase();
                if (seen.has(key))
                    return false;
                seen.add(key);
                return true;
            })
                .sort((a, b) => String(a.ragione_sociale || "").localeCompare(String(b.ragione_sociale || ""), "it"));
            setRoleCompanies(rows);
            setLoadingRoleCompanies(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [ruolo]);
    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            setResults([]);
            return;
        }
        let cancelled = false;
        setSearching(true);
        const t = setTimeout(async () => {
            const { data, error } = await supabase
                .from("anagrafica_aziende_mp")
                .select("id,ragione_sociale,indirizzo,citta,provincia,cap,codice_fiscale,partita_iva")
                .or(`ragione_sociale.ilike.%${q}%,codice_fiscale.ilike.%${q}%,partita_iva.ilike.%${q}%`)
                .order("ragione_sociale")
                .limit(50);
            if (!cancelled) {
                setResults(data || []);
                setLoadError(error ? "Ricerca anagrafica non disponibile" : "");
                setSearching(false);
            }
        }, 300);
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [query]);
    // Carica tutti i dati collegati (autorizzazioni, cantieri, targhe, conducenti) del cliente scelto
    useEffect(() => {
        const ids = clienteIds.length ? clienteIds : clienteId ? [clienteId] : [];
        if (ids.length === 0) {
            setDbAuts([]);
            setCantieri([]);
            setTarghe([]);
            setConducenti([]);
            setPartnerDefaults([]);
            return;
        }
        let cancelled = false;
        setLoadingDeps(true);
        (async () => {
            const [a, c, t, k, p] = await Promise.all([
                supabase
                    .from("cliente_autorizzazioni")
                    .select("id,numero_autorizzazione,tipo,ente_rilascio,data_inizio,data_scadenza,note")
                    .in("cliente_id", ids)
                    .order("data_scadenza", { ascending: false })
                    .limit(500),
                supabase
                    .from("cliente_cantieri")
                    .select("id,denominazione,indirizzo,comune,provincia,note")
                    .in("cliente_id", ids)
                    .order("denominazione")
                    .limit(1000),
                supabase
                    .from("cliente_targhe")
                    .select("id,targa,tipo_mezzo,conducente_default,note")
                    .in("cliente_id", ids)
                    .order("targa")
                    .limit(1000),
                supabase
                    .from("cliente_conducenti")
                    .select("id,cognome,nome")
                    .in("cliente_id", ids)
                    .order("cognome")
                    .limit(1000),
                supabase
                    .from("cliente_partner_default")
                    .select("id,ruolo,ragione_sociale,indirizzo,cap,citta,provincia")
                    .in("cliente_id", ids)
                    .order("ruolo")
                    .limit(500),
            ]);
            if (cancelled)
                return;
            const failed = [a, c, t, k, p].find((response) => response.error);
            if (failed)
                setLoadError("Alcuni dati collegati non sono leggibili");
            const dedup = (rows, keyFn) => {
                const seen = new Set();
                return (rows || []).filter((r) => {
                    const k = keyFn(r);
                    if (seen.has(k))
                        return false;
                    seen.add(k);
                    return true;
                });
            };
            // Non deduplicare le autorizzazioni: righe con lo stesso numero possono
            // avere date/validità differenti e devono restare tutte selezionabili.
            setDbAuts(a.data || []);
            setCantieri(dedup(c.data, (r) => `${r.denominazione}|${r.indirizzo}|${r.comune}`));
            setTarghe(dedup(t.data, (r) => String(r.targa || "").toUpperCase()));
            setConducenti(dedup(k.data, (r) => `${r.cognome}|${r.nome}`.toUpperCase()));
            setPartnerDefaults(dedup(p.data, (r) => `${r.ruolo}|${r.ragione_sociale}|${r.indirizzo}`.toUpperCase()));
            setLoadingDeps(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [clienteId, clienteIds]);
    const selectAnagrafica = async (r) => {
        onSelectAutorizzazione({ numero: "", tipo: "", data: "" });
        setDbAuts([]);
        setLoadingDeps(true);
        onSelectAzienda({
            nome: r.ragione_sociale || "",
            indirizzo: fmtIndirizzo(r),
            cf: r.codice_fiscale || "",
            piva: r.partita_iva || r.codice_fiscale || "",
        });
        setClienteId(r.id);
        setClienteNome(r.ragione_sociale || "");
        setAziendaKey("");
        setAuts([]);
        setAutId("");
        setQuery(r.ragione_sociale || "");
        setResults([]);
        setClienteIds(await resolveClienteIds(r));
    };
    const selectAzienda = async (key) => {
        onSelectAutorizzazione({ numero: "", tipo: "", data: "" });
        setDbAuts([]);
        setLoadingDeps(true);
        setAziendaKey(key);
        setAutId("");
        setAuts(key ? getAutorizzazioni(key) : []);
        const az = AZIENDE_PRESETS.find((a) => a.key === key);
        if (!az) {
            setClienteId(null);
            setClienteIds([]);
            setClienteNome("");
            return;
        }
        onSelectAzienda({ nome: az.nome, indirizzo: az.indirizzo, cf: az.cf, piva: az.piva });
        setClienteNome(az.nome);
        const { data } = await supabase
            .from("anagrafica_aziende_mp")
            .select("id")
            .or(`codice_fiscale.eq.${az.cf},partita_iva.eq.${az.piva}`)
            .limit(200);
        const ids = (data || []).map((x) => x.id);
        setClienteId(ids[0] ?? null);
        setClienteIds(ids);
    };
    const selectAut = (id) => {
        setAutId(id);
        const local = auts.find((a) => a.id === id);
        if (local) {
            onSelectAutorizzazione({ numero: local.numero, tipo: local.tipo, data: local.data });
            return;
        }
        const db = dbAuts.find((a) => a.id === id);
        if (db) {
            onSelectAutorizzazione({
                numero: db.numero_autorizzazione || "",
                tipo: db.ente_rilascio || db.tipo || "",
                data: db.data_scadenza || db.data_inizio || "",
            });
        }
    };
    const salvaNuovo = () => {
        const key = aziendaKey || clienteId;
        if (!key || !nuovo.numero.trim())
            return;
        const entry = addAutorizzazione(key, {
            numero: nuovo.numero.trim(),
            tipo: nuovo.tipo,
            data: nuovo.data,
        });
        setAuts(getAutorizzazioni(key));
        setAdding(false);
        setNuovo({ numero: "", tipo: TIPI_AUTORIZZAZIONE[0], data: "" });
        setAutId(entry.id);
        onSelectAutorizzazione({ numero: entry.numero, tipo: entry.tipo, data: entry.data });
    };
    const eliminaSelezionata = () => {
        const key = aziendaKey || clienteId;
        if (!key || !autId)
            return;
        removeAutorizzazione(key, autId);
        setAuts(getAutorizzazioni(key));
        setAutId("");
    };
    // Mostra al produttore solo autorizzazioni proprie o di tipo normativo,
    // escludendo esplicitamente quelle appartenenti agli altri ruoli FIR.
    const autsOrdinate = !ruolo
        ? dbAuts
        : ruolo === "PRODUTTORE"
            ? dbAuts.filter((a) => !["DESTINATARIO", "TRASPORTATORE", "INTERMEDIARIO"].includes(String(a.tipo || "").toUpperCase()))
            : dbAuts.filter((a) => String(a.tipo || "").toUpperCase() === ruolo);
    const selectCls = "w-full bg-secondary/50 border border-primary/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary";
    return (_jsxs("div", { className: "rounded-xl border border-primary/25 bg-primary/5 p-3 space-y-2", children: [_jsxs("label", { className: "text-[10px] text-primary font-mono uppercase tracking-wider block", children: ["\u2699 ", label] }), _jsxs("select", { value: aziendaKey, onChange: (e) => selectAzienda(e.target.value), className: selectCls, children: [_jsx("option", { value: "", children: "-- Preset Multyproget / Niyol --" }), AZIENDE_PRESETS.map((a) => (_jsx("option", { value: a.key, children: a.nome }, a.key)))] }), ruolo && ruolo !== "PRODUTTORE" && (_jsxs("select", { value: "", onChange: (e) => {
                    const selected = roleCompanies.find((company) => company.id === e.target.value);
                    if (selected)
                        void selectAnagrafica(selected);
                }, className: selectCls, disabled: loadingRoleCompanies, children: [_jsx("option", { value: "", children: loadingRoleCompanies
                            ? `-- Caricamento ${ruolo.toLowerCase()}… --`
                            : `-- Tutti i ${ruolo.toLowerCase()} (${roleCompanies.length}) --` }), roleCompanies.map((company) => (_jsxs("option", { value: company.id, children: [company.ragione_sociale, " \u2014 ", company.partita_iva || company.codice_fiscale || "senza P.IVA"] }, company.id)))] })), _jsxs("select", { value: "", onChange: (e) => {
                    const selected = allCompanies.find((c) => c.id === e.target.value);
                    if (selected)
                        void selectAnagrafica(selected);
                }, className: selectCls, disabled: loadingAll, children: [_jsx("option", { value: "", children: loadingAll ? "-- Caricamento anagrafica completa… --" : `-- Tutta l'anagrafica (${allCompanies.length}) --` }), allCompanies.map((c) => (_jsxs("option", { value: c.id, children: [c.ragione_sociale, c.citta ? ` — ${c.citta}` : "", c.partita_iva || c.codice_fiscale ? ` — ${c.partita_iva || c.codice_fiscale}` : ""] }, c.id)))] }), _jsxs("div", { className: "relative", children: [_jsxs("div", { className: "flex items-center gap-2 rounded-lg border border-primary/30 bg-secondary/50 px-3", children: [_jsx(Search, { className: "h-3.5 w-3.5 text-primary shrink-0" }), _jsx("input", { value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Cerca in anagrafica (es. ITALCONCIMI, P.IVA, CF)\u2026", className: "w-full bg-transparent py-2 text-sm text-white placeholder:text-white/40 focus:outline-none" }), searching && _jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin text-primary shrink-0" })] }), results.length > 0 && (_jsx("div", { className: "absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-primary/30 bg-background shadow-xl", children: results.map((r) => (_jsxs("button", { type: "button", onClick: () => selectAnagrafica(r), className: "block w-full px-3 py-2 text-left text-xs text-white hover:bg-primary/15", children: [_jsx("span", { className: "font-semibold", children: r.ragione_sociale }), _jsx("span", { className: "block text-[10px] text-white/50", children: [r.indirizzo, r.citta, r.partita_iva || r.codice_fiscale].filter(Boolean).join(" · ") })] }, r.id))) })), query.trim().length >= 2 && !searching && results.length === 0 && (_jsx("p", { className: "mt-1 text-[10px] text-white/50", children: "Nessuna azienda trovata in anagrafica." }))] }), loadError && _jsx("p", { className: "text-[10px] text-destructive", children: loadError }), clienteId && (_jsx("p", { className: "text-[10px] text-white/50", children: loadingDeps ? "Caricamento dati collegati…" : (_jsxs(_Fragment, { children: [clienteNome, ": ", autsOrdinate.length, " autorizzazioni \u00B7 ", cantieri.length, " cantieri \u00B7 ", targhe.length, " targhe \u00B7", " ", conducenti.length, " conducenti \u00B7 ", partnerDefaults.length, " dati predefiniti"] })) })), (aziendaKey || clienteId) && (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex gap-2", children: [_jsxs("select", { value: autId, onChange: (e) => selectAut(e.target.value), className: selectCls, children: [_jsx("option", { value: "", children: "-- Autorizzazione (numero / tipo / scadenza) --" }), autsOrdinate.map((a) => (_jsxs("option", { value: a.id, children: [a.numero_autorizzazione, " \u2014 ", a.tipo, a.ente_rilascio ? ` ${a.ente_rilascio}` : "", a.data_scadenza ? ` (scad. ${a.data_scadenza})` : ""] }, a.id))), auts.map((a) => (_jsxs("option", { value: a.id, children: [a.numero, " \u2014 ", a.tipo, a.data ? ` (${a.data})` : ""] }, a.id)))] }), _jsx("button", { type: "button", onClick: () => setAdding((v) => !v), title: "Aggiungi autorizzazione ai preset", className: "shrink-0 px-2 rounded-lg border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors", children: _jsx(Plus, { className: "h-4 w-4" }) }), autId && auts.some((a) => a.id === autId) && (_jsx("button", { type: "button", onClick: eliminaSelezionata, title: "Rimuovi dai preset", className: "shrink-0 px-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors", children: _jsx(Trash2, { className: "h-4 w-4" }) }))] }), autsOrdinate.length === 0 && auts.length === 0 && !adding && (_jsx("p", { className: "text-[10px] text-white/50", children: "Nessuna autorizzazione in archivio per questa azienda: usa \uFF0B per aggiungerla." })), onSelectCantiere && (_jsxs("select", { className: selectCls, defaultValue: "", onChange: (e) => {
                            const c = cantieri.find((x) => x.id === e.target.value);
                            if (c)
                                onSelectCantiere({
                                    denominazione: c.denominazione || "",
                                    indirizzo: c.indirizzo || "",
                                    comune: c.comune || "",
                                    provincia: c.provincia || "",
                                    cap: c.note?.match(/(?:^|\s)CAP[:\s]+([0-9]{5})(?:\s|$)/i)?.[1] || "",
                                });
                        }, children: [_jsxs("option", { value: "", children: ["-- Cantiere / luogo di produzione (", cantieri.length, ") --"] }), cantieri.map((c) => (_jsx("option", { value: c.id, children: [c.denominazione, c.indirizzo, c.comune, c.provincia].filter(Boolean).join(" · ") }, c.id)))] })), onSelectTarga && (_jsxs("select", { className: selectCls, defaultValue: "", onChange: (e) => {
                            const t = targhe.find((x) => x.id === e.target.value);
                            if (t)
                                onSelectTarga({
                                    targa: t.targa || "",
                                    rimorchio: t.note?.match(/RIMORCHIO(?:\s+DEFAULT)?[:\s]+([^;|]+)/i)?.[1]?.trim() || "",
                                    tipoMezzo: t.tipo_mezzo || "",
                                    conducente: t.conducente_default || "",
                                });
                        }, children: [_jsxs("option", { value: "", children: ["-- Targa mezzo (", targhe.length, ") --"] }), targhe.map((t) => (_jsxs("option", { value: t.id, children: [t.targa, t.tipo_mezzo ? ` (${t.tipo_mezzo})` : "", t.conducente_default ? ` — ${t.conducente_default}` : ""] }, t.id)))] })), onSelectConducente && (_jsxs("select", { className: selectCls, defaultValue: "", onChange: (e) => {
                            const c = conducenti.find((x) => x.id === e.target.value);
                            if (c)
                                onSelectConducente({ cognome: c.cognome || "", nome: c.nome || "" });
                        }, children: [_jsxs("option", { value: "", children: ["-- Conducente (", conducenti.length, ") --"] }), conducenti.map((c) => (_jsx("option", { value: c.id, children: [c.cognome, c.nome].filter(Boolean).join(" ") }, c.id)))] })), onSelectPartnerDefault && partnerDefaults.length > 0 && (_jsxs("select", { className: selectCls, defaultValue: "", onChange: (e) => {
                            const p = partnerDefaults.find((x) => x.id === e.target.value);
                            if (!p)
                                return;
                            onSelectPartnerDefault({
                                nome: p.ragione_sociale || "",
                                indirizzo: [p.indirizzo, p.cap, p.citta, p.provincia ? `(${p.provincia})` : ""].filter(Boolean).join(" "),
                                cf: "",
                                piva: "",
                                ruolo: p.ruolo || "",
                            });
                        }, children: [_jsxs("option", { value: "", children: ["-- Dati vettore / partner predefinito (", partnerDefaults.length, ") --"] }), partnerDefaults.map((p) => (_jsxs("option", { value: p.id, children: [p.ruolo, " \u2014 ", p.ragione_sociale, " \u2014 ", [p.indirizzo, p.citta].filter(Boolean).join(" · ")] }, p.id)))] })), adding && (_jsxs("div", { className: "space-y-2 rounded-lg border border-border/40 bg-background/40 p-2", children: [_jsx("input", { value: nuovo.numero, onChange: (e) => setNuovo({ ...nuovo, numero: e.target.value }), placeholder: "Numero / codice autorizzazione", className: "w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm" }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx("select", { value: nuovo.tipo, onChange: (e) => setNuovo({ ...nuovo, tipo: e.target.value }), className: "w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm", children: TIPI_AUTORIZZAZIONE.map((t) => (_jsx("option", { value: t, children: t }, t))) }), _jsx("input", { type: "date", value: nuovo.data, onChange: (e) => setNuovo({ ...nuovo, data: e.target.value }), className: "w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm" })] }), _jsx("button", { type: "button", onClick: salvaNuovo, className: "w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-display", children: "Salva autorizzazione nei preset" })] }))] }))] }));
}
