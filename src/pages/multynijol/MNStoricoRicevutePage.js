import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { Search, FileUp, FileSpreadsheet, Upload } from "lucide-react";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";
import { toast } from "sonner";
import * as XLSX from "xlsx";
const TENANT_ID = "dc2a6046-d9a8-4549-8e45-82367d695ac6";
const COLS = [
    { header: "N. Doc", key: "numero_doc", width: 12 },
    { header: "Data", key: "data_doc", width: 14, format: (v) => v ? new Date(v).toLocaleDateString("it-IT") : "—" },
    { header: "Ragione Sociale", key: "ragione_sociale", width: 25 },
    { header: "Codice Fiscale", key: "codice_fiscale", width: 20 },
    { header: "Imponibile", key: "imponibile", width: 14, format: (v) => `€ ${Number(v || 0).toFixed(2)}` },
    { header: "Totale", key: "totale_doc", width: 14, format: (v) => `€ ${Number(v || 0).toFixed(2)}` },
    { header: "Kg", key: "quantita_kg", width: 10 },
    { header: "Città", key: "citta", width: 16 },
    { header: "Prov.", key: "provincia", width: 6 },
    { header: "Pagamento", key: "metodo_pagamento", width: 14 },
];
export default function MNStoricoRicevutePage() {
    const [search, setSearch] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [importing, setImporting] = useState(false);
    const qc = useQueryClient();
    const { data: items = [], isLoading } = useQuery({
        queryKey: ["mn-storico-ricevute"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("storico_ricevute_privati")
                .select("*")
                .eq("tenant_id", TENANT_ID)
                .order("data_doc", { ascending: false });
            if (error)
                throw error;
            return data || [];
        },
    });
    const filtered = items.filter((i) => {
        if (search) {
            const s = search.toLowerCase();
            const match = `${i.ragione_sociale} ${i.codice_fiscale || ""} ${i.numero_doc} ${i.citta || ""}`.toLowerCase().includes(s);
            if (!match)
                return false;
        }
        if (dateFrom && i.data_doc < dateFrom)
            return false;
        if (dateTo && i.data_doc > dateTo)
            return false;
        return true;
    });
    const totalImponibile = filtered.reduce((s, i) => s + Number(i.imponibile || 0), 0);
    const totalKg = filtered.reduce((s, i) => s + Number(i.quantita_kg || 0), 0);
    const parseEuro = (v) => {
        if (!v)
            return 0;
        return parseFloat(String(v).replace(/[€\s]/g, "").replace(/\./g, "").replace(",", ".")) || 0;
    };
    const importXlsx = async () => {
        setImporting(true);
        try {
            const res = await fetch("/data/elenco_ricevute_fatte_ai_privati.xlsx");
            const ab = await res.arrayBuffer();
            const wb = XLSX.read(ab, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(ws);
            const rows = json.map((r) => {
                const rawDate = r["Data"];
                let dataDoc = "2025-01-01";
                if (typeof rawDate === "number") {
                    const d = XLSX.SSF.parse_date_code(rawDate);
                    dataDoc = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
                }
                else if (typeof rawDate === "string" && rawDate.includes("/")) {
                    const [dd, mm, yyyy] = rawDate.split("/");
                    dataDoc = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
                }
                return {
                    numero_doc: String(r["N. Doc"] || ""),
                    data_doc: dataDoc,
                    tipo_doc: r["Tipo Doc."] || "ACQ",
                    codice_cliente: r["Codice"] ? String(r["Codice"]) : null,
                    ragione_sociale: r["Ragione"] || "",
                    codice_fiscale: r["Cod. Fiscale"] || null,
                    imponibile: parseEuro(String(r["Imponibile"] || "0")),
                    totale_doc: parseEuro(String(r["Totale Doc."] || "0")),
                    quantita_kg: parseFloat(String(r["Quantita Kg"] || "0").replace(",", ".")) || 0,
                    indirizzo: r["Indirizzo"] || null,
                    cap: r["CAP"] ? String(r["CAP"]) : null,
                    citta: r["Città"] || r["Citta"] || null,
                    provincia: r["Prov."] || null,
                    peso_netto: parseFloat(String(r["Peso Netto"] || "0").replace(",", ".")) || 0,
                    peso_lordo: parseFloat(String(r["Peso Lordo"] || "0").replace(",", ".")) || 0,
                    metodo_pagamento: r["Cod.Pagamento"] || null,
                    descrizione_pagamento: r["Descr.Pagamento"] || null,
                    stato_ddt: r["Stato DDT"] || "U",
                    quantita_fatturabile: parseFloat(String(r["Quantità Fatturabile (Kg)"] || "0").replace(",", ".")) || 0,
                    tenant_id: TENANT_ID,
                };
            });
            // Insert in batches of 100
            for (let i = 0; i < rows.length; i += 100) {
                const batch = rows.slice(i, i + 100);
                const { error } = await supabase.from("storico_ricevute_privati").insert(batch);
                if (error)
                    throw error;
            }
            toast.success(`Importate ${rows.length} ricevute`);
            qc.invalidateQueries({ queryKey: ["mn-storico-ricevute"] });
        }
        catch (err) {
            toast.error("Errore importazione: " + (err?.message || err));
        }
        finally {
            setImporting(false);
        }
    };
    return (_jsx(MNAdminLayout, { title: "Storico Ricevute", subtitle: "Privati Cittadini", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-3 gap-3", children: [_jsxs("div", { className: "p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsx("p", { className: "text-xs text-muted-foreground font-mono uppercase", children: "Totale Ricevute" }), _jsx("p", { className: "text-2xl font-bold text-foreground", children: filtered.length })] }), _jsxs("div", { className: "p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsx("p", { className: "text-xs text-muted-foreground font-mono uppercase", children: "Imponibile Totale" }), _jsxs("p", { className: "text-2xl font-bold text-foreground", children: ["\u20AC ", totalImponibile.toLocaleString("it-IT", { minimumFractionDigits: 2 })] })] }), _jsxs("div", { className: "p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsx("p", { className: "text-xs text-muted-foreground font-mono uppercase", children: "Kg Totali" }), _jsx("p", { className: "text-2xl font-bold text-foreground", children: totalKg.toLocaleString("it-IT") })] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsxs("div", { className: "relative flex-1 min-w-[200px]", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx("input", { value: search, onChange: e => setSearch(e.target.value), placeholder: "Cerca per ragione sociale, CF, n. doc, citt\u00E0...", className: "w-full pl-10 pr-4 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("label", { className: "text-xs font-mono text-muted-foreground", children: "DA" }), _jsx("input", { type: "date", value: dateFrom, onChange: e => setDateFrom(e.target.value), className: "px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("label", { className: "text-xs font-mono text-muted-foreground", children: "A" }), _jsx("input", { type: "date", value: dateTo, onChange: e => setDateTo(e.target.value), className: "px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground" })] }), _jsxs("span", { className: "text-xs font-mono text-muted-foreground", children: [filtered.length, " / ", items.length] }), items.length === 0 && (_jsxs("button", { onClick: importXlsx, disabled: importing, className: "flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50", children: [_jsx(Upload, { className: "h-3.5 w-3.5" }), " ", importing ? "Importando..." : "Importa Storico"] })), _jsxs("div", { className: "flex gap-1", children: [_jsx("button", { onClick: () => exportToPdf(filtered, COLS, "storico_ricevute", "Storico Ricevute Privati"), className: "p-1.5 rounded-lg hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-colors", title: "Esporta PDF", children: _jsx(FileUp, { className: "h-4 w-4" }) }), _jsx("button", { onClick: () => exportToExcel(filtered, COLS, "storico_ricevute", "Storico Ricevute"), className: "p-1.5 rounded-lg hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-colors", title: "Esporta Excel", children: _jsx(FileSpreadsheet, { className: "h-4 w-4" }) })] })] }), _jsx("div", { className: "rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl overflow-hidden", children: isLoading ? (_jsx("div", { className: "p-8 text-center text-muted-foreground", children: "Caricamento..." })) : filtered.length === 0 ? (_jsx("div", { className: "p-8 text-center text-muted-foreground", children: "Nessuna ricevuta trovata" })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30 text-left", children: [_jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "N. Doc" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Data" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Ragione Sociale" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "CF" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Imponibile" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Totale" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Kg" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Citt\u00E0" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Prov." }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Pagamento" })] }) }), _jsx("tbody", { children: filtered.map((item) => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-muted/10 transition-colors", children: [_jsx("td", { className: "px-4 py-3 font-mono text-xs text-foreground", children: item.numero_doc }), _jsx("td", { className: "px-4 py-3 text-xs text-muted-foreground", children: item.data_doc ? new Date(item.data_doc).toLocaleDateString("it-IT") : "—" }), _jsx("td", { className: "px-4 py-3 font-medium text-foreground", children: item.ragione_sociale }), _jsx("td", { className: "px-4 py-3 font-mono text-xs text-muted-foreground", children: item.codice_fiscale || "—" }), _jsxs("td", { className: "px-4 py-3 text-xs text-foreground", children: ["\u20AC ", Number(item.imponibile || 0).toFixed(2)] }), _jsxs("td", { className: "px-4 py-3 text-xs text-foreground", children: ["\u20AC ", Number(item.totale_doc || 0).toFixed(2)] }), _jsx("td", { className: "px-4 py-3 font-mono text-xs text-foreground", children: item.quantita_kg }), _jsx("td", { className: "px-4 py-3 text-xs text-muted-foreground", children: item.citta || "—" }), _jsx("td", { className: "px-4 py-3 text-xs text-muted-foreground", children: item.provincia || "—" }), _jsx("td", { className: "px-4 py-3 text-xs text-muted-foreground", children: item.metodo_pagamento || "—" })] }, item.id))) })] }) })) })] }) }));
}
