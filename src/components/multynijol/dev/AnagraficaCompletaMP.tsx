import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  Search, Plus, Edit, Trash2, FileSpreadsheet, Printer, Upload, Building2,
} from "lucide-react";
import { toast } from "sonner";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";
import * as XLSX from "xlsx";

const MULTY_TENANT_ID = "77ec9a3d-a6d4-4235-8e68-1a6f345de57a";

interface AziendaMP {
  id: string;
  codice: string | null;
  ragione_sociale: string;
  indirizzo: string | null;
  citta: string | null;
  provincia: string | null;
  cap: string | null;
  codice_fiscale: string | null;
  p_sl: boolean;
  p_ul: boolean;
  trasportatore: boolean;
  destinatario: boolean;
  intermediario: boolean;
  fornitore: boolean;
  cliente: boolean;
  alias: string | null;
  cod_tipologia: string | null;
  tipologia: string | null;
  fax: string | null;
  email: string | null;
  nazione: string | null;
  partita_iva: string | null;
  telefono: string | null;
  zona_gruppo_cliente: string | null;
  stato: string | null;
  cellulare: string | null;
  cod_cliente: string | null;
  cliente_fatturazione: string | null;
  codice_destinatario: string | null;
  pec: string | null;
  latitudine: string | null;
  longitudine: string | null;
  codice_cat_eco: string | null;
  note: string | null;
  stato_amm: string | null;
  codice_cdc: string | null;
  urbano: boolean;
  attivo: boolean;
}

const emptyForm = (): Omit<AziendaMP, "id" | "attivo"> => ({
  codice: "", ragione_sociale: "", indirizzo: "", citta: "", provincia: "", cap: "",
  codice_fiscale: "", p_sl: false, p_ul: false, trasportatore: false, destinatario: false,
  intermediario: false, fornitore: false, cliente: false, alias: "", cod_tipologia: "1",
  tipologia: "Azienda Privata", fax: "", email: "", nazione: "IT", partita_iva: "",
  telefono: "", zona_gruppo_cliente: "", stato: "0", cellulare: "", cod_cliente: "",
  cliente_fatturazione: "", codice_destinatario: "", pec: "", latitudine: "", longitudine: "",
  codice_cat_eco: "", note: "", stato_amm: "", codice_cdc: "", urbano: false,
});

