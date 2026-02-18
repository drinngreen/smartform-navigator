import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Search, Users, AlertTriangle, Package,
  Trash2, Receipt, Scale, FileUp, FileSpreadsheet,
} from "lucide-react";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Privato {
  id: string; nome: string; cognome: string; codice_fiscale: string;
  comune_residenza: string | null; numero_tessera: string | null;
  tipo_utenza: string; note: string | null; attivo: boolean;
}
interface LimiteCER {
  id: string; cer: string; tipo_utenza: string;
  limite_conferimento_kg: number | null; limite_annuo_kg: number | null;
  limite_mensile_kg: number | null; limite_giornaliero_kg: number | null;
  periodo_riferimento: string; note: string | null;
}
interface Conferimento {
  id: string; nome_privato: string; cer: string; kg_pesati: number;
  data: string; importo_pagato: number | null; metodo_pag: string | null;
  note: string | null; privato_id: string | null; cf_pi: string | null;
  tipo_utenza: string | null; numero_fir: string | null;
  quantita_presunta: number | null; stato_rifiuto: string | null;
  codice_ce: string | null; esito_pesata: string | null;
}
interface Ricevuta {
  id: string; numero_ricevuta: string; data_emissione: string;
  importo: number; note: string | null; conferimento_id: string | null;
}
interface Impianto { id: string; nome: string; }

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

function ExportButtons({ onPdf, onExcel }: { onPdf: () => void; onExcel: () => void }) {
  return (
    <div className="flex gap-1">
      <button onClick={onPdf} className="p-1.5 rounded-lg hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-colors" title="Esporta PDF"><FileUp className="h-4 w-4" /></button>
      <button onClick={onExcel} className="p-1.5 rounded-lg hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-colors" title="Esporta Excel"><FileSpreadsheet className="h-4 w-4" /></button>
    </div>
  );
}

const CONF_COLS = [
  { header: "Privato", key: "nome_privato", width: 25 },
  { header: "CF/P.IVA", key: "cf_pi", width: 20 },
  { header: "CER", key: "cer", width: 12 },
  { header: "Kg", key: "kg_pesati", width: 10 },
  { header: "Importo €", key: "importo_pagato", width: 12, format: (v: any) => v != null ? `€ ${v}` : "—" },
  { header: "Pagamento", key: "metodo_pag", width: 12 },
  { header: "Data", key: "data", width: 16, format: (v: any) => v ? new Date(v).toLocaleDateString("it-IT") : "—" },
  { header: "Note", key: "note", width: 20 },
];
const PRIV_COLS = [
  { header: "Cognome", key: "cognome", width: 18 },
  { header: "Nome", key: "nome", width: 18 },
  { header: "Codice Fiscale", key: "codice_fiscale", width: 20 },
  { header: "Comune", key: "comune_residenza", width: 16 },
  { header: "Tessera", key: "numero_tessera", width: 14 },
  { header: "Tipo Utenza", key: "tipo_utenza", width: 14 },
  { header: "Note", key: "note", width: 20 },
];
const LIM_COLS = [
  { header: "CER", key: "cer", width: 12 },
  { header: "Utenza", key: "tipo_utenza", width: 14 },
  { header: "Singolo kg", key: "limite_conferimento_kg", width: 12 },
  { header: "Annuo kg", key: "limite_annuo_kg", width: 12 },
  { header: "Mensile kg", key: "limite_mensile_kg", width: 12 },
  { header: "Giornaliero kg", key: "limite_giornaliero_kg", width: 14 },
  { header: "Note", key: "note", width: 18 },
];
const RIC_COLS = [
  { header: "N° Ricevuta", key: "numero_ricevuta", width: 16 },
  { header: "Dettagli", key: "note", width: 30 },
  { header: "Importo €", key: "importo", width: 12, format: (v: any) => `€ ${v ?? 0}` },
  { header: "Data", key: "data_emissione", width: 18, format: (v: any) => v ? new Date(v).toLocaleDateString("it-IT") : "—" },
];

