import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Plus, Edit, Trash2, FileSpreadsheet, Printer, Upload, Building2, } from "lucide-react";
import { toast } from "sonner";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";
import * as XLSX from "xlsx";
const MULTY_TENANT_CANDIDATES = [
    "77ec9a3d-602e-438f-97bf-1c69abd8f691",
    "77ec9a3d-a6d4-4235-8e68-1a6f345de57a",
];
const emptyForm = () => ({
    codice: "", ragione_sociale: "", indirizzo: "", citta: "", provincia: "", cap: "",
    codice_fiscale: "", p_sl: false, p_ul: false, trasportatore: false, destinatario: false,
    intermediario: false, fornitore: false, cliente: false, alias: "", cod_tipologia: "1",
    tipologia: "Azienda Privata", fax: "", email: "", nazione: "IT", partita_iva: "",
    telefono: "", zona_gruppo_cliente: "", stato: "0", cellulare: "", cod_cliente: "",
    cliente_fatturazione: "", codice_destinatario: "", pec: "", latitudine: "", longitudine: "",
    codice_cat_eco: "", note: "", stato_amm: "", codice_cdc: "", urbano: false,
});
export function AnagraficaCompletaMP() {
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(emptyForm());
    const [importing, setImporting] = useState(false);
    const tenantId = MULTY_TENANT_CANDIDATES[0];
    const { data: aziende, isLoading, refetch } = useQuery({
        queryKey: ["anagrafica-aziende-mp", tenantId],
        enabled: !!tenantId,
        queryFn: async () => {
            if (!tenantId)
                return [];
            const allRecords = [];
            let from = 0;
            const pageSize = 1000;
            while (true) {
                const { data, error } = await supabase
                    .from("anagrafica_aziende_mp")
                    .select("*")
                    .eq("tenant_id", tenantId)
                    .eq("attivo", true)
                    .order("ragione_sociale")
                    .range(from, from + pageSize - 1);
                if (error)
                    throw error;
                const rows = (data || []);
                allRecords.push(...rows);
                if (rows.length < pageSize)
                    break;
                from += pageSize;
            }
            return allRecords;
        },
    });
    const q = search.toLowerCase();
    const filtered = (aziende || []).filter(a => !q || `${a.ragione_sociale} ${a.codice_fiscale || ""} ${a.partita_iva || ""} ${a.citta || ""} ${a.codice || ""}`.toLowerCase().includes(q));
    const openNew = () => { setForm(emptyForm()); setEditId(null); setShowForm(true); };
    const openEdit = (a) => {
        setForm({
            codice: a.codice || "", ragione_sociale: a.ragione_sociale, indirizzo: a.indirizzo || "",
            citta: a.citta || "", provincia: a.provincia || "", cap: a.cap || "",
            codice_fiscale: a.codice_fiscale || "", p_sl: a.p_sl, p_ul: a.p_ul,
            trasportatore: a.trasportatore, destinatario: a.destinatario, intermediario: a.intermediario,
            fornitore: a.fornitore, cliente: a.cliente, alias: a.alias || "",
            cod_tipologia: a.cod_tipologia || "1", tipologia: a.tipologia || "Azienda Privata",
            fax: a.fax || "", email: a.email || "", nazione: a.nazione || "IT",
            partita_iva: a.partita_iva || "", telefono: a.telefono || "",
            zona_gruppo_cliente: a.zona_gruppo_cliente || "", stato: a.stato || "0",
            cellulare: a.cellulare || "", cod_cliente: a.cod_cliente || "",
            cliente_fatturazione: a.cliente_fatturazione || "", codice_destinatario: a.codice_destinatario || "",
            pec: a.pec || "", latitudine: a.latitudine || "", longitudine: a.longitudine || "",
            codice_cat_eco: a.codice_cat_eco || "", note: a.note || "",
            stato_amm: a.stato_amm || "", codice_cdc: a.codice_cdc || "", urbano: a.urbano,
        });
        setEditId(a.id);
        setShowForm(true);
    };
    const handleSave = async () => {
        if (!tenantId) {
            toast.error("Tenant Multyproget non trovato");
            return;
        }
        if (!form.ragione_sociale.trim()) {
            toast.error("Ragione sociale obbligatoria");
            return;
        }
        const payload = { ...form, tenant_id: tenantId };
        if (editId) {
            const { error } = await supabase.from("anagrafica_aziende_mp").update(payload).eq("id", editId);
            if (error) {
                toast.error(error.message);
                return;
            }
            toast.success("Anagrafica aggiornata");
        }
        else {
            const { error } = await supabase.from("anagrafica_aziende_mp").insert(payload);
            if (error) {
                toast.error(error.message);
                return;
            }
            toast.success("Nuova azienda registrata");
        }
        setShowForm(false);
        setEditId(null);
        refetch();
    };
    const handleDelete = async (id) => {
        if (!window.confirm("Disattivare questa azienda?"))
            return;
        const { error } = await supabase.from("anagrafica_aziende_mp").update({ attivo: false }).eq("id", id);
        if (error) {
            toast.error(error.message);
            return;
        }
        toast.success("Azienda disattivata");
        refetch();
    };
    const normalizeKey = (value) => value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    const parseBool = (value) => {
        if (typeof value === "boolean")
            return value;
        if (typeof value === "number")
            return value === 1;
        const normalized = String(value ?? "").trim().toLowerCase();
        return ["1", "true", "vero", "si", "sì", "x"].includes(normalized);
    };
    const pickValue = (row, aliases) => {
        const entries = Object.entries(row);
        const normalizedAliases = aliases.map(normalizeKey);
        for (const alias of normalizedAliases) {
            const exact = entries.find(([key]) => normalizeKey(key) === alias);
            if (exact)
                return exact[1];
        }
        for (const alias of normalizedAliases) {
            const startsWith = entries.find(([key]) => normalizeKey(key).startsWith(alias));
            if (startsWith)
                return startsWith[1];
        }
        for (const alias of normalizedAliases) {
            const contains = entries.find(([key]) => normalizeKey(key).includes(alias));
            if (contains)
                return contains[1];
        }
        return "";
    };
    const asText = (value, fallback = "") => {
        const str = String(value ?? "").trim();
        return str || fallback;
    };
    const mapExcelRows = (rows) => rows.map((row) => ({
        tenant_id: tenantId,
        codice: asText(pickValue(row, ["codice"])),
        ragione_sociale: asText(pickValue(row, ["ragione", "ragione sociale", "denominazione"])),
        indirizzo: asText(pickValue(row, ["indirizzo"])),
        citta: asText(pickValue(row, ["citta", "città", "comune"])),
        provincia: asText(pickValue(row, ["prov", "provincia"])),
        cap: asText(pickValue(row, ["cap"])),
        codice_fiscale: asText(pickValue(row, ["codice fiscale", "cf"])),
        p_sl: parseBool(pickValue(row, ["p sl"])),
        p_ul: parseBool(pickValue(row, ["p ul"])),
        trasportatore: parseBool(pickValue(row, ["trasp", "trasportatore"])),
        destinatario: parseBool(pickValue(row, ["dest", "destinatario"])),
        intermediario: parseBool(pickValue(row, ["inter", "intermediario"])),
        fornitore: parseBool(pickValue(row, ["forn", "fornitore"])),
        cliente: parseBool(pickValue(row, ["cli", "cliente"])),
        alias: asText(pickValue(row, ["alias"])),
        cod_tipologia: asText(pickValue(row, ["cod tipol", "cod tipologia"]), "1"),
        tipologia: asText(pickValue(row, ["tipologia"]), "Azienda Privata"),
        fax: asText(pickValue(row, ["fax"])),
        email: asText(pickValue(row, ["email"])),
        nazione: asText(pickValue(row, ["nazione"]), "IT"),
        partita_iva: asText(pickValue(row, ["p iva", "partita iva", "piva"])),
        telefono: asText(pickValue(row, ["telefono"])),
        zona_gruppo_cliente: asText(pickValue(row, ["zona gruppo cliente"])),
        stato: asText(pickValue(row, ["stato"]), "0"),
        cellulare: asText(pickValue(row, ["cellulare"])),
        cod_cliente: asText(pickValue(row, ["cod cliente"])),
        cliente_fatturazione: asText(pickValue(row, ["cliente fatt"])),
        codice_destinatario: asText(pickValue(row, ["codice destinatario"])),
        pec: asText(pickValue(row, ["pec"])),
        latitudine: asText(pickValue(row, ["latitudine"])),
        longitudine: asText(pickValue(row, ["longitudine"])),
        codice_cat_eco: asText(pickValue(row, ["codice cat eco"])),
        note: asText(pickValue(row, ["note"])),
        stato_amm: asText(pickValue(row, ["stato amm"]), "0"),
        codice_cdc: asText(pickValue(row, ["codice cdc"])),
        urbano: parseBool(pickValue(row, ["urbano"])),
    })).filter((r) => r.tenant_id && r.ragione_sociale);
    const insertBatches = async (mapped) => {
        if (!tenantId)
            throw new Error("Tenant Multyproget non trovato");
        let inserted = 0;
        for (let i = 0; i < mapped.length; i += 50) {
            const batch = mapped.slice(i, i + 50);
            const { error } = await supabase.from("anagrafica_aziende_mp").insert(batch);
            if (error) {
                toast.error(`Errore batch ${i}: ${error.message}`);
                return inserted;
            }
            inserted += batch.length;
        }
        return inserted;
    };
    const handleImportExcel = async () => {
        setImporting(true);
        try {
            const resp = await fetch("/data/anagrafica_completa_multi_proget_2.xlsx");
            if (!resp.ok)
                throw new Error("File non trovato");
            const buf = await resp.arrayBuffer();
            const wb = XLSX.read(buf, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
            const mapped = mapExcelRows(rows);
            const inserted = await insertBatches(mapped);
            toast.success(`Importati ${inserted} record su ${mapped.length}`);
            refetch();
        }
        catch (err) {
            toast.error(`Errore importazione: ${err.message}`);
        }
        finally {
            setImporting(false);
        }
    };
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setImporting(true);
        try {
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
            const mapped = mapExcelRows(rows);
            if (!mapped.length) {
                toast.error("Nessun record valido trovato nel file");
                return;
            }
            const inserted = await insertBatches(mapped);
            toast.success(`Importati ${inserted} record su ${mapped.length}`);
            refetch();
        }
        catch (err) {
            toast.error(`Errore: ${err.message}`);
        }
        finally {
            setImporting(false);
            e.target.value = "";
        }
    };
    const roles = (a) => {
        const r = [];
        if (a.p_sl)
            r.push("P.SL");
        if (a.p_ul)
            r.push("P.UL");
        if (a.trasportatore)
            r.push("Trasp.");
        if (a.destinatario)
            r.push("Dest.");
        if (a.intermediario)
            r.push("Inter.");
        if (a.fornitore)
            r.push("Forn.");
        if (a.cliente)
            r.push("Cli.");
        return r;
    };
    const exportCols = [
        { header: "Codice", key: "codice", width: 10 },
        { header: "Ragione Sociale", key: "ragione_sociale", width: 30 },
        { header: "Indirizzo", key: "indirizzo", width: 24 },
        { header: "Città", key: "citta", width: 16 },
        { header: "Prov.", key: "provincia", width: 6 },
        { header: "CAP", key: "cap", width: 8 },
        { header: "CF", key: "codice_fiscale", width: 18 },
        { header: "P.IVA", key: "partita_iva", width: 14 },
        { header: "Email", key: "email", width: 24 },
        { header: "Telefono", key: "telefono", width: 14 },
    ];
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-3 flex-wrap", children: [_jsxs("div", { className: "relative flex-1 min-w-[200px]", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Cerca ragione sociale, CF, P.IVA, citt\u00E0, codice...", value: search, onChange: e => setSearch(e.target.value), className: "pl-10 bg-card/60 border-border/30" })] }), _jsxs(Button, { onClick: openNew, className: "gap-2 bg-emerald-600 hover:bg-emerald-700", children: [_jsx(Plus, { className: "h-4 w-4" }), " Nuova Azienda"] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: handleImportExcel, disabled: importing, className: "gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10", children: [_jsx(Upload, { className: "h-3 w-3" }), " ", importing ? "Importazione..." : "Importa da server"] }), _jsxs("label", { className: "inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer text-sm", children: [_jsx(Upload, { className: "h-3 w-3" }), " Carica Excel", _jsx("input", { type: "file", accept: ".xlsx,.xls", onChange: handleFileUpload, className: "hidden", disabled: importing })] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => {
                            if (!filtered.length)
                                return toast.error("Nessun dato");
                            exportToExcel(filtered, exportCols, "anagrafica-aziende-mp", "Aziende MP");
                        }, className: "gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10", children: [_jsx(FileSpreadsheet, { className: "h-3 w-3" }), " Excel"] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => {
                            if (!filtered.length)
                                return toast.error("Nessun dato");
                            exportToPdf(filtered, exportCols, "anagrafica-aziende-mp", "Anagrafica Completa Multyproget");
                        }, className: "gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10", children: [_jsx(Printer, { className: "h-3 w-3" }), " PDF"] }), _jsxs("span", { className: "text-sm text-muted-foreground", children: [_jsx(Building2, { className: "h-4 w-4 inline mr-1" }), " ", filtered.length, " aziende"] })] }), _jsx(Card, { className: "bg-card/60 border-border/30", children: _jsx(CardContent, { className: "p-0", children: _jsx("div", { className: "overflow-x-auto max-h-[600px] overflow-y-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "sticky top-0 bg-card z-10", children: _jsxs("tr", { className: "border-b border-border/30 text-muted-foreground", children: [_jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Codice" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Ragione Sociale" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Indirizzo" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Citt\u00E0" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Prov." }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "CF / P.IVA" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Ruoli" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Email" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Telefono" }), _jsx("th", { className: "text-right p-3 text-xs uppercase", children: "Azioni" })] }) }), _jsxs("tbody", { children: [isLoading ? (_jsx("tr", { children: _jsx("td", { colSpan: 10, className: "p-6 text-center text-muted-foreground", children: "Caricamento..." }) })) : filtered.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 10, className: "p-6 text-center text-muted-foreground", children: "Nessuna azienda trovata" }) })) : (filtered.slice(0, 200).map(a => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-white/5", children: [_jsx("td", { className: "p-3 font-mono text-xs text-muted-foreground", children: a.codice || "—" }), _jsx("td", { className: "p-3 font-medium", children: a.ragione_sociale }), _jsx("td", { className: "p-3 text-muted-foreground text-xs", children: a.indirizzo || "—" }), _jsx("td", { className: "p-3 text-muted-foreground", children: a.citta || "—" }), _jsx("td", { className: "p-3 text-muted-foreground", children: a.provincia || "—" }), _jsx("td", { className: "p-3 font-mono text-xs text-muted-foreground", children: a.codice_fiscale || a.partita_iva || "—" }), _jsx("td", { className: "p-3", children: _jsx("div", { className: "flex flex-wrap gap-1", children: roles(a).map(r => (_jsx("span", { className: "px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400", children: r }, r))) }) }), _jsx("td", { className: "p-3 text-muted-foreground text-xs", children: a.email || "—" }), _jsx("td", { className: "p-3 text-muted-foreground text-xs", children: a.telefono || a.cellulare || "—" }), _jsx("td", { className: "p-3 text-right", children: _jsxs("div", { className: "flex gap-1 justify-end", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: () => openEdit(a), className: "text-emerald-400 h-7 w-7 p-0", children: _jsx(Edit, { className: "h-3 w-3" }) }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => handleDelete(a.id), className: "text-red-400 h-7 w-7 p-0", children: _jsx(Trash2, { className: "h-3 w-3" }) })] }) })] }, a.id)))), filtered.length > 200 && (_jsx("tr", { children: _jsxs("td", { colSpan: 10, className: "p-3 text-center text-muted-foreground text-xs", children: ["... e altri ", filtered.length - 200, " risultati"] }) }))] })] }) }) }) }), _jsx(Dialog, { open: showForm, onOpenChange: o => { if (!o) {
                    setShowForm(false);
                    setEditId(null);
                } }, children: _jsxs(DialogContent, { className: "max-w-3xl max-h-[85vh] overflow-y-auto", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: editId ? "Modifica Azienda" : "Nuova Azienda" }) }), _jsxs("div", { className: "grid grid-cols-3 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { children: "Codice" }), _jsx(Input, { value: form.codice || "", onChange: e => setForm(f => ({ ...f, codice: e.target.value })) })] }), _jsxs("div", { className: "col-span-2", children: [_jsx(Label, { children: "Ragione Sociale *" }), _jsx(Input, { value: form.ragione_sociale, onChange: e => setForm(f => ({ ...f, ragione_sociale: e.target.value })) })] }), _jsxs("div", { className: "col-span-2", children: [_jsx(Label, { children: "Indirizzo" }), _jsx(Input, { value: form.indirizzo || "", onChange: e => setForm(f => ({ ...f, indirizzo: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Citt\u00E0" }), _jsx(Input, { value: form.citta || "", onChange: e => setForm(f => ({ ...f, citta: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Provincia" }), _jsx(Input, { value: form.provincia || "", onChange: e => setForm(f => ({ ...f, provincia: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "CAP" }), _jsx(Input, { value: form.cap || "", onChange: e => setForm(f => ({ ...f, cap: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Nazione" }), _jsx(Input, { value: form.nazione || "", onChange: e => setForm(f => ({ ...f, nazione: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Codice Fiscale" }), _jsx(Input, { value: form.codice_fiscale || "", onChange: e => setForm(f => ({ ...f, codice_fiscale: e.target.value.toUpperCase() })), className: "font-mono" })] }), _jsxs("div", { children: [_jsx(Label, { children: "P. IVA" }), _jsx(Input, { value: form.partita_iva || "", onChange: e => setForm(f => ({ ...f, partita_iva: e.target.value })), className: "font-mono" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Alias" }), _jsx(Input, { value: form.alias || "", onChange: e => setForm(f => ({ ...f, alias: e.target.value })) })] }), _jsxs("div", { className: "col-span-3 border border-border/30 rounded-lg p-3", children: [_jsx(Label, { className: "mb-2 block", children: "Ruoli" }), _jsx("div", { className: "flex flex-wrap gap-4", children: [
                                                ["p_sl", "P. Sede Legale"],
                                                ["p_ul", "P. Unità Locale"],
                                                ["trasportatore", "Trasportatore"],
                                                ["destinatario", "Destinatario"],
                                                ["intermediario", "Intermediario"],
                                                ["fornitore", "Fornitore"],
                                                ["cliente", "Cliente"],
                                                ["urbano", "Urbano"],
                                            ].map(([key, label]) => (_jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: form[key], onChange: e => setForm(f => ({ ...f, [key]: e.target.checked })), className: "rounded border-border" }), label] }, key))) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Tipologia" }), _jsx(Input, { value: form.tipologia || "", onChange: e => setForm(f => ({ ...f, tipologia: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Cod. Tipologia" }), _jsx(Input, { value: form.cod_tipologia || "", onChange: e => setForm(f => ({ ...f, cod_tipologia: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Telefono" }), _jsx(Input, { value: form.telefono || "", onChange: e => setForm(f => ({ ...f, telefono: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Cellulare" }), _jsx(Input, { value: form.cellulare || "", onChange: e => setForm(f => ({ ...f, cellulare: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Fax" }), _jsx(Input, { value: form.fax || "", onChange: e => setForm(f => ({ ...f, fax: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Email" }), _jsx(Input, { value: form.email || "", onChange: e => setForm(f => ({ ...f, email: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "PEC" }), _jsx(Input, { value: form.pec || "", onChange: e => setForm(f => ({ ...f, pec: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Zona/Gruppo Cliente" }), _jsx(Input, { value: form.zona_gruppo_cliente || "", onChange: e => setForm(f => ({ ...f, zona_gruppo_cliente: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Stato" }), _jsx(Input, { value: form.stato || "", onChange: e => setForm(f => ({ ...f, stato: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Cod. Cliente" }), _jsx(Input, { value: form.cod_cliente || "", onChange: e => setForm(f => ({ ...f, cod_cliente: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Cliente Fatturazione" }), _jsx(Input, { value: form.cliente_fatturazione || "", onChange: e => setForm(f => ({ ...f, cliente_fatturazione: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Codice Destinatario" }), _jsx(Input, { value: form.codice_destinatario || "", onChange: e => setForm(f => ({ ...f, codice_destinatario: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Latitudine" }), _jsx(Input, { value: form.latitudine || "", onChange: e => setForm(f => ({ ...f, latitudine: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Longitudine" }), _jsx(Input, { value: form.longitudine || "", onChange: e => setForm(f => ({ ...f, longitudine: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Codice Cat. Eco." }), _jsx(Input, { value: form.codice_cat_eco || "", onChange: e => setForm(f => ({ ...f, codice_cat_eco: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Stato Amm." }), _jsx(Input, { value: form.stato_amm || "", onChange: e => setForm(f => ({ ...f, stato_amm: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Codice CDC" }), _jsx(Input, { value: form.codice_cdc || "", onChange: e => setForm(f => ({ ...f, codice_cdc: e.target.value })) })] }), _jsxs("div", { className: "col-span-3", children: [_jsx(Label, { children: "Note" }), _jsx(Textarea, { value: form.note || "", onChange: e => setForm(f => ({ ...f, note: e.target.value })), rows: 2 })] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => { setShowForm(false); setEditId(null); }, children: "Annulla" }), _jsx(Button, { onClick: handleSave, className: "bg-emerald-600 hover:bg-emerald-700", children: editId ? "Aggiorna" : "Registra" })] })] }) })] }));
}
