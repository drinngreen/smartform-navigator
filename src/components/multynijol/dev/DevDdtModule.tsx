import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { FileText, Plus, Trash2, Printer, Loader2, X, Truck } from "lucide-react";

const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";

const CAUSALI = [
  "Conto proprio",
  "Vendita",
  "Reso",
  "Trasferimento cassone vuoto",
  "Trasferimento cassone pieno",
  "Riparazione",
  "Manutenzione",
  "Comodato d'uso",
  "Altro",
];

interface Ddt {
  id: string;
  tenant_id: string;
  numero_ddt: string;
  anno: number;
  data: string;
  cliente_destinatario: string;
  indirizzo_destinazione: string | null;
  descrizione_bene: string;
  quantita: string | null;
  targa_mezzo: string | null;
  conducente: string | null;
  causale_trasporto: string;
  note: string | null;
}

export function DevDdtModule({ tenantId = MULTY_TENANT_ID, tenantLabel = "Multyproget" }: { tenantId?: string; tenantLabel?: string }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [printing, setPrinting] = useState<Ddt | null>(null);
  const [form, setForm] = useState<Partial<Ddt>>({
    data: new Date().toISOString().slice(0, 10),
    causale_trasporto: "Conto proprio",
  });

  const { data: ddts, isLoading } = useQuery({
    queryKey: ["ddt", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("ddt_forms" as any).select("*").eq("tenant_id", tenantId).order("data", { ascending: false });
      if (error) throw error;
      return (data || []) as Ddt[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["ddt", tenantId] });

  const create = useMutation({
    mutationFn: async (p: Partial<Ddt>) => {
      if (!p.cliente_destinatario || !p.descrizione_bene) throw new Error("Cliente e descrizione bene sono obbligatori");
      const anno = new Date(p.data || new Date()).getFullYear();
      const { data: numData, error: numErr } = await supabase.rpc("next_ddt_number", { p_tenant_id: tenantId, p_anno: anno });
      if (numErr) throw numErr;
      const payload = { ...p, tenant_id: tenantId, anno, numero_ddt: numData as string };
      const { data, error } = await supabase.from("ddt_forms" as any).insert(payload).select().single();
      if (error) throw error;
      return data as Ddt;
    },
    onSuccess: (d) => {
      toast.success(`DDT ${d.numero_ddt} creato`);
      setShowForm(false);
      setForm({ data: new Date().toISOString().slice(0, 10), causale_trasporto: "Conto proprio" });
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ddt_forms" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("DDT eliminato"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/30 bg-card/60 p-4 flex flex-wrap items-center gap-3">
        <FileText className="h-6 w-6 text-blue-400" />
        <div className="flex-1 min-w-[200px]">
          <h2 className="text-lg font-semibold">Documenti di Trasporto (DDT)</h2>
          <p className="text-xs text-muted-foreground">Emissione occasionale per movimentazioni interne, spostamento cassoni, comodati.</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm">
          <Plus className="h-4 w-4" /> Nuovo DDT
        </button>
      </div>

      <div className="rounded-2xl border border-border/30 bg-card/60 overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Caricamento...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-background/60">
                <tr className="border-b border-border/30 text-muted-foreground text-xs uppercase">
                  <th className="text-left p-3">N° DDT</th>
                  <th className="text-left p-3">Data</th>
                  <th className="text-left p-3">Destinatario</th>
                  <th className="text-left p-3">Bene</th>
                  <th className="text-left p-3">Causale</th>
                  <th className="text-left p-3">Mezzo</th>
                  <th className="text-right p-3">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {(ddts || []).map(d => (
                  <tr key={d.id} className="border-b border-border/10 hover:bg-white/5">
                    <td className="p-3 font-mono font-semibold">{d.numero_ddt}</td>
                    <td className="p-3">{new Date(d.data).toLocaleDateString("it-IT")}</td>
                    <td className="p-3">{d.cliente_destinatario}</td>
                    <td className="p-3 text-muted-foreground truncate max-w-[220px]">{d.descrizione_bene}</td>
                    <td className="p-3 text-xs">{d.causale_trasporto}</td>
                    <td className="p-3 font-mono text-xs">{d.targa_mezzo || "—"}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setPrinting(d)} className="p-1.5 rounded hover:bg-blue-500/20 text-blue-400" title="Stampa PDF">
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => confirm(`Eliminare DDT ${d.numero_ddt}?`) && del.mutate(d.id)}
                          className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive" title="Elimina">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!ddts?.length && (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">Nessun DDT emesso</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border/40 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <h3 className="text-lg font-semibold flex items-center gap-2"><Truck className="h-5 w-5" /> Nuovo DDT</h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-muted/30"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto">
              <FormField label="Data DDT *">
                <input type="date" value={form.data || ""} onChange={e => setForm({ ...form, data: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background/60 border border-border/30 text-sm" />
              </FormField>
              <FormField label="Cliente / Destinatario *">
                <input value={form.cliente_destinatario || ""} onChange={e => setForm({ ...form, cliente_destinatario: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background/60 border border-border/30 text-sm" placeholder="Ragione sociale destinatario" />
              </FormField>
              <FormField label="Indirizzo di destinazione">
                <input value={form.indirizzo_destinazione || ""} onChange={e => setForm({ ...form, indirizzo_destinazione: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background/60 border border-border/30 text-sm" placeholder="Via, città, CAP" />
              </FormField>
              <FormField label="Descrizione bene trasportato *">
                <textarea value={form.descrizione_bene || ""} onChange={e => setForm({ ...form, descrizione_bene: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background/60 border border-border/30 text-sm min-h-[70px]"
                  placeholder="Es. Cassone scarrabile 20mc vuoto" />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Quantità">
                  <input value={form.quantita || ""} onChange={e => setForm({ ...form, quantita: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background/60 border border-border/30 text-sm" placeholder="Es. 1 pezzo" />
                </FormField>
                <FormField label="Causale trasporto *">
                  <select value={form.causale_trasporto || "Conto proprio"} onChange={e => setForm({ ...form, causale_trasporto: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background/60 border border-border/30 text-sm">
                    {CAUSALI.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </FormField>
                <FormField label="Targa mezzo">
                  <input value={form.targa_mezzo || ""} onChange={e => setForm({ ...form, targa_mezzo: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg bg-background/60 border border-border/30 text-sm font-mono" />
                </FormField>
                <FormField label="Conducente">
                  <input value={form.conducente || ""} onChange={e => setForm({ ...form, conducente: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background/60 border border-border/30 text-sm" />
                </FormField>
              </div>
              <FormField label="Note">
                <textarea value={form.note || ""} onChange={e => setForm({ ...form, note: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background/60 border border-border/30 text-sm min-h-[60px]" />
              </FormField>
            </div>
            <div className="p-4 border-t border-border/30 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm hover:bg-muted/30">Annulla</button>
              <button onClick={() => create.mutate(form)} disabled={create.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50">
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Emetti DDT
              </button>
            </div>
          </div>
        </div>
      )}

      {printing && <DdtPrintDialog ddt={printing} tenantLabel={tenantLabel} onClose={() => setPrinting(null)} />}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

function DdtPrintDialog({ ddt, tenantLabel, onClose }: { ddt: Ddt; tenantLabel: string; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);

  const doPrint = () => {
    const html = printRef.current?.innerHTML;
    if (!html) return;
    const w = window.open("", "_blank", "width=900,height=1200");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>DDT ${ddt.numero_ddt}</title>
<style>
body{font-family:Arial,sans-serif;color:#000;margin:0;padding:20mm;font-size:11pt;}
h1{font-size:16pt;margin:0 0 4px 0;}
h2{font-size:12pt;margin:8px 0;border-bottom:1px solid #000;padding-bottom:2px;}
table{width:100%;border-collapse:collapse;margin:6px 0;}
td,th{border:1px solid #000;padding:6px;text-align:left;vertical-align:top;font-size:10pt;}
th{background:#f0f0f0;}
.header{display:flex;justify-content:space-between;align-items:start;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:10px;}
.big{font-size:14pt;font-weight:bold;}
.firma{border:1px solid #000;height:60px;padding:4px;font-size:9pt;color:#666;}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
@media print{@page{size:A4;margin:15mm;} body{padding:0;}}
</style></head><body>${html}<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),400);}</script></body></html>`);
    w.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white text-black rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-3 border-b bg-gray-100">
          <h3 className="text-sm font-semibold">Anteprima DDT {ddt.numero_ddt}</h3>
          <div className="flex gap-2">
            <button onClick={doPrint} className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600 text-white text-xs">
              <Printer className="h-3.5 w-3.5" /> Stampa / PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-200"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="overflow-y-auto p-6" ref={printRef}>
          <div className="header">
            <div>
              <div className="big">{tenantLabel.toUpperCase()}</div>
              <div style={{ fontSize: "9pt" }}>Documento di Trasporto (DDT)</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div><strong>N° DDT:</strong> {ddt.numero_ddt}</div>
              <div><strong>Data:</strong> {new Date(ddt.data).toLocaleDateString("it-IT")}</div>
            </div>
          </div>

          <h2>Destinatario</h2>
          <table>
            <tbody>
              <tr><th style={{ width: "30%" }}>Ragione sociale</th><td>{ddt.cliente_destinatario}</td></tr>
              <tr><th>Indirizzo di consegna</th><td>{ddt.indirizzo_destinazione || "—"}</td></tr>
            </tbody>
          </table>

          <h2>Bene trasportato</h2>
          <table>
            <thead>
              <tr><th style={{ width: "70%" }}>Descrizione</th><th>Quantità</th></tr>
            </thead>
            <tbody>
              <tr><td>{ddt.descrizione_bene}</td><td>{ddt.quantita || "—"}</td></tr>
            </tbody>
          </table>

          <h2>Trasporto</h2>
          <table>
            <tbody>
              <tr><th style={{ width: "30%" }}>Causale trasporto</th><td>{ddt.causale_trasporto}</td></tr>
              <tr><th>Targa mezzo</th><td>{ddt.targa_mezzo || "—"}</td></tr>
              <tr><th>Conducente</th><td>{ddt.conducente || "—"}</td></tr>
              <tr><th>Note</th><td>{ddt.note || "—"}</td></tr>
            </tbody>
          </table>

          <div className="grid2" style={{ marginTop: "20px" }}>
            <div>
              <div style={{ fontSize: "9pt", marginBottom: "4px" }}>Firma vettore</div>
              <div className="firma"></div>
            </div>
            <div>
              <div style={{ fontSize: "9pt", marginBottom: "4px" }}>Firma destinatario per ricevuta</div>
              <div className="firma"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
