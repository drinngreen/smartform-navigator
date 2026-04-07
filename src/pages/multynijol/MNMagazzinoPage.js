import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Users, AlertTriangle, Package, Trash2, Receipt, Scale, FileUp, FileSpreadsheet, } from "lucide-react";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";
import { format } from "date-fns";
import { it } from "date-fns/locale";
function StatCard({ icon: Icon, label, value, color }) {
    return (_jsxs("div", { className: "flex items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsx("div", { className: "p-2 rounded-xl", style: { background: `rgba(${color}, 0.15)` }, children: _jsx(Icon, { className: "h-5 w-5", style: { color: `rgb(${color})` } }) }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground font-mono uppercase", children: label }), _jsx("p", { className: "text-lg font-bold text-foreground", children: value })] })] }));
}
function ExportButtons({ onPdf, onExcel }) {
    return (_jsxs("div", { className: "flex gap-1", children: [_jsx("button", { onClick: onPdf, className: "p-1.5 rounded-lg hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-colors", title: "Esporta PDF", children: _jsx(FileUp, { className: "h-4 w-4" }) }), _jsx("button", { onClick: onExcel, className: "p-1.5 rounded-lg hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-colors", title: "Esporta Excel", children: _jsx(FileSpreadsheet, { className: "h-4 w-4" }) })] }));
}
const CONF_COLS = [
    { header: "Privato", key: "nome_privato", width: 25 },
    { header: "CF/P.IVA", key: "cf_pi", width: 20 },
    { header: "CER", key: "cer", width: 12 },
    { header: "Kg", key: "kg_pesati", width: 10 },
    { header: "Importo €", key: "importo_pagato", width: 12, format: (v) => v != null ? `€ ${v}` : "—" },
    { header: "Pagamento", key: "metodo_pag", width: 12 },
    { header: "Data", key: "data", width: 16, format: (v) => v ? new Date(v).toLocaleDateString("it-IT") : "—" },
    { header: "Note", key: "note", width: 20 },
];
const PRIV_COLS = [
    { header: "Cognome", key: "cognome", width: 18 },
    { header: "Nome", key: "nome", width: 18 },
    { header: "Codice Fiscale", key: "codice_fiscale", width: 20 },
    { header: "Comune", key: "comune_residenza", width: 16 },
    { header: "Tessera", key: "numero_tessera", width: 14 },
    { header: "Tipo Utenza", key: "tipo_utenza", width: 14 },
    { header: "Note", key: "note", width: 20 },
];
const LIM_COLS = [
    { header: "CER", key: "cer", width: 12 },
    { header: "Utenza", key: "tipo_utenza", width: 14 },
    { header: "Singolo kg", key: "limite_conferimento_kg", width: 12 },
    { header: "Annuo kg", key: "limite_annuo_kg", width: 12 },
    { header: "Mensile kg", key: "limite_mensile_kg", width: 12 },
    { header: "Giornaliero kg", key: "limite_giornaliero_kg", width: 14 },
    { header: "Note", key: "note", width: 18 },
];
const RIC_COLS = [
    { header: "N° Ricevuta", key: "numero_ricevuta", width: 16 },
    { header: "Dettagli", key: "note", width: 30 },
    { header: "Importo €", key: "importo", width: 12, format: (v) => `€ ${v ?? 0}` },
    { header: "Data", key: "data_emissione", width: 18, format: (v) => v ? new Date(v).toLocaleDateString("it-IT") : "—" },
];
export default function MNMagazzinoPage() {
    const { context } = useParams();
    const [activeTab, setActiveTab] = useState("conferimenti");
    const [impianti, setImpianti] = useState([]);
    const [selectedImpianto, setSelectedImpianto] = useState("");
    const [privati, setPrivati] = useState([]);
    const [limiti, setLimiti] = useState([]);
    const [conferimenti, setConferimenti] = useState([]);
    const [ricevute, setRicevute] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [showNewPrivato, setShowNewPrivato] = useState(false);
    const [showNewConferimento, setShowNewConferimento] = useState(false);
    const [showNewLimite, setShowNewLimite] = useState(false);
    const [showNewRicevuta, setShowNewRicevuta] = useState(false);
    const [limitWarning, setLimitWarning] = useState(null);
    const [privatoForm, setPrivatoForm] = useState({ nome: "", cognome: "", codice_fiscale: "", comune_residenza: "", numero_tessera: "", tipo_utenza: "domestica", note: "" });
    const [confForm, setConfForm] = useState({ privato_id: "", nome_privato: "", cognome_privato: "", cf_privato: "", cer: "", kg_pesati: "", importo_pagato: "", metodo_pag: "contanti", note: "", numero_fir: "", quantita_presunta: "", stato_rifiuto: "", codice_ce: "", targa_automezzo: "", modello_automezzo: "" });
    const [privatoSearch, setPrivatoSearch] = useState("");
    const [showPrivatoDropdown, setShowPrivatoDropdown] = useState(false);
    const [limiteForm, setLimiteForm] = useState({ cer: "", tipo_utenza: "domestica", limite_conferimento_kg: "", limite_annuo_kg: "", limite_mensile_kg: "", limite_giornaliero_kg: "", periodo_riferimento: "annuale", note: "" });
    const [ricevutaForm, setRicevutaForm] = useState({ privato_id: "", nome_manuale: "", importo: "", note: "" });
    useEffect(() => {
        (async () => {
            const { data } = await supabase.from("impianti").select("id, nome").order("nome");
            if (data && data.length > 0) {
                setImpianti(data);
                setSelectedImpianto(data[0].id);
            }
        })();
    }, []);
    const TENANT_ID = "dc2a6046-d9a8-4549-8e45-82367d695ac6";
    const fetchAll = useCallback(async () => {
        setLoading(true);
        const privQuery = supabase.from("anagrafica_privati").select("*").eq("tenant_id", TENANT_ID).order("cognome");
        const limQuery = selectedImpianto
            ? supabase.from("limiti_privati").select("*").eq("impianto_id", selectedImpianto).order("cer")
            : supabase.from("limiti_privati").select("*").eq("tenant_id", TENANT_ID).order("cer");
        const confQuery = selectedImpianto
            ? supabase.from("privati_conferimenti").select("*").eq("impianto_id", selectedImpianto).order("data", { ascending: false }).limit(200)
            : supabase.from("privati_conferimenti").select("*").eq("tenant_id", TENANT_ID).order("data", { ascending: false }).limit(200);
        const ricQuery = selectedImpianto
            ? supabase.from("ricevute_privati").select("*").eq("impianto_id", selectedImpianto).order("data_emissione", { ascending: false }).limit(200)
            : supabase.from("ricevute_privati").select("*").eq("tenant_id", TENANT_ID).order("data_emissione", { ascending: false }).limit(200);
        const [privRes, limRes, confRes, ricRes] = await Promise.all([privQuery, limQuery, confQuery, ricQuery]);
        setPrivati(privRes.data || []);
        setLimiti(limRes.data || []);
        setConferimenti(confRes.data || []);
        setRicevute(ricRes.data || []);
        setLoading(false);
    }, [selectedImpianto]);
    useEffect(() => { fetchAll(); }, [fetchAll]);
    const checkLimits = useCallback(async (privatoId, cer, kgNew) => {
        const privato = privati.find(p => p.id === privatoId);
        if (!privato)
            return null;
        const applicable = limiti.filter(l => l.cer === cer && l.tipo_utenza === privato.tipo_utenza);
        if (applicable.length === 0)
            return null;
        const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
        const { data: existing } = await supabase
            .from("privati_conferimenti").select("kg_pesati, data")
            .eq("impianto_id", selectedImpianto).eq("privato_id", privatoId).eq("cer", cer).gte("data", yearStart);
        const totalAnnuo = (existing || []).reduce((s, c) => s + Number(c.kg_pesati), 0);
        const warnings = [];
        for (const lim of applicable) {
            if (lim.limite_conferimento_kg && kgNew > lim.limite_conferimento_kg)
                warnings.push(`⚠️ Supera limite singolo conferimento (${lim.limite_conferimento_kg} kg)`);
            if (lim.limite_annuo_kg && (totalAnnuo + kgNew) > lim.limite_annuo_kg)
                warnings.push(`⚠️ Supera limite annuo (${lim.limite_annuo_kg} kg). Già conferiti: ${totalAnnuo} kg`);
            if (lim.limite_mensile_kg) {
                const ms = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
                const monthly = (existing || []).filter((c) => c.data >= ms).reduce((s, c) => s + Number(c.kg_pesati), 0);
                if ((monthly + kgNew) > lim.limite_mensile_kg)
                    warnings.push(`⚠️ Supera limite mensile (${lim.limite_mensile_kg} kg). Mese: ${monthly} kg`);
            }
            if (lim.limite_giornaliero_kg) {
                const today = new Date().toISOString().slice(0, 10);
                const daily = (existing || []).filter((c) => c.data?.startsWith(today)).reduce((s, c) => s + Number(c.kg_pesati), 0);
                if ((daily + kgNew) > lim.limite_giornaliero_kg)
                    warnings.push(`⚠️ Supera limite giornaliero (${lim.limite_giornaliero_kg} kg). Oggi: ${daily} kg`);
            }
        }
        return warnings.length > 0 ? warnings.join("\n") : null;
    }, [privati, limiti, selectedImpianto]);
    const savePrivato = async () => {
        if (!privatoForm.nome || !privatoForm.cognome || !privatoForm.codice_fiscale) {
            toast.error("Nome, cognome e CF obbligatori");
            return;
        }
        const { error } = await supabase.from("anagrafica_privati").insert({ ...privatoForm, impianto_id: selectedImpianto });
        if (error) {
            toast.error(error.message);
            return;
        }
        toast.success("Privato registrato");
        setShowNewPrivato(false);
        setPrivatoForm({ nome: "", cognome: "", codice_fiscale: "", comune_residenza: "", numero_tessera: "", tipo_utenza: "domestica", note: "" });
        fetchAll();
    };
    const getConfTipoUtenza = useCallback(() => {
        if (confForm.privato_id) {
            const p = privati.find(pr => pr.id === confForm.privato_id);
            return p?.tipo_utenza || "domestica";
        }
        return "domestica";
    }, [confForm.privato_id, privati]);
    const saveConferimento = async () => {
        const tipoUtenza = getConfTipoUtenza();
        const isSpeciali = tipoUtenza === "produttore_speciali";
        if (!confForm.cer || !confForm.kg_pesati) {
            toast.error("CER e kg obbligatori");
            return;
        }
        if (isSpeciali && !confForm.numero_fir) {
            toast.error("Numero FIR obbligatorio per Produttore Speciali");
            return;
        }
        const kg = parseFloat(confForm.kg_pesati);
        // Confronto pesata vs presunta per speciali
        let esitoPesata = null;
        if (isSpeciali && confForm.quantita_presunta) {
            const presunta = parseFloat(confForm.quantita_presunta);
            const diff = Math.abs(kg - presunta);
            const pctDiff = presunta > 0 ? (diff / presunta) * 100 : 0;
            if (pctDiff > 10) {
                esitoPesata = "respinto";
                toast.warning(`⚠️ Scostamento peso ${pctDiff.toFixed(1)}% (presunto: ${presunta} kg, pesato: ${kg} kg). Conferimento segnalato.`);
            }
            else {
                esitoPesata = "accettato";
            }
        }
        // Controllo limiti — BLOCCA se superati
        if (confForm.privato_id) {
            const w = await checkLimits(confForm.privato_id, confForm.cer, kg);
            if (w) {
                setLimitWarning(w);
                toast.error("Conferimento bloccato: limiti superati");
                return;
            }
        }
        const privato = privati.find(p => p.id === confForm.privato_id);
        const nomeFinale = privato ? `${privato.cognome} ${privato.nome}` : confForm.cognome_privato ? `${confForm.cognome_privato} ${confForm.nome_privato}`.trim() : "Anonimo";
        const cfFinale = privato?.codice_fiscale || confForm.cf_privato || null;
        const { data: confData, error } = await supabase.from("privati_conferimenti").insert({
            impianto_id: selectedImpianto, cer: confForm.cer, kg_pesati: kg,
            nome_privato: nomeFinale,
            cf_pi: cfFinale,
            importo_pagato: confForm.importo_pagato ? parseFloat(confForm.importo_pagato) : null,
            metodo_pag: confForm.metodo_pag || null, note: confForm.note || null,
            privato_id: confForm.privato_id || null,
            tipo_utenza: tipoUtenza,
            numero_fir: isSpeciali ? confForm.numero_fir : null,
            quantita_presunta: isSpeciali && confForm.quantita_presunta ? parseFloat(confForm.quantita_presunta) : null,
            stato_rifiuto: isSpeciali ? confForm.stato_rifiuto || null : null,
            codice_ce: isSpeciali ? confForm.codice_ce || null : null,
            esito_pesata: esitoPesata,
            targa_automezzo: confForm.targa_automezzo || null,
            modello_automezzo: confForm.modello_automezzo || null,
        }).select().single();
        if (error) {
            toast.error(error.message);
            return;
        }
        // Genera ricevuta automaticamente (per domestica/non_domestica)
        const conf = confData;
        if (conf && !isSpeciali) {
            const anno = new Date().getFullYear();
            const { data: numData } = await supabase.rpc("next_ricevuta_number", { p_impianto_id: selectedImpianto, p_anno: anno });
            await supabase.from("ricevute_privati").insert({
                impianto_id: selectedImpianto, conferimento_id: conf.id, privato_id: conf.privato_id,
                numero_ricevuta: numData || `${Date.now()}`, anno,
                importo: conf.importo_pagato || 0,
                note: `${nomeFinale} — CER ${conf.cer} — ${conf.kg_pesati} kg${conf.targa_automezzo ? ` — Targa: ${conf.targa_automezzo}` : ""}${conf.modello_automezzo ? ` — Modello: ${conf.modello_automezzo}` : ""}`,
            });
        }
        toast.success(isSpeciali ? "Conferimento speciale registrato (FIR)" : "Conferimento e ricevuta registrati");
        setShowNewConferimento(false);
        setConfForm({ privato_id: "", nome_privato: "", cognome_privato: "", cf_privato: "", cer: "", kg_pesati: "", importo_pagato: "", metodo_pag: "contanti", note: "", numero_fir: "", quantita_presunta: "", stato_rifiuto: "", codice_ce: "", targa_automezzo: "", modello_automezzo: "" });
        setPrivatoSearch("");
        setLimitWarning(null);
        fetchAll();
    };
    const saveLimite = async () => {
        if (!limiteForm.cer) {
            toast.error("CER obbligatorio");
            return;
        }
        const { error } = await supabase.from("limiti_privati").insert({
            impianto_id: selectedImpianto, cer: limiteForm.cer, tipo_utenza: limiteForm.tipo_utenza,
            limite_conferimento_kg: limiteForm.limite_conferimento_kg ? parseFloat(limiteForm.limite_conferimento_kg) : null,
            limite_annuo_kg: limiteForm.limite_annuo_kg ? parseFloat(limiteForm.limite_annuo_kg) : null,
            limite_mensile_kg: limiteForm.limite_mensile_kg ? parseFloat(limiteForm.limite_mensile_kg) : null,
            limite_giornaliero_kg: limiteForm.limite_giornaliero_kg ? parseFloat(limiteForm.limite_giornaliero_kg) : null,
            periodo_riferimento: limiteForm.periodo_riferimento, note: limiteForm.note || null,
        });
        if (error) {
            toast.error(error.message);
            return;
        }
        toast.success("Limite salvato");
        setShowNewLimite(false);
        setLimiteForm({ cer: "", tipo_utenza: "domestica", limite_conferimento_kg: "", limite_annuo_kg: "", limite_mensile_kg: "", limite_giornaliero_kg: "", periodo_riferimento: "annuale", note: "" });
        fetchAll();
    };
    const generateRicevuta = async (conf) => {
        const anno = new Date().getFullYear();
        const { data: numData } = await supabase.rpc("next_ricevuta_number", { p_impianto_id: selectedImpianto, p_anno: anno });
        const { error } = await supabase.from("ricevute_privati").insert({
            impianto_id: selectedImpianto, conferimento_id: conf.id, privato_id: conf.privato_id,
            numero_ricevuta: numData || `${Date.now()}`, anno,
            importo: conf.importo_pagato || 0, note: `CER ${conf.cer} - ${conf.kg_pesati} kg${conf.targa_automezzo ? ` — Targa: ${conf.targa_automezzo}` : ""}${conf.modello_automezzo ? ` — Modello: ${conf.modello_automezzo}` : ""}`,
        });
        if (error) {
            toast.error(error.message);
            return;
        }
        toast.success("Ricevuta generata");
        fetchAll();
    };
    const saveRicevutaManuale = async () => {
        const anno = new Date().getFullYear();
        const { data: numData } = await supabase.rpc("next_ricevuta_number", { p_impianto_id: selectedImpianto, p_anno: anno });
        const privato = privati.find(p => p.id === ricevutaForm.privato_id);
        const nomeNote = privato ? `${privato.cognome} ${privato.nome}` : ricevutaForm.nome_manuale || "";
        const noteFinale = [nomeNote, ricevutaForm.note].filter(Boolean).join(" — ");
        const { error } = await supabase.from("ricevute_privati").insert({
            impianto_id: selectedImpianto, privato_id: ricevutaForm.privato_id || null,
            numero_ricevuta: numData || `${Date.now()}`, anno,
            importo: ricevutaForm.importo ? parseFloat(ricevutaForm.importo) : 0,
            note: noteFinale || null,
        });
        if (error) {
            toast.error(error.message);
            return;
        }
        toast.success("Ricevuta creata");
        setShowNewRicevuta(false);
        setRicevutaForm({ privato_id: "", nome_manuale: "", importo: "", note: "" });
        fetchAll();
    };
    const deletePrivato = async (id) => {
        const { error } = await supabase.from("anagrafica_privati").delete().eq("id", id);
        if (error)
            toast.error(error.message);
        else {
            toast.success("Eliminato");
            fetchAll();
        }
    };
    const filteredPrivati = privati.filter(p => !search || `${p.cognome} ${p.nome} ${p.codice_fiscale}`.toLowerCase().includes(search.toLowerCase()));
    const filteredConf = conferimenti.filter(c => !search || `${c.nome_privato} ${c.cer}`.toLowerCase().includes(search.toLowerCase()));
    const totalKgOggi = conferimenti.filter(c => c.data?.startsWith(new Date().toISOString().slice(0, 10))).reduce((s, c) => s + Number(c.kg_pesati), 0);
    return (_jsxs(MNAdminLayout, { title: "Gestione Impianto", subtitle: "Conferimenti Privati & Magazzino", children: [impianti.length > 1 && (_jsxs("div", { className: "mb-4 flex items-center gap-3", children: [_jsx("span", { className: "text-xs font-mono text-muted-foreground", children: "IMPIANTO" }), _jsxs(Select, { value: selectedImpianto, onValueChange: setSelectedImpianto, children: [_jsx(SelectTrigger, { className: "w-64 bg-card/60 border-border/30", children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: impianti.map(i => _jsx(SelectItem, { value: i.id, children: i.nome }, i.id)) })] })] })), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-6", children: [_jsx(StatCard, { icon: Users, label: "Privati Attivi", value: privati.filter(p => p.attivo).length, color: "16, 185, 129" }), _jsx(StatCard, { icon: Package, label: "Conferimenti", value: conferimenti.length, color: "249, 115, 22" }), _jsx(StatCard, { icon: Scale, label: "Kg Oggi", value: `${totalKgOggi.toLocaleString("it-IT")} kg`, color: "20, 184, 166" }), _jsx(StatCard, { icon: Receipt, label: "Ricevute", value: ricevute.length, color: "59, 130, 246" })] }), _jsxs(Tabs, { value: activeTab, onValueChange: setActiveTab, children: [_jsxs("div", { className: "flex items-center gap-3 mb-4 flex-wrap", children: [_jsxs(TabsList, { className: "bg-card/60 border border-border/30", children: [_jsx(TabsTrigger, { value: "conferimenti", className: "text-xs font-mono", children: "Conferimenti" }), _jsx(TabsTrigger, { value: "anagrafica", className: "text-xs font-mono", children: "Anagrafica" }), _jsx(TabsTrigger, { value: "limiti", className: "text-xs font-mono", children: "Limiti CER" }), _jsx(TabsTrigger, { value: "ricevute", className: "text-xs font-mono", children: "Ricevute" })] }), _jsx("div", { className: "flex-1" }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Cerca...", value: search, onChange: e => setSearch(e.target.value), className: "pl-9 w-48 bg-card/60 border-border/30 text-sm" })] })] }), _jsx(TabsContent, { value: "conferimenti", children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("h3", { className: "text-sm font-mono text-muted-foreground uppercase", children: "Registro Conferimenti" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(ExportButtons, { onPdf: () => exportToPdf(filteredConf, CONF_COLS, "conferimenti", "Registro Conferimenti"), onExcel: () => exportToExcel(filteredConf, CONF_COLS, "conferimenti", "Conferimenti") }), _jsxs(Dialog, { open: showNewConferimento, onOpenChange: v => { setShowNewConferimento(v); setLimitWarning(null); }, children: [_jsx(DialogTrigger, { asChild: true, children: _jsxs(Button, { size: "sm", className: "gap-2", children: [_jsx(Plus, { className: "h-4 w-4" }), " Nuovo"] }) }), _jsxs(DialogContent, { className: "max-w-lg", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Nuovo Conferimento" }) }), _jsxs("div", { className: "grid gap-4 py-2", children: [_jsxs("div", { className: "relative", children: [_jsx(Label, { children: "Cerca Privato Registrato" }), _jsx(Input, { placeholder: "Cognome, nome o CF...", value: privatoSearch, onChange: e => { setPrivatoSearch(e.target.value); setShowPrivatoDropdown(true); }, onFocus: () => setShowPrivatoDropdown(true), className: "bg-card/60 border-border/30" }), showPrivatoDropdown && privatoSearch.length > 0 && (_jsxs("div", { className: "absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-background shadow-lg", children: [privati.filter(p => p.attivo && `${p.cognome} ${p.nome} ${p.codice_fiscale}`.toLowerCase().includes(privatoSearch.toLowerCase())).slice(0, 10).map(p => (_jsxs("button", { type: "button", className: "w-full text-left px-3 py-2 hover:bg-accent/20 text-sm transition-colors", onClick: () => { setConfForm(f => ({ ...f, privato_id: p.id, nome_privato: p.nome, cognome_privato: p.cognome, cf_privato: p.codice_fiscale })); setPrivatoSearch(`${p.cognome} ${p.nome}`); setShowPrivatoDropdown(false); }, children: [_jsxs("span", { className: "font-medium", children: [p.cognome, " ", p.nome] }), _jsx("span", { className: "text-muted-foreground ml-2 text-xs font-mono", children: p.codice_fiscale }), p.tipo_utenza === "produttore_speciali" && _jsx("span", { className: "text-amber-400 ml-2 text-[10px] font-bold", children: "(SPEC)" }), p.tipo_utenza === "non_domestica" && _jsx("span", { className: "text-muted-foreground ml-2 text-[10px]", children: "(N.DOM)" })] }, p.id))), privati.filter(p => p.attivo && `${p.cognome} ${p.nome} ${p.codice_fiscale}`.toLowerCase().includes(privatoSearch.toLowerCase())).length === 0 && (_jsx("div", { className: "px-3 py-2 text-xs text-muted-foreground", children: "Nessun risultato \u2014 compila manualmente" }))] })), confForm.privato_id && (_jsx("button", { type: "button", className: "absolute right-2 top-8 text-xs text-muted-foreground hover:text-destructive", onClick: () => { setConfForm(f => ({ ...f, privato_id: "", nome_privato: "", cognome_privato: "", cf_privato: "" })); setPrivatoSearch(""); }, children: "\u2715 Rimuovi" }))] }), !confForm.privato_id && (_jsxs("div", { className: "space-y-3 p-3 rounded-xl border border-dashed border-border/40 bg-muted/20", children: [_jsx("p", { className: "text-xs text-muted-foreground font-mono", children: "DATI PRIVATO (inserisci manualmente)" }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { children: "Nome" }), _jsx(Input, { placeholder: "Mario", value: confForm.nome_privato, onChange: e => setConfForm(f => ({ ...f, nome_privato: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Cognome" }), _jsx(Input, { placeholder: "Rossi", value: confForm.cognome_privato, onChange: e => setConfForm(f => ({ ...f, cognome_privato: e.target.value })) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Codice Fiscale / P.IVA" }), _jsx(Input, { placeholder: "RSSMRA80A01H501Z", value: confForm.cf_privato, onChange: e => setConfForm(f => ({ ...f, cf_privato: e.target.value.toUpperCase() })) })] })] })), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { children: "CER *" }), _jsx(Input, { placeholder: "20 03 01", value: confForm.cer, onChange: e => { setConfForm(f => ({ ...f, cer: e.target.value })); setLimitWarning(null); } })] }), _jsxs("div", { children: [_jsx(Label, { children: "Kg *" }), _jsx(Input, { type: "number", value: confForm.kg_pesati, onChange: e => { setConfForm(f => ({ ...f, kg_pesati: e.target.value })); setLimitWarning(null); }, onBlur: async () => { if (confForm.privato_id && confForm.cer && confForm.kg_pesati) {
                                                                                                const w = await checkLimits(confForm.privato_id, confForm.cer, parseFloat(confForm.kg_pesati));
                                                                                                setLimitWarning(w);
                                                                                            } } })] })] }), getConfTipoUtenza() === "produttore_speciali" && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm flex items-start gap-2", children: [_jsx(AlertTriangle, { className: "h-4 w-4 mt-0.5 shrink-0" }), _jsxs("span", { children: ["\u26A0\uFE0F Per rifiuti speciali, il FIR compilato dal produttore \u00E8 ", _jsx("strong", { children: "obbligatorio" }), " pena sanzioni. Dal 2026 \u00E8 richiesto il FIR digitale RENTRI per certi produttori."] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { children: "Numero FIR *" }), _jsx(Input, { placeholder: "AA00000000", value: confForm.numero_fir, onChange: e => setConfForm(f => ({ ...f, numero_fir: e.target.value.toUpperCase() })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Quantit\u00E0 Presunta (kg)" }), _jsx(Input, { type: "number", placeholder: "Es. 500", value: confForm.quantita_presunta, onChange: e => setConfForm(f => ({ ...f, quantita_presunta: e.target.value })) })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { children: "Stato Fisico Rifiuto" }), _jsxs("select", { className: "w-full px-3 py-2 rounded-md bg-card/60 border border-border/30 text-sm text-foreground", value: confForm.stato_rifiuto, onChange: e => setConfForm(f => ({ ...f, stato_rifiuto: e.target.value })), children: [_jsx("option", { value: "", children: "\u2014 Seleziona \u2014" }), _jsx("option", { value: "solido", children: "Solido non pulverulento" }), _jsx("option", { value: "solido_pulverulento", children: "Solido pulverulento" }), _jsx("option", { value: "fangoso", children: "Fangoso palabile" }), _jsx("option", { value: "liquido", children: "Liquido" })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Codice C/E" }), _jsxs("select", { className: "w-full px-3 py-2 rounded-md bg-card/60 border border-border/30 text-sm text-foreground", value: confForm.codice_ce, onChange: e => setConfForm(f => ({ ...f, codice_ce: e.target.value })), children: [_jsx("option", { value: "", children: "\u2014 Seleziona \u2014" }), _jsx("option", { value: "R12", children: "R12 - Scambio rifiuti" }), _jsx("option", { value: "R13", children: "R13 - Messa in riserva" }), _jsx("option", { value: "D13", children: "D13 - Raggruppamento" }), _jsx("option", { value: "D14", children: "D14 - Ricondizionamento" }), _jsx("option", { value: "D15", children: "D15 - Deposito preliminare" })] })] })] })] })), limitWarning && (_jsxs("div", { className: "p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-2", children: [_jsx(AlertTriangle, { className: "h-4 w-4 mt-0.5 shrink-0" }), _jsx("pre", { className: "whitespace-pre-wrap font-mono text-xs", children: limitWarning })] })), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { children: "Importo \u20AC" }), _jsx(Input, { type: "number", value: confForm.importo_pagato, onChange: e => setConfForm(f => ({ ...f, importo_pagato: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Pagamento" }), _jsxs("select", { className: "w-full px-3 py-2 rounded-md bg-card/60 border border-border/30 text-sm text-foreground", value: confForm.metodo_pag, onChange: e => setConfForm(f => ({ ...f, metodo_pag: e.target.value })), children: [_jsx("option", { value: "contanti", children: "Contanti" }), _jsx("option", { value: "pos", children: "POS" }), _jsx("option", { value: "bonifico", children: "Bonifico" }), _jsx("option", { value: "gratuito", children: "Gratuito" })] })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { children: "Targa Automezzo" }), _jsx(Input, { placeholder: "AA000BB", value: confForm.targa_automezzo, onChange: e => setConfForm(f => ({ ...f, targa_automezzo: e.target.value.toUpperCase() })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Modello Automezzo" }), _jsx(Input, { placeholder: "Es. Fiat Ducato", value: confForm.modello_automezzo, onChange: e => setConfForm(f => ({ ...f, modello_automezzo: e.target.value })) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Note" }), _jsx(Textarea, { value: confForm.note, onChange: e => setConfForm(f => ({ ...f, note: e.target.value })) })] }), _jsx(Button, { onClick: saveConferimento, className: "w-full", children: "Registra Conferimento" })] })] })] })] })] }), _jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/30 overflow-hidden", children: [_jsxs("div", { className: "grid grid-cols-[1fr_100px_80px_80px_120px] gap-2 px-4 py-2 border-b border-border/20 text-xs font-mono text-muted-foreground uppercase", children: [_jsx("span", { children: "Privato" }), _jsx("span", { children: "CER" }), _jsx("span", { children: "Kg" }), _jsx("span", { children: "\u20AC" }), _jsx("span", { children: "Data" })] }), loading ? _jsx("div", { className: "p-8 text-center text-muted-foreground text-sm", children: "Caricamento..." })
                                            : filteredConf.length === 0 ? _jsx("div", { className: "p-8 text-center text-muted-foreground text-sm", children: "Nessun conferimento" })
                                                : filteredConf.map(c => (_jsxs("div", { className: "grid grid-cols-[1fr_100px_80px_80px_120px] gap-2 px-4 py-3 border-b border-border/10 hover:bg-accent/5 items-center", children: [_jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-sm font-medium text-foreground truncate", children: c.nome_privato }), c.cf_pi && _jsx("span", { className: "text-[10px] text-muted-foreground", children: c.cf_pi })] }), _jsx(Badge, { variant: "outline", className: "text-xs font-mono w-fit", children: c.cer }), _jsx("span", { className: "text-sm font-mono text-foreground", children: c.kg_pesati }), _jsx("span", { className: "text-sm font-mono text-foreground", children: c.importo_pagato ?? "—" }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-xs text-muted-foreground", children: c.data ? format(new Date(c.data), "dd/MM/yy", { locale: it }) : "—" }), ricevute.find(r => r.conferimento_id === c.id) ? (_jsx(Receipt, { className: "h-3.5 w-3.5 text-primary ml-1" })) : (_jsx("span", { className: "text-[10px] text-muted-foreground ml-1", children: "no ric." }))] })] }, c.id)))] })] }) }), _jsx(TabsContent, { value: "anagrafica", children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("h3", { className: "text-sm font-mono text-muted-foreground uppercase", children: "Anagrafica Privati" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(ExportButtons, { onPdf: () => exportToPdf(filteredPrivati, PRIV_COLS, "anagrafica_privati", "Anagrafica Privati"), onExcel: () => exportToExcel(filteredPrivati, PRIV_COLS, "anagrafica_privati", "Anagrafica") }), _jsxs(Dialog, { open: showNewPrivato, onOpenChange: setShowNewPrivato, children: [_jsx(DialogTrigger, { asChild: true, children: _jsxs(Button, { size: "sm", className: "gap-2", children: [_jsx(Plus, { className: "h-4 w-4" }), " Nuovo"] }) }), _jsxs(DialogContent, { className: "max-w-lg", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Registra Privato" }) }), _jsxs("div", { className: "grid gap-4 py-2", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { children: "Nome *" }), _jsx(Input, { value: privatoForm.nome, onChange: e => setPrivatoForm(f => ({ ...f, nome: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Cognome *" }), _jsx(Input, { value: privatoForm.cognome, onChange: e => setPrivatoForm(f => ({ ...f, cognome: e.target.value })) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Codice Fiscale *" }), _jsx(Input, { value: privatoForm.codice_fiscale, onChange: e => setPrivatoForm(f => ({ ...f, codice_fiscale: e.target.value.toUpperCase() })) })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { children: "Comune" }), _jsx(Input, { value: privatoForm.comune_residenza, onChange: e => setPrivatoForm(f => ({ ...f, comune_residenza: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "N\u00B0 Tessera" }), _jsx(Input, { value: privatoForm.numero_tessera, onChange: e => setPrivatoForm(f => ({ ...f, numero_tessera: e.target.value })) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Tipo Utenza" }), _jsxs(Select, { value: privatoForm.tipo_utenza, onValueChange: v => setPrivatoForm(f => ({ ...f, tipo_utenza: v })), children: [_jsx(SelectTrigger, { className: "bg-card/60", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "domestica", children: "Domestica" }), _jsx(SelectItem, { value: "non_domestica", children: "Non Domestica / Assimilata" }), _jsx(SelectItem, { value: "produttore_speciali", children: "Produttore Speciali" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Note" }), _jsx(Textarea, { value: privatoForm.note, onChange: e => setPrivatoForm(f => ({ ...f, note: e.target.value })) })] }), _jsx(Button, { onClick: savePrivato, className: "w-full", children: "Registra" })] })] })] })] })] }), _jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/30 overflow-hidden", children: [_jsxs("div", { className: "grid grid-cols-[1fr_150px_120px_80px_60px] gap-2 px-4 py-2 border-b border-border/20 text-xs font-mono text-muted-foreground uppercase", children: [_jsx("span", { children: "Nome" }), _jsx("span", { children: "C.F." }), _jsx("span", { children: "Comune" }), _jsx("span", { children: "Tipo" }), _jsx("span", {})] }), filteredPrivati.length === 0 ? _jsx("div", { className: "p-8 text-center text-muted-foreground text-sm", children: "Nessun privato" })
                                            : filteredPrivati.map(p => (_jsxs("div", { className: "grid grid-cols-[1fr_150px_120px_80px_60px] gap-2 px-4 py-3 border-b border-border/10 hover:bg-accent/5 items-center", children: [_jsxs("span", { className: "text-sm font-medium text-foreground", children: [p.cognome, " ", p.nome] }), _jsx("span", { className: "text-xs font-mono text-muted-foreground", children: p.codice_fiscale }), _jsx("span", { className: "text-xs text-muted-foreground", children: p.comune_residenza || "—" }), _jsx(Badge, { variant: p.tipo_utenza === "domestica" ? "default" : p.tipo_utenza === "produttore_speciali" ? "destructive" : "secondary", className: "text-[10px]", children: p.tipo_utenza === "domestica" ? "DOM" : p.tipo_utenza === "produttore_speciali" ? "SPEC" : "N.DOM" }), _jsx("button", { onClick: () => deletePrivato(p.id), className: "p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors", children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) })] }, p.id)))] })] }) }), _jsx(TabsContent, { value: "limiti", children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("h3", { className: "text-sm font-mono text-muted-foreground uppercase", children: "Limiti CER" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(ExportButtons, { onPdf: () => exportToPdf(limiti, LIM_COLS, "limiti_cer", "Limiti CER"), onExcel: () => exportToExcel(limiti, LIM_COLS, "limiti_cer", "Limiti") }), _jsxs(Dialog, { open: showNewLimite, onOpenChange: setShowNewLimite, children: [_jsx(DialogTrigger, { asChild: true, children: _jsxs(Button, { size: "sm", className: "gap-2", children: [_jsx(Plus, { className: "h-4 w-4" }), " Nuovo"] }) }), _jsxs(DialogContent, { className: "max-w-lg", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Imposta Limite" }) }), _jsxs("div", { className: "grid gap-4 py-2", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { children: "CER *" }), _jsx(Input, { placeholder: "20 03 01", value: limiteForm.cer, onChange: e => setLimiteForm(f => ({ ...f, cer: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Utenza" }), _jsxs(Select, { value: limiteForm.tipo_utenza, onValueChange: v => setLimiteForm(f => ({ ...f, tipo_utenza: v })), children: [_jsx(SelectTrigger, { className: "bg-card/60", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "domestica", children: "Domestica" }), _jsx(SelectItem, { value: "non_domestica", children: "Non Domestica / Assimilata" }), _jsx(SelectItem, { value: "produttore_speciali", children: "Produttore Speciali" })] })] })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { children: "Singolo (kg)" }), _jsx(Input, { type: "number", value: limiteForm.limite_conferimento_kg, onChange: e => setLimiteForm(f => ({ ...f, limite_conferimento_kg: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Annuo (kg)" }), _jsx(Input, { type: "number", value: limiteForm.limite_annuo_kg, onChange: e => setLimiteForm(f => ({ ...f, limite_annuo_kg: e.target.value })) })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { children: "Mensile (kg)" }), _jsx(Input, { type: "number", value: limiteForm.limite_mensile_kg, onChange: e => setLimiteForm(f => ({ ...f, limite_mensile_kg: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Giornaliero (kg)" }), _jsx(Input, { type: "number", value: limiteForm.limite_giornaliero_kg, onChange: e => setLimiteForm(f => ({ ...f, limite_giornaliero_kg: e.target.value })) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Note" }), _jsx(Textarea, { value: limiteForm.note, onChange: e => setLimiteForm(f => ({ ...f, note: e.target.value })) })] }), _jsx(Button, { onClick: saveLimite, className: "w-full", children: "Salva" })] })] })] })] })] }), _jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/30 overflow-hidden", children: [_jsxs("div", { className: "grid grid-cols-[100px_80px_1fr_1fr_1fr_1fr] gap-2 px-4 py-2 border-b border-border/20 text-xs font-mono text-muted-foreground uppercase", children: [_jsx("span", { children: "CER" }), _jsx("span", { children: "Utenza" }), _jsx("span", { children: "Singolo" }), _jsx("span", { children: "Annuo" }), _jsx("span", { children: "Mensile" }), _jsx("span", { children: "Giorn." })] }), limiti.length === 0 ? _jsx("div", { className: "p-8 text-center text-muted-foreground text-sm", children: "Nessun limite" })
                                            : limiti.map(l => (_jsxs("div", { className: "grid grid-cols-[100px_80px_1fr_1fr_1fr_1fr] gap-2 px-4 py-3 border-b border-border/10 hover:bg-accent/5 items-center", children: [_jsx(Badge, { variant: "outline", className: "text-xs font-mono w-fit", children: l.cer }), _jsx("span", { className: "text-xs text-muted-foreground", children: l.tipo_utenza === "domestica" ? "DOM" : l.tipo_utenza === "produttore_speciali" ? "SPEC" : "N.DOM" }), _jsx("span", { className: "text-sm font-mono text-foreground", children: l.limite_conferimento_kg ?? "—" }), _jsx("span", { className: "text-sm font-mono text-foreground", children: l.limite_annuo_kg ?? "—" }), _jsx("span", { className: "text-sm font-mono text-foreground", children: l.limite_mensile_kg ?? "—" }), _jsx("span", { className: "text-sm font-mono text-foreground", children: l.limite_giornaliero_kg ?? "—" })] }, l.id)))] })] }) }), _jsx(TabsContent, { value: "ricevute", children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("h3", { className: "text-sm font-mono text-muted-foreground uppercase", children: "Ricevute Emesse" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(ExportButtons, { onPdf: () => exportToPdf(ricevute, RIC_COLS, "ricevute", "Ricevute Emesse"), onExcel: () => exportToExcel(ricevute, RIC_COLS, "ricevute", "Ricevute") }), _jsxs(Dialog, { open: showNewRicevuta, onOpenChange: setShowNewRicevuta, children: [_jsx(DialogTrigger, { asChild: true, children: _jsxs(Button, { size: "sm", className: "gap-2", children: [_jsx(Plus, { className: "h-4 w-4" }), " Crea Ricevuta"] }) }), _jsxs(DialogContent, { className: "max-w-md", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Nuova Ricevuta Manuale" }) }), _jsxs("div", { className: "grid gap-4 py-2", children: [_jsxs("div", { children: [_jsx(Label, { children: "Privato da anagrafica (opzionale)" }), _jsxs(Select, { value: ricevutaForm.privato_id, onValueChange: v => setRicevutaForm(f => ({ ...f, privato_id: v, nome_manuale: "" })), children: [_jsx(SelectTrigger, { className: "bg-card/60", children: _jsx(SelectValue, { placeholder: "Seleziona..." }) }), _jsx(SelectContent, { children: privati.map(p => _jsxs(SelectItem, { value: p.id, children: [p.cognome, " ", p.nome] }, p.id)) })] })] }), !ricevutaForm.privato_id && (_jsxs("div", { children: [_jsx(Label, { children: "Oppure scrivi Nome e Cognome" }), _jsx(Input, { placeholder: "Es. Rossi Mario", value: ricevutaForm.nome_manuale, onChange: e => setRicevutaForm(f => ({ ...f, nome_manuale: e.target.value })) })] })), ricevutaForm.privato_id && (_jsx("button", { type: "button", className: "text-xs text-muted-foreground hover:text-foreground underline text-left", onClick: () => setRicevutaForm(f => ({ ...f, privato_id: "" })), children: "\u270F\uFE0F Inserisci manualmente" })), _jsxs("div", { children: [_jsx(Label, { children: "Importo \u20AC" }), _jsx(Input, { type: "number", step: "0.01", value: ricevutaForm.importo, onChange: e => setRicevutaForm(f => ({ ...f, importo: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Note / Descrizione" }), _jsx(Textarea, { value: ricevutaForm.note, onChange: e => setRicevutaForm(f => ({ ...f, note: e.target.value })), placeholder: "Descrizione libera..." })] }), _jsx(Button, { onClick: saveRicevutaManuale, className: "w-full", children: "Crea Ricevuta" })] })] })] })] })] }), _jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/30 overflow-hidden", children: [_jsxs("div", { className: "grid grid-cols-[120px_1fr_100px_120px] gap-2 px-4 py-2 border-b border-border/20 text-xs font-mono text-muted-foreground uppercase", children: [_jsx("span", { children: "N\u00B0 Ricevuta" }), _jsx("span", { children: "Dettagli" }), _jsx("span", { children: "Importo" }), _jsx("span", { children: "Data" })] }), ricevute.length === 0 ? _jsx("div", { className: "p-8 text-center text-muted-foreground text-sm", children: "Nessuna ricevuta" })
                                            : ricevute.map(r => (_jsxs("div", { className: "grid grid-cols-[120px_1fr_100px_120px] gap-2 px-4 py-3 border-b border-border/10 hover:bg-accent/5 items-center", children: [_jsx("span", { className: "text-sm font-mono font-bold text-foreground", children: r.numero_ricevuta }), _jsx("span", { className: "text-xs text-muted-foreground truncate", children: r.note || "—" }), _jsxs("span", { className: "text-sm font-mono text-foreground", children: ["\u20AC ", r.importo] }), _jsx("span", { className: "text-xs text-muted-foreground", children: r.data_emissione ? format(new Date(r.data_emissione), "dd/MM/yy HH:mm", { locale: it }) : "—" })] }, r.id)))] })] }) })] })] }));
}
