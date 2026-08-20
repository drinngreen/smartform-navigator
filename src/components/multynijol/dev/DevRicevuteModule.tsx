import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";
import { toast } from "sonner";
import { FileSpreadsheet, FileText, Pencil, Printer, Receipt, Trash2 } from "lucide-react";

const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";

type RicevutaRow = {
  id: string;
  numero_ricevuta: string | null;
  anno: number | null;
  importo: number | null;
  note: string | null;
  data_emissione: string;
  privato_id: string | null;
  conferimento_id?: string | null;
  gruppo_id?: string | null;
  materiali?: { cer: string | null; kg_pesati: number | null; prezzo_kg?: number | null; importo_pagato?: number | null }[];
  conferimento?: {
    cer: string | null;
    kg_pesati: number | null;
    prezzo_kg?: number | null;
    importo_pagato?: number | null;
    data: string | null;
    targa_automezzo: string | null;
    modello_automezzo: string | null;
    metodo_pag: string | null;
    note: string | null;
    numero_progressivo: number | null;
    anno_dbt: number | null;
  } | null;
};


type RicevutaEnriched = RicevutaRow & {
  privato_display: string;
  privato_cf: string;
  privato_indirizzo: string;
};

type PrivatoLite = {
  id: string;
  nome: string;
  cognome: string;
  codice_fiscale: string;
  indirizzo: string | null;
  comune_residenza: string | null;
  cap: string | null;
  provincia: string | null;
};

const formatIndirizzoPrivato = (p?: PrivatoLite) => {
  if (!p) return "";
  const cittaParts = [p.cap, p.comune_residenza, p.provincia ? `(${p.provincia})` : ""].filter(Boolean).join(" ").trim();
  return [p.indirizzo, cittaParts].filter(Boolean).join(" - ");
};

