import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";
import { toast } from "sonner";
import { FileSpreadsheet, FileText, Pencil, Printer, Receipt, Trash2 } from "lucide-react";
const MULTY_TENANT_ID = "dc2a6046-d9a8-4549-8e45-82367d695ac6";
export function DevRicevuteModule() {
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const [editing, setEditing] = useState(null);
    const [editForm, setEditForm] = useState({ importo: "", note: "" });
    const { data: privati = [] } = useQuery({
        queryKey: ["dev-privati-lite", MULTY_TENANT_ID],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("anagrafica_privati")
                .select("id, nome, cognome, codice_fiscale")
                .eq("tenant_id", MULTY_TENANT_ID)
                .eq("attivo", true);
            if (error)
                throw error;
            return (data ?? []);
        },
    });
    const privatiMap = useMemo(() => {
        const m = new Map();
        for (const p of privati)
            m.set(p.id, p);
        return m;
    }, [privati]);
    const { data: ricevute = [], isLoading } = useQuery({
        queryKey: ["dev-ricevute-registro", MULTY_TENANT_ID],
        queryFn: async () => {
            const { data, error } = (await supabase
                .from("ricevute_privati")
                .select("id, numero_ricevuta, anno, importo, note, created_at, privato_id")
                .eq("tenant_id", MULTY_TENANT_ID)
                .order("created_at", { ascending: false })
                .limit(1000));
            if (error)
                throw error;
            return (data ?? []);
        },
    });
    const filtered = useMemo(() => {
        if (!search)
            return ricevute;
        const s = search.toLowerCase();
        return ricevute.filter((r) => {
            const p = r.privato_id ? privatiMap.get(r.privato_id) : undefined;
            const hay = [
                r.numero_ricevuta ?? "",
                r.note ?? "",
                p ? `${p.cognome} ${p.nome}` : "",
                p?.codice_fiscale ?? "",
            ]
                .join(" ")
                .toLowerCase();
            return hay.includes(s);
        });
    }, [ricevute, search, privatiMap]);
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase
                .from("ricevute_privati")
                .delete()
                .eq("id", id);
            if (error)
                throw error;
        },
        onSuccess: () => {
            toast.success("Ricevuta eliminata");
            qc.invalidateQueries({ queryKey: ["dev-ricevute-registro"] });
            qc.invalidateQueries({ queryKey: ["dev-ricevute"] });
        },
        onError: (e) => toast.error(e?.message ?? String(e)),
    });
    const updateMutation = useMutation({
        mutationFn: async (payload) => {
            const { error } = await supabase
                .from("ricevute_privati")
                .update({ importo: payload.importo, note: payload.note })
                .eq("id", payload.id);
            if (error)
                throw error;
        },
        onSuccess: () => {
            toast.success("Ricevuta aggiornata");
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["dev-ricevute-registro"] });
            qc.invalidateQueries({ queryKey: ["dev-ricevute"] });
        },
        onError: (e) => toast.error(e?.message ?? String(e)),
    });
    const openEdit = (r) => {
        setEditing(r);
        setEditForm({
            importo: String(r.importo ?? 0),
            note: r.note ?? "",
        });
    };
    const escHtml = (v) => v
        .split("&").join("&amp;")
        .split("<").join("&lt;")
        .split(">").join("&gt;")
        .split("\"").join("&quot;")
        .split("'").join("&#039;");
    const safeFileBase = (r) => (r.numero_ricevuta ?? r.id).split("/").join("-");
    const AZIENDA = {
        nome: "MULTYPROGET S.R.L.",
        indirizzo: "Via Rivarossa 18/20 - 10060 Piscina (TO)",
        istat: "001195",
        cf: "12347770013",
        codRS: "205.213",
    };
    const aziendaHtml = `
    <div style="margin-bottom:24px;border-bottom:2px solid #111;padding-bottom:14px;">
      <div style="font-size:22px;font-weight:800;letter-spacing:1px;">${AZIENDA.nome}</div>
      <div style="font-size:12px;color:#333;margin-top:4px;">${AZIENDA.indirizzo}</div>
      <div style="font-size:11px;color:#555;margin-top:2px;">
        ISTAT: ${AZIENDA.istat} &nbsp;|&nbsp; CF: ${AZIENDA.cf} &nbsp;|&nbsp; Cod.RS: ${AZIENDA.codRS}
      </div>
    </div>
  `;
    const printSingle = (r) => {
        const p = r.privato_id ? privatiMap.get(r.privato_id) : undefined;
        const w = window.open("", "_blank");
        if (!w)
            return;
        const title = `Ricevuta ${r.numero_ricevuta ?? ""}`;
        const privato = p ? `${p.cognome} ${p.nome}` : "—";
        const cf = p?.codice_fiscale ?? "—";
        const noteHtml = escHtml(r.note ?? "").split("\n").join("<br />");
        const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="color-scheme" content="only light" />
  <title>${escHtml(title)}</title>
  <style>
    html, body { background: #fff !important; color: #111 !important; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; padding: 32px; }
    h1 { margin: 0 0 6px; font-size: 26px; }
    .meta { color: #444; font-size: 12px; margin-bottom: 18px; }
    .box { border: 1px solid #222; padding: 16px; border-radius: 10px; }
    .row { display: flex; gap: 16px; margin: 10px 0; }
    .label { width: 140px; color: #555; font-size: 12px; }
    .val { flex: 1; font-weight: 700; font-size: 14px; }
    .note-section { margin-top: 14px; white-space: pre-wrap; }
    @media print {
      html, body { background: #fff !important; color: #111 !important; }
      input, button, select, textarea, [type="color"] { display: none !important; }
    }
  </style>
</head>
<body>
  ${aziendaHtml}
  <h1>${escHtml(title)}</h1>
  <div class="meta">Data: ${escHtml(new Date(r.created_at).toLocaleString("it-IT"))}</div>
  <div class="box">
    <div class="row"><div class="label">Privato</div><div class="val">${escHtml(privato)}</div></div>
    <div class="row"><div class="label">Codice fiscale</div><div class="val">${escHtml(cf)}</div></div>
    <div class="row"><div class="label">Importo</div><div class="val">&euro; ${escHtml(Number(r.importo ?? 0).toLocaleString("it-IT", { minimumFractionDigits: 2 }))}</div></div>
    <div class="row"><div class="label">Anno</div><div class="val">${escHtml(String(r.anno ?? "—"))}</div></div>
    <div class="note-section"><div class="label">Note</div><div>${noteHtml || "—"}</div></div>
  </div>
</body>
</html>`;
        w.document.open();
        w.document.write(html);
        w.document.close();
        // Aspetta il rendering, poi stampa
        setTimeout(() => {
            try {
                w.focus();
                w.print();
            }
            catch (_) { /* popup blocked */ }
        }, 300);
    };
    const exportCols = [
        { header: "Numero", key: "numero_ricevuta", width: 16 },
        {
            header: "Data",
            key: "created_at",
            width: 14,
            format: (v) => (v ? new Date(v).toLocaleDateString("it-IT") : "-"),
        },
        { header: "Privato", key: "privato_display", width: 22 },
        { header: "CF", key: "privato_cf", width: 18 },
        {
            header: "Importo",
            key: "importo",
            width: 12,
            format: (v) => Number(v || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 }),
        },
        { header: "Note", key: "note", width: 30 },
    ];
    const enriched = useMemo(() => {
        return filtered.map((r) => {
            const p = r.privato_id ? privatiMap.get(r.privato_id) : undefined;
            return {
                ...r,
                privato_display: p ? `${p.cognome} ${p.nome}` : "—",
                privato_cf: p?.codice_fiscale ?? "—",
            };
        });
    }, [filtered, privatiMap]);
    const aziendaHeaderLines = [
        AZIENDA.nome,
        AZIENDA.indirizzo,
        `ISTAT: ${AZIENDA.istat} | CF: ${AZIENDA.cf} | Cod.RS: ${AZIENDA.codRS}`,
    ];
    const exportSingleExcel = (row) => {
        exportToExcel([row], exportCols, `ricevuta-${safeFileBase(row)}`, "Ricevuta", aziendaHeaderLines);
    };
    const exportSinglePdf = (row) => {
        exportToPdf([row], exportCols, `ricevuta-${safeFileBase(row)}`, `${AZIENDA.nome}\n${AZIENDA.indirizzo}\nISTAT: ${AZIENDA.istat} | CF: ${AZIENDA.cf} | Cod.RS: ${AZIENDA.codRS}\n\nRicevuta`);
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs(Card, { className: "bg-card/60 border-border/30", children: [_jsxs(CardHeader, { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs(CardTitle, { className: "text-sm flex items-center gap-2", children: [_jsx(Receipt, { className: "h-4 w-4" }), " Registro Ricevute (", filtered.length, ")"] }), _jsxs("div", { className: "flex gap-1", children: [_jsxs(Button, { variant: "outline", size: "sm", onClick: () => {
                                                    if (!enriched.length)
                                                        return toast.error("Nessuna ricevuta");
                                                    exportToExcel(enriched, exportCols, "registro-ricevute", "Ricevute", aziendaHeaderLines);
                                                }, className: "gap-1 h-7 text-xs", children: [_jsx(FileSpreadsheet, { className: "h-3 w-3" }), " Excel"] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => {
                                                    if (!enriched.length)
                                                        return toast.error("Nessuna ricevuta");
                                                    exportToPdf(enriched, exportCols, "registro-ricevute", `${AZIENDA.nome}\n${AZIENDA.indirizzo}\nISTAT: ${AZIENDA.istat} | CF: ${AZIENDA.cf} | Cod.RS: ${AZIENDA.codRS}\n\nRegistro Ricevute`);
                                                }, className: "gap-1 h-7 text-xs", children: [_jsx(Printer, { className: "h-3 w-3" }), " PDF"] })] })] }), _jsx(Input, { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Cerca per numero, nome, CF, note...", className: "bg-background/60" })] }), _jsx(CardContent, { children: isLoading ? (_jsx("div", { className: "text-sm text-muted-foreground", children: "Caricamento..." })) : !filtered.length ? (_jsx("div", { className: "text-sm text-muted-foreground", children: "Nessuna ricevuta trovata" })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30 text-left", children: [_jsx("th", { className: "px-3 py-2 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Numero" }), _jsx("th", { className: "px-3 py-2 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Data" }), _jsx("th", { className: "px-3 py-2 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Privato" }), _jsx("th", { className: "px-3 py-2 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Importo" }), _jsx("th", { className: "px-3 py-2 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Azioni" })] }) }), _jsx("tbody", { children: filtered.map((r) => {
                                            const p = r.privato_id ? privatiMap.get(r.privato_id) : undefined;
                                            const row = {
                                                ...r,
                                                privato_display: p ? `${p.cognome} ${p.nome}` : "—",
                                                privato_cf: p?.codice_fiscale ?? "—",
                                            };
                                            return (_jsxs("tr", { className: "border-b border-border/10 hover:bg-muted/10 transition-colors", children: [_jsx("td", { className: "px-3 py-2 font-mono text-xs", children: r.numero_ricevuta ?? "—" }), _jsx("td", { className: "px-3 py-2 text-xs text-muted-foreground", children: new Date(r.created_at).toLocaleDateString("it-IT") }), _jsxs("td", { className: "px-3 py-2", children: [_jsx("div", { className: "font-medium", children: p ? `${p.cognome} ${p.nome}` : "—" }), _jsx("div", { className: "text-xs text-muted-foreground font-mono", children: p?.codice_fiscale ?? "" })] }), _jsxs("td", { className: "px-3 py-2 text-xs", children: ["\u20AC ", Number(r.importo ?? 0).toFixed(2)] }), _jsx("td", { className: "px-3 py-2", children: _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs(Button, { variant: "outline", size: "sm", className: "h-9 px-2 text-xs border-neon-cyan/70 text-neon-cyan bg-neon-cyan/10 hover:bg-neon-cyan/20", onClick: () => printSingle(r), title: "Stampa ricevuta", children: [_jsx(Printer, { className: "h-4 w-4", color: "hsl(var(--neon-cyan))", strokeWidth: 2.6 }), _jsx("span", { children: "Stampa" })] }), _jsxs(Button, { variant: "outline", size: "sm", className: "h-9 px-2 text-xs border-neon-purple/70 text-neon-purple bg-neon-purple/10 hover:bg-neon-purple/20", onClick: () => exportSinglePdf(row), title: "Esporta PDF", children: [_jsx(FileText, { className: "h-4 w-4", color: "hsl(var(--neon-purple))", strokeWidth: 2.4 }), _jsx("span", { children: "PDF" })] }), _jsxs(Button, { variant: "outline", size: "sm", className: "h-9 px-2 text-xs border-neon-green/70 text-neon-green bg-neon-green/10 hover:bg-neon-green/20", onClick: () => exportSingleExcel(row), title: "Esporta Excel", children: [_jsx(FileSpreadsheet, { className: "h-4 w-4", color: "hsl(var(--neon-green))", strokeWidth: 2.4 }), _jsx("span", { children: "Excel" })] }), _jsxs(Button, { variant: "outline", size: "sm", className: "h-9 px-2 text-xs border-border text-foreground bg-card/40 hover:bg-muted/40", onClick: () => openEdit(r), title: "Modifica", children: [_jsx(Pencil, { className: "h-4 w-4", strokeWidth: 2.6 }), _jsx("span", { children: "Modifica" })] }), _jsxs(Button, { variant: "outline", size: "sm", className: "h-9 px-2 text-xs border-destructive/70 text-destructive bg-destructive/10 hover:bg-destructive/20", onClick: () => {
                                                                        if (!window.confirm("Eliminare questa ricevuta?"))
                                                                            return;
                                                                        deleteMutation.mutate(r.id);
                                                                    }, title: "Elimina", children: [_jsx(Trash2, { className: "h-4 w-4", color: "hsl(var(--destructive))", strokeWidth: 2.6 }), _jsx("span", { children: "Elimina" })] })] }) })] }, r.id));
                                        }) })] }) })) })] }), _jsx(Dialog, { open: !!editing, onOpenChange: (o) => !o && setEditing(null), children: _jsxs(DialogContent, { children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Modifica Ricevuta" }) }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("div", { className: "text-xs text-muted-foreground", children: "Importo (\u20AC)" }), _jsx(Input, { value: editForm.importo, onChange: (e) => setEditForm((s) => ({ ...s, importo: e.target.value })) })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("div", { className: "text-xs text-muted-foreground", children: "Note" }), _jsx(Textarea, { value: editForm.note, onChange: (e) => setEditForm((s) => ({ ...s, note: e.target.value })), rows: 4 })] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setEditing(null), children: "Annulla" }), _jsx(Button, { onClick: () => {
                                        if (!editing)
                                            return;
                                        const imp = Number(String(editForm.importo).replace(",", ".")) || 0;
                                        updateMutation.mutate({
                                            id: editing.id,
                                            importo: imp,
                                            note: editForm.note?.trim() ? editForm.note.trim() : null,
                                        });
                                    }, children: "Salva" })] })] }) })] }));
}
