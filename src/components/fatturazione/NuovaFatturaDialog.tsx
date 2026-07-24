import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { X, Plus, Trash2, Save, AlertTriangle, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  tenantId?: string;
  onClose: () => void;
  onCreated: () => void;
  preselectedFirIds?: string[];
  preselectedRighe?: Riga[];
  clienteId?: string;
  clienteFallback?: Partial<Cliente>;
}

type Cliente = {
  id: string;
  ragione_sociale: string;
  partita_iva: string | null;
  codice_fiscale: string | null;
  indirizzo: string | null;
  citta: string | null;
  cap: string | null;
  provincia: string | null;
  codice_destinatario: string | null;
};

export type Riga = {
  descrizione: string;
  cer: string;
  fir_form_id: string | null;
  numero_fir: string;
  quantita: number;
  unita_misura: string;
  prezzo_unitario: number;
  aliquota_iva: number;
  reverse_charge: boolean;
  tipo_riga: "servizio" | "trasporto" | "noleggio";
};

const CER_REVERSE_CHARGE = new Set<string>(["170405", "191202", "191203"]); // metalli ferrosi/non-ferrosi tipici RC art.74

export function NuovaFatturaDialog({ tenantId, onClose, onCreated, preselectedFirIds, preselectedRighe, clienteId: initialClienteId, clienteFallback }: Props) {
  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteId, setClienteId] = useState<string | null>(initialClienteId || null);
  const [unitaLocale, setUnitaLocale] = useState("");
  const [dataEmissione, setDataEmissione] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [righe, setRighe] = useState<Riga[]>(preselectedRighe && preselectedRighe.length ? preselectedRighe : [emptyRiga()]);
  const [saving, setSaving] = useState(false);
  const [showFirPicker, setShowFirPicker] = useState(false);

  const { data: clienti = [] } = useQuery({
    queryKey: ["fatture-clienti", tenantId, clienteSearch],
    queryFn: async () => {
      let q = supabase.from("anagrafica_aziende_mp" as any)
        .select("id,ragione_sociale,partita_iva,codice_fiscale,indirizzo,citta,cap,provincia,codice_destinatario")
        .eq("cliente", true)
        .order("ragione_sociale")
        .limit(50);
      if (tenantId) q = q.eq("tenant_id", tenantId);
      if (clienteSearch) q = q.ilike("ragione_sociale", `%${clienteSearch}%`);
      const { data, error } = await q;
      if (error) throw error;
      return ((data as any) || []) as Cliente[];
    },
    enabled: !initialClienteId,
  });

  const { data: clienteSelezionato } = useQuery({
    queryKey: ["fatture-cliente", clienteId],
    queryFn: async () => {
      if (!clienteId) return null;
      const { data, error } = await supabase.from("anagrafica_aziende_mp" as any)
        .select("*").eq("id", clienteId).maybeSingle();
      if (error) throw error;
      return (data as any) as Cliente | null;
    },
    enabled: !!clienteId,
  });

  const { data: firsDisponibili = [] } = useQuery({
    queryKey: ["fatture-firs", tenantId],
    queryFn: async () => {
      let q = supabase.from("fir_forms" as any)
        .select("id,numero_fir,form_data,cer,quantita_partenza,quantita_arrivo,destinatario_denominazione,produttore_denominazione,updated_at")
        .eq("status", "completato")
        .order("updated_at", { ascending: false })
        .limit(200);
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: showFirPicker,
  });

  const { data: erpIva = [] } = useQuery({
    queryKey: ["erp-iva", tenantId],
    queryFn: async () => {
      let q = supabase.from("erp_codici_iva" as any).select("codice,descrizione,aliquota,natura").eq("attivo", true);
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const cliente = clienteSelezionato || (clienteFallback as any);
  const hasPIva = !!cliente?.partita_iva;

  useEffect(() => {
    // Auto-check reverse charge in base al CER
    setRighe(r => r.map(x => ({ ...x, reverse_charge: CER_REVERSE_CHARGE.has(x.cer.replace(/\s/g, "")) || x.reverse_charge })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    let imp = 0, iva = 0;
    for (const r of righe) {
      const rowImp = Number(r.quantita || 0) * Number(r.prezzo_unitario || 0);
      const rowIva = r.reverse_charge ? 0 : rowImp * (Number(r.aliquota_iva || 0) / 100);
      imp += rowImp; iva += rowIva;
    }
    return { imponibile: imp, iva, totale: imp + iva };
  }, [righe]);

  const addRiga = () => setRighe(r => [...r, emptyRiga()]);
  const rmRiga = (i: number) => setRighe(r => r.filter((_, idx) => idx !== i));
  const updRiga = (i: number, patch: Partial<Riga>) => setRighe(r => r.map((x, idx) => idx === i ? { ...x, ...patch } : x));

  const addFirAsRiga = (fir: any) => {
    const cer = fir.cer || fir.form_data?.cer || "";
    const q = Number(fir.quantita_partenza || fir.quantita_arrivo || fir.form_data?.quantita || 0);
    setRighe(r => [...r, {
      descrizione: `Smaltimento CER ${cer} - FIR ${fir.numero_fir || ""}`.trim(),
      cer,
      fir_form_id: fir.id,
      numero_fir: fir.numero_fir || "",
      quantita: q || 1,
      unita_misura: "kg",
      prezzo_unitario: 0,
      aliquota_iva: 22,
      reverse_charge: CER_REVERSE_CHARGE.has(cer.replace(/\s/g, "")),
      tipo_riga: "servizio",
    }]);
    setShowFirPicker(false);
  };

  const salva = async () => {
    if (!tenantId) { toast.error("Tenant mancante"); return; }
    if (!cliente) { toast.error("Selezionare un cliente"); return; }
    if (!hasPIva) { toast.error("Partita IVA cliente mancante: aggiornare l'anagrafica prima di fatturare"); return; }
    if (righe.length === 0 || righe.every(r => !r.descrizione)) { toast.error("Aggiungere almeno una riga"); return; }
    setSaving(true);
    try {
      const anno = new Date(dataEmissione).getFullYear();
      const { data: numRes, error: numErr } = await supabase.rpc("next_fattura_number", { p_tenant_id: tenantId, p_anno: anno });
      if (numErr) throw numErr;
      const numero = numRes as number;

      const rc = righe.every(r => r.reverse_charge);
      const { data: fatt, error: fErr } = await supabase.from("fatture" as any).insert({
        tenant_id: tenantId,
        numero, anno,
        data_emissione: dataEmissione,
        cliente_id: cliente.id,
        cliente_ragione_sociale: cliente.ragione_sociale,
        cliente_partita_iva: cliente.partita_iva,
        cliente_codice_fiscale: cliente.codice_fiscale,
        cliente_indirizzo: [cliente.indirizzo, cliente.cap, cliente.citta, cliente.provincia].filter(Boolean).join(" "),
        cliente_unita_locale: unitaLocale || null,
        tipo: righe.some(r => r.tipo_riga === "noleggio") ? "noleggio" : "servizi",
        stato: "cortesia",
        imponibile: totals.imponibile,
        iva: totals.iva,
        totale: totals.totale,
        reverse_charge: rc,
        note,
      }).select().single();
      if (fErr) throw fErr;

      const righeInsert = righe.map((r, i) => ({
        fattura_id: (fatt as any).id,
        ordine: i,
        descrizione: r.descrizione,
        cer: r.cer || null,
        fir_form_id: r.fir_form_id,
        numero_fir: r.numero_fir || null,
        quantita: r.quantita,
        unita_misura: r.unita_misura,
        prezzo_unitario: r.prezzo_unitario,
        imponibile: Number(r.quantita) * Number(r.prezzo_unitario),
        aliquota_iva: r.reverse_charge ? 0 : r.aliquota_iva,
        iva: r.reverse_charge ? 0 : Number(r.quantita) * Number(r.prezzo_unitario) * (Number(r.aliquota_iva) / 100),
        totale: Number(r.quantita) * Number(r.prezzo_unitario) * (r.reverse_charge ? 1 : 1 + Number(r.aliquota_iva) / 100),
        reverse_charge: r.reverse_charge,
        tipo_riga: r.tipo_riga,
      }));
      const { error: rErr } = await supabase.from("fatture_righe" as any).insert(righeInsert);
      if (rErr) throw rErr;

      toast.success(`Fattura ${numero}/${anno} creata in Cortesia`);
      onCreated();
    } catch (e: any) {
      toast.error(e.message || "Errore salvataggio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border/40 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border/30 bg-card">
          <h2 className="text-lg font-semibold">Nuova Fattura di Cortesia</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted/20"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Cliente */}
          <section>
            <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Cliente</label>
            {!initialClienteId ? (
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input value={clienteSearch} onChange={e => { setClienteSearch(e.target.value); setClienteId(null); }}
                  placeholder="Cerca cliente..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-background/60 border border-border/30 text-sm" />
                {clienteSearch && !clienteId && clienti.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-xl bg-card border border-border/40 shadow-xl">
                    {clienti.map(c => (
                      <button key={c.id} onClick={() => { setClienteId(c.id); setClienteSearch(c.ragione_sociale); }}
                        className="w-full text-left px-3 py-2 hover:bg-muted/20 text-sm border-b border-border/10 last:border-0">
                        <div className="font-medium">{c.ragione_sociale}</div>
                        <div className="text-xs text-muted-foreground">
                          P.IVA: {c.partita_iva || "—"} · {c.citta || ""}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {cliente && (
              <div className={`mt-2 p-3 rounded-xl border text-sm ${hasPIva ? "bg-emerald-500/5 border-emerald-500/30" : "bg-red-500/10 border-red-500/40"}`}>
                <div className="font-semibold">{cliente.ragione_sociale}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {cliente.indirizzo} · {cliente.citta} ({cliente.provincia}) · CF: {cliente.codice_fiscale || "—"}
                </div>
                {!hasPIva && (
                  <div className="mt-2 flex items-start gap-2 text-red-300 text-xs">
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                    <div>
                      <strong>Partita IVA mancante.</strong> Aggiornare l'anagrafica dell'impianto/cliente prima di generare la fattura.
                    </div>
                  </div>
                )}
                <input value={unitaLocale} onChange={e => setUnitaLocale(e.target.value)}
                  placeholder="Unità locale (facoltativa)"
                  className="mt-2 w-full px-3 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs" />
              </div>
            )}
          </section>

          {/* Data e note */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Data emissione</label>
              <input type="date" value={dataEmissione} onChange={e => setDataEmissione(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm" />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Note</label>
              <input value={note} onChange={e => setNote(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm" />
            </div>
          </div>

          {/* Righe */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Righe fattura</label>
              <div className="flex gap-2">
                <button onClick={() => setShowFirPicker(v => !v)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25">
                  Da Formulario
                </button>
                <button onClick={addRiga}
                  className="text-xs px-3 py-1.5 rounded-lg bg-muted/20 hover:bg-muted/30 flex items-center gap-1">
                  <Plus className="h-3 w-3" />Riga libera
                </button>
              </div>
            </div>

            {showFirPicker && (
              <div className="mb-3 p-3 rounded-xl bg-background/40 border border-border/30 max-h-56 overflow-y-auto">
                {firsDisponibili.length === 0 ? (
                  <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />Carico formulari...</div>
                ) : firsDisponibili.map((f: any) => (
                  <button key={f.id} onClick={() => addFirAsRiga(f)}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted/20 text-xs border-b border-border/10">
                    <span className="font-mono font-semibold">{f.numero_fir || "—"}</span> · CER {f.cer || f.form_data?.cer || "—"} · {f.produttore_denominazione} → {f.destinatario_denominazione}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-2">
              {righe.map((r, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start p-2 rounded-xl bg-background/40 border border-border/20">
                  <input value={r.descrizione} onChange={e => updRiga(i, { descrizione: e.target.value })}
                    placeholder="Descrizione"
                    className="col-span-4 px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs" />
                  <input value={r.cer} onChange={e => updRiga(i, { cer: e.target.value })}
                    placeholder="CER"
                    className="col-span-1 px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs font-mono" />
                  <input type="number" step="0.001" value={r.quantita} onChange={e => updRiga(i, { quantita: Number(e.target.value) })}
                    placeholder="Q.tà"
                    className="col-span-1 px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs" />
                  <input value={r.unita_misura} onChange={e => updRiga(i, { unita_misura: e.target.value })}
                    placeholder="UM"
                    className="col-span-1 px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs" />
                  <input type="number" step="0.0001" value={r.prezzo_unitario} onChange={e => updRiga(i, { prezzo_unitario: Number(e.target.value) })}
                    placeholder="Prezzo"
                    className="col-span-2 px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs" />
                  <input type="number" step="0.01" list="erp-iva-list" value={r.aliquota_iva} onChange={e => updRiga(i, { aliquota_iva: Number(e.target.value) })} disabled={r.reverse_charge}
                    placeholder="IVA %"
                    className="col-span-1 px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs disabled:opacity-40" />
                  <label className="col-span-2 flex items-center gap-1 text-[10px] px-1">
                    <input type="checkbox" checked={r.reverse_charge} onChange={e => updRiga(i, { reverse_charge: e.target.checked })} />
                    Rev. charge
                    <button onClick={() => rmRiga(i)} className="ml-auto p-1 rounded hover:bg-destructive/20 text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </label>
                </div>
              ))}
            </div>
            <datalist id="erp-iva-list">
              {erpIva.map((x: any) => (
                <option key={x.codice} value={x.aliquota}>{x.codice} — {x.descrizione}</option>
              ))}
            </datalist>
          </section>

          {/* Totali */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-background/40 border border-border/30">
            <TotBox label="Imponibile" value={totals.imponibile} />
            <TotBox label="IVA" value={totals.iva} />
            <TotBox label="Totale" value={totals.totale} strong />
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-border/30 bg-card">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-muted/20 hover:bg-muted/30 text-sm">Annulla</button>
          <button disabled={saving || !hasPIva} onClick={salva}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Genera Cortesia
          </button>
        </div>
      </div>
    </div>
  );
}

function TotBox({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div>
      <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-mono ${strong ? "text-lg font-bold text-primary" : "text-sm"}`}>
        {new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value)}
      </div>
    </div>
  );
}

function emptyRiga(): Riga {
  return { descrizione: "", cer: "", fir_form_id: null, numero_fir: "", quantita: 1, unita_misura: "kg", prezzo_unitario: 0, aliquota_iva: 22, reverse_charge: false, tipo_riga: "servizio" };
}