export function AnagraficaCompletaMP() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [importing, setImporting] = useState(false);

  const { data: aziende, isLoading, refetch } = useQuery({
    queryKey: ["anagrafica-aziende-mp", MULTY_TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anagrafica_aziende_mp" as any)
        .select("*")
        .eq("tenant_id", MULTY_TENANT_ID)
        .eq("attivo", true)
        .order("ragione_sociale");
      if (error) throw error;
      return data as unknown as AziendaMP[];
    },
  });

  const q = search.toLowerCase();
  const filtered = (aziende || []).filter(a =>
    !q || `${a.ragione_sociale} ${a.codice_fiscale || ""} ${a.partita_iva || ""} ${a.citta || ""} ${a.codice || ""}`.toLowerCase().includes(q)
  );

  const openNew = () => { setForm(emptyForm()); setEditId(null); setShowForm(true); };
  const openEdit = (a: AziendaMP) => {
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
    if (!form.ragione_sociale.trim()) { toast.error("Ragione sociale obbligatoria"); return; }
    const payload = { ...form, tenant_id: MULTY_TENANT_ID };
    if (editId) {
      const { error } = await supabase.from("anagrafica_aziende_mp" as any).update(payload as any).eq("id", editId);
      if (error) { toast.error(error.message); return; }
      toast.success("Anagrafica aggiornata");
    } else {
      const { error } = await supabase.from("anagrafica_aziende_mp" as any).insert(payload as any);
      if (error) { toast.error(error.message); return; }
      toast.success("Nuova azienda registrata");
    }
    setShowForm(false); setEditId(null); refetch();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Disattivare questa azienda?")) return;
    const { error } = await supabase.from("anagrafica_aziende_mp" as any).update({ attivo: false } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Azienda disattivata"); refetch();
  };

  const handleImportExcel = async () => {
    setImporting(true);
    try {
      const resp = await fetch("/data/anagrafica_completa_multi_proget_2.xlsx");
      const buf = await resp.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      const mapped = rows.map(r => ({
        tenant_id: MULTY_TENANT_ID,
        codice: String(r["Codice"] || "").trim(),
        ragione_sociale: String(r["Ragione"] || "").trim(),
        indirizzo: String(r["Indirizzo"] || "").trim(),
        citta: String(r["Città"] || "").trim(),
        provincia: String(r["Prov."] || "").trim(),
        cap: String(r["CAP"] || "").trim(),
        codice_fiscale: String(r["Codice Fiscale"] || "").trim(),
        p_sl: r["P. SL"] === true || r["P. SL"] === "TRUE",
        p_ul: r["P. UL"] === true || r["P. UL"] === "TRUE",
        trasportatore: r["Trasp."] === true || r["Trasp."] === "TRUE",
        destinatario: r["Dest."] === true || r["Dest."] === "TRUE",
        intermediario: r["Inter."] === true || r["Inter."] === "TRUE",
        fornitore: r["Forn."] === true || r["Forn."] === "TRUE",
        cliente: r["Cli."] === true || r["Cli."] === "TRUE",
        alias: String(r["Alias"] || "").trim(),
        cod_tipologia: String(r["Cod. Tipol."] || "1").trim(),
        tipologia: String(r["Tipologia"] || "Azienda Privata").trim(),
        fax: String(r["Fax"] || "").trim(),
        email: String(r["Email"] || "").trim(),
        nazione: String(r["Nazione"] || "IT").trim(),
        partita_iva: String(r["P. Iva"] || "").trim(),
        telefono: String(r["Telefono"] || "").trim(),
        zona_gruppo_cliente: String(r["Zona/Gruppo Cliente"] || "").trim(),
        stato: String(r["Stato"] || "0").trim(),
        cellulare: String(r["Cellulare"] || "").trim(),
        cod_cliente: String(r["Cod. Cliente"] || "").trim(),
        cliente_fatturazione: String(r["Cliente fatt."] || "").trim(),
        codice_destinatario: String(r["Codice Destinatario"] || "").trim(),
        pec: String(r["PEC"] || "").trim(),
        latitudine: String(r["Latitudine"] || "").trim(),
        longitudine: String(r["Longitudine"] || "").trim(),
        codice_cat_eco: String(r["Codice Cat. Eco."] || "").trim(),
        note: String(r["Note"] || "").trim(),
        stato_amm: String(r["Stato Amm."] || "").trim(),
        codice_cdc: String(r["Codice CDC"] || "").trim(),
        urbano: r["Urbano"] === true || r["Urbano"] === "TRUE",
      })).filter(r => r.ragione_sociale);

      // Insert in batches of 50
      let inserted = 0;
      for (let i = 0; i < mapped.length; i += 50) {
        const batch = mapped.slice(i, i + 50);
        const { error } = await supabase.from("anagrafica_aziende_mp" as any).insert(batch as any);
        if (error) { toast.error(`Errore batch ${i}: ${error.message}`); break; }
        inserted += batch.length;
      }
      toast.success(`Importati ${inserted} record`);
      refetch();
    } catch (err: any) {
      toast.error(`Errore importazione: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const roles = (a: AziendaMP) => {
    const r: string[] = [];
    if (a.p_sl) r.push("P.SL");
    if (a.p_ul) r.push("P.UL");
    if (a.trasportatore) r.push("Trasp.");
    if (a.destinatario) r.push("Dest.");
    if (a.intermediario) r.push("Inter.");
    if (a.fornitore) r.push("Forn.");
    if (a.cliente) r.push("Cli.");
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

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cerca ragione sociale, CF, P.IVA, città, codice..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-card/60 border-border/30" />
        </div>
        <Button onClick={openNew} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" /> Nuova Azienda
        </Button>
        <Button variant="outline" size="sm" onClick={handleImportExcel} disabled={importing}
          className="gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
          <Upload className="h-3 w-3" /> {importing ? "Importazione..." : "Importa Excel"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => {
          if (!filtered.length) return toast.error("Nessun dato");
          exportToExcel(filtered, exportCols, "anagrafica-aziende-mp", "Aziende MP");
        }} className="gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
          <FileSpreadsheet className="h-3 w-3" /> Excel
        </Button>
        <Button variant="outline" size="sm" onClick={() => {
          if (!filtered.length) return toast.error("Nessun dato");
          exportToPdf(filtered, exportCols, "anagrafica-aziende-mp", "Anagrafica Completa Multyproget");
        }} className="gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
          <Printer className="h-3 w-3" /> PDF
        </Button>
        <span className="text-sm text-muted-foreground">
          <Building2 className="h-4 w-4 inline mr-1" /> {filtered.length} aziende
        </span>
      </div>

      {/* Table */}
      <Card className="bg-card/60 border-border/30">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border/30 text-muted-foreground">
                  <th className="text-left p-3 text-xs uppercase">Codice</th>
                  <th className="text-left p-3 text-xs uppercase">Ragione Sociale</th>
                  <th className="text-left p-3 text-xs uppercase">Indirizzo</th>
                  <th className="text-left p-3 text-xs uppercase">Città</th>
                  <th className="text-left p-3 text-xs uppercase">Prov.</th>
                  <th className="text-left p-3 text-xs uppercase">CF / P.IVA</th>
                  <th className="text-left p-3 text-xs uppercase">Ruoli</th>
                  <th className="text-left p-3 text-xs uppercase">Email</th>
                  <th className="text-left p-3 text-xs uppercase">Telefono</th>
                  <th className="text-right p-3 text-xs uppercase">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">Caricamento...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">Nessuna azienda trovata</td></tr>
                ) : (
                  filtered.slice(0, 200).map(a => (
                    <tr key={a.id} className="border-b border-border/10 hover:bg-white/5">
                      <td className="p-3 font-mono text-xs text-muted-foreground">{a.codice || "—"}</td>
                      <td className="p-3 font-medium">{a.ragione_sociale}</td>
                      <td className="p-3 text-muted-foreground text-xs">{a.indirizzo || "—"}</td>
                      <td className="p-3 text-muted-foreground">{a.citta || "—"}</td>
                      <td className="p-3 text-muted-foreground">{a.provincia || "—"}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">
                        {a.codice_fiscale || a.partita_iva || "—"}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {roles(a).map(r => (
                            <span key={r} className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400">{r}</span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">{a.email || "—"}</td>
                      <td className="p-3 text-muted-foreground text-xs">{a.telefono || a.cellulare || "—"}</td>
                      <td className="p-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(a)} className="text-emerald-400 h-7 w-7 p-0">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)} className="text-red-400 h-7 w-7 p-0">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                {filtered.length > 200 && (
                  <tr><td colSpan={10} className="p-3 text-center text-muted-foreground text-xs">
                    ... e altri {filtered.length - 200} risultati
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* New/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={o => { if (!o) { setShowForm(false); setEditId(null); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Modifica Azienda" : "Nuova Azienda"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Codice</Label><Input value={form.codice || ""} onChange={e => setForm(f => ({ ...f, codice: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Ragione Sociale *</Label><Input value={form.ragione_sociale} onChange={e => setForm(f => ({ ...f, ragione_sociale: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Indirizzo</Label><Input value={form.indirizzo || ""} onChange={e => setForm(f => ({ ...f, indirizzo: e.target.value }))} /></div>
            <div><Label>Città</Label><Input value={form.citta || ""} onChange={e => setForm(f => ({ ...f, citta: e.target.value }))} /></div>
            <div><Label>Provincia</Label><Input value={form.provincia || ""} onChange={e => setForm(f => ({ ...f, provincia: e.target.value }))} /></div>
            <div><Label>CAP</Label><Input value={form.cap || ""} onChange={e => setForm(f => ({ ...f, cap: e.target.value }))} /></div>
            <div><Label>Nazione</Label><Input value={form.nazione || ""} onChange={e => setForm(f => ({ ...f, nazione: e.target.value }))} /></div>
            <div><Label>Codice Fiscale</Label><Input value={form.codice_fiscale || ""} onChange={e => setForm(f => ({ ...f, codice_fiscale: e.target.value.toUpperCase() }))} className="font-mono" /></div>
            <div><Label>P. IVA</Label><Input value={form.partita_iva || ""} onChange={e => setForm(f => ({ ...f, partita_iva: e.target.value }))} className="font-mono" /></div>
            <div><Label>Alias</Label><Input value={form.alias || ""} onChange={e => setForm(f => ({ ...f, alias: e.target.value }))} /></div>

            {/* Ruoli checkboxes */}
            <div className="col-span-3 border border-border/30 rounded-lg p-3">
              <Label className="mb-2 block">Ruoli</Label>
              <div className="flex flex-wrap gap-4">
                {([
                  ["p_sl", "P. Sede Legale"],
                  ["p_ul", "P. Unità Locale"],
                  ["trasportatore", "Trasportatore"],
                  ["destinatario", "Destinatario"],
                  ["intermediario", "Intermediario"],
                  ["fornitore", "Fornitore"],
                  ["cliente", "Cliente"],
                  ["urbano", "Urbano"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} className="rounded border-border" />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div><Label>Tipologia</Label><Input value={form.tipologia || ""} onChange={e => setForm(f => ({ ...f, tipologia: e.target.value }))} /></div>
            <div><Label>Cod. Tipologia</Label><Input value={form.cod_tipologia || ""} onChange={e => setForm(f => ({ ...f, cod_tipologia: e.target.value }))} /></div>
            <div><Label>Telefono</Label><Input value={form.telefono || ""} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} /></div>
            <div><Label>Cellulare</Label><Input value={form.cellulare || ""} onChange={e => setForm(f => ({ ...f, cellulare: e.target.value }))} /></div>
            <div><Label>Fax</Label><Input value={form.fax || ""} onChange={e => setForm(f => ({ ...f, fax: e.target.value }))} /></div>
            <div><Label>Email</Label><Input value={form.email || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>PEC</Label><Input value={form.pec || ""} onChange={e => setForm(f => ({ ...f, pec: e.target.value }))} /></div>
            <div><Label>Zona/Gruppo Cliente</Label><Input value={form.zona_gruppo_cliente || ""} onChange={e => setForm(f => ({ ...f, zona_gruppo_cliente: e.target.value }))} /></div>
            <div><Label>Stato</Label><Input value={form.stato || ""} onChange={e => setForm(f => ({ ...f, stato: e.target.value }))} /></div>
            <div><Label>Cod. Cliente</Label><Input value={form.cod_cliente || ""} onChange={e => setForm(f => ({ ...f, cod_cliente: e.target.value }))} /></div>
            <div><Label>Cliente Fatturazione</Label><Input value={form.cliente_fatturazione || ""} onChange={e => setForm(f => ({ ...f, cliente_fatturazione: e.target.value }))} /></div>
            <div><Label>Codice Destinatario</Label><Input value={form.codice_destinatario || ""} onChange={e => setForm(f => ({ ...f, codice_destinatario: e.target.value }))} /></div>
            <div><Label>Latitudine</Label><Input value={form.latitudine || ""} onChange={e => setForm(f => ({ ...f, latitudine: e.target.value }))} /></div>
            <div><Label>Longitudine</Label><Input value={form.longitudine || ""} onChange={e => setForm(f => ({ ...f, longitudine: e.target.value }))} /></div>
            <div><Label>Codice Cat. Eco.</Label><Input value={form.codice_cat_eco || ""} onChange={e => setForm(f => ({ ...f, codice_cat_eco: e.target.value }))} /></div>
            <div><Label>Stato Amm.</Label><Input value={form.stato_amm || ""} onChange={e => setForm(f => ({ ...f, stato_amm: e.target.value }))} /></div>
            <div><Label>Codice CDC</Label><Input value={form.codice_cdc || ""} onChange={e => setForm(f => ({ ...f, codice_cdc: e.target.value }))} /></div>
            <div className="col-span-3"><Label>Note</Label><Textarea value={form.note || ""} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>Annulla</Button>
            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
              {editId ? "Aggiorna" : "Registra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