export function DevRicevuteModule() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<RicevutaRow | null>(null);
  const [editForm, setEditForm] = useState({ importo: "", note: "", data_emissione: "" });

  const { data: privati = [] } = useQuery({
    queryKey: ["dev-privati-lite", MULTY_TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anagrafica_privati")
        .select("id, nome, cognome, codice_fiscale, indirizzo, comune_residenza, cap, provincia")
        .eq("tenant_id", MULTY_TENANT_ID)
        .eq("attivo", true);
      if (error) throw error;
      return (data ?? []) as PrivatoLite[];
    },
  });


  const privatiMap = useMemo(() => {
    const m = new Map<string, PrivatoLite>();
    for (const p of privati) m.set(p.id, p);
    return m;
  }, [privati]);

  const { data: ricevute = [], isLoading } = useQuery({
    queryKey: ["dev-ricevute-registro", MULTY_TENANT_ID],
    queryFn: async () => {
      const { data, error } = (await (supabase as any)
        .from("ricevute_privati")
        .select("id, numero_ricevuta, anno, importo, note, data_emissione, privato_id, conferimento_id, gruppo_id, conferimento:privati_conferimenti(cer, kg_pesati, prezzo_kg, importo_pagato, data, targa_automezzo, modello_automezzo, metodo_pag, note, numero_progressivo, anno_dbt)")
        .eq("tenant_id", MULTY_TENANT_ID)
        .order("data_emissione", { ascending: false })
        .limit(1000)) as { data: RicevutaRow[] | null; error: any };
      if (error) throw error;
      const rows = (data ?? []) as RicevutaRow[];

      // Conferimenti multi-materiale: raggruppa per gruppo_id
      const gruppi = Array.from(new Set(rows.map((r) => r.gruppo_id).filter(Boolean))) as string[];
      if (gruppi.length) {
        const { data: confs } = (await (supabase as any)
          .from("privati_conferimenti")
          .select("gruppo_id, cer, kg_pesati, prezzo_kg, importo_pagato")
          .in("gruppo_id", gruppi)) as { data: { gruppo_id: string; cer: string | null; kg_pesati: number | null; prezzo_kg: number | null; importo_pagato: number | null }[] | null };
        const byGruppo = new Map<string, { cer: string | null; kg_pesati: number | null; prezzo_kg: number | null; importo_pagato: number | null }[]>();
        for (const c of confs ?? []) {
          if (!byGruppo.has(c.gruppo_id)) byGruppo.set(c.gruppo_id, []);
          byGruppo.get(c.gruppo_id)!.push({ cer: c.cer, kg_pesati: c.kg_pesati, prezzo_kg: c.prezzo_kg, importo_pagato: c.importo_pagato });
        }
        for (const r of rows) if (r.gruppo_id) r.materiali = byGruppo.get(r.gruppo_id);
      }
      return rows;
    },
  });


  const filtered = useMemo(() => {
    if (!search) return ricevute;
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
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ricevute_privati" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ricevuta eliminata");
      qc.invalidateQueries({ queryKey: ["dev-ricevute-registro"] });
      qc.invalidateQueries({ queryKey: ["dev-ricevute"] });
    },
    onError: (e: any) => toast.error(e?.message ?? String(e)),
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; importo: number; note: string | null; data_emissione: string }) => {
      const { error } = await supabase
        .from("ricevute_privati" as any)
        .update({ importo: payload.importo, note: payload.note, data_emissione: payload.data_emissione })
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ricevuta aggiornata");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["dev-ricevute-registro"] });
      qc.invalidateQueries({ queryKey: ["dev-ricevute"] });
    },
    onError: (e: any) => toast.error(e?.message ?? String(e)),
  });

  const openEdit = (r: RicevutaRow) => {
    setEditing(r);
    setEditForm({
      importo: String(r.importo ?? 0),
      note: r.note ?? "",
      data_emissione: r.data_emissione ? String(r.data_emissione).slice(0, 10) : new Date().toISOString().slice(0, 10),
    });
  };

  const escHtml = (v: string) =>
    v
      .split("&").join("&amp;")
      .split("<").join("&lt;")
      .split(">").join("&gt;")
      .split("\"").join("&quot;")
      .split("'").join("&#039;");

  const safeFileBase = (r: RicevutaRow) => (r.numero_ricevuta ?? r.id).split("/").join("-");

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

  const printSingle = (r: RicevutaRow) => {
    const p = r.privato_id ? privatiMap.get(r.privato_id) : undefined;
    const w = window.open("", "_blank");
    if (!w) return;

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
  <div style="display:flex;justify-content:space-between;align-items:baseline;gap:24px;margin-bottom:18px;">
    <h1 style="margin:0;font-size:26px;font-weight:800;">${escHtml(title)}</h1>
    <div style="font-size:26px;font-weight:800;">${escHtml(new Date(r.data_emissione).toLocaleDateString("it-IT"))}</div>
  </div>
  <div class="box">
    <div class="row"><div class="label">Privato</div><div class="val">${escHtml(privato)}</div></div>
    <div class="row"><div class="label">Indirizzo</div><div class="val">${escHtml(formatIndirizzoPrivato(p) || "—")}</div></div>
    <div class="row"><div class="label">Codice fiscale</div><div class="val">${escHtml(cf)}</div></div>

    ${r.conferimento ? `
      ${r.conferimento.numero_progressivo != null ? `<div class="row"><div class="label">N° Registro DBT</div><div class="val">#${escHtml(String(r.conferimento.numero_progressivo))}/${escHtml(String(r.conferimento.anno_dbt ?? ""))}</div></div>` : ""}
      <div class="row"><div class="label">Data conferimento</div><div class="val">${escHtml(r.conferimento.data ? new Date(r.conferimento.data).toLocaleDateString("it-IT") : "—")}</div></div>
      ${(r.materiali && r.materiali.length > 1)
        ? `<div class="row"><div class="label">Materiali</div><div class="val">${r.materiali.map((m) => `${escHtml(m.cer ?? "—")} — ${escHtml(Number(m.kg_pesati ?? 0).toLocaleString("it-IT"))} kg`).join("<br/>")}</div></div>
           <div class="row"><div class="label">Peso totale</div><div class="val">${escHtml(r.materiali.reduce((s, m) => s + (Number(m.kg_pesati) || 0), 0).toLocaleString("it-IT"))} kg</div></div>`
        : `<div class="row"><div class="label">CER</div><div class="val">${escHtml(r.conferimento.cer ?? "—")}</div></div>
           <div class="row"><div class="label">Peso</div><div class="val">${escHtml(Number(r.conferimento.kg_pesati ?? 0).toLocaleString("it-IT"))} kg</div></div>`}
      ${r.conferimento.targa_automezzo ? `<div class="row"><div class="label">Targa automezzo</div><div class="val">${escHtml(r.conferimento.targa_automezzo)}${r.conferimento.modello_automezzo ? ` — ${escHtml(r.conferimento.modello_automezzo)}` : ""}</div></div>` : ""}
      ${r.conferimento.metodo_pag ? `<div class="row"><div class="label">Metodo pagamento</div><div class="val">${escHtml(r.conferimento.metodo_pag === "contanti" ? "Contanti" : "Metodi Tracciabili / Politici")}</div></div>` : ""}
    ` : ""}
    <div class="row"><div class="label">Importo</div><div class="val">&euro; ${escHtml(
      Number(r.importo ?? 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })
    )}</div></div>
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
      try { w.focus(); w.print(); } catch (_) { /* popup blocked */ }
    }, 300);
  };

  const exportCols = [
    { header: "Numero", key: "numero_ricevuta", width: 16 },
    {
      header: "Data",
      key: "data_emissione",
      width: 14,
      format: (v: any) => (v ? new Date(v).toLocaleDateString("it-IT") : "-"),
    },
    { header: "Privato", key: "privato_display", width: 22 },
    { header: "CF", key: "privato_cf", width: 18 },
    { header: "Indirizzo", key: "privato_indirizzo", width: 34 },
    {
      header: "Importo",
      key: "importo",
      width: 12,
      format: (v: any) => Number(v || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 }),
    },
    { header: "Note", key: "note", width: 30 },
  ];

  const enriched = useMemo((): RicevutaEnriched[] => {
    return filtered.map((r) => {
      const p = r.privato_id ? privatiMap.get(r.privato_id) : undefined;
      return {
        ...r,
        privato_display: p ? `${p.cognome} ${p.nome}` : "—",
        privato_cf: p?.codice_fiscale ?? "—",
        privato_indirizzo: formatIndirizzoPrivato(p) || "—",
      };
    });
  }, [filtered, privatiMap]);


  const aziendaHeaderLines = [
    AZIENDA.nome,
    AZIENDA.indirizzo,
    `ISTAT: ${AZIENDA.istat} | CF: ${AZIENDA.cf} | Cod.RS: ${AZIENDA.codRS}`,
  ];

  const exportSingleExcel = (row: RicevutaEnriched) => {
    exportToExcel([row] as any[], exportCols as any, `ricevuta-${safeFileBase(row)}`, "Ricevuta", aziendaHeaderLines);
  };

  const exportSinglePdf = (row: RicevutaEnriched) => {
    exportToPdf(
      [row] as any[],
      exportCols as any,
      `ricevuta-${safeFileBase(row)}`,
      `${AZIENDA.nome}\n${AZIENDA.indirizzo}\nISTAT: ${AZIENDA.istat} | CF: ${AZIENDA.cf} | Cod.RS: ${AZIENDA.codRS}\n\nRicevuta`
    );
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card/60 border-border/30">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Registro Ricevute ({filtered.length})
            </CardTitle>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!enriched.length) return toast.error("Nessuna ricevuta");
                  exportToExcel(enriched as any[], exportCols as any, "registro-ricevute", "Ricevute", aziendaHeaderLines);
                }}
                className="gap-1 h-7 text-xs"
              >
                <FileSpreadsheet className="h-3 w-3" /> Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!enriched.length) return toast.error("Nessuna ricevuta");
                  exportToPdf(enriched as any[], exportCols as any, "registro-ricevute", `${AZIENDA.nome}\n${AZIENDA.indirizzo}\nISTAT: ${AZIENDA.istat} | CF: ${AZIENDA.cf} | Cod.RS: ${AZIENDA.codRS}\n\nRegistro Ricevute`);
                }}
                className="gap-1 h-7 text-xs"
              >
                <Printer className="h-3 w-3" /> PDF
              </Button>
            </div>
          </div>

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per numero, nome, CF, note..."
            className="bg-background/60"
          />
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Caricamento...</div>
          ) : !filtered.length ? (
            <div className="text-sm text-muted-foreground">Nessuna ricevuta trovata</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-left">
                    <th className="px-3 py-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">Numero</th>
                    <th className="px-3 py-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">Data</th>
                    <th className="px-3 py-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">Privato</th>
                    <th className="px-3 py-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">Importo</th>
                    <th className="px-3 py-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const p = r.privato_id ? privatiMap.get(r.privato_id) : undefined;
                    const row: RicevutaEnriched = {
                      ...r,
                      privato_display: p ? `${p.cognome} ${p.nome}` : "—",
                      privato_cf: p?.codice_fiscale ?? "—",
                      privato_indirizzo: formatIndirizzoPrivato(p) || "—",
                    };


                    return (
                      <tr key={r.id} className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                        <td className="px-3 py-2 font-mono text-xs">{r.numero_ricevuta ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {new Date(r.data_emissione).toLocaleDateString("it-IT")}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{p ? `${p.cognome} ${p.nome}` : "—"}</div>
                          <div className="text-xs text-muted-foreground font-mono">{p?.codice_fiscale ?? ""}</div>
                          <div className="text-xs text-muted-foreground">{formatIndirizzoPrivato(p) || "—"}</div>
                        </td>

                        <td className="px-3 py-2 text-xs">€ {Number(r.importo ?? 0).toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 px-2 text-xs border-neon-cyan/70 text-neon-cyan bg-neon-cyan/10 hover:bg-neon-cyan/20"
                              onClick={() => printSingle(r)}
                              title="Stampa ricevuta"
                            >
                              <Printer className="h-4 w-4" color="hsl(var(--neon-cyan))" strokeWidth={2.6} />
                              <span>Stampa</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 px-2 text-xs border-neon-purple/70 text-neon-purple bg-neon-purple/10 hover:bg-neon-purple/20"
                              onClick={() => exportSinglePdf(row)}
                              title="Esporta PDF"
                            >
                              <FileText className="h-4 w-4" color="hsl(var(--neon-purple))" strokeWidth={2.4} />
                              <span>PDF</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 px-2 text-xs border-neon-green/70 text-neon-green bg-neon-green/10 hover:bg-neon-green/20"
                              onClick={() => exportSingleExcel(row)}
                              title="Esporta Excel"
                            >
                              <FileSpreadsheet className="h-4 w-4" color="hsl(var(--neon-green))" strokeWidth={2.4} />
                              <span>Excel</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 px-2 text-xs border-border text-foreground bg-card/40 hover:bg-muted/40"
                              onClick={() => openEdit(r)}
                              title="Modifica"
                            >
                              <Pencil className="h-4 w-4" strokeWidth={2.6} />
                              <span>Modifica</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 px-2 text-xs border-destructive/70 text-destructive bg-destructive/10 hover:bg-destructive/20"
                              onClick={() => {
                                if (!window.confirm("Eliminare questa ricevuta?")) return;
                                deleteMutation.mutate(r.id);
                              }}
                              title="Elimina"
                            >
                              <Trash2 className="h-4 w-4" color="hsl(var(--destructive))" strokeWidth={2.6} />
                              <span>Elimina</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Ricevuta</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Data emissione</div>
              <Input
                type="date"
                value={editForm.data_emissione}
                onChange={(e) => setEditForm((s) => ({ ...s, data_emissione: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Importo (€)</div>
              <Input
                value={editForm.importo}
                onChange={(e) => setEditForm((s) => ({ ...s, importo: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Note</div>
              <Textarea
                value={editForm.note}
                onChange={(e) => setEditForm((s) => ({ ...s, note: e.target.value }))}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Annulla
            </Button>
            <Button
              onClick={() => {
                if (!editing) return;
                const imp = Number(String(editForm.importo).replace(",", ".")) || 0;
                updateMutation.mutate({
                  id: editing.id,
                  importo: imp,
                  note: editForm.note?.trim() ? editForm.note.trim() : null,
                  data_emissione: editForm.data_emissione,
                });
              }}
            >
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