export default function MNMagazzinoPage() {
  const { context } = useParams<{ context: string }>();

  const [activeTab, setActiveTab] = useState("conferimenti");
  const [impianti, setImpianti] = useState<Impianto[]>([]);
  const [selectedImpianto, setSelectedImpianto] = useState("");
  const [privati, setPrivati] = useState<Privato[]>([]);
  const [limiti, setLimiti] = useState<LimiteCER[]>([]);
  const [conferimenti, setConferimenti] = useState<Conferimento[]>([]);
  const [ricevute, setRicevute] = useState<Ricevuta[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [showNewPrivato, setShowNewPrivato] = useState(false);
  const [showNewConferimento, setShowNewConferimento] = useState(false);
  const [showNewLimite, setShowNewLimite] = useState(false);
  const [showNewRicevuta, setShowNewRicevuta] = useState(false);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  const [privatoForm, setPrivatoForm] = useState({ nome: "", cognome: "", codice_fiscale: "", comune_residenza: "", numero_tessera: "", tipo_utenza: "domestica", note: "" });
  const [confForm, setConfForm] = useState({ privato_id: "", nome_privato: "", cognome_privato: "", cf_privato: "", cer: "", kg_pesati: "", importo_pagato: "", metodo_pag: "contanti", note: "", numero_fir: "", quantita_presunta: "", stato_rifiuto: "", codice_ce: "", targa_automezzo: "", modello_automezzo: "" });
  const [privatoSearch, setPrivatoSearch] = useState("");
  const [showPrivatoDropdown, setShowPrivatoDropdown] = useState(false);
  const [limiteForm, setLimiteForm] = useState({ cer: "", tipo_utenza: "domestica", limite_conferimento_kg: "", limite_annuo_kg: "", limite_mensile_kg: "", limite_giornaliero_kg: "", periodo_riferimento: "annuale", note: "" });
  const [ricevutaForm, setRicevutaForm] = useState({ privato_id: "", nome_manuale: "", importo: "", note: "" });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("impianti").select("id, nome").order("nome");
      if (data && data.length > 0) { setImpianti(data); setSelectedImpianto(data[0].id); }
    })();
  }, []);

  const fetchAll = useCallback(async () => {
    if (!selectedImpianto) return;
    setLoading(true);
    const [privRes, limRes, confRes, ricRes] = await Promise.all([
      supabase.from("anagrafica_privati" as any).select("*").eq("impianto_id", selectedImpianto).order("cognome"),
      supabase.from("limiti_privati" as any).select("*").eq("impianto_id", selectedImpianto).order("cer"),
      supabase.from("privati_conferimenti").select("*").eq("impianto_id", selectedImpianto).order("data", { ascending: false }).limit(200),
      supabase.from("ricevute_privati" as any).select("*").eq("impianto_id", selectedImpianto).order("data_emissione", { ascending: false }).limit(200),
    ]);
    setPrivati((privRes.data as any) || []);
    setLimiti((limRes.data as any) || []);
    setConferimenti((confRes.data as any) || []);
    setRicevute((ricRes.data as any) || []);
    setLoading(false);
  }, [selectedImpianto]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const checkLimits = useCallback(async (privatoId: string, cer: string, kgNew: number) => {
    const privato = privati.find(p => p.id === privatoId);
    if (!privato) return null;
    const applicable = limiti.filter(l => l.cer === cer && l.tipo_utenza === privato.tipo_utenza);
    if (applicable.length === 0) return null;

    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
    const { data: existing } = await (supabase
      .from("privati_conferimenti").select("kg_pesati, data")
      .eq("impianto_id", selectedImpianto) as any).eq("privato_id", privatoId).eq("cer", cer).gte("data", yearStart);

    const totalAnnuo = (existing || []).reduce((s: number, c: any) => s + Number(c.kg_pesati), 0);
    const warnings: string[] = [];

    for (const lim of applicable) {
      if (lim.limite_conferimento_kg && kgNew > lim.limite_conferimento_kg)
        warnings.push(`⚠️ Supera limite singolo conferimento (${lim.limite_conferimento_kg} kg)`);
      if (lim.limite_annuo_kg && (totalAnnuo + kgNew) > lim.limite_annuo_kg)
        warnings.push(`⚠️ Supera limite annuo (${lim.limite_annuo_kg} kg). Già conferiti: ${totalAnnuo} kg`);
      if (lim.limite_mensile_kg) {
        const ms = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const monthly = (existing || []).filter((c: any) => c.data >= ms).reduce((s: number, c: any) => s + Number(c.kg_pesati), 0);
        if ((monthly + kgNew) > lim.limite_mensile_kg)
          warnings.push(`⚠️ Supera limite mensile (${lim.limite_mensile_kg} kg). Mese: ${monthly} kg`);
      }
      if (lim.limite_giornaliero_kg) {
        const today = new Date().toISOString().slice(0, 10);
        const daily = (existing || []).filter((c: any) => c.data?.startsWith(today)).reduce((s: number, c: any) => s + Number(c.kg_pesati), 0);
        if ((daily + kgNew) > lim.limite_giornaliero_kg)
          warnings.push(`⚠️ Supera limite giornaliero (${lim.limite_giornaliero_kg} kg). Oggi: ${daily} kg`);
      }
    }
    return warnings.length > 0 ? warnings.join("\n") : null;
  }, [privati, limiti, selectedImpianto]);

  const savePrivato = async () => {
    if (!privatoForm.nome || !privatoForm.cognome || !privatoForm.codice_fiscale) { toast.error("Nome, cognome e CF obbligatori"); return; }
    const { error } = await supabase.from("anagrafica_privati" as any).insert({ ...privatoForm, impianto_id: selectedImpianto } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Privato registrato");
    setShowNewPrivato(false);
    setPrivatoForm({ nome: "", cognome: "", codice_fiscale: "", comune_residenza: "", numero_tessera: "", tipo_utenza: "domestica", note: "" });
    fetchAll();
  };

  const getConfTipoUtenza = useCallback(() => {
    if (confForm.privato_id) {
      const p = privati.find(pr => pr.id === confForm.privato_id);
      return p?.tipo_utenza || "domestica";
    }
    return "domestica";
  }, [confForm.privato_id, privati]);

  const saveConferimento = async () => {
    const tipoUtenza = getConfTipoUtenza();
    const isSpeciali = tipoUtenza === "produttore_speciali";

    if (!confForm.cer || !confForm.kg_pesati) { toast.error("CER e kg obbligatori"); return; }
    if (isSpeciali && !confForm.numero_fir) { toast.error("Numero FIR obbligatorio per Produttore Speciali"); return; }
    const kg = parseFloat(confForm.kg_pesati);

    // Confronto pesata vs presunta per speciali
    let esitoPesata: string | null = null;
    if (isSpeciali && confForm.quantita_presunta) {
      const presunta = parseFloat(confForm.quantita_presunta);
      const diff = Math.abs(kg - presunta);
      const pctDiff = presunta > 0 ? (diff / presunta) * 100 : 0;
      if (pctDiff > 10) {
        esitoPesata = "respinto";
        toast.warning(`⚠️ Scostamento peso ${pctDiff.toFixed(1)}% (presunto: ${presunta} kg, pesato: ${kg} kg). Conferimento segnalato.`);
      } else {
        esitoPesata = "accettato";
      }
    }

    // Controllo limiti — BLOCCA se superati
    if (confForm.privato_id) {
      const w = await checkLimits(confForm.privato_id, confForm.cer, kg);
      if (w) {
        setLimitWarning(w);
        toast.error("Conferimento bloccato: limiti superati");
        return;
      }
    }

    const privato = privati.find(p => p.id === confForm.privato_id);
    const nomeFinale = privato ? `${privato.cognome} ${privato.nome}` : confForm.cognome_privato ? `${confForm.cognome_privato} ${confForm.nome_privato}`.trim() : "Anonimo";
    const cfFinale = privato?.codice_fiscale || confForm.cf_privato || null;
    const { data: confData, error } = await supabase.from("privati_conferimenti").insert({
      impianto_id: selectedImpianto, cer: confForm.cer, kg_pesati: kg,
      nome_privato: nomeFinale,
      cf_pi: cfFinale,
      importo_pagato: confForm.importo_pagato ? parseFloat(confForm.importo_pagato) : null,
      metodo_pag: confForm.metodo_pag || null, note: confForm.note || null,
      privato_id: confForm.privato_id || null,
      tipo_utenza: tipoUtenza,
      numero_fir: isSpeciali ? confForm.numero_fir : null,
      quantita_presunta: isSpeciali && confForm.quantita_presunta ? parseFloat(confForm.quantita_presunta) : null,
      stato_rifiuto: isSpeciali ? confForm.stato_rifiuto || null : null,
      codice_ce: isSpeciali ? confForm.codice_ce || null : null,
      esito_pesata: esitoPesata,
      targa_automezzo: confForm.targa_automezzo || null,
      modello_automezzo: confForm.modello_automezzo || null,
    } as any).select().single();
    if (error) { toast.error(error.message); return; }

    // Genera ricevuta automaticamente (per domestica/non_domestica)
    const conf = confData as any;
    if (conf && !isSpeciali) {
      const anno = new Date().getFullYear();
      const { data: numData } = await supabase.rpc("next_ricevuta_number", { p_impianto_id: selectedImpianto, p_anno: anno } as any);
      await supabase.from("ricevute_privati" as any).insert({
        impianto_id: selectedImpianto, conferimento_id: conf.id, privato_id: conf.privato_id,
        numero_ricevuta: (numData as any) || `${Date.now()}`, anno,
        importo: conf.importo_pagato || 0,
        note: `${nomeFinale} — CER ${conf.cer} — ${conf.kg_pesati} kg${conf.targa_automezzo ? ` — Targa: ${conf.targa_automezzo}` : ""}${conf.modello_automezzo ? ` — Modello: ${conf.modello_automezzo}` : ""}`,
      } as any);
    }

    toast.success(isSpeciali ? "Conferimento speciale registrato (FIR)" : "Conferimento e ricevuta registrati");
    setShowNewConferimento(false);
    setConfForm({ privato_id: "", nome_privato: "", cognome_privato: "", cf_privato: "", cer: "", kg_pesati: "", importo_pagato: "", metodo_pag: "contanti", note: "", numero_fir: "", quantita_presunta: "", stato_rifiuto: "", codice_ce: "", targa_automezzo: "", modello_automezzo: "" });
    setPrivatoSearch("");
    setLimitWarning(null);
    fetchAll();
  };

  const saveLimite = async () => {
    if (!limiteForm.cer) { toast.error("CER obbligatorio"); return; }
    const { error } = await supabase.from("limiti_privati" as any).insert({
      impianto_id: selectedImpianto, cer: limiteForm.cer, tipo_utenza: limiteForm.tipo_utenza,
      limite_conferimento_kg: limiteForm.limite_conferimento_kg ? parseFloat(limiteForm.limite_conferimento_kg) : null,
      limite_annuo_kg: limiteForm.limite_annuo_kg ? parseFloat(limiteForm.limite_annuo_kg) : null,
      limite_mensile_kg: limiteForm.limite_mensile_kg ? parseFloat(limiteForm.limite_mensile_kg) : null,
      limite_giornaliero_kg: limiteForm.limite_giornaliero_kg ? parseFloat(limiteForm.limite_giornaliero_kg) : null,
      periodo_riferimento: limiteForm.periodo_riferimento, note: limiteForm.note || null,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Limite salvato");
    setShowNewLimite(false);
    setLimiteForm({ cer: "", tipo_utenza: "domestica", limite_conferimento_kg: "", limite_annuo_kg: "", limite_mensile_kg: "", limite_giornaliero_kg: "", periodo_riferimento: "annuale", note: "" });
    fetchAll();
  };

  const generateRicevuta = async (conf: Conferimento) => {
    const anno = new Date().getFullYear();
    const { data: numData } = await supabase.rpc("next_ricevuta_number", { p_impianto_id: selectedImpianto, p_anno: anno } as any);
    const { error } = await supabase.from("ricevute_privati" as any).insert({
      impianto_id: selectedImpianto, conferimento_id: conf.id, privato_id: conf.privato_id,
      numero_ricevuta: (numData as any) || `${Date.now()}`, anno,
      importo: conf.importo_pagato || 0, note: `CER ${conf.cer} - ${conf.kg_pesati} kg`,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Ricevuta generata");
    fetchAll();
  };

  const saveRicevutaManuale = async () => {
    const anno = new Date().getFullYear();
    const { data: numData } = await supabase.rpc("next_ricevuta_number", { p_impianto_id: selectedImpianto, p_anno: anno } as any);
    const privato = privati.find(p => p.id === ricevutaForm.privato_id);
    const nomeNote = privato ? `${privato.cognome} ${privato.nome}` : ricevutaForm.nome_manuale || "";
    const noteFinale = [nomeNote, ricevutaForm.note].filter(Boolean).join(" — ");
    const { error } = await supabase.from("ricevute_privati" as any).insert({
      impianto_id: selectedImpianto, privato_id: ricevutaForm.privato_id || null,
      numero_ricevuta: (numData as any) || `${Date.now()}`, anno,
      importo: ricevutaForm.importo ? parseFloat(ricevutaForm.importo) : 0,
      note: noteFinale || null,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Ricevuta creata");
    setShowNewRicevuta(false);
    setRicevutaForm({ privato_id: "", nome_manuale: "", importo: "", note: "" });
    fetchAll();
  };

  const deletePrivato = async (id: string) => {
    const { error } = await supabase.from("anagrafica_privati" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Eliminato"); fetchAll(); }
  };

  const filteredPrivati = privati.filter(p => !search || `${p.cognome} ${p.nome} ${p.codice_fiscale}`.toLowerCase().includes(search.toLowerCase()));
  const filteredConf = conferimenti.filter(c => !search || `${c.nome_privato} ${c.cer}`.toLowerCase().includes(search.toLowerCase()));

  const totalKgOggi = conferimenti.filter(c => c.data?.startsWith(new Date().toISOString().slice(0, 10))).reduce((s, c) => s + Number(c.kg_pesati), 0);

  return (
    <MNAdminLayout title="Gestione Impianto" subtitle="Conferimenti Privati & Magazzino">
      {impianti.length > 1 && (
        <div className="mb-4 flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground">IMPIANTO</span>
          <Select value={selectedImpianto} onValueChange={setSelectedImpianto}>
            <SelectTrigger className="w-64 bg-card/60 border-border/30"><SelectValue /></SelectTrigger>
            <SelectContent>{impianti.map(i => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Users} label="Privati Attivi" value={privati.filter(p => p.attivo).length} color="16, 185, 129" />
        <StatCard icon={Package} label="Conferimenti" value={conferimenti.length} color="249, 115, 22" />
        <StatCard icon={Scale} label="Kg Oggi" value={`${totalKgOggi.toLocaleString("it-IT")} kg`} color="20, 184, 166" />
        <StatCard icon={Receipt} label="Ricevute" value={ricevute.length} color="59, 130, 246" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <TabsList className="bg-card/60 border border-border/30">
            <TabsTrigger value="conferimenti" className="text-xs font-mono">Conferimenti</TabsTrigger>
            <TabsTrigger value="anagrafica" className="text-xs font-mono">Anagrafica</TabsTrigger>
            <TabsTrigger value="limiti" className="text-xs font-mono">Limiti CER</TabsTrigger>
            <TabsTrigger value="ricevute" className="text-xs font-mono">Ricevute</TabsTrigger>
          </TabsList>
          <div className="flex-1" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cerca..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-48 bg-card/60 border-border/30 text-sm" />
          </div>
        </div>

        {/* CONFERIMENTI */}
        <TabsContent value="conferimenti">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-mono text-muted-foreground uppercase">Registro Conferimenti</h3>
              <div className="flex items-center gap-2">
                <ExportButtons
                  onPdf={() => exportToPdf(filteredConf, CONF_COLS, "conferimenti", "Registro Conferimenti")}
                  onExcel={() => exportToExcel(filteredConf, CONF_COLS, "conferimenti", "Conferimenti")}
                />
                <Dialog open={showNewConferimento} onOpenChange={v => { setShowNewConferimento(v); setLimitWarning(null); }}>
                  <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nuovo</Button></DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>Nuovo Conferimento</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-2">
                      {/* Ricerca privato esistente */}
                      <div className="relative">
                        <Label>Cerca Privato Registrato</Label>
                        <Input placeholder="Cognome, nome o CF..." value={privatoSearch}
                          onChange={e => { setPrivatoSearch(e.target.value); setShowPrivatoDropdown(true); }}
                          onFocus={() => setShowPrivatoDropdown(true)} className="bg-card/60 border-border/30" />
                        {showPrivatoDropdown && privatoSearch.length > 0 && (
                          <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-background shadow-lg">
                            {privati.filter(p => p.attivo && `${p.cognome} ${p.nome} ${p.codice_fiscale}`.toLowerCase().includes(privatoSearch.toLowerCase())).slice(0, 10).map(p => (
                              <button key={p.id} type="button" className="w-full text-left px-3 py-2 hover:bg-accent/20 text-sm transition-colors"
                                onClick={() => { setConfForm(f => ({ ...f, privato_id: p.id, nome_privato: p.nome, cognome_privato: p.cognome, cf_privato: p.codice_fiscale })); setPrivatoSearch(`${p.cognome} ${p.nome}`); setShowPrivatoDropdown(false); }}>
                                <span className="font-medium">{p.cognome} {p.nome}</span>
                                <span className="text-muted-foreground ml-2 text-xs font-mono">{p.codice_fiscale}</span>
                                {p.tipo_utenza === "produttore_speciali" && <span className="text-amber-400 ml-2 text-[10px] font-bold">(SPEC)</span>}
                                {p.tipo_utenza === "non_domestica" && <span className="text-muted-foreground ml-2 text-[10px]">(N.DOM)</span>}
                              </button>
                            ))}
                            {privati.filter(p => p.attivo && `${p.cognome} ${p.nome} ${p.codice_fiscale}`.toLowerCase().includes(privatoSearch.toLowerCase())).length === 0 && (
                              <div className="px-3 py-2 text-xs text-muted-foreground">Nessun risultato — compila manualmente</div>
                            )}
                          </div>
                        )}
                        {confForm.privato_id && (
                          <button type="button" className="absolute right-2 top-8 text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => { setConfForm(f => ({ ...f, privato_id: "", nome_privato: "", cognome_privato: "", cf_privato: "" })); setPrivatoSearch(""); }}>✕ Rimuovi</button>
                        )}
                      </div>
                      {!confForm.privato_id && (
                        <div className="space-y-3 p-3 rounded-xl border border-dashed border-border/40 bg-muted/20">
                          <p className="text-xs text-muted-foreground font-mono">DATI PRIVATO (inserisci manualmente)</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div><Label>Nome</Label><Input placeholder="Mario" value={confForm.nome_privato} onChange={e => setConfForm(f => ({ ...f, nome_privato: e.target.value }))} /></div>
                            <div><Label>Cognome</Label><Input placeholder="Rossi" value={confForm.cognome_privato} onChange={e => setConfForm(f => ({ ...f, cognome_privato: e.target.value }))} /></div>
                          </div>
                          <div><Label>Codice Fiscale / P.IVA</Label><Input placeholder="RSSMRA80A01H501Z" value={confForm.cf_privato} onChange={e => setConfForm(f => ({ ...f, cf_privato: e.target.value.toUpperCase() }))} /></div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>CER *</Label><Input placeholder="20 03 01" value={confForm.cer} onChange={e => { setConfForm(f => ({ ...f, cer: e.target.value })); setLimitWarning(null); }} /></div>
                        <div><Label>Kg *</Label><Input type="number" value={confForm.kg_pesati} onChange={e => { setConfForm(f => ({ ...f, kg_pesati: e.target.value })); setLimitWarning(null); }}
                          onBlur={async () => { if (confForm.privato_id && confForm.cer && confForm.kg_pesati) { const w = await checkLimits(confForm.privato_id, confForm.cer, parseFloat(confForm.kg_pesati)); setLimitWarning(w); } }} /></div>
                      </div>
                      {/* Campi extra per Produttore Speciali */}
                      {getConfTipoUtenza() === "produttore_speciali" && (
                        <>
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>⚠️ Per rifiuti speciali, il FIR compilato dal produttore è <strong>obbligatorio</strong> pena sanzioni. Dal 2026 è richiesto il FIR digitale RENTRI per certi produttori.</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><Label>Numero FIR *</Label><Input placeholder="AA00000000" value={confForm.numero_fir} onChange={e => setConfForm(f => ({ ...f, numero_fir: e.target.value.toUpperCase() }))} /></div>
                            <div><Label>Quantità Presunta (kg)</Label><Input type="number" placeholder="Es. 500" value={confForm.quantita_presunta} onChange={e => setConfForm(f => ({ ...f, quantita_presunta: e.target.value }))} /></div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><Label>Stato Fisico Rifiuto</Label>
                              <select className="w-full px-3 py-2 rounded-md bg-card/60 border border-border/30 text-sm text-foreground" value={confForm.stato_rifiuto} onChange={e => setConfForm(f => ({ ...f, stato_rifiuto: e.target.value }))}>
                                <option value="">— Seleziona —</option>
                                <option value="solido">Solido non pulverulento</option>
                                <option value="solido_pulverulento">Solido pulverulento</option>
                                <option value="fangoso">Fangoso palabile</option>
                                <option value="liquido">Liquido</option>
                              </select>
                            </div>
                            <div><Label>Codice C/E</Label>
                              <select className="w-full px-3 py-2 rounded-md bg-card/60 border border-border/30 text-sm text-foreground" value={confForm.codice_ce} onChange={e => setConfForm(f => ({ ...f, codice_ce: e.target.value }))}>
                                <option value="">— Seleziona —</option>
                                <option value="R12">R12 - Scambio rifiuti</option>
                                <option value="R13">R13 - Messa in riserva</option>
                                <option value="D13">D13 - Raggruppamento</option>
                                <option value="D14">D14 - Ricondizionamento</option>
                                <option value="D15">D15 - Deposito preliminare</option>
                              </select>
                            </div>
                          </div>
                        </>
                      )}
                      {limitWarning && (
                        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /><pre className="whitespace-pre-wrap font-mono text-xs">{limitWarning}</pre>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Importo €</Label><Input type="number" value={confForm.importo_pagato} onChange={e => setConfForm(f => ({ ...f, importo_pagato: e.target.value }))} /></div>
                        <div><Label>Pagamento</Label>
                          <select className="w-full px-3 py-2 rounded-md bg-card/60 border border-border/30 text-sm text-foreground" value={confForm.metodo_pag} onChange={e => setConfForm(f => ({ ...f, metodo_pag: e.target.value }))}>
                            <option value="contanti">Contanti</option><option value="pos">POS</option><option value="bonifico">Bonifico</option><option value="gratuito">Gratuito</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Targa Automezzo</Label><Input placeholder="AA000BB" value={confForm.targa_automezzo} onChange={e => setConfForm(f => ({ ...f, targa_automezzo: e.target.value.toUpperCase() }))} /></div>
                        <div><Label>Modello Automezzo</Label><Input placeholder="Es. Fiat Ducato" value={confForm.modello_automezzo} onChange={e => setConfForm(f => ({ ...f, modello_automezzo: e.target.value }))} /></div>
                      </div>
                      <div><Label>Note</Label><Textarea value={confForm.note} onChange={e => setConfForm(f => ({ ...f, note: e.target.value }))} /></div>
                      <Button onClick={saveConferimento} className="w-full">Registra Conferimento</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="rounded-2xl bg-card/60 border border-border/30 overflow-hidden">
              <div className="grid grid-cols-[1fr_100px_80px_80px_120px] gap-2 px-4 py-2 border-b border-border/20 text-xs font-mono text-muted-foreground uppercase">
                <span>Privato</span><span>CER</span><span>Kg</span><span>€</span><span>Data</span>
              </div>
              {loading ? <div className="p-8 text-center text-muted-foreground text-sm">Caricamento...</div>
                : filteredConf.length === 0 ? <div className="p-8 text-center text-muted-foreground text-sm">Nessun conferimento</div>
                : filteredConf.map(c => (
                  <div key={c.id} className="grid grid-cols-[1fr_100px_80px_80px_120px] gap-2 px-4 py-3 border-b border-border/10 hover:bg-accent/5 items-center">
                    <div className="flex flex-col"><span className="text-sm font-medium text-foreground truncate">{c.nome_privato}</span>{c.cf_pi && <span className="text-[10px] text-muted-foreground">{c.cf_pi}</span>}</div>
                    <Badge variant="outline" className="text-xs font-mono w-fit">{c.cer}</Badge>
                    <span className="text-sm font-mono text-foreground">{c.kg_pesati}</span>
                    <span className="text-sm font-mono text-foreground">{c.importo_pagato ?? "—"}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">{c.data ? format(new Date(c.data), "dd/MM/yy", { locale: it }) : "—"}</span>
                      {ricevute.find(r => r.conferimento_id === c.id) ? (
                        <Receipt className="h-3.5 w-3.5 text-primary ml-1" />
                      ) : (
                        <span className="text-[10px] text-muted-foreground ml-1">no ric.</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </TabsContent>

        {/* ANAGRAFICA */}
        <TabsContent value="anagrafica">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-mono text-muted-foreground uppercase">Anagrafica Privati</h3>
              <div className="flex items-center gap-2">
                <ExportButtons
                  onPdf={() => exportToPdf(filteredPrivati, PRIV_COLS, "anagrafica_privati", "Anagrafica Privati")}
                  onExcel={() => exportToExcel(filteredPrivati, PRIV_COLS, "anagrafica_privati", "Anagrafica")}
                />
              <Dialog open={showNewPrivato} onOpenChange={setShowNewPrivato}>
                <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nuovo</Button></DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Registra Privato</DialogTitle></DialogHeader>
                  <div className="grid gap-4 py-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Nome *</Label><Input value={privatoForm.nome} onChange={e => setPrivatoForm(f => ({ ...f, nome: e.target.value }))} /></div>
                      <div><Label>Cognome *</Label><Input value={privatoForm.cognome} onChange={e => setPrivatoForm(f => ({ ...f, cognome: e.target.value }))} /></div>
                    </div>
                    <div><Label>Codice Fiscale *</Label><Input value={privatoForm.codice_fiscale} onChange={e => setPrivatoForm(f => ({ ...f, codice_fiscale: e.target.value.toUpperCase() }))} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Comune</Label><Input value={privatoForm.comune_residenza} onChange={e => setPrivatoForm(f => ({ ...f, comune_residenza: e.target.value }))} /></div>
                      <div><Label>N° Tessera</Label><Input value={privatoForm.numero_tessera} onChange={e => setPrivatoForm(f => ({ ...f, numero_tessera: e.target.value }))} /></div>
                    </div>
                    <div><Label>Tipo Utenza</Label>
                      <Select value={privatoForm.tipo_utenza} onValueChange={v => setPrivatoForm(f => ({ ...f, tipo_utenza: v }))}>
                        <SelectTrigger className="bg-card/60"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="domestica">Domestica</SelectItem>
                          <SelectItem value="non_domestica">Non Domestica / Assimilata</SelectItem>
                          <SelectItem value="produttore_speciali">Produttore Speciali</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Note</Label><Textarea value={privatoForm.note} onChange={e => setPrivatoForm(f => ({ ...f, note: e.target.value }))} /></div>
                    <Button onClick={savePrivato} className="w-full">Registra</Button>
                  </div>
                </DialogContent>
              </Dialog>
              </div>
            </div>
            <div className="rounded-2xl bg-card/60 border border-border/30 overflow-hidden">
              <div className="grid grid-cols-[1fr_150px_120px_80px_60px] gap-2 px-4 py-2 border-b border-border/20 text-xs font-mono text-muted-foreground uppercase">
                <span>Nome</span><span>C.F.</span><span>Comune</span><span>Tipo</span><span></span>
              </div>
              {filteredPrivati.length === 0 ? <div className="p-8 text-center text-muted-foreground text-sm">Nessun privato</div>
                : filteredPrivati.map(p => (
                  <div key={p.id} className="grid grid-cols-[1fr_150px_120px_80px_60px] gap-2 px-4 py-3 border-b border-border/10 hover:bg-accent/5 items-center">
                    <span className="text-sm font-medium text-foreground">{p.cognome} {p.nome}</span>
                    <span className="text-xs font-mono text-muted-foreground">{p.codice_fiscale}</span>
                    <span className="text-xs text-muted-foreground">{p.comune_residenza || "—"}</span>
                    <Badge variant={p.tipo_utenza === "domestica" ? "default" : p.tipo_utenza === "produttore_speciali" ? "destructive" : "secondary"} className="text-[10px]">{p.tipo_utenza === "domestica" ? "DOM" : p.tipo_utenza === "produttore_speciali" ? "SPEC" : "N.DOM"}</Badge>
                    <button onClick={() => deletePrivato(p.id)} className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
            </div>
          </div>
        </TabsContent>

        {/* LIMITI */}
        <TabsContent value="limiti">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-mono text-muted-foreground uppercase">Limiti CER</h3>
              <div className="flex items-center gap-2">
                <ExportButtons
                  onPdf={() => exportToPdf(limiti, LIM_COLS, "limiti_cer", "Limiti CER")}
                  onExcel={() => exportToExcel(limiti, LIM_COLS, "limiti_cer", "Limiti")}
                />
              <Dialog open={showNewLimite} onOpenChange={setShowNewLimite}>
                <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nuovo</Button></DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Imposta Limite</DialogTitle></DialogHeader>
                  <div className="grid gap-4 py-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>CER *</Label><Input placeholder="20 03 01" value={limiteForm.cer} onChange={e => setLimiteForm(f => ({ ...f, cer: e.target.value }))} /></div>
                      <div><Label>Utenza</Label>
                        <Select value={limiteForm.tipo_utenza} onValueChange={v => setLimiteForm(f => ({ ...f, tipo_utenza: v }))}>
                          <SelectTrigger className="bg-card/60"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="domestica">Domestica</SelectItem>
                            <SelectItem value="non_domestica">Non Domestica / Assimilata</SelectItem>
                            <SelectItem value="produttore_speciali">Produttore Speciali</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Singolo (kg)</Label><Input type="number" value={limiteForm.limite_conferimento_kg} onChange={e => setLimiteForm(f => ({ ...f, limite_conferimento_kg: e.target.value }))} /></div>
                      <div><Label>Annuo (kg)</Label><Input type="number" value={limiteForm.limite_annuo_kg} onChange={e => setLimiteForm(f => ({ ...f, limite_annuo_kg: e.target.value }))} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Mensile (kg)</Label><Input type="number" value={limiteForm.limite_mensile_kg} onChange={e => setLimiteForm(f => ({ ...f, limite_mensile_kg: e.target.value }))} /></div>
                      <div><Label>Giornaliero (kg)</Label><Input type="number" value={limiteForm.limite_giornaliero_kg} onChange={e => setLimiteForm(f => ({ ...f, limite_giornaliero_kg: e.target.value }))} /></div>
                    </div>
                    <div><Label>Note</Label><Textarea value={limiteForm.note} onChange={e => setLimiteForm(f => ({ ...f, note: e.target.value }))} /></div>
                    <Button onClick={saveLimite} className="w-full">Salva</Button>
                  </div>
                </DialogContent>
              </Dialog>
              </div>
            </div>
            <div className="rounded-2xl bg-card/60 border border-border/30 overflow-hidden">
              <div className="grid grid-cols-[100px_80px_1fr_1fr_1fr_1fr] gap-2 px-4 py-2 border-b border-border/20 text-xs font-mono text-muted-foreground uppercase">
                <span>CER</span><span>Utenza</span><span>Singolo</span><span>Annuo</span><span>Mensile</span><span>Giorn.</span>
              </div>
              {limiti.length === 0 ? <div className="p-8 text-center text-muted-foreground text-sm">Nessun limite</div>
                : limiti.map(l => (
                  <div key={l.id} className="grid grid-cols-[100px_80px_1fr_1fr_1fr_1fr] gap-2 px-4 py-3 border-b border-border/10 hover:bg-accent/5 items-center">
                    <Badge variant="outline" className="text-xs font-mono w-fit">{l.cer}</Badge>
                    <span className="text-xs text-muted-foreground">{l.tipo_utenza === "domestica" ? "DOM" : l.tipo_utenza === "produttore_speciali" ? "SPEC" : "N.DOM"}</span>
                    <span className="text-sm font-mono text-foreground">{l.limite_conferimento_kg ?? "—"}</span>
                    <span className="text-sm font-mono text-foreground">{l.limite_annuo_kg ?? "—"}</span>
                    <span className="text-sm font-mono text-foreground">{l.limite_mensile_kg ?? "—"}</span>
                    <span className="text-sm font-mono text-foreground">{l.limite_giornaliero_kg ?? "—"}</span>
                  </div>
                ))}
            </div>
          </div>
        </TabsContent>

        {/* RICEVUTE */}
        <TabsContent value="ricevute">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-mono text-muted-foreground uppercase">Ricevute Emesse</h3>
              <div className="flex items-center gap-2">
                <ExportButtons
                  onPdf={() => exportToPdf(ricevute, RIC_COLS, "ricevute", "Ricevute Emesse")}
                  onExcel={() => exportToExcel(ricevute, RIC_COLS, "ricevute", "Ricevute")}
                />
                <Dialog open={showNewRicevuta} onOpenChange={setShowNewRicevuta}>
                  <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Crea Ricevuta</Button></DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Nuova Ricevuta Manuale</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-2">
                      <div>
                        <Label>Privato da anagrafica (opzionale)</Label>
                        <Select value={ricevutaForm.privato_id} onValueChange={v => setRicevutaForm(f => ({ ...f, privato_id: v, nome_manuale: "" }))}>
                          <SelectTrigger className="bg-card/60"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                          <SelectContent>{privati.map(p => <SelectItem key={p.id} value={p.id}>{p.cognome} {p.nome}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      {!ricevutaForm.privato_id && (
                        <div><Label>Oppure scrivi Nome e Cognome</Label><Input placeholder="Es. Rossi Mario" value={ricevutaForm.nome_manuale} onChange={e => setRicevutaForm(f => ({ ...f, nome_manuale: e.target.value }))} /></div>
                      )}
                      {ricevutaForm.privato_id && (
                        <button type="button" className="text-xs text-muted-foreground hover:text-foreground underline text-left" onClick={() => setRicevutaForm(f => ({ ...f, privato_id: "" }))}>✏️ Inserisci manualmente</button>
                      )}
                      <div><Label>Importo €</Label><Input type="number" step="0.01" value={ricevutaForm.importo} onChange={e => setRicevutaForm(f => ({ ...f, importo: e.target.value }))} /></div>
                      <div><Label>Note / Descrizione</Label><Textarea value={ricevutaForm.note} onChange={e => setRicevutaForm(f => ({ ...f, note: e.target.value }))} placeholder="Descrizione libera..." /></div>
                      <Button onClick={saveRicevutaManuale} className="w-full">Crea Ricevuta</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="rounded-2xl bg-card/60 border border-border/30 overflow-hidden">
              <div className="grid grid-cols-[120px_1fr_100px_120px] gap-2 px-4 py-2 border-b border-border/20 text-xs font-mono text-muted-foreground uppercase">
                <span>N° Ricevuta</span><span>Dettagli</span><span>Importo</span><span>Data</span>
              </div>
              {ricevute.length === 0 ? <div className="p-8 text-center text-muted-foreground text-sm">Nessuna ricevuta</div>
                : ricevute.map(r => (
                  <div key={r.id} className="grid grid-cols-[120px_1fr_100px_120px] gap-2 px-4 py-3 border-b border-border/10 hover:bg-accent/5 items-center">
                    <span className="text-sm font-mono font-bold text-foreground">{r.numero_ricevuta}</span>
                    <span className="text-xs text-muted-foreground truncate">{r.note || "—"}</span>
                    <span className="text-sm font-mono text-foreground">€ {r.importo}</span>
                    <span className="text-xs text-muted-foreground">{r.data_emissione ? format(new Date(r.data_emissione), "dd/MM/yy HH:mm", { locale: it }) : "—"}</span>
                  </div>
                ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </MNAdminLayout>
  );
}
