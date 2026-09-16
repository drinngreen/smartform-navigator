import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useMovimentiImpianto } from "@/hooks/useMovimentiImpianto";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus, Search, Package, ArrowDownToLine, Scale,
  Factory, CheckCircle, XCircle, AlertTriangle, FileText,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { applicaChiusuraDestinatario } from "@/lib/chiusuraDestinatarioGiacenza";


interface Impianto { id: string; nome: string; }

const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";

/** Formulario realmente emesso dall'autista, in viaggio verso l'impianto. */
interface FirInViaggio {
  id: string;
  numero_fir: string | null;
  codice_eer: string | null;
  descrizione_rifiuto: string | null;
  produttore_denominazione: string | null;
  trasportatore_denominazione: string | null;
  destinatario_denominazione: string | null;
  quantita: number | null;
  unita_misura: string | null;
  data_partenza: string | null;
  submitted_at: string | null;
}

const emptyForm = {
  numero_fir: "", cer: "", descrizione_rifiuto: "",
  produttore_denominazione: "", trasportatore_denominazione: "",
  quantita_presunta: "", quantita_kg: "",
  esito_accettazione: "accettato" as "accettato" | "parziale" | "respinto",
  note: "",
};

export default function MNImpiantoDestinatarioPage() {
  const { context } = useParams<{ context: string }>();
  const { user } = useAuth();
  const [impianti, setImpianti] = useState<Impianto[]>([]);
  const [selectedImpianto, setSelectedImpianto] = useState<string>("");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Formulari in viaggio (emessi e firmati dall'autista, non ancora chiusi)
  const [firInViaggio, setFirInViaggio] = useState<FirInViaggio[]>([]);
  const [loadingFir, setLoadingFir] = useState(false);
  const [selectedFirId, setSelectedFirId] = useState<string>("");
  const [manualMode, setManualMode] = useState(false);

  const { movimenti, isLoading, stats } = useMovimentiImpianto(
    selectedImpianto || undefined, "DESTINATARIO"
  );

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    supabase.from("impianti").select("id, nome").then(({ data }) => {
      if (data) {
        setImpianti(data);
        if (data.length > 0 && !selectedImpianto) setSelectedImpianto(data[0].id);
      }
    });
  }, []);

  const loadFirInViaggio = async () => {
    setLoadingFir(true);
    const { data, error } = await supabase
      .from("fir_forms")
      .select("id, numero_fir, codice_eer, descrizione_rifiuto, produttore_denominazione, trasportatore_denominazione, destinatario_denominazione, quantita, unita_misura, data_partenza, submitted_at")
      .eq("status", "inviato")
      .eq("deleted_by_user", false)
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .limit(200);
    setLoadingFir(false);
    if (error) { toast.error("Impossibile caricare i formulari in viaggio: " + error.message); return; }
    setFirInViaggio((data ?? []) as FirInViaggio[]);
  };

  useEffect(() => { if (dialogOpen) void loadFirInViaggio(); }, [dialogOpen]);

  const selectedFir = firInViaggio.find((f) => f.id === selectedFirId) ?? null;

  const handleSelectFir = (id: string) => {
    setSelectedFirId(id);
    const fir = firInViaggio.find((f) => f.id === id);
    if (!fir) return;
    setManualMode(false);
    setForm({
      ...emptyForm,
      numero_fir: fir.numero_fir ?? "",
      cer: fir.codice_eer ?? "",
      descrizione_rifiuto: fir.descrizione_rifiuto ?? "",
      produttore_denominazione: fir.produttore_denominazione ?? "",
      trasportatore_denominazione: fir.trasportatore_denominazione ?? "",
      quantita_presunta: fir.quantita != null ? String(fir.quantita) : "",
    });
  };

  const resetDialog = () => {
    setForm(emptyForm);
    setSelectedFirId("");
    setManualMode(false);
  };

  const handleSave = async () => {
    if (!selectedFirId && !manualMode) {
      toast.error("Seleziona il formulario in arrivo, oppure attiva l'inserimento manuale");
      return;
    }
    if (!form.numero_fir.trim()) { toast.error("Il Numero FIR è obbligatorio"); return; }
    if (!form.cer.trim() || !form.quantita_kg) { toast.error("CER e Quantità pesata sono obbligatori"); return; }

    const kgPesati = parseFloat(form.quantita_kg);
    if (!Number.isFinite(kgPesati) || kgPesati <= 0) { toast.error("La quantità pesata deve essere maggiore di zero"); return; }
    const kgPresunta = form.quantita_presunta ? parseFloat(form.quantita_presunta) : null;

    // Auto-detect esito based on weight comparison
    const esito = form.esito_accettazione;
    if (kgPresunta && kgPresunta > 0) {
      const diff = Math.abs(kgPesati - kgPresunta);
      const pctDiff = (diff / kgPresunta) * 100;
      if (pctDiff > 10) {
        toast.warning(`⚠️ Scostamento peso: ${pctDiff.toFixed(1)}% rispetto alla quantità presunta`);
      }
    }

    setSaving(true);
    try {
      if (esito !== "respinto") {
        const applicazione = await applicaChiusuraDestinatario({
          tenantId: MULTY_TENANT_ID,
          impiantoId: selectedImpianto,
          numeroFir: form.numero_fir.trim(),
          cer: form.cer.trim(),
          quantitaKg: kgPesati,
          esito,
          descrizione: form.descrizione_rifiuto || null,
          firId: selectedFirId || null,
          causale: "FIR_DIGITALE_CHIUSO_DESTINATARIO",
        });
        if (applicazione.applicato !== true) toast.info(applicazione.motivo);
      }


    // Chiusura del formulario dell'autista: senza questo passaggio il FIR
    // resterebbe "in viaggio" anche dopo l'arrivo e la pesata.
    if (selectedFirId) {
      const { error: closeError } = await supabase
        .from("fir_forms")
        .update({
          status: "completato",
          completed_at: new Date().toISOString(),
          data_arrivo: new Date().toISOString().split("T")[0],
        })
        .eq("id", selectedFirId);
      if (closeError) {
        toast.error("Arrivo registrato, ma il formulario non risulta chiuso: " + closeError.message);
      } else {
        toast.success(
          esito === "respinto"
            ? "Formulario chiuso come respinto: nessuna giacenza movimentata"
            : "Formulario chiuso: giacenze aggiornate con il peso riscontrato",
        );
      }
    }

      setDialogOpen(false);
      resetDialog();
    } catch (e: any) {
      toast.error("Arrivo non registrato: " + (e?.message || String(e)));
    } finally {
      setSaving(false);
    }
  };

  const filtered = movimenti?.filter((m) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return m.cer.toLowerCase().includes(s) ||
      m.produttore_denominazione?.toLowerCase().includes(s) ||
      m.numero_fir?.toLowerCase().includes(s) ||
      m.descrizione_rifiuto?.toLowerCase().includes(s);
  }) ?? [];

  const accettati = movimenti?.filter((m) => m.esito_accettazione === "accettato").length ?? 0;
  const respinti = movimenti?.filter((m) => m.esito_accettazione === "respinto").length ?? 0;
  const parziali = movimenti?.filter((m) => m.esito_accettazione === "parziale").length ?? 0;

  return (
    <MNAdminLayout title="Impianto — Destinatario" subtitle="Ricezione rifiuti da produttori esterni">
      {/* Impianto selector */}
      <div className="mb-4">
        <Select value={selectedImpianto} onValueChange={setSelectedImpianto}>
          <SelectTrigger className="w-64 bg-card/60 border-border/30">
            <SelectValue placeholder="Seleziona impianto" />
          </SelectTrigger>
          <SelectContent>
            {impianti.map((imp) => (
              <SelectItem key={imp.id} value={imp.id}>{imp.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard icon={Package} label="Totale" value={stats.totale} color="59, 130, 246" />
        <StatCard icon={Scale} label="Kg Ricevuti" value={`${stats.kgTotali.toLocaleString("it-IT")}`} color="6, 182, 212" />
        <StatCard icon={CheckCircle} label="Accettati" value={accettati} color="34, 197, 94" />
        <StatCard icon={AlertTriangle} label="Parziali" value={parziali} color="249, 115, 22" />
        <StatCard icon={XCircle} label="Respinti" value={respinti} color="239, 68, 68" />
      </div>

      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca FIR, CER, produttore..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card/60 border-border/30"
          />
        </div>

        <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white">
          <ArrowDownToLine className="h-4 w-4 mr-1" /> Registra Arrivo
        </Button>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5 text-blue-400" />
              Registra Arrivo — Pesata e Accettazione
            </DialogTitle>
          </DialogHeader>

          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-start gap-2 text-sm">
            <FileText className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
            <span className="text-blue-200">
              L'impianto figura come <strong>Destinatario (Campo 3)</strong> nel FIR. Compilare quantità effettiva ed esito accettazione.
            </span>
          </div>

          <div className="space-y-3 mt-2">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <Label className="text-xs text-muted-foreground">Formulario in arrivo *</Label>
                <button
                  type="button"
                  onClick={() => { setManualMode((v) => !v); setSelectedFirId(""); }}
                  className="text-[11px] underline text-muted-foreground hover:text-foreground"
                >
                  {manualMode ? "Scegli dall'elenco" : "Non è in elenco: inserisci a mano"}
                </button>
              </div>
              {manualMode ? (
                <Input
                  value={form.numero_fir}
                  onChange={(e) => setForm({ ...form, numero_fir: e.target.value })}
                  placeholder="Numero formulario in arrivo"
                />
              ) : (
                <Select value={selectedFirId} onValueChange={handleSelectFir}>
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue placeholder={loadingFir ? "Caricamento formulari…" : "Seleziona il formulario firmato dall'autista"} />
                  </SelectTrigger>
                  <SelectContent>
                    {firInViaggio.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">Nessun formulario in viaggio</div>
                    ) : firInViaggio.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {(f.numero_fir || "senza numero")} — {f.codice_eer || "?"} — {f.produttore_denominazione || "produttore n.d."}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {manualMode && (
                <p className="mt-1 text-[11px] text-amber-300">
                  Attenzione: inserendo a mano, il formulario dell'autista non verrà chiuso automaticamente.
                </p>
              )}
              {selectedFir && (
                <p className="mt-1 text-[11px] text-emerald-300">
                  Dati presi dal formulario firmato: alla registrazione verrà chiuso automaticamente.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Produttore</Label>
                <Input value={form.produttore_denominazione} onChange={(e) => setForm({ ...form, produttore_denominazione: e.target.value })} placeholder="Denominazione produttore" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Trasportatore</Label>
                <Input value={form.trasportatore_denominazione} onChange={(e) => setForm({ ...form, trasportatore_denominazione: e.target.value })} placeholder="Denominazione vettore" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Codice CER *</Label>
                <Input value={form.cer} onChange={(e) => setForm({ ...form, cer: e.target.value })} placeholder="17.04.05" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Descrizione rifiuto</Label>
                <Input value={form.descrizione_rifiuto} onChange={(e) => setForm({ ...form, descrizione_rifiuto: e.target.value })} placeholder="Ferro e acciaio" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Quantità presunta (kg)</Label>
                <Input type="number" value={form.quantita_presunta} onChange={(e) => setForm({ ...form, quantita_presunta: e.target.value })} placeholder="Da FIR" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Quantità pesata (kg) *</Label>
                <Input type="number" value={form.quantita_kg} onChange={(e) => setForm({ ...form, quantita_kg: e.target.value })} placeholder="Peso effettivo" />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Esito Accettazione</Label>
              <Select value={form.esito_accettazione} onValueChange={(v: any) => setForm({ ...form, esito_accettazione: v })}>
                <SelectTrigger className="bg-secondary/50 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accettato">✅ Accettato per intero</SelectItem>
                  <SelectItem value="parziale">⚠️ Accettato parzialmente</SelectItem>
                  <SelectItem value="respinto">❌ Respinto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Note</Label>
              <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} className="bg-secondary/50 border-border" />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Salvataggio..." : "Registra Arrivo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <div className="rounded-2xl bg-card/60 border border-border/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 text-muted-foreground text-xs uppercase">
                <th className="p-3 text-left">Data</th>
                <th className="p-3 text-left">FIR</th>
                <th className="p-3 text-left">CER</th>
                <th className="p-3 text-left">Produttore</th>
                <th className="p-3 text-left">Trasportatore</th>
                <th className="p-3 text-right">Presunta</th>
                <th className="p-3 text-right">Pesata</th>
                <th className="p-3 text-center">Esito</th>
                <th className="p-3 text-left">Note</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Caricamento...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Nessun arrivo registrato</td></tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m.id} className="border-b border-border/10 hover:bg-accent/5">
                    <td className="p-3 font-mono text-xs">{m.data_movimento ? format(new Date(m.data_movimento), "dd/MM/yyyy", { locale: it }) : "—"}</td>
                    <td className="p-3 font-mono text-xs">{m.numero_fir || "—"}</td>
                    <td className="p-3 font-mono">{m.cer}</td>
                    <td className="p-3 text-xs max-w-[150px] truncate">{m.produttore_denominazione || "—"}</td>
                    <td className="p-3 text-xs max-w-[150px] truncate">{m.trasportatore_denominazione || "—"}</td>
                    <td className="p-3 text-right text-xs">{m.quantita_presunta ? Number(m.quantita_presunta).toLocaleString("it-IT") : "—"}</td>
                    <td className="p-3 text-right font-bold">{Number(m.quantita_kg).toLocaleString("it-IT")}</td>
                    <td className="p-3 text-center">
                      <EsitoBadge esito={m.esito_accettazione} />
                    </td>
                    <td className="p-3 text-xs max-w-[150px] truncate">{m.note || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info box */}
      <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm space-y-2">
        <h4 className="font-semibold text-blue-300 flex items-center gap-2"><Factory className="h-4 w-4" /> Schema FIR — Impianto come Destinatario</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
          <div><span className="text-blue-400">Campo 1 — Produttore:</span> Cliente / altro impianto</div>
          <div><span className="text-blue-400">Campo 2 — Trasportatore:</span> Vettore</div>
          <div><span className="text-blue-400">Campo 3 — Destinatario:</span> Impianto tuo</div>
          <div><span className="text-blue-400">Esito:</span> Accettato / Parziale / Respinto</div>
        </div>
      </div>
    </MNAdminLayout>
  );
}

function EsitoBadge({ esito }: { esito: string | null }) {
  if (!esito) return <span className="text-muted-foreground">—</span>;
  const map: Record<string, { label: string; cls: string }> = {
    accettato: { label: "Accettato", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
    parziale: { label: "Parziale", cls: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
    respinto: { label: "Respinto", cls: "bg-red-500/20 text-red-300 border-red-500/30" },
  };
  const m = map[esito] || { label: esito, cls: "bg-muted text-muted-foreground" };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${m.cls}`}>{m.label}</span>;
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
      <div className="p-2 rounded-xl" style={{ background: `rgba(${color}, 0.15)` }}>
        <Icon className="h-5 w-5" style={{ color: `rgb(${color})` }} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-mono uppercase">{label}</p>
        <p className="text-lg font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
