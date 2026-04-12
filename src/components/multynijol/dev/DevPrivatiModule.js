import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFormBridgeFields } from "@/hooks/useFormBridge";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlertTriangle, Upload, FileText, Users, ShieldAlert, Plus, Receipt, Scale, Search, FileSpreadsheet, Printer, Trash2, Edit2, CalendarIcon } from "lucide-react";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale/it";
import { cn } from "@/lib/utils";
import { CER_DATA } from "./DevCERPreferitiModule";
const MULTY_TENANT_ID = "dc2a6046-d9a8-4549-8e45-82367d695ac6";
const LIMITE_ANNUO_GLOBALE_KG = 1500;
const EMPTY_PRIVATO_FORM = {
    nome: "", cognome: "", codice_fiscale: "", comune_residenza: "",
    numero_documento: "", scadenza_documento: "", modello_automezzo: "", targa_automezzo: "",
};
export function DevPrivatiModule() {
    const queryClient = useQueryClient();
    const [searchPrivato, setSearchPrivato] = useState("");
    const [selectedPrivatoId, setSelectedPrivatoId] = useState(null);
    const [conferimentoPrivatoId, setConferimentoPrivatoId] = useState(null);
    const [ricevutaPrivatoId, setRicevutaPrivatoId] = useState(null);
    const fileInputRef = useRef(null);
    const [showNewConferimento, setShowNewConferimento] = useState(false);
    const [showNewRicevuta, setShowNewRicevuta] = useState(false);
    const [showNewPrivato, setShowNewPrivato] = useState(false);
    const [limitWarning, setLimitWarning] = useState(null);
    const [editPrivatoId, setEditPrivatoId] = useState(null);
    const [cerSearch, setCerSearch] = useState("");
    const [showCerDropdown, setShowCerDropdown] = useState(false);
    // Forms
    const [confForm, setConfForm] = useState({ cer: "", kg_pesati: "", importo_pagato: "", metodo_pag: "contanti", note: "", targa_automezzo: "", modello_automezzo: "" });
    const [ricevutaForm, setRicevutaForm] = useState({ importo: "", note: "" });
    const [privatoForm, setPrivatoForm] = useState({ ...EMPTY_PRIVATO_FORM });
    const [scadenzaDate, setScadenzaDate] = useState();
    // Form Bridge: register privato form fields for AI auto-fill
    const setPrivatoField = useCallback((key) => (v) => setPrivatoForm(prev => ({ ...prev, [key]: v })), []);
    const setConfField = useCallback((key) => (v) => setConfForm(prev => ({ ...prev, [key]: v })), []);
    useFormBridgeFields(() => [
        { id: "privato_nome", label: "Nome", type: "text", getValue: () => privatoForm.nome, setValue: setPrivatoField("nome") },
        { id: "privato_cognome", label: "Cognome", type: "text", getValue: () => privatoForm.cognome, setValue: setPrivatoField("cognome") },
        { id: "privato_codice_fiscale", label: "Codice Fiscale", type: "text", getValue: () => privatoForm.codice_fiscale, setValue: setPrivatoField("codice_fiscale") },
        { id: "privato_comune_residenza", label: "Comune Residenza", type: "text", getValue: () => privatoForm.comune_residenza, setValue: setPrivatoField("comune_residenza") },
        { id: "privato_numero_documento", label: "Numero Documento", type: "text", getValue: () => privatoForm.numero_documento, setValue: setPrivatoField("numero_documento") },
        { id: "privato_targa_automezzo", label: "Targa Automezzo", type: "text", getValue: () => privatoForm.targa_automezzo, setValue: setPrivatoField("targa_automezzo") },
        { id: "privato_modello_automezzo", label: "Modello Automezzo", type: "text", getValue: () => privatoForm.modello_automezzo, setValue: setPrivatoField("modello_automezzo") },
        { id: "conf_cer", label: "CER Conferimento", type: "text", getValue: () => confForm.cer, setValue: setConfField("cer") },
        { id: "conf_kg_pesati", label: "Kg Pesati", type: "number", getValue: () => confForm.kg_pesati, setValue: setConfField("kg_pesati") },
        { id: "conf_importo_pagato", label: "Importo Pagato", type: "number", getValue: () => confForm.importo_pagato, setValue: setConfField("importo_pagato") },
        { id: "conf_note", label: "Note Conferimento", type: "textarea", getValue: () => confForm.note, setValue: setConfField("note") },
    ], [privatoForm, confForm]);
    // Fetch impianti for the tenant
    const { data: impianti } = useQuery({
        queryKey: ["dev-impianti", MULTY_TENANT_ID],
        queryFn: async () => {
            const { data, error } = await supabase.from("impianti").select("id, nome").eq("tenant_id", MULTY_TENANT_ID);
            if (error)
                throw error;
            return data;
        },
    });
    const impiantoId = impianti?.[0]?.id;
    const { data: privati } = useQuery({
        queryKey: ["dev-privati", MULTY_TENANT_ID],
        queryFn: async () => {
            const { data, error } = await supabase.from("anagrafica_privati").select("*").eq("tenant_id", MULTY_TENANT_ID).eq("attivo", true).order("cognome");
            if (error)
                throw error;
            return data;
        },
    });
    const { data: conferimenti } = useQuery({
        queryKey: ["dev-conferimenti-anno", MULTY_TENANT_ID],
        queryFn: async () => {
            const annoCorrente = new Date().getFullYear();
            const { data, error } = await supabase.from("privati_conferimenti").select("privato_id, cer, kg_pesati, data").eq("tenant_id", MULTY_TENANT_ID).gte("data", `${annoCorrente}-01-01`);
            if (error)
                throw error;
            return data;
        },
    });
    const { data: ricevute } = useQuery({
        queryKey: ["dev-ricevute", MULTY_TENANT_ID, selectedPrivatoId],
        queryFn: async () => {
            if (!selectedPrivatoId)
                return [];
            const { data, error } = await supabase
                .from("ricevute_privati")
                .select("id, numero_ricevuta, anno, importo, note, created_at")
                .eq("tenant_id", MULTY_TENANT_ID)
                .eq("privato_id", selectedPrivatoId)
                .order("created_at", { ascending: false });
            if (error)
                throw error;
            return (data ?? []);
        },
        enabled: !!selectedPrivatoId,
    });
    const { data: documenti } = useQuery({
        queryKey: ["dev-documenti", selectedPrivatoId],
        queryFn: async () => {
            if (!selectedPrivatoId)
                return [];
            const { data, error } = await supabase.from("documenti_privati").select("*").eq("anagrafica_id", selectedPrivatoId).order("created_at", { ascending: false });
            if (error)
                throw error;
            return data;
        },
        enabled: !!selectedPrivatoId,
    });
    const uploadDoc = useMutation({
        mutationFn: async (file) => {
            if (!selectedPrivatoId)
                throw new Error("Seleziona un privato");
            const path = `${MULTY_TENANT_ID}/${selectedPrivatoId}/${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage.from("documenti-privati").upload(path, file);
            if (uploadError)
                throw uploadError;
            const { error: dbError } = await supabase.from("documenti_privati").insert({
                anagrafica_id: selectedPrivatoId, tenant_id: MULTY_TENANT_ID,
                nome_file: file.name, storage_path: path, tipo_documento: "documento_identita",
            });
            if (dbError)
                throw dbError;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["dev-documenti"] }); toast.success("Documento caricato"); },
        onError: (e) => toast.error("Errore upload: " + e.message),
    });
    const getCerUsage = (privatoId) => {
        if (!conferimenti)
            return {};
        const usage = {};
        for (const c of conferimenti) {
            if (c.privato_id === privatoId) {
                usage[c.cer] = (usage[c.cer] || 0) + Number(c.kg_pesati);
            }
        }
        return usage;
    };
    const getTotalKgAnnui = (privatoId) => {
        if (!conferimenti)
            return 0;
        return conferimenti.filter(c => c.privato_id === privatoId).reduce((sum, c) => sum + Number(c.kg_pesati), 0);
    };
    const checkLimits = async (privatoId, cer, kgNew) => {
        if (!privatoId || !impiantoId)
            return null;
        const privato = privati?.find(p => p.id === privatoId);
        if (!privato)
            return null;
        // Global 1500kg annual limit per privato
        const totalGlobale = getTotalKgAnnui(privatoId) + kgNew;
        if (totalGlobale > LIMITE_ANNUO_GLOBALE_KG) {
            return `🚫 LIMITE ANNUO SUPERATO: ${totalGlobale.toLocaleString("it-IT")} kg / ${LIMITE_ANNUO_GLOBALE_KG} kg`;
        }
        if (totalGlobale >= LIMITE_ANNUO_GLOBALE_KG * 0.8) {
            return `⚠️ Attenzione: ${totalGlobale.toLocaleString("it-IT")} kg / ${LIMITE_ANNUO_GLOBALE_KG} kg (${Math.round(totalGlobale / LIMITE_ANNUO_GLOBALE_KG * 100)}%)`;
        }
        return null;
    };
    // CER filtered list for combobox
    const filteredCER = useMemo(() => {
        if (!cerSearch)
            return CER_DATA.slice(0, 20);
        const s = cerSearch.toLowerCase();
        return CER_DATA.filter(c => c.codice.includes(s) || c.descrizione.toLowerCase().includes(s)).slice(0, 20);
    }, [cerSearch]);
    const handleSaveConferimento = async () => {
        const targetPrivatoId = conferimentoPrivatoId ?? selectedPrivatoId;
        if (!targetPrivatoId) {
            toast.error("Seleziona un privato");
            return;
        }
        if (!impiantoId) {
            toast.error("Nessun impianto configurato");
            return;
        }
        if (!confForm.cer || !confForm.kg_pesati) {
            toast.error("CER e kg obbligatori");
            return;
        }
        const kg = parseFloat(confForm.kg_pesati);
        const warning = await checkLimits(targetPrivatoId, confForm.cer, kg);
        if (warning && (warning.includes("LIMITE SUPERATO") || warning.includes("LIMITE ANNUO GLOBALE"))) {
            setLimitWarning(warning);
            toast.error("Conferimento BLOCCATO: limite superato");
            return;
        }
        if (warning)
            setLimitWarning(warning);
        const privato = privati?.find((p) => p.id === targetPrivatoId);
        const nomeFinale = privato ? `${privato.cognome} ${privato.nome}` : "Anonimo";
        const { data: confData, error } = await supabase
            .from("privati_conferimenti")
            .insert({
            impianto_id: impiantoId,
            cer: confForm.cer,
            kg_pesati: kg,
            nome_privato: nomeFinale,
            cf_pi: privato?.codice_fiscale || null,
            importo_pagato: confForm.importo_pagato ? parseFloat(confForm.importo_pagato) : null,
            metodo_pag: confForm.metodo_pag || null,
            note: confForm.note || null,
            privato_id: targetPrivatoId,
            tipo_utenza: privato?.tipo_utenza || "domestica",
            targa_automezzo: confForm.targa_automezzo || null,
            modello_automezzo: confForm.modello_automezzo || null,
        })
            .select()
            .single();
        if (error) {
            toast.error(error.message);
            return;
        }
        const conf = confData;
        if (conf) {
            const anno = new Date().getFullYear();
            const { data: numData } = await supabase.rpc("next_ricevuta_number", { p_impianto_id: impiantoId, p_anno: anno });
            await supabase.from("ricevute_privati").insert({
                tenant_id: MULTY_TENANT_ID, impianto_id: impiantoId, conferimento_id: conf.id,
                privato_id: targetPrivatoId, numero_ricevuta: numData || `${Date.now()}`, anno,
                importo: conf.importo_pagato || 0,
                note: `${nomeFinale} — CER ${conf.cer} — ${conf.kg_pesati} kg${conf.targa_automezzo ? ` — Targa: ${conf.targa_automezzo}` : ""}`,
            });
        }
        toast.success("✅ Conferimento e ricevuta registrati!");
        setShowNewConferimento(false);
        setConferimentoPrivatoId(null);
        setConfForm({ cer: "", kg_pesati: "", importo_pagato: "", metodo_pag: "contanti", note: "", targa_automezzo: "", modello_automezzo: "" });
        setCerSearch("");
        setLimitWarning(null);
        queryClient.invalidateQueries({ queryKey: ["dev-conferimenti-anno"] });
        queryClient.invalidateQueries({ queryKey: ["dev-ricevute"] });
        queryClient.invalidateQueries({ queryKey: ["dev-ricevute-registro"] });
    };
    const handleSaveRicevutaManuale = async () => {
        const targetPrivatoId = ricevutaPrivatoId ?? selectedPrivatoId;
        if (!targetPrivatoId) {
            toast.error("Seleziona un privato");
            return;
        }
        if (!impiantoId) {
            toast.error("Nessun impianto configurato");
            return;
        }
        const privato = privati?.find((p) => p.id === targetPrivatoId);
        const nomeNote = privato ? `${privato.cognome} ${privato.nome}` : "";
        const anno = new Date().getFullYear();
        const { data: numData } = await supabase.rpc("next_ricevuta_number", { p_impianto_id: impiantoId, p_anno: anno });
        const { error } = await supabase.from("ricevute_privati").insert({
            tenant_id: MULTY_TENANT_ID, impianto_id: impiantoId, privato_id: targetPrivatoId,
            numero_ricevuta: numData || `${Date.now()}`, anno,
            importo: ricevutaForm.importo ? parseFloat(ricevutaForm.importo) : 0,
            note: [nomeNote, ricevutaForm.note].filter(Boolean).join(" — ") || null,
        });
        if (error) {
            toast.error(error.message);
            return;
        }
        toast.success("✅ Ricevuta manuale generata!");
        setShowNewRicevuta(false);
        setRicevutaPrivatoId(null);
        setRicevutaForm({ importo: "", note: "" });
        queryClient.invalidateQueries({ queryKey: ["dev-ricevute"] });
        queryClient.invalidateQueries({ queryKey: ["dev-ricevute-registro"] });
    };
    const handleDeleteRicevuta = async (ricevutaId) => {
        const ok = window.confirm("Eliminare questa ricevuta?");
        if (!ok)
            return;
        const { error } = await supabase.from("ricevute_privati").delete().eq("id", ricevutaId);
        if (error) {
            toast.error(error.message);
            return;
        }
        toast.success("Ricevuta eliminata");
        queryClient.invalidateQueries({ queryKey: ["dev-ricevute"] });
        queryClient.invalidateQueries({ queryKey: ["dev-ricevute-registro"] });
    };
    const handlePrintRicevute = () => {
        if (!ricevute?.length) {
            toast.error("Nessuna ricevuta da stampare");
            return;
        }
        const w = window.open("", "_blank");
        if (!w)
            return;
        w.document.write(`
      <html><head><title>Ricevute Privati</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #333; padding: 8px; text-align: left; }
        th { background: #16a34a; color: white; }
        h1 { color: #16a34a; }
      </style></head><body>
      <h1>Ricevute — ${selectedPrivato?.cognome || ""} ${selectedPrivato?.nome || ""}</h1>
      <table>
        <thead><tr><th>Numero</th><th>Data</th><th>Importo</th><th>Note</th></tr></thead>
        <tbody>
          ${ricevute.map(r => `<tr><td>${r.numero_ricevuta || "-"}</td><td>${new Date(r.created_at).toLocaleDateString("it-IT")}</td><td>€ ${Number(r.importo || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</td><td>${r.note || "-"}</td></tr>`).join("")}
        </tbody>
      </table>
      </body></html>
    `);
        w.document.close();
        w.print();
    };
    const openEditPrivato = (p) => {
        setEditPrivatoId(p.id);
        setPrivatoForm({
            nome: p.nome || "",
            cognome: p.cognome || "",
            codice_fiscale: p.codice_fiscale || "",
            comune_residenza: p.comune_residenza || "",
            numero_documento: p.numero_documento || "",
            scadenza_documento: p.scadenza_documento || "",
            modello_automezzo: p.modello_automezzo || p.automezzo || "",
            targa_automezzo: p.targa_automezzo || "",
        });
        if (p.scadenza_documento) {
            const [y, m, d] = p.scadenza_documento.split("-").map(Number);
            setScadenzaDate(new Date(y, m - 1, d));
        }
        else {
            setScadenzaDate(undefined);
        }
        setShowNewPrivato(true);
    };
    const handleSavePrivato = async () => {
        if (!privatoForm.nome || !privatoForm.cognome || !privatoForm.codice_fiscale) {
            toast.error("Nome, cognome e CF obbligatori");
            return;
        }
        const scadenzaStr = scadenzaDate
            ? `${scadenzaDate.getFullYear()}-${String(scadenzaDate.getMonth() + 1).padStart(2, "0")}-${String(scadenzaDate.getDate()).padStart(2, "0")}`
            : null;
        const payload = {
            nome: privatoForm.nome,
            cognome: privatoForm.cognome,
            codice_fiscale: privatoForm.codice_fiscale,
            comune_residenza: privatoForm.comune_residenza || null,
            numero_documento: privatoForm.numero_documento || null,
            scadenza_documento: scadenzaStr,
            modello_automezzo: privatoForm.modello_automezzo || null,
            automezzo: privatoForm.modello_automezzo || null,
            targa_automezzo: privatoForm.targa_automezzo || null,
            tipo_utenza: "domestica",
            attivo: true,
        };
        if (editPrivatoId) {
            const { error } = await supabase.from("anagrafica_privati").update(payload).eq("id", editPrivatoId);
            if (error) {
                toast.error(error.message);
                return;
            }
            toast.success("✅ Privato aggiornato");
        }
        else {
            const { data: created, error } = await supabase
                .from("anagrafica_privati")
                .insert({ ...payload, tenant_id: MULTY_TENANT_ID, impianto_id: impiantoId })
                .select("id")
                .single();
            if (error) {
                toast.error(error.message);
                return;
            }
            setSelectedPrivatoId(created?.id ?? null);
            setSearchPrivato(payload.cognome);
            toast.success("✅ Privato registrato");
        }
        setShowNewPrivato(false);
        setEditPrivatoId(null);
        setPrivatoForm({ ...EMPTY_PRIVATO_FORM });
        setScadenzaDate(undefined);
        queryClient.invalidateQueries({ queryKey: ["dev-privati"] });
    };
    const filteredPrivati = privati?.filter(p => !searchPrivato ||
        `${p.nome} ${p.cognome} ${p.codice_fiscale}`.toLowerCase().includes(searchPrivato.toLowerCase()));
    const selectedPrivato = privati?.find(p => p.id === selectedPrivatoId);
    const activeConferimentoPrivato = privati?.find(p => p.id === (conferimentoPrivatoId ?? selectedPrivatoId));
    const activeRicevutaPrivato = privati?.find(p => p.id === (ricevutaPrivatoId ?? selectedPrivatoId));
    const selectedUsage = selectedPrivatoId ? getCerUsage(selectedPrivatoId) : {};
    // Auto-fill targa/modello when opening conferimento
    const handleOpenConferimento = () => {
        if (!selectedPrivatoId) {
            toast.error("Seleziona un privato");
            return;
        }
        const p = privati?.find(x => x.id === selectedPrivatoId);
        setConferimentoPrivatoId(selectedPrivatoId);
        setConfForm({
            cer: "", kg_pesati: "", importo_pagato: "", metodo_pag: "contanti", note: "",
            targa_automezzo: p?.targa_automezzo || "",
            modello_automezzo: p?.modello_automezzo || p?.automezzo || "",
        });
        setCerSearch("");
        setShowNewConferimento(true);
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs(Card, { className: "bg-red-950/30 border-red-500/30", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "text-red-400 flex items-center gap-2", children: [_jsx(ShieldAlert, { className: "h-5 w-5" }), " Limite Annuo per Privato: ", LIMITE_ANNUO_GLOBALE_KG, " kg"] }) }), _jsx(CardContent, { children: _jsxs("p", { className: "text-sm text-muted-foreground", children: ["Ogni privato pu\u00F2 conferire al massimo ", _jsxs("strong", { className: "text-red-400", children: [LIMITE_ANNUO_GLOBALE_KG, " kg"] }), " totali all'anno (tutti i CER sommati). Il sistema blocca automaticamente i conferimenti oltre soglia."] }) })] }), _jsxs("div", { className: "flex gap-2 flex-wrap", children: [_jsxs(Button, { onClick: () => { setEditPrivatoId(null); setPrivatoForm({ ...EMPTY_PRIVATO_FORM }); setScadenzaDate(undefined); setShowNewPrivato(true); }, className: "gap-2 bg-emerald-600 hover:bg-emerald-700", children: [_jsx(Plus, { className: "h-4 w-4" }), " Nuovo Privato"] }), _jsxs(Button, { onClick: handleOpenConferimento, variant: "outline", className: "gap-2 border-emerald-500/30 text-emerald-400", children: [_jsx(Scale, { className: "h-4 w-4" }), " Nuovo Conferimento"] }), _jsxs(Button, { onClick: () => {
                            if (!selectedPrivatoId) {
                                toast.error("Seleziona un privato");
                                return;
                            }
                            setRicevutaPrivatoId(selectedPrivatoId);
                            setShowNewRicevuta(true);
                        }, variant: "outline", className: "gap-2 border-emerald-500/30 text-emerald-400", children: [_jsx(Receipt, { className: "h-4 w-4" }), " Ricevuta Manuale"] })] }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Cerca privato (nome, cognome, CF)...", value: searchPrivato, onChange: (e) => setSearchPrivato(e.target.value), className: "pl-10 max-w-md bg-card/60 border-border/50" })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4", children: [_jsxs(Card, { className: "bg-card/60 border-border/30", children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex items-center justify-between w-full", children: [_jsxs(CardTitle, { className: "text-emerald-400 flex items-center gap-2", children: [_jsx(Users, { className: "h-5 w-5" }), " Anagrafica Privati (", filteredPrivati?.length ?? 0, ")"] }), _jsxs("div", { className: "flex gap-1", children: [_jsxs(Button, { variant: "outline", size: "sm", onClick: () => {
                                                        if (!filteredPrivati?.length)
                                                            return;
                                                        const cols = [
                                                            { header: "Cognome", key: "cognome", width: 16 },
                                                            { header: "Nome", key: "nome", width: 16 },
                                                            { header: "CF", key: "codice_fiscale", width: 18 },
                                                            { header: "Comune", key: "comune_residenza", width: 16 },
                                                            { header: "Documento", key: "numero_documento", width: 14 },
                                                            { header: "Targa", key: "targa_automezzo", width: 12 },
                                                        ];
                                                        exportToExcel(filteredPrivati, cols, "privati-dev", "Privati");
                                                    }, className: "gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 h-7 text-xs", children: [_jsx(FileSpreadsheet, { className: "h-3 w-3" }), " Excel"] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => {
                                                        if (!filteredPrivati?.length)
                                                            return;
                                                        const cols = [
                                                            { header: "Cognome", key: "cognome", width: 16 },
                                                            { header: "Nome", key: "nome", width: 16 },
                                                            { header: "CF", key: "codice_fiscale", width: 18 },
                                                            { header: "Comune", key: "comune_residenza", width: 16 },
                                                            { header: "Documento", key: "numero_documento", width: 14 },
                                                            { header: "Targa", key: "targa_automezzo", width: 12 },
                                                        ];
                                                        exportToPdf(filteredPrivati, cols, "privati-dev", "Anagrafica Privati — Multyproget Dev");
                                                    }, className: "gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 h-7 text-xs", children: [_jsx(Printer, { className: "h-3 w-3" }), " PDF"] })] })] }) }), _jsx(CardContent, { className: "max-h-96 overflow-y-auto", children: filteredPrivati?.map((p) => {
                                    const totalKg = getTotalKgAnnui(p.id);
                                    const hasWarning = totalKg >= LIMITE_ANNUO_GLOBALE_KG * 0.8;
                                    return (_jsxs("div", { onClick: () => setSelectedPrivatoId(p.id), className: `p-3 rounded cursor-pointer mb-1 border transition-all ${selectedPrivatoId === p.id ? "bg-emerald-500/10 border-emerald-500/30" : "bg-card/30 border-border/10 hover:bg-white/5"}`, children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("span", { className: "font-medium", children: [p.cognome, " ", p.nome] }), _jsx("span", { className: "ml-2 text-xs text-muted-foreground font-mono", children: p.codice_fiscale })] }), _jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [hasWarning && _jsx(AlertTriangle, { className: "h-4 w-4 text-amber-400" }), _jsxs("button", { className: "h-7 px-2 inline-flex items-center gap-1 rounded-md border border-emerald-500/40 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium", onClick: (e) => { e.stopPropagation(); openEditPrivato(p); }, title: "Modifica privato", children: [_jsx(Edit2, { className: "h-3.5 w-3.5" }), "Modifica"] })] })] }), _jsxs("div", { className: "text-xs text-muted-foreground mt-1", children: [p.comune_residenza || "-", p.targa_automezzo ? ` · ${p.targa_automezzo}` : ""] })] }, p.id));
                                }) })] }), _jsx("div", { className: "space-y-4", children: selectedPrivato ? (_jsxs(_Fragment, { children: [_jsxs(Card, { className: "bg-card/60 border-border/30", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "text-sm", children: ["Consumi CER Anno \u2014 ", selectedPrivato.cognome, " ", selectedPrivato.nome] }) }), _jsx(CardContent, { children: (() => {
                                                const totalKg = getTotalKgAnnui(selectedPrivatoId);
                                                const pct = (totalKg / LIMITE_ANNUO_GLOBALE_KG) * 100;
                                                const isOver = totalKg >= LIMITE_ANNUO_GLOBALE_KG;
                                                const isWarn = pct >= 80;
                                                return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "font-medium", children: "Totale Annuo" }), _jsxs("span", { className: isOver ? "text-red-400 font-bold" : isWarn ? "text-amber-400" : "", children: [totalKg.toLocaleString("it-IT"), " kg / ", LIMITE_ANNUO_GLOBALE_KG, " kg"] })] }), _jsx("div", { className: "h-2 bg-card/60 rounded-full overflow-hidden", children: _jsx("div", { className: `h-full rounded-full transition-all ${isOver ? "bg-red-500" : isWarn ? "bg-amber-500" : "bg-emerald-500"}`, style: { width: `${Math.min(pct, 100)}%` } }) })] }), Object.keys(selectedUsage).length === 0 ? (_jsx("p", { className: "text-muted-foreground text-sm", children: "Nessun conferimento quest'anno" })) : (_jsx("div", { className: "space-y-1", children: Object.entries(selectedUsage).map(([cer, kg]) => (_jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "font-mono", children: cer }), _jsxs("span", { children: [kg.toLocaleString("it-IT"), " kg"] })] }, cer))) })), isOver && (_jsxs("div", { className: "flex items-center gap-1 text-red-400 text-xs", children: [_jsx(AlertTriangle, { className: "h-3 w-3" }), " LIMITE SUPERATO \u2014 Operazione bloccata"] }))] }));
                                            })() })] }), _jsxs(Card, { className: "bg-card/60 border-border/30", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "text-sm flex items-center gap-2", children: [_jsx(FileText, { className: "h-4 w-4" }), " Documenti Scansionati"] }) }), _jsxs(CardContent, { children: [_jsx("input", { type: "file", ref: fileInputRef, className: "hidden", accept: ".pdf,.jpg,.jpeg,.png", onChange: (e) => { const f = e.target.files?.[0]; if (f)
                                                        uploadDoc.mutate(f); } }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => fileInputRef.current?.click(), disabled: uploadDoc.isPending, className: "gap-2 mb-3 border-emerald-500/30 text-emerald-400", children: [_jsx(Upload, { className: "h-4 w-4" }), " Carica Documento"] }), documenti?.length ? (_jsx("div", { className: "space-y-1", children: documenti.map((d) => (_jsxs("div", { className: "flex items-center gap-2 text-sm p-2 rounded bg-card/30", children: [_jsx(FileText, { className: "h-4 w-4 text-muted-foreground" }), _jsx("span", { children: d.nome_file }), _jsx("span", { className: "text-xs text-muted-foreground ml-auto", children: new Date(d.created_at).toLocaleDateString("it-IT") })] }, d.id))) })) : (_jsx("p", { className: "text-muted-foreground text-xs", children: "Nessun documento caricato" }))] })] }), _jsxs(Card, { className: "bg-card/60 border-border/30", children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs(CardTitle, { className: "text-sm flex items-center gap-2", children: [_jsx(Receipt, { className: "h-4 w-4" }), " Ricevute (", ricevute?.length ?? 0, ")"] }), _jsxs("div", { className: "flex gap-1", children: [_jsxs(Button, { variant: "outline", size: "sm", onClick: handlePrintRicevute, className: "gap-1 border-emerald-500/30 text-emerald-400 h-7 text-xs", children: [_jsx(Printer, { className: "h-3 w-3" }), " Stampa"] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => {
                                                                    if (!ricevute?.length)
                                                                        return toast.error("Nessuna ricevuta");
                                                                    const cols = [
                                                                        { header: "Numero", key: "numero_ricevuta", width: 16 },
                                                                        { header: "Data", key: "created_at", width: 14, format: (v) => v ? new Date(v).toLocaleDateString("it-IT") : "-" },
                                                                        { header: "Importo", key: "importo", width: 12, format: (v) => Number(v || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 }) },
                                                                        { header: "Note", key: "note", width: 30 },
                                                                    ];
                                                                    exportToExcel(ricevute, cols, `ricevute-${selectedPrivato?.cognome || "privato"}`, "Ricevute");
                                                                }, className: "gap-1 border-emerald-500/30 text-emerald-400 h-7 text-xs", children: [_jsx(FileSpreadsheet, { className: "h-3 w-3" }), " Excel"] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => {
                                                                    if (!ricevute?.length)
                                                                        return toast.error("Nessuna ricevuta");
                                                                    const cols = [
                                                                        { header: "Numero", key: "numero_ricevuta", width: 16 },
                                                                        { header: "Data", key: "created_at", width: 14, format: (v) => v ? new Date(v).toLocaleDateString("it-IT") : "-" },
                                                                        { header: "Importo", key: "importo", width: 12, format: (v) => Number(v || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 }) },
                                                                        { header: "Note", key: "note", width: 30 },
                                                                    ];
                                                                    exportToPdf(ricevute, cols, `ricevute-${selectedPrivato?.cognome || "privato"}`, `Ricevute — ${selectedPrivato?.cognome || ""} ${selectedPrivato?.nome || ""}`);
                                                                }, className: "gap-1 border-emerald-500/30 text-emerald-400 h-7 text-xs", children: [_jsx(Printer, { className: "h-3 w-3" }), " PDF"] })] })] }) }), _jsx(CardContent, { children: !ricevute?.length ? (_jsx("p", { className: "text-muted-foreground text-xs", children: "Nessuna ricevuta registrata" })) : (_jsx("div", { className: "space-y-1", children: ricevute.map((r) => (_jsxs("div", { className: "flex items-center gap-2 text-sm p-2 rounded bg-card/30", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium", children: r.numero_ricevuta || "-" }), _jsxs("p", { className: "text-xs text-muted-foreground", children: [new Date(r.created_at).toLocaleDateString("it-IT"), " \u00B7 \u20AC ", Number(r.importo || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })] })] }), _jsx(Button, { variant: "outline", size: "sm", className: "ml-auto h-7 border-destructive/30 text-destructive hover:bg-destructive/10", onClick: () => handleDeleteRicevuta(r.id), children: _jsx(Trash2, { className: "h-3 w-3" }) })] }, r.id))) })) })] })] })) : (_jsx(Card, { className: "bg-card/60 border-border/30", children: _jsx(CardContent, { className: "p-8 text-center text-muted-foreground", children: "Seleziona un privato dalla lista per operare" }) })) })] }), _jsx(Dialog, { open: showNewPrivato, onOpenChange: (o) => { setShowNewPrivato(o); if (!o) {
                    setEditPrivatoId(null);
                    setPrivatoForm({ ...EMPTY_PRIVATO_FORM });
                    setScadenzaDate(undefined);
                } }, children: _jsxs(DialogContent, { className: "max-w-lg", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: editPrivatoId ? "Modifica Privato" : "Nuovo Privato" }) }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { children: "Nome *" }), _jsx(Input, { value: privatoForm.nome, onChange: (e) => setPrivatoForm(p => ({ ...p, nome: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Cognome *" }), _jsx(Input, { value: privatoForm.cognome, onChange: (e) => setPrivatoForm(p => ({ ...p, cognome: e.target.value })) })] }), _jsxs("div", { className: "col-span-2", children: [_jsx(Label, { children: "Codice Fiscale *" }), _jsx(Input, { value: privatoForm.codice_fiscale, onChange: (e) => setPrivatoForm(p => ({ ...p, codice_fiscale: e.target.value.toUpperCase() })), className: "font-mono" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Comune" }), _jsx(Input, { value: privatoForm.comune_residenza, onChange: (e) => setPrivatoForm(p => ({ ...p, comune_residenza: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "N\u00B0 Documento" }), _jsx(Input, { value: privatoForm.numero_documento, onChange: (e) => setPrivatoForm(p => ({ ...p, numero_documento: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Scadenza Documento" }), _jsxs(Popover, { children: [_jsxs(PopoverTrigger, { className: cn("w-full inline-flex items-center rounded-lg border border-slate-700 bg-transparent px-4 py-2 text-left text-sm", !scadenzaDate && "text-muted-foreground"), children: [_jsx(CalendarIcon, { className: "mr-2 h-4 w-4" }), scadenzaDate ? format(scadenzaDate, "dd/MM/yyyy") : "Seleziona data"] }), _jsx(PopoverContent, { className: "w-auto p-0", align: "start", children: _jsx(Calendar, { mode: "single", selected: scadenzaDate, onSelect: setScadenzaDate, locale: it, initialFocus: true, className: "p-3 pointer-events-auto" }) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Modello Automezzo" }), _jsx(Input, { value: privatoForm.modello_automezzo, onChange: (e) => setPrivatoForm(p => ({ ...p, modello_automezzo: e.target.value })) })] }), _jsxs("div", { className: "col-span-2", children: [_jsx(Label, { children: "Targa Automezzo" }), _jsx(Input, { value: privatoForm.targa_automezzo, onChange: (e) => setPrivatoForm(p => ({ ...p, targa_automezzo: e.target.value.toUpperCase() })), className: "font-mono" })] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setShowNewPrivato(false), children: "Annulla" }), _jsx(Button, { onClick: handleSavePrivato, className: "bg-emerald-600 hover:bg-emerald-700", children: editPrivatoId ? "Salva" : "Registra" })] })] }) }), _jsx(Dialog, { open: showNewConferimento, onOpenChange: (o) => { setShowNewConferimento(o); setLimitWarning(null); if (!o) {
                    setConferimentoPrivatoId(null);
                    setCerSearch("");
                    setShowCerDropdown(false);
                } }, children: _jsxs(DialogContent, { className: "max-w-lg max-h-[90vh] overflow-y-auto", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(Scale, { className: "h-5 w-5 text-emerald-400" }), "Nuovo Conferimento \u2014 ", activeConferimentoPrivato?.cognome, " ", activeConferimentoPrivato?.nome] }) }), limitWarning && (_jsxs("div", { className: "p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2", children: [_jsx(AlertTriangle, { className: "h-4 w-4 mt-0.5 shrink-0" }), _jsx("span", { children: limitWarning })] })), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { className: "col-span-2 relative", children: [_jsx(Label, { children: "Codice CER *" }), _jsx(Input, { value: confForm.cer || cerSearch, onChange: (e) => {
                                                const v = e.target.value;
                                                setCerSearch(v);
                                                setConfForm(p => ({ ...p, cer: v }));
                                                setShowCerDropdown(true);
                                            }, onFocus: () => setShowCerDropdown(true), onBlur: () => setTimeout(() => setShowCerDropdown(false), 200), placeholder: "Cerca o digita CER (es. 200140)", className: "font-mono" }), showCerDropdown && filteredCER.length > 0 && (_jsx("div", { className: "absolute z-50 top-full left-0 right-0 mt-1 max-h-36 overflow-y-auto rounded-md border border-border bg-popover shadow-lg", children: filteredCER.map(c => (_jsxs("button", { type: "button", className: "w-full text-left px-3 py-1.5 text-sm hover:bg-accent/50 flex items-center gap-2", onMouseDown: (e) => e.preventDefault(), onClick: () => {
                                                    setConfForm(p => ({ ...p, cer: c.codice }));
                                                    setCerSearch(c.codice);
                                                    setShowCerDropdown(false);
                                                }, children: [_jsx("span", { className: "font-mono text-emerald-400 shrink-0", children: c.codice }), _jsx("span", { className: "text-muted-foreground truncate text-xs", children: c.descrizione }), c.pericoloso && _jsx("span", { className: "text-red-400 text-xs shrink-0", children: "\u26A0\uFE0F" })] }, c.codice))) }))] }), _jsxs("div", { children: [_jsx(Label, { children: "Peso (kg) *" }), _jsx(Input, { type: "number", value: confForm.kg_pesati, onChange: (e) => setConfForm(p => ({ ...p, kg_pesati: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Importo \u20AC" }), _jsx(Input, { type: "number", value: confForm.importo_pagato, onChange: (e) => setConfForm(p => ({ ...p, importo_pagato: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Metodo Pagamento" }), _jsxs(Select, { value: confForm.metodo_pag, onValueChange: (v) => setConfForm(p => ({ ...p, metodo_pag: v })), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "contanti", children: "Contanti" }), _jsx(SelectItem, { value: "pos", children: "POS" }), _jsx(SelectItem, { value: "bonifico", children: "Bonifico" }), _jsx(SelectItem, { value: "gratuito", children: "Gratuito" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Targa Automezzo" }), _jsx(Input, { value: confForm.targa_automezzo, onChange: (e) => setConfForm(p => ({ ...p, targa_automezzo: e.target.value.toUpperCase() })), className: "font-mono" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Modello" }), _jsx(Input, { value: confForm.modello_automezzo, onChange: (e) => setConfForm(p => ({ ...p, modello_automezzo: e.target.value })) })] }), _jsxs("div", { className: "col-span-2", children: [_jsx(Label, { children: "Note" }), _jsx(Textarea, { value: confForm.note, onChange: (e) => setConfForm(p => ({ ...p, note: e.target.value })), rows: 2 })] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => { setShowNewConferimento(false); setConferimentoPrivatoId(null); }, children: "Annulla" }), _jsxs(Button, { onClick: handleSaveConferimento, className: "bg-emerald-600 hover:bg-emerald-700 gap-2", children: [_jsx(Scale, { className: "h-4 w-4" }), " Registra Conferimento + Ricevuta"] })] })] }) }), _jsx(Dialog, { open: showNewRicevuta, onOpenChange: (o) => { setShowNewRicevuta(o); if (!o)
                    setRicevutaPrivatoId(null); }, children: _jsxs(DialogContent, { className: "max-w-md", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(Receipt, { className: "h-5 w-5 text-emerald-400" }), "Ricevuta Manuale \u2014 ", activeRicevutaPrivato?.cognome, " ", activeRicevutaPrivato?.nome] }) }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx(Label, { children: "Importo \u20AC" }), _jsx(Input, { type: "number", value: ricevutaForm.importo, onChange: (e) => setRicevutaForm(p => ({ ...p, importo: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Note" }), _jsx(Textarea, { value: ricevutaForm.note, onChange: (e) => setRicevutaForm(p => ({ ...p, note: e.target.value })), rows: 3 })] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => { setShowNewRicevuta(false); setRicevutaPrivatoId(null); }, children: "Annulla" }), _jsxs(Button, { onClick: handleSaveRicevutaManuale, className: "bg-emerald-600 hover:bg-emerald-700 gap-2", children: [_jsx(Receipt, { className: "h-4 w-4" }), " Genera Ricevuta"] })] })] }) })] }));
}
