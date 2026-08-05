import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, RefreshCw, Loader2, Plus, ArrowDownToLine, ArrowUpFromLine,
  FileSpreadsheet, Printer, AlertTriangle,
} from "lucide-react";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";

const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";

// CER preferiti from Excel – same dataset used in DevCERPreferitiModule
const CER_PREFERITI = [
  { codice: "010408", descrizione: "scarti di ghiaia e pietrisco", pericoloso: false },
  { codice: "030105", descrizione: "segatura, trucioli, residui di taglio, legno", pericoloso: false },
  { codice: "070213", descrizione: "rifiuti plastici", pericoloso: false },
  { codice: "080111", descrizione: "pitture e vernici di scarto, contenenti solventi organici o altre sostanze pericolose", pericoloso: true },
  { codice: "080312", descrizione: "scarti di inchiostro, contenenti sostanze pericolose", pericoloso: true },
  { codice: "080318", descrizione: "toner per stampa esauriti", pericoloso: false },
  { codice: "090105", descrizione: "soluzioni di lavaggio e soluzioni di arresto-fissaggio", pericoloso: true },
  { codice: "100210", descrizione: "scaglie di laminazione", pericoloso: false },
  { codice: "120101", descrizione: "limatura e trucioli di metalli ferrosi", pericoloso: false },
  { codice: "120102", descrizione: "polveri e particolato di metalli ferrosi", pericoloso: false },
  { codice: "120103", descrizione: "limatura e trucioli di metalli non ferrosi", pericoloso: false },
  { codice: "120104", descrizione: "polveri e particolato di metalli non ferrosi", pericoloso: false },
  { codice: "120105", descrizione: "limatura e trucioli di materiali plastici", pericoloso: false },
  { codice: "120107", descrizione: "oli minerali per macchinari, non contenenti alogeni", pericoloso: true },
  { codice: "120109", descrizione: "emulsioni e soluzioni per macchinari, non contenenti alogeni", pericoloso: true },
  { codice: "120117", descrizione: "residui di materiale di sabbiatura", pericoloso: false },
  { codice: "120121", descrizione: "corpi d'utensile e materiali di rettifica esauriti", pericoloso: false },
  { codice: "120301", descrizione: "soluzioni acquose di lavaggio", pericoloso: true },
  { codice: "130110", descrizione: "oli minerali per circuiti idraulici, non clorurati", pericoloso: true },
  { codice: "130205", descrizione: "oli minerali per motori, ingranaggi e lubrificazione, non clorurati", pericoloso: true },
  { codice: "140603", descrizione: "altri solventi e miscele di solventi", pericoloso: true },
  { codice: "150101", descrizione: "imballaggi di carta e cartone", pericoloso: false },
  { codice: "150102", descrizione: "imballaggi di plastica", pericoloso: false },
  { codice: "150103", descrizione: "imballaggi in legno", pericoloso: false },
  { codice: "150104", descrizione: "imballaggi metallici", pericoloso: false },
  { codice: "150106", descrizione: "imballaggi in materiali misti", pericoloso: false },
  { codice: "150107", descrizione: "imballaggi di vetro", pericoloso: false },
  { codice: "150110", descrizione: "imballaggi contenenti residui di sostanze pericolose", pericoloso: true },
  { codice: "150202", descrizione: "assorbenti, materiali filtranti contaminati da sostanze pericolose", pericoloso: true },
  { codice: "150203", descrizione: "assorbenti, materiali filtranti, stracci e indumenti protettivi", pericoloso: false },
  { codice: "160103", descrizione: "pneumatici fuori uso", pericoloso: false },
  { codice: "160117", descrizione: "metalli ferrosi", pericoloso: false },
  { codice: "160119", descrizione: "plastica", pericoloso: false },
  { codice: "160120", descrizione: "vetro", pericoloso: false },
  { codice: "160122", descrizione: "componenti non specificati altrimenti", pericoloso: false },
  { codice: "160213", descrizione: "apparecchiature fuori uso, contenenti componenti pericolosi", pericoloso: true },
  { codice: "160214", descrizione: "apparecchiature fuori uso", pericoloso: false },
  { codice: "160216", descrizione: "componenti rimossi da apparecchiature fuori uso", pericoloso: false },
  { codice: "160305", descrizione: "rifiuti organici contenenti sostanze pericolose", pericoloso: true },
  { codice: "160504", descrizione: "gas in contenitori a pressione, contenenti sostanze pericolose", pericoloso: true },
  { codice: "160505", descrizione: "gas in contenitori a pressione", pericoloso: false },
  { codice: "160601", descrizione: "batterie al piombo", pericoloso: true },
  { codice: "160604", descrizione: "batterie alcaline", pericoloso: true },
  { codice: "160605", descrizione: "altre batterie ed accumulatori", pericoloso: true },
  { codice: "170102", descrizione: "mattoni", pericoloso: false },
  { codice: "170103", descrizione: "mattonelle e ceramiche", pericoloso: false },
  { codice: "170107", descrizione: "miscugli di cemento, mattoni, mattonelle e ceramiche", pericoloso: false },
  { codice: "170201", descrizione: "legno", pericoloso: false },
  { codice: "170202", descrizione: "vetro", pericoloso: false },
  { codice: "170203", descrizione: "plastica", pericoloso: false },
  { codice: "170302", descrizione: "miscele bituminose", pericoloso: false },
  { codice: "170401", descrizione: "rame, bronzo, ottone", pericoloso: false },
  { codice: "170402", descrizione: "alluminio", pericoloso: false },
  { codice: "170403", descrizione: "piombo", pericoloso: false },
  { codice: "170404", descrizione: "zinco", pericoloso: false },
  { codice: "170405", descrizione: "ferro e acciaio", pericoloso: false },
  { codice: "170407", descrizione: "metalli misti", pericoloso: false },
  { codice: "170411", descrizione: "cavi", pericoloso: false },
  { codice: "170603", descrizione: "altri materiali isolanti contenenti sostanze pericolose", pericoloso: true },
  { codice: "170604", descrizione: "materiali isolanti", pericoloso: false },
  { codice: "170802", descrizione: "materiali da costruzione a base di gesso", pericoloso: false },
  { codice: "170904", descrizione: "rifiuti misti dell'attività di costruzione e demolizione", pericoloso: false },
  { codice: "191202", descrizione: "metalli ferrosi", pericoloso: false },
  { codice: "191203", descrizione: "metalli non ferrosi", pericoloso: false },
  { codice: "191204", descrizione: "plastica e gomma", pericoloso: false },
  { codice: "191207", descrizione: "legno", pericoloso: false },
  { codice: "191212", descrizione: "altri rifiuti prodotti dal trattamento meccanico dei rifiuti", pericoloso: false },
  { codice: "200101", descrizione: "carta e cartone", pericoloso: false },
  { codice: "200140", descrizione: "metalli (alluminio)", pericoloso: false },
  { codice: "200140-CAVO", descrizione: "metalli (metallo-cavo)", pericoloso: false },
  { codice: "200140-fe", descrizione: "metalli (ferro)", pericoloso: false },
  { codice: "200140-OT", descrizione: "metalli (ottone)", pericoloso: false },
  { codice: "200140-PI", descrizione: "metalli (metallo-piombo)", pericoloso: false },
  { codice: "200140-RA", descrizione: "metalli (metallo-rame)", pericoloso: false },
  { codice: "200307", descrizione: "rifiuti ingombranti", pericoloso: false },
];

