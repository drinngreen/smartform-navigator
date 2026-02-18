import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { X, Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { creaScritturaPrimaNota } from "@/lib/primaNotaService";

interface PrimaNotaFormDialogProps {
  item?: any;
  tenantId?: string;
  onClose: () => void;
}

interface RigaForm {
  id: string;
  conto_id: string;
  segno: "DARE" | "AVERE";
  importo: string;
  descrizione_riga: string;
  centro_costo: string;
  commessa: string;
}

const emptyRiga = (): RigaForm => ({
  id: crypto.randomUUID(),
  conto_id: "",
  segno: "DARE",
  importo: "",
  descrizione_riga: "",
  centro_costo: "",
  commessa: "",
});

export function PrimaNotaFormDialog({ item, tenantId, onClose }: PrimaNotaFormDialogProps) {
  const isView = !!item;
  const queryClient = useQueryClient();

  const [data, setData] = useState(item?.data_registrazione || new Date().toISOString().slice(0, 10));
  const [descrizione, setDescrizione] = useState(item?.descrizione || "");
  const [causaleId, setCausaleId] = useState(item?.causale_id || "");
  const [documentoTipo, setDocumentoTipo] = useState(item?.documento_tipo || "MANUALE");
  const [righe, setRighe] = useState<RigaForm[]>([emptyRiga(), emptyRiga()]);
  const [saving, setSaving] = useState(false);

  // Load existing rows if viewing
  const { data: existingRighe } = useQuery({
    queryKey: ["erp-prima-nota-righe-detail", item?.id],
    enabled: !!item?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("erp_prima_nota_righe" as any)
        .select("*, conto:erp_piano_conti!erp_prima_nota_righe_conto_id_fkey(codice, descrizione)")
        .eq("prima_nota_id", item.id)
        .order("created_at");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: conti = [] } = useQuery({
    queryKey: ["erp-piano-conti-select", tenantId],
    queryFn: async () => {
      const q = supabase.from("erp_piano_conti" as any).select("id, codice, descrizione, is_movimentabile").eq("is_movimentabile", true).order("codice");
      if (tenantId) (q as any).eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: causali = [] } = useQuery({
    queryKey: ["erp-causali-select", tenantId],
    queryFn: async () => {
      const q = supabase.from("erp_causali_contabili" as any).select("id, codice, descrizione").eq("attivo", true).order("codice");
      if (tenantId) (q as any).eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const totaleDare = useMemo(() => righe.filter(r => r.segno === "DARE").reduce((s, r) => s + (parseFloat(r.importo) || 0), 0), [righe]);
  const totaleAvere = useMemo(() => righe.filter(r => r.segno === "AVERE").reduce((s, r) => s + (parseFloat(r.importo) || 0), 0), [righe]);
  const sbilancio = Math.abs(totaleDare - totaleAvere);
  const isBalanced = sbilancio < 0.01 && totaleDare > 0;

  const updateRiga = (id: string, field: keyof RigaForm, value: string) => {
    setRighe(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addRiga = () => setRighe(prev => [...prev, emptyRiga()]);
  const removeRiga = (id: string) => setRighe(prev => prev.filter(r => r.id !== id));

  const handleSave = async () => {
    if (!isBalanced) {
      toast.error("La scrittura non è bilanciata (Dare ≠ Avere)");
      return;
    }
    if (!descrizione.trim()) {
      toast.error("Inserisci una descrizione");
      return;
    }

    setSaving(true);
    try {
      await creaScritturaPrimaNota({
        tenant_id: tenantId || null,
        data_registrazione: data,
        descrizione,
        causale_id: causaleId || null,
        documento_tipo: documentoTipo,
        righe: righe.filter(r => r.conto_id && parseFloat(r.importo) > 0).map(r => ({
          conto_id: r.conto_id,
          segno: r.segno,
          importo: parseFloat(r.importo),
          descrizione_riga: r.descrizione_riga,
          centro_costo: r.centro_costo || undefined,
          commessa: r.commessa || undefined,
        })),
      });
      toast.success("Scrittura registrata");
      queryClient.invalidateQueries({ queryKey: ["erp-prima-nota"] });
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Errore salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-card border border-border/30 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <h2 className="text-lg font-semibold text-foreground">
            {isView ? `Scrittura #${item.numero_registro}` : "Nuova Scrittura di Prima Nota"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted/20 text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Main fields */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">Data</label>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} disabled={isView}
                className="w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground disabled:opacity-60" />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">Causale</label>
              <select value={causaleId} onChange={(e) => setCausaleId(e.target.value)} disabled={isView}
                className="w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground disabled:opacity-60">
                <option value="">— Nessuna —</option>
                {causali.map((c: any) => <option key={c.id} value={c.id}>{c.codice} — {c.descrizione}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">Tipo Documento</label>
              <select value={documentoTipo} onChange={(e) => setDocumentoTipo(e.target.value)} disabled={isView}
                className="w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground disabled:opacity-60">
                <option value="MANUALE">Manuale</option>
                <option value="FATTURA_VENDITA">Fattura Vendita</option>
                <option value="FATTURA_ACQUISTO">Fattura Acquisto</option>
                <option value="INCASSO">Incasso</option>
                <option value="PAGAMENTO">Pagamento</option>
                <option value="GIROCONTO">Giroconto</option>
                <option value="STIPENDI">Stipendi</option>
                <option value="AMMORTAMENTO">Ammortamento</option>
              </select>
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-mono text-muted-foreground mb-1">Descrizione</label>
              <input value={descrizione} onChange={(e) => setDescrizione(e.target.value)} disabled={isView}
                className="w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground disabled:opacity-60" />
            </div>
          </div>

          {/* Balance indicator */}
          <div className={`flex items-center gap-2 p-3 rounded-xl border ${isBalanced ? "border-green-500/30 bg-green-500/10" : "border-yellow-500/30 bg-yellow-500/10"}`}>
            {isBalanced ? (
              <><CheckCircle2 className="h-4 w-4 text-green-400" /><span className="text-sm text-green-400">Scrittura bilanciata</span></>
            ) : (
              <><AlertTriangle className="h-4 w-4 text-yellow-400" /><span className="text-sm text-yellow-400">Sbilancio: {formatCurrency(sbilancio)} — Dare: {formatCurrency(totaleDare)} / Avere: {formatCurrency(totaleAvere)}</span></>
            )}
          </div>

          {/* Rows table */}
          <div className="rounded-xl border border-border/30 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-muted/10">
                  <th className="px-3 py-2 text-left text-xs font-mono uppercase text-muted-foreground">Conto</th>
                  <th className="px-3 py-2 text-left text-xs font-mono uppercase text-muted-foreground w-24">Segno</th>
                  <th className="px-3 py-2 text-left text-xs font-mono uppercase text-muted-foreground w-32">Importo</th>
                  <th className="px-3 py-2 text-left text-xs font-mono uppercase text-muted-foreground">Descrizione</th>
                  <th className="px-3 py-2 text-left text-xs font-mono uppercase text-muted-foreground w-28">C. Costo</th>
                  {!isView && <th className="px-3 py-2 w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {isView ? (
                  (existingRighe || []).map((r: any) => (
                    <tr key={r.id} className="border-b border-border/10">
                      <td className="px-3 py-2 text-foreground">{r.conto?.codice} — {r.conto?.descrizione}</td>
                      <td className={`px-3 py-2 font-mono font-bold ${r.segno === "DARE" ? "text-blue-400" : "text-green-400"}`}>{r.segno}</td>
                      <td className="px-3 py-2 font-mono text-foreground">{formatCurrency(Number(r.importo))}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.descrizione_riga || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{r.centro_costo || "—"}</td>
                    </tr>
                  ))
                ) : (
                  righe.map((r) => (
                    <tr key={r.id} className="border-b border-border/10">
                      <td className="px-2 py-1">
                        <select value={r.conto_id} onChange={(e) => updateRiga(r.id, "conto_id", e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs text-foreground">
                          <option value="">Seleziona conto...</option>
                          {conti.map((c: any) => <option key={c.id} value={c.id}>{c.codice} — {c.descrizione}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <select value={r.segno} onChange={(e) => updateRiga(r.id, "segno", e.target.value)}
                          className={`w-full px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs font-bold ${r.segno === "DARE" ? "text-blue-400" : "text-green-400"}`}>
                          <option value="DARE">DARE</option>
                          <option value="AVERE">AVERE</option>
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" step="0.01" min="0" value={r.importo} onChange={(e) => updateRiga(r.id, "importo", e.target.value)}
                          placeholder="0.00" className="w-full px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs text-foreground font-mono" />
                      </td>
                      <td className="px-2 py-1">
                        <input value={r.descrizione_riga} onChange={(e) => updateRiga(r.id, "descrizione_riga", e.target.value)}
                          placeholder="Descrizione..." className="w-full px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs text-foreground" />
                      </td>
                      <td className="px-2 py-1">
                        <input value={r.centro_costo} onChange={(e) => updateRiga(r.id, "centro_costo", e.target.value)}
                          placeholder="—" className="w-full px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs text-foreground" />
                      </td>
                      <td className="px-2 py-1">
                        {righe.length > 2 && (
                          <button onClick={() => removeRiga(r.id)} className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!isView && (
              <div className="p-2 border-t border-border/20">
                <button onClick={addRiga} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-primary hover:bg-primary/10 transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Aggiungi riga
                </button>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="flex justify-end gap-6 text-sm font-mono">
            <span className="text-blue-400">Dare: {formatCurrency(isView ? (existingRighe || []).filter((r: any) => r.segno === "DARE").reduce((s: number, r: any) => s + Number(r.importo), 0) : totaleDare)}</span>
            <span className="text-green-400">Avere: {formatCurrency(isView ? (existingRighe || []).filter((r: any) => r.segno === "AVERE").reduce((s: number, r: any) => s + Number(r.importo), 0) : totaleAvere)}</span>
          </div>

          {/* Actions */}
          {!isView && (
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted/20">Annulla</button>
              <button onClick={handleSave} disabled={saving || !isBalanced}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {saving ? "Salvataggio..." : "Registra Scrittura"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
