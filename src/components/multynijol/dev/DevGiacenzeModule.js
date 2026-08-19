import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, RefreshCw, Package, ArrowDown, ArrowUp, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { CER_CATALOG } from "@/data/cerCatalog";
import { logAgentActivity } from "@/stores/agentActivityStore";
const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
// Intestazione fissa per export (replica StRegRag)
const COMPANY = {
    ragione: "MULTY PROGET S.R.L. - VIA RIVAROSSA 18/20 Piscina 10060 TO",
    registroLabel: "Registro n. : 1   Reg. Produttore-Destinatario   Unità Locale: 1 - MULTY PROGET S.R.L. - VIA RIVAROSSA 18/20 Piscina",
};
const fmt = (n) => n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 3 });
const fmtDate = (d) => d.toLocaleDateString("it-IT");
export function DevGiacenzeModule() {
    const queryClient = useQueryClient();
    const [searchCer, setSearchCer] = useState("");
    const [dataAl, setDataAl] = useState(() => new Date().toISOString().slice(0, 10));
    const [dataDal, setDataDal] = useState("");
    const [showAllCer, setShowAllCer] = useState(false);
    // Fetch all movimenti for the tenant (we filter client-side per data selezionata)
    const { data: movimenti, isLoading } = useQuery({
        queryKey: ["dev-movimenti-multy", MULTY_TENANT_ID],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("movimenti_impianto")
                .select("cer, descrizione_rifiuto, tipo_movimento, quantita_kg, data_movimento, impianto_id")
                .eq("tenant_id", MULTY_TENANT_ID);
            if (error)
                throw error;
            return data;
        },
    });
    // Saldi iniziali ufficiali (snapshot) — indispensabili per la giacenza reale
    const { data: baseline } = useQuery({
        queryKey: ["dev-giacenze-baseline", MULTY_TENANT_ID],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("magazzino_giacenze")
                .select("cer, descrizione_cer, saldo_iniziale_kg, saldo_snapshot_at")
                .eq("tenant_id", MULTY_TENANT_ID);
            if (error)
                throw error;
            return data;
        },
    });
    // Aggregazione contabile per CER: Saldo = Carico − Scarico sui movimenti del periodo,
    // esattamente come la stampa ufficiale "Registrazioni per C.E.R.".
    const rows = useMemo(() => {
        if (!movimenti)
            return [];
        const map = {};
        const descriptionsByCer = {};
        const isTechnicalDesc = (d) => /rettifica di allineamento|allineamento ufficiale|import registro|storno/i.test(d);
        for (const m of movimenti) {
            const d = m.descrizione_rifiuto?.trim();
            if (d && !isTechnicalDesc(d))
                descriptionsByCer[m.cer] = d;
        }
        for (const b of baseline ?? []) {
            const d = b.descrizione_cer?.trim();
            if (d && !isTechnicalDesc(d))
                descriptionsByCer[b.cer] = d;
        }
        // Se richiesto, mostra l'intero catalogo CER/EER (843 codici) con saldo 0 se senza movimenti
        if (showAllCer) {
            for (const b of baseline ?? []) {
                if (!b.cer)
                    continue;
                map[b.cer] = { cer: b.cer, descrizione: descriptionsByCer[b.cer] || "", carico: 0, scarico: 0, saldo: 0 };
            }
            for (const c of CER_CATALOG) {
                if (!map[c.codice]) {
                    map[c.codice] = {
                        cer: c.codice,
                        descrizione: descriptionsByCer[c.codice] || c.descrizione,
                        carico: 0,
                        scarico: 0,
                        saldo: 0,
                    };
                }
            }
        }
        for (const m of movimenti) {
            if (dataAl && m.data_movimento > dataAl)
                continue;
            if (dataDal && m.data_movimento < dataDal)
                continue;
            const key = m.cer;
            if (!map[key]) {
                map[key] = { cer: m.cer, descrizione: descriptionsByCer[key] || "", carico: 0, scarico: 0, saldo: 0 };
            }
            const q = Number(m.quantita_kg) || 0;
            if (m.tipo_movimento === "CARICO")
                map[key].carico += q;
            else
                map[key].scarico += q;
        }
        Object.values(map).forEach((r) => (r.saldo = r.carico - r.scarico));
        return Object.values(map)
            .filter((r) => showAllCer || r.carico !== 0 || r.scarico !== 0)
            .sort((a, b) => a.cer.localeCompare(b.cer));
    }, [movimenti, baseline, dataAl, dataDal, showAllCer]);
    const filtered = useMemo(() => rows.filter((r) => !searchCer || r.cer.toLowerCase().includes(searchCer.toLowerCase())), [rows, searchCer]);
    const totals = useMemo(() => filtered.reduce((acc, r) => ({
        carico: acc.carico + r.carico,
        scarico: acc.scarico + r.scarico,
        saldo: acc.saldo + r.saldo,
    }), { carico: 0, scarico: 0, saldo: 0 }), [filtered]);
    // Aggiornamento automatico: qualsiasi movimento o conferimento privato ricarica le giacenze
    useEffect(() => {
        const channel = supabase
            .channel("dev-giacenze-live")
            .on("postgres_changes", { event: "*", schema: "public", table: "movimenti_impianto" }, () => {
            queryClient.invalidateQueries({ queryKey: ["dev-movimenti-multy"] });
            queryClient.invalidateQueries({ queryKey: ["dev-giacenze-baseline"] });
        })
            .on("postgres_changes", { event: "*", schema: "public", table: "privati_conferimenti" }, () => {
            queryClient.invalidateQueries({ queryKey: ["dev-movimenti-multy"] });
            queryClient.invalidateQueries({ queryKey: ["dev-giacenze-baseline"] });
        })
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);
    // Sync giacenze: ricalcola magazzino_giacenze per TUTTI i CER presenti nei movimenti
    const recalculate = useMutation({
        mutationFn: async () => {
            const { data: stockRows, error: stockError } = await supabase
                .from("magazzino_giacenze")
                .select("impianto_id, cer")
                .eq("tenant_id", MULTY_TENANT_ID);
            if (stockError)
                throw stockError;
            const { data: movRows, error: movError } = await supabase
                .from("movimenti_impianto")
                .select("impianto_id, cer")
                .eq("tenant_id", MULTY_TENANT_ID);
            if (movError)
                throw movError;
            const pairs = new Map();
            for (const row of [...(stockRows ?? []), ...(movRows ?? [])]) {
                if (!row.impianto_id || !row.cer)
                    continue;
                pairs.set(`${row.impianto_id}|${row.cer}`, { impianto_id: row.impianto_id, cer: row.cer });
            }
            for (const { impianto_id, cer } of pairs.values()) {
                const { error } = await supabase.rpc("recalculate_magazzino_giacenza", {
                    p_tenant_id: MULTY_TENANT_ID,
                    p_impianto_id: impianto_id,
                    p_cer: cer,
                });
                if (error)
                    throw error;
            }
            logAgentActivity("Sync giacenze dai movimenti", "ok", `${pairs.size} codici CER`);
            return pairs.size;
        },
        onSuccess: (count) => {
            ["dev-giacenze", "dev-giacenze-baseline", "dev-movimenti-multy", "dev-mag-giacenze", "dev-mag-movimenti", "dev-registro-movimenti"].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
            toast.success(`Giacenze ricalcolate dai movimenti (${count} codici CER)`);
        },
        onError: (e) => toast.error("Errore: " + e.message),
    });
    // Costruisce intestazione testuale (riusata da PDF/Excel)
    const buildHeaderLines = () => {
        const oggi = new Date();
        const dal = dataDal ? fmtDate(new Date(dataDal)) : "";
        const al = fmtDate(new Date(dataAl));
        return [
            "STAMPA REGISTRAZIONI PER C.E.R.",
            `Stampa del ${fmtDate(oggi)}`,
            "",
            COMPANY.ragione,
            "",
            COMPANY.registroLabel,
            `Data: dal ${dal}   al ${al}        C.E.R.: * Tutti`,
            "Produttore: * Tutti                                            Trasportatore: * Tutti",
            "Destinatario: * Tutti                                          Intermediario: * Tutti",
            "Tipo Operaz.:                       Provenienza:",
        ];
    };
    // Nome file basato sul periodo richiesto (es. Registro_CER_dal_01-01-2025_al_31-12-2025)
    const buildFileName = () => {
        const slug = (d) => d.split("-").reverse().join("-"); // YYYY-MM-DD -> DD-MM-YYYY
        if (dataDal)
            return `Registro_CER_dal_${slug(dataDal)}_al_${slug(dataAl)}`;
        return `Registro_CER_al_${slug(dataAl)}`;
    };
    // PDF replica StRegRag
    const handleExportPdf = () => {
        if (!filtered.length)
            return toast.error("Nessun dato da esportare");
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const marginX = 10;
        const oggi = fmtDate(new Date());
        const al = fmtDate(new Date(dataAl));
        const dal = dataDal ? fmtDate(new Date(dataDal)) : "";
        const drawHeader = () => {
            let y = 12;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.text("STAMPA REGISTRAZIONI PER C.E.R.", pageW / 2, y, { align: "center" });
            y += 5;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.text(`Stampa del ${oggi}`, pageW / 2, y, { align: "center" });
            y += 6;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.text(COMPANY.ragione, marginX, y);
            y += 6;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.text(COMPANY.registroLabel, marginX, y);
            y += 4;
            doc.text(`Data: dal ${dal}   al ${al}`, marginX, y);
            doc.text("C.E.R.: * Tutti", pageW - marginX, y, { align: "right" });
            y += 4;
            doc.text("Produttore: * Tutti", marginX, y);
            doc.text("Trasportatore: * Tutti", pageW - marginX, y, { align: "right" });
            y += 4;
            doc.text("Destinatario: * Tutti", marginX, y);
            doc.text("Intermediario: * Tutti", pageW - marginX, y, { align: "right" });
            y += 4;
            doc.text("Tipo Operaz.:", marginX, y);
            doc.text("Provenienza:", marginX + 70, y);
            y += 3;
            doc.setDrawColor(120);
            doc.line(marginX, y, pageW - marginX, y);
            return y + 2;
        };
        const headerEndY = 50;
        const totalPagesExp = "{total_pages_count_string}";
        autoTable(doc, {
            startY: headerEndY,
            head: [
                [
                    { content: "C.E.R.", rowSpan: 2, styles: { valign: "bottom" } },
                    { content: "", rowSpan: 2 },
                    { content: "Quantità", colSpan: 3, styles: { halign: "center" } },
                ],
                ["Carico", "Scarico", "Saldo"],
            ],
            body: filtered.map((r) => [
                { content: r.cer, styles: { fontStyle: "bold" } },
                r.descrizione,
                { content: fmt(r.carico), styles: { halign: "right" } },
                { content: fmt(r.scarico), styles: { halign: "right" } },
                { content: fmt(r.saldo), styles: { halign: "right", fontStyle: "bold" } },
            ]),
            foot: [
                [
                    { content: "TOTALI GENERALI", colSpan: 2, styles: { fontStyle: "bold" } },
                    { content: fmt(totals.carico), styles: { halign: "right", fontStyle: "bold" } },
                    { content: fmt(totals.scarico), styles: { halign: "right", fontStyle: "bold" } },
                    { content: fmt(totals.saldo), styles: { halign: "right", fontStyle: "bold" } },
                ],
            ],
            styles: { font: "helvetica", fontSize: 7.3, cellPadding: 1.1, lineColor: [180, 180, 180], lineWidth: 0.1, overflow: "linebreak" },
            headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: "bold" },
            footStyles: { fillColor: [230, 230, 230], textColor: 0 },
            columnStyles: {
                0: { cellWidth: 34, overflow: "visible" },
                1: { cellWidth: "auto" },
                2: { cellWidth: 22 },
                3: { cellWidth: 22 },
                4: { cellWidth: 22 },
            },
            margin: { left: marginX, right: marginX, top: headerEndY, bottom: 14 },
            showHead: "everyPage",
            showFoot: "lastPage",
            willDrawPage: () => {
                drawHeader();
            },
            didDrawPage: () => {
                const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
                doc.setFontSize(7.5);
                doc.setTextColor(80);
                doc.text("Salvo diversa indicazione l'unità di misura di riferimento è il kg.", marginX, pageH - 8);
                doc.setTextColor(120);
                doc.text(`Pagina ${pageNumber} di ${totalPagesExp}`, pageW - marginX, pageH - 4, { align: "right" });
            },
        });
        if (typeof doc.putTotalPages === "function") {
            doc.putTotalPages(totalPagesExp);
        }
        doc.save(`${buildFileName()}.pdf`);
    };
    // Excel con intestazione identica
    const handleExportExcel = () => {
        if (!filtered.length)
            return toast.error("Nessun dato da esportare");
        const headerLines = buildHeaderLines();
        const aoa = headerLines.map((l) => [l]);
        aoa.push([]);
        aoa.push(["C.E.R.", "Descrizione", "Quantità Carico", "Quantità Scarico", "Quantità Saldo"]);
        filtered.forEach((r) => aoa.push([r.cer, r.descrizione, r.carico, r.scarico, r.saldo]));
        aoa.push([]);
        aoa.push(["TOTALI GENERALI", "", totals.carico, totals.scarico, totals.saldo]);
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws["!cols"] = [{ wch: 18 }, { wch: 60 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Registro CER");
        XLSX.writeFile(wb, `${buildFileName()}.xlsx`);
    };
    const positiveCers = filtered.filter((r) => r.saldo > 0).length;
    const totaleKg = totals.saldo;
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(Package, { className: "h-8 w-8 text-emerald-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Codici CER con saldo > 0" }), _jsx("p", { className: "text-2xl font-bold text-emerald-400", children: positiveCers })] })] }) }), _jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(ArrowDown, { className: "h-8 w-8 text-blue-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Saldo totale" }), _jsxs("p", { className: "text-2xl font-bold text-blue-400", children: [fmt(totaleKg), " kg"] })] })] }) }), _jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(ArrowUp, { className: "h-8 w-8 text-amber-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Movimenti totali (tenant)" }), _jsx("p", { className: "text-2xl font-bold text-amber-400", children: movimenti?.length ?? 0 })] })] }) })] }), _jsx(Card, { className: "bg-card/40 border-emerald-500/20", children: _jsxs(CardContent, { className: "p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Dal (opzionale)" }), _jsx(Input, { type: "date", value: dataDal, onChange: (e) => setDataDal(e.target.value), className: "bg-card/60" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Al (saldo storico)" }), _jsx(Input, { type: "date", value: dataAl, onChange: (e) => setDataAl(e.target.value), className: "bg-card/60" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Filtro CER" }), _jsx(Input, { placeholder: "es. 170405", value: searchCer, onChange: (e) => setSearchCer(e.target.value), className: "bg-card/60" })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("label", { className: "flex items-center gap-2 text-xs text-foreground cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: showAllCer, onChange: (e) => setShowAllCer(e.target.checked), className: "h-4 w-4 accent-emerald-500" }), "Mostra tutti i CER a magazzino (anche a zero)"] }), _jsxs("div", { className: "text-xs text-muted-foreground", children: ["Saldo = carichi \u2212 scarichi con data \u2264 ", fmtDate(new Date(dataAl)), ". Aggiornamento automatico ad ogni movimento."] })] })] }) }), _jsxs("div", { className: "flex gap-2 flex-wrap", children: [_jsxs(Button, { variant: "outline", onClick: () => recalculate.mutate(), disabled: recalculate.isPending, className: "gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10", children: [_jsx(RefreshCw, { className: "h-4 w-4" }), " Sync giacenze da movimenti"] }), _jsxs(Button, { variant: "outline", onClick: handleExportPdf, className: "gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10", children: [_jsx(FileText, { className: "h-4 w-4" }), " Stampa PDF"] }), _jsxs(Button, { variant: "outline", onClick: handleExportExcel, className: "gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10", children: [_jsx(FileSpreadsheet, { className: "h-4 w-4" }), " Excel"] }), _jsxs(Button, { variant: "outline", onClick: () => window.print(), className: "gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10", children: [_jsx(Printer, { className: "h-4 w-4" }), " Stampa pagina"] })] }), _jsxs(Card, { className: "bg-card/60 border-border/30", children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "text-emerald-400", children: ["\uD83D\uDCCB Stampa Registrazioni per C.E.R. \u2014 al ", fmtDate(new Date(dataAl))] }), _jsx("p", { className: "text-xs text-muted-foreground", children: COMPANY.ragione })] }), _jsx(CardContent, { children: isLoading ? (_jsx("p", { className: "text-muted-foreground text-sm", children: "Caricamento..." })) : !filtered.length ? (_jsx("p", { className: "text-muted-foreground text-sm", children: "Nessun movimento registrato per Multyproget. I dati demo sono stati ripuliti \u2014 inserisci movimenti reali tramite Carico/Scarico." })) : (_jsxs("div", { className: "overflow-x-auto", children: [_jsxs("table", { className: "w-full text-sm", children: [_jsxs("thead", { children: [_jsxs("tr", { className: "border-b-2 border-border/50 text-muted-foreground bg-card/40", children: [_jsx("th", { className: "text-left py-2 px-3", rowSpan: 2, children: "C.E.R." }), _jsx("th", { className: "text-left py-2 px-3", rowSpan: 2, children: "Descrizione" }), _jsx("th", { className: "text-center py-1 px-3", colSpan: 3, children: "Quantit\u00E0" })] }), _jsxs("tr", { className: "border-b border-border/30 text-muted-foreground bg-card/30", children: [_jsx("th", { className: "text-right py-1 px-3", children: "Carico" }), _jsx("th", { className: "text-right py-1 px-3", children: "Scarico" }), _jsx("th", { className: "text-right py-1 px-3", children: "Saldo" })] })] }), _jsxs("tbody", { children: [filtered.map((r) => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-white/5", children: [_jsx("td", { className: "py-1.5 px-3 font-mono font-bold text-emerald-300", children: r.cer }), _jsx("td", { className: "py-1.5 px-3 text-xs", children: r.descrizione || "—" }), _jsx("td", { className: "py-1.5 px-3 text-right", children: fmt(r.carico) }), _jsx("td", { className: "py-1.5 px-3 text-right", children: fmt(r.scarico) }), _jsx("td", { className: `py-1.5 px-3 text-right font-bold ${r.saldo > 0 ? "text-emerald-400" : r.saldo < 0 ? "text-red-400" : "text-muted-foreground"}`, children: fmt(r.saldo) })] }, r.cer))), _jsxs("tr", { className: "bg-emerald-500/10 border-t-2 border-emerald-500/40 font-bold", children: [_jsx("td", { colSpan: 2, className: "py-2 px-3", children: "TOTALI GENERALI" }), _jsx("td", { className: "py-2 px-3 text-right", children: fmt(totals.carico) }), _jsx("td", { className: "py-2 px-3 text-right", children: fmt(totals.scarico) }), _jsx("td", { className: "py-2 px-3 text-right text-emerald-300", children: fmt(totals.saldo) })] })] })] }), _jsx("p", { className: "text-xs text-muted-foreground mt-3 italic", children: "Salvo diversa indicazione l'unit\u00E0 di misura di riferimento \u00E8 il kg." })] })) })] })] }));
}