const emptyForm = {
  tipo_movimento: "CARICO" as string,
  ruolo_impianto: "DESTINATARIO" as string,
  cer: "",
  descrizione_rifiuto: "",
  quantita_kg: "",
  quantita_presunta: "",
  produttore_denominazione: "",
  trasportatore_denominazione: "",
  destinatario_denominazione: "",
  numero_fir: "",
  origine: "",
  esito_accettazione: "accettato",
  note: "",
  data_movimento: new Date().toISOString().slice(0, 10),
};

export function DevRegistroCaricoScaricoModule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [cerSearch, setCerSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch impianto for this tenant
  const { data: impianto } = useQuery({
    queryKey: ["dev-impianto-multy"],
    queryFn: async () => {
      const { data } = await supabase
        .from("impianti")
        .select("id, nome")
        .eq("tenant_id", MULTY_TENANT_ID)
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Fetch movimenti
  const { data: movimenti = [], isLoading, refetch } = useQuery({
    queryKey: ["dev-registro-movimenti", MULTY_TENANT_ID],
    queryFn: async () => {
      const all: any[] = [];
      let from = 0;
      const ps = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("movimenti_impianto")
          .select("*")
          .eq("tenant_id", MULTY_TENANT_ID)
          .order("data_movimento", { ascending: false })
          .range(from, from + ps - 1);
        if (error) throw error;
        all.push(...(data || []));
        if (!data || data.length < ps) break;
        from += ps;
      }
      return all;
    },
  });

  const filtered = useMemo(() => {
    return movimenti.filter((m: any) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        m.cer?.toLowerCase().includes(q) ||
        m.descrizione_rifiuto?.toLowerCase().includes(q) ||
        m.produttore_denominazione?.toLowerCase().includes(q) ||
        m.numero_fir?.toLowerCase().includes(q) ||
        m.trasportatore_denominazione?.toLowerCase().includes(q);
      const matchTipo = filterTipo === "all" || m.tipo_movimento === filterTipo;
      return matchSearch && matchTipo;
    });
  }, [movimenti, search, filterTipo]);

  const stats = useMemo(() => ({
    total: movimenti.length,
    carico: movimenti.filter((m: any) => m.tipo_movimento === "CARICO").length,
    scarico: movimenti.filter((m: any) => m.tipo_movimento === "SCARICO").length,
    totalKg: movimenti.reduce((s: number, m: any) => s + (m.quantita_kg || 0), 0),
  }), [movimenti]);

  // CER selector filtering
  const filteredCER = useMemo(() => {
    if (!cerSearch.trim()) return CER_PREFERITI.slice(0, 20);
    const q = cerSearch.toLowerCase();
    return CER_PREFERITI.filter(
      (c) => c.codice.toLowerCase().includes(q) || c.descrizione.toLowerCase().includes(q)
    );
  }, [cerSearch]);

  const selectCER = (cer: typeof CER_PREFERITI[0]) => {
    setForm((f) => ({
      ...f,
      cer: cer.codice,
      descrizione_rifiuto: cer.descrizione,
    }));
    setCerSearch("");
  };

  const handleSave = async () => {
    if (!form.cer.trim()) { toast.error("Seleziona un codice CER"); return; }
    if (!form.quantita_kg || parseFloat(form.quantita_kg) <= 0) { toast.error("Inserisci una quantità valida"); return; }
    if (!impianto?.id) { toast.error("Nessun impianto trovato per questo tenant"); return; }

    setSaving(true);
    try {
      const qty = parseFloat(form.quantita_kg);
      const { error } = await supabase.from("movimenti_impianto").insert({
        tenant_id: MULTY_TENANT_ID,
        impianto_id: impianto.id,
        tipo_movimento: form.tipo_movimento,
        ruolo_impianto: form.ruolo_impianto,
        cer: form.cer,
        descrizione_rifiuto: form.descrizione_rifiuto || null,
        quantita_kg: qty,
        quantita_presunta: form.quantita_presunta ? parseFloat(form.quantita_presunta) : null,
        produttore_denominazione: form.produttore_denominazione || null,
        trasportatore_denominazione: form.trasportatore_denominazione || null,
        destinatario_denominazione: form.destinatario_denominazione || null,
        numero_fir: form.numero_fir || null,
        origine: form.origine || null,
        esito_accettazione: form.esito_accettazione || null,
        note: form.note || null,
        data_movimento: form.data_movimento,
        created_by: user?.id || null,
      });
      if (error) throw error;

      toast.success("Movimento registrato e giacenza aggiornata");
      setForm({ ...emptyForm });
      setAddOpen(false);
      // Invalida tutte le viste che leggono movimenti/giacenze
      ["dev-registro-movimenti", "dev-movimenti-multy", "dev-mag-movimenti", "dev-mag-giacenze", "dev-giacenze"].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] })
      );
    } catch (e: any) {
      toast.error("Errore: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Totale", value: stats.total, icon: "📋" },
          { label: "Carichi", value: stats.carico, icon: "📥" },
          { label: "Scarichi", value: stats.scarico, icon: "📤" },
          { label: "Kg Totali", value: stats.totalKg.toLocaleString("it-IT"), icon: "⚖️" },
        ].map((s) => (
          <Card key={s.label} className="bg-card/60 border-emerald-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <span>{s.icon}</span>
                <span className="text-xs text-muted-foreground uppercase">{s.label}</span>
              </div>
              <span className="text-2xl font-bold text-foreground">{s.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cerca CER, produttore, FIR..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card/60 border-border/30" />
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-[140px] bg-card/60 border-border/30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="CARICO">Carico</SelectItem>
            <SelectItem value="SCARICO">Scarico</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading} className="border-emerald-500/30 text-emerald-400">
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
        <Button onClick={() => setAddOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" /> Nuovo Movimento
        </Button>
        <Button variant="outline" size="sm" onClick={() => {
          if (!filtered.length) return toast.error("Nessun movimento");
          const cols = [
            { header: "Data", key: "data_movimento", width: 12, format: (v: any) => new Date(v).toLocaleDateString("it-IT") },
            { header: "Tipo", key: "tipo_movimento", width: 10 },
            { header: "Ruolo", key: "ruolo_impianto", width: 14 },
            { header: "CER", key: "cer", width: 12 },
            { header: "Descrizione", key: "descrizione_rifiuto", width: 28 },
            { header: "Kg", key: "quantita_kg", width: 10 },
            { header: "Produttore", key: "produttore_denominazione", width: 20 },
            { header: "Trasportatore", key: "trasportatore_denominazione", width: 20 },
            { header: "N° FIR", key: "numero_fir", width: 16 },
            { header: "Esito", key: "esito_accettazione", width: 12 },
          ];
          exportToExcel(filtered, cols, "registro-carico-scarico", "Registro");
        }} className="gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
          <FileSpreadsheet className="h-3 w-3" /> Excel
        </Button>
        <Button variant="outline" size="sm" onClick={() => {
          if (!filtered.length) return toast.error("Nessun movimento");
          const cols = [
            { header: "Data", key: "data_movimento", width: 12, format: (v: any) => new Date(v).toLocaleDateString("it-IT") },
            { header: "Tipo", key: "tipo_movimento", width: 10 },
            { header: "CER", key: "cer", width: 12 },
            { header: "Kg", key: "quantita_kg", width: 10 },
            { header: "Produttore", key: "produttore_denominazione", width: 20 },
            { header: "N° FIR", key: "numero_fir", width: 16 },
          ];
          exportToPdf(filtered, cols, "registro-carico-scarico", "Registro Carico/Scarico — Multyproget");
        }} className="gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
          <Printer className="h-3 w-3" /> PDF
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-400" /></div>
      ) : (
        <Card className="bg-card/60 border-border/30">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-muted-foreground">
                    <th className="text-left p-3 text-xs uppercase">Data</th>
                    <th className="text-left p-3 text-xs uppercase">Tipo</th>
                    <th className="text-left p-3 text-xs uppercase">Ruolo</th>
                    <th className="text-left p-3 text-xs uppercase">CER</th>
                    <th className="text-left p-3 text-xs uppercase">Descrizione</th>
                    <th className="text-right p-3 text-xs uppercase">Kg</th>
                    <th className="text-left p-3 text-xs uppercase">Produttore</th>
                    <th className="text-left p-3 text-xs uppercase">Trasportatore</th>
                    <th className="text-left p-3 text-xs uppercase">N° FIR</th>
                    <th className="text-left p-3 text-xs uppercase">Esito</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m: any) => (
                    <tr key={m.id} className="border-b border-border/10 hover:bg-muted/5">
                      <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(m.data_movimento).toLocaleDateString("it-IT")}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={m.tipo_movimento === "CARICO"
                            ? "border-emerald-500/40 text-emerald-400"
                            : "border-blue-500/40 text-blue-400"
                          }
                        >
                          {m.tipo_movimento === "CARICO" ? (
                            <><ArrowDownToLine className="h-3 w-3 mr-1" />Carico</>
                          ) : (
                            <><ArrowUpFromLine className="h-3 w-3 mr-1" />Scarico</>
                          )}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{m.ruolo_impianto}</td>
                      <td className="p-3 font-mono text-foreground">
                        {m.cer}
                        {CER_PREFERITI.find(c => c.codice === m.cer)?.pericoloso && (
                          <AlertTriangle className="inline h-3 w-3 ml-1 text-amber-400" />
                        )}
                      </td>
                      <td className="p-3 text-foreground max-w-[200px] truncate" title={m.descrizione_rifiuto}>
                        {m.descrizione_rifiuto || "—"}
                      </td>
                      <td className="p-3 text-right font-mono text-foreground">{m.quantita_kg?.toLocaleString("it-IT")}</td>
                      <td className="p-3 text-muted-foreground text-xs">{m.produttore_denominazione || "—"}</td>
                      <td className="p-3 text-muted-foreground text-xs">{m.trasportatore_denominazione || "—"}</td>
                      <td className="p-3 font-mono text-xs text-emerald-400">{m.numero_fir || "—"}</td>
                      <td className="p-3">
                        {m.esito_accettazione && (
                          <Badge variant={m.esito_accettazione === "accettato" ? "default" : "destructive"} className="text-[10px]">
                            {m.esito_accettazione}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">Nessun movimento trovato</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuovo Movimento — Registro Carico/Scarico</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            {/* Tipo & Ruolo */}
            <div>
              <Label>Tipo Movimento</Label>
              <Select value={form.tipo_movimento} onValueChange={(v) => setForm((f) => ({ ...f, tipo_movimento: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CARICO">📥 Carico</SelectItem>
                  <SelectItem value="SCARICO">📤 Scarico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ruolo Impianto</Label>
              <Select value={form.ruolo_impianto} onValueChange={(v) => setForm((f) => ({ ...f, ruolo_impianto: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRODUTTORE">Produttore</SelectItem>
                  <SelectItem value="DESTINATARIO">Destinatario</SelectItem>
                  <SelectItem value="TRATTAMENTO_INTERNO">Trattamento Interno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* CER Selector */}
            <div className="col-span-2">
              <Label>Codice CER (da preferiti)</Label>
              <div className="relative">
                <Input
                  placeholder="Cerca CER preferito..."
                  value={form.cer ? `${form.cer} — ${form.descrizione_rifiuto}` : cerSearch}
                  onChange={(e) => {
                    setCerSearch(e.target.value);
                    if (form.cer) setForm((f) => ({ ...f, cer: "", descrizione_rifiuto: "" }));
                  }}
                  className="bg-card/60 border-border/30"
                />
                {cerSearch.trim() && !form.cer && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredCER.map((c) => (
                      <button
                        key={c.codice}
                        onClick={() => selectCER(c)}
                        className="w-full text-left px-3 py-2 hover:bg-muted/30 flex items-center gap-2 text-sm"
                      >
                        <span className="font-mono font-semibold text-foreground">{c.codice}</span>
                        {c.pericoloso && <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />}
                        <span className="text-muted-foreground truncate">{c.descrizione}</span>
                      </button>
                    ))}
                    {filteredCER.length === 0 && (
                      <div className="px-3 py-2 text-muted-foreground text-sm">Nessun CER trovato</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quantità */}
            <div>
              <Label>Quantità (Kg) *</Label>
              <Input type="number" value={form.quantita_kg} onChange={(e) => setForm((f) => ({ ...f, quantita_kg: e.target.value }))} className="bg-card/60 border-border/30" />
            </div>
            <div>
              <Label>Quantità Presunta (Kg)</Label>
              <Input type="number" value={form.quantita_presunta} onChange={(e) => setForm((f) => ({ ...f, quantita_presunta: e.target.value }))} className="bg-card/60 border-border/30" />
            </div>

            {/* Data & FIR */}
            <div>
              <Label>Data Movimento</Label>
              <Input type="date" value={form.data_movimento} onChange={(e) => setForm((f) => ({ ...f, data_movimento: e.target.value }))} className="bg-card/60 border-border/30" />
            </div>
            <div>
              <Label>Numero FIR</Label>
              <Input value={form.numero_fir} onChange={(e) => setForm((f) => ({ ...f, numero_fir: e.target.value }))} className="bg-card/60 border-border/30" />
            </div>

            {/* Soggetti */}
            <div>
              <Label>Produttore</Label>
              <Input value={form.produttore_denominazione} onChange={(e) => setForm((f) => ({ ...f, produttore_denominazione: e.target.value }))} className="bg-card/60 border-border/30" />
            </div>
            <div>
              <Label>Trasportatore</Label>
              <Input value={form.trasportatore_denominazione} onChange={(e) => setForm((f) => ({ ...f, trasportatore_denominazione: e.target.value }))} className="bg-card/60 border-border/30" />
            </div>
            <div>
              <Label>Destinatario</Label>
              <Input value={form.destinatario_denominazione} onChange={(e) => setForm((f) => ({ ...f, destinatario_denominazione: e.target.value }))} className="bg-card/60 border-border/30" />
            </div>
            <div>
              <Label>Esito Accettazione</Label>
              <Select value={form.esito_accettazione} onValueChange={(v) => setForm((f) => ({ ...f, esito_accettazione: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="accettato">Accettato</SelectItem>
                  <SelectItem value="respinto">Respinto</SelectItem>
                  <SelectItem value="parziale">Parziale</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Note */}
            <div className="col-span-2">
              <Label>Note</Label>
              <Textarea value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} className="bg-card/60 border-border/30" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Annulla</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Registra Movimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
