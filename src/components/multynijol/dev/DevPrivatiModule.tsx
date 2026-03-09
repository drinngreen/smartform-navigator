import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Upload, FileText, Users, ShieldAlert, Plus, Receipt, Scale, Search, FileSpreadsheet, Printer, Trash2 } from "lucide-react";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";
import { toast } from "sonner";

const MULTY_TENANT_ID = "dc2a6046-d9a8-4549-8e45-82367d695ac6";

const CER_CRITICI: Record<string, { label: string; limite_annuo_kg: number }> = {
  "200140": { label: "Metalli", limite_annuo_kg: 200 },
  "200307": { label: "Rifiuti ingombranti", limite_annuo_kg: 300 },
  "200101": { label: "Carta e cartone", limite_annuo_kg: 500 },
  "200110": { label: "Abbigliamento", limite_annuo_kg: 200 },
};

export function DevPrivatiModule() {
  const queryClient = useQueryClient();
  const [searchPrivato, setSearchPrivato] = useState("");
  const [selectedPrivatoId, setSelectedPrivatoId] = useState<string | null>(null);
  const [conferimentoPrivatoId, setConferimentoPrivatoId] = useState<string | null>(null);
  const [ricevutaPrivatoId, setRicevutaPrivatoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showNewConferimento, setShowNewConferimento] = useState(false);
  const [showNewRicevuta, setShowNewRicevuta] = useState(false);
  const [showNewPrivato, setShowNewPrivato] = useState(false);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  // Forms
  const [confForm, setConfForm] = useState({ cer: "", kg_pesati: "", importo_pagato: "", metodo_pag: "contanti", note: "", targa_automezzo: "", modello_automezzo: "" });
  const [ricevutaForm, setRicevutaForm] = useState({ importo: "", note: "" });
  const [privatoForm, setPrivatoForm] = useState({ nome: "", cognome: "", codice_fiscale: "", comune_residenza: "", numero_tessera: "", tipo_utenza: "domestica", note: "" });

  // Fetch impianti for the tenant
  const { data: impianti } = useQuery({
    queryKey: ["dev-impianti", MULTY_TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase.from("impianti").select("id, nome").eq("tenant_id", MULTY_TENANT_ID);
      if (error) throw error;
      return data;
    },
  });
  const impiantoId = impianti?.[0]?.id;

  const { data: privati } = useQuery({
    queryKey: ["dev-privati", MULTY_TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase.from("anagrafica_privati").select("*").eq("tenant_id", MULTY_TENANT_ID).eq("attivo", true).order("cognome");
      if (error) throw error;
      return data;
    },
  });

  const { data: conferimenti } = useQuery({
    queryKey: ["dev-conferimenti-anno", MULTY_TENANT_ID],
    queryFn: async () => {
      const annoCorrente = new Date().getFullYear();
      const { data, error } = await supabase.from("privati_conferimenti").select("privato_id, cer, kg_pesati, data").eq("tenant_id", MULTY_TENANT_ID).gte("data", `${annoCorrente}-01-01`);
      if (error) throw error;
      return data;
    },
  });

  const { data: ricevute } = useQuery({
    queryKey: ["dev-ricevute", MULTY_TENANT_ID, selectedPrivatoId],
    queryFn: async () => {
      if (!selectedPrivatoId) return [];
      const { data, error } = await supabase
        .from("ricevute_privati" as any)
        .select("id, numero_ricevuta, anno, importo, note, created_at")
        .eq("tenant_id", MULTY_TENANT_ID)
        .eq("privato_id", selectedPrivatoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!selectedPrivatoId,
  });

  const { data: documenti } = useQuery({
    queryKey: ["dev-documenti", selectedPrivatoId],
    queryFn: async () => {
      if (!selectedPrivatoId) return [];
      const { data, error } = await supabase.from("documenti_privati").select("*").eq("anagrafica_id", selectedPrivatoId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPrivatoId,
  });

  const uploadDoc = useMutation({
    mutationFn: async (file: File) => {
      if (!selectedPrivatoId) throw new Error("Seleziona un privato");
      const path = `${MULTY_TENANT_ID}/${selectedPrivatoId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documenti-privati").upload(path, file);
      if (uploadError) throw uploadError;
      const { error: dbError } = await supabase.from("documenti_privati").insert({
        anagrafica_id: selectedPrivatoId, tenant_id: MULTY_TENANT_ID,
        nome_file: file.name, storage_path: path, tipo_documento: "documento_identita",
      });
      if (dbError) throw dbError;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["dev-documenti"] }); toast.success("Documento caricato"); },
    onError: (e) => toast.error("Errore upload: " + e.message),
  });

  const getCerUsage = (privatoId: string) => {
    if (!conferimenti) return {};
    const usage: Record<string, number> = {};
    for (const c of conferimenti) {
      if (c.privato_id === privatoId) {
        usage[c.cer] = (usage[c.cer] || 0) + Number(c.kg_pesati);
      }
    }
    return usage;
  };

  const checkLimits = async (privatoId: string, cer: string, kgNew: number): Promise<string | null> => {
    if (!privatoId || !impiantoId) return null;
    const privato = privati?.find(p => p.id === privatoId);
    if (!privato) return null;
    const critico = CER_CRITICI[cer];
    if (!critico) return null;
    const usage = getCerUsage(privatoId);
    const totalAnnuo = (usage[cer] || 0) + kgNew;
    if (totalAnnuo > critico.limite_annuo_kg) {
      return `⚠️ LIMITE SUPERATO per CER ${cer}: ${totalAnnuo} kg / ${critico.limite_annuo_kg} kg annui`;
    }
    if (totalAnnuo >= critico.limite_annuo_kg * 0.8) {
      return `⚠️ Attenzione: ${totalAnnuo} kg / ${critico.limite_annuo_kg} kg annui (${Math.round(totalAnnuo / critico.limite_annuo_kg * 100)}%)`;
    }
    return null;
  };

  const handleSaveConferimento = async () => {
    const targetPrivatoId = conferimentoPrivatoId ?? selectedPrivatoId;
    if (!targetPrivatoId) {
      toast.error("Seleziona un privato");
      return;
    }
    if (!impiantoId) {
      toast.error("Nessun impianto configurato");
      return;
    }
    if (!confForm.cer || !confForm.kg_pesati) {
      toast.error("CER e kg obbligatori");
      return;
    }

    const kg = parseFloat(confForm.kg_pesati);

    // Check limits - BLOCK if exceeded
    const warning = await checkLimits(targetPrivatoId, confForm.cer, kg);
    if (warning && warning.includes("LIMITE SUPERATO")) {
      setLimitWarning(warning);
      toast.error("Conferimento BLOCCATO: limite annuo superato");
      return;
    }
    if (warning) setLimitWarning(warning);

    const privato = privati?.find((p) => p.id === targetPrivatoId);
    const nomeFinale = privato ? `${privato.cognome} ${privato.nome}` : "Anonimo";

    const { data: confData, error } = await supabase
      .from("privati_conferimenti")
      .insert({
        impianto_id: impiantoId,
        cer: confForm.cer,
        kg_pesati: kg,
        nome_privato: nomeFinale,
        cf_pi: privato?.codice_fiscale || null,
        importo_pagato: confForm.importo_pagato ? parseFloat(confForm.importo_pagato) : null,
        metodo_pag: confForm.metodo_pag || null,
        note: confForm.note || null,
        privato_id: targetPrivatoId,
        tipo_utenza: privato?.tipo_utenza || "domestica",
        targa_automezzo: confForm.targa_automezzo || null,
        modello_automezzo: confForm.modello_automezzo || null,
      } as any)
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    // Auto-generate receipt
    const conf = confData as any;
    if (conf) {
      const anno = new Date().getFullYear();
      const { data: numData } = await supabase.rpc(
        "next_ricevuta_number",
        { p_impianto_id: impiantoId, p_anno: anno } as any
      );
      await supabase.from("ricevute_privati" as any).insert({
        tenant_id: MULTY_TENANT_ID,
        impianto_id: impiantoId,
        conferimento_id: conf.id,
        privato_id: targetPrivatoId,
        numero_ricevuta: (numData as any) || `${Date.now()}`,
        anno,
        importo: conf.importo_pagato || 0,
        note: `${nomeFinale} — CER ${conf.cer} — ${conf.kg_pesati} kg${conf.targa_automezzo ? ` — Targa: ${conf.targa_automezzo}` : ""}`,
      } as any);
    }

    toast.success("✅ Conferimento e ricevuta registrati!");
    setShowNewConferimento(false);
    setConferimentoPrivatoId(null);
    setConfForm({
      cer: "",
      kg_pesati: "",
      importo_pagato: "",
      metodo_pag: "contanti",
      note: "",
      targa_automezzo: "",
      modello_automezzo: "",
    });
    setLimitWarning(null);
    queryClient.invalidateQueries({ queryKey: ["dev-conferimenti-anno"] });
    queryClient.invalidateQueries({ queryKey: ["dev-ricevute"] });
  };

  const handleSaveRicevutaManuale = async () => {
    const targetPrivatoId = ricevutaPrivatoId ?? selectedPrivatoId;
    if (!targetPrivatoId) {
      toast.error("Seleziona un privato");
      return;
    }
    if (!impiantoId) {
      toast.error("Nessun impianto configurato");
      return;
    }

    const privato = privati?.find((p) => p.id === targetPrivatoId);
    const nomeNote = privato ? `${privato.cognome} ${privato.nome}` : "";
    const anno = new Date().getFullYear();
    const { data: numData } = await supabase.rpc(
      "next_ricevuta_number",
      { p_impianto_id: impiantoId, p_anno: anno } as any
    );
    const { error } = await supabase.from("ricevute_privati" as any).insert({
      impianto_id: impiantoId,
      privato_id: targetPrivatoId,
      numero_ricevuta: (numData as any) || `${Date.now()}`,
      anno,
      importo: ricevutaForm.importo ? parseFloat(ricevutaForm.importo) : 0,
      note: [nomeNote, ricevutaForm.note].filter(Boolean).join(" — ") || null,
    } as any);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("✅ Ricevuta manuale generata!");
    setShowNewRicevuta(false);
    setRicevutaPrivatoId(null);
    setRicevutaForm({ importo: "", note: "" });
    queryClient.invalidateQueries({ queryKey: ["dev-ricevute"] });
  };

  const handleDeleteRicevuta = async (ricevutaId: string) => {
    const ok = window.confirm("Eliminare questa ricevuta?");
    if (!ok) return;
    const { error } = await supabase.from("ricevute_privati" as any).delete().eq("id", ricevutaId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Ricevuta eliminata");
    queryClient.invalidateQueries({ queryKey: ["dev-ricevute"] });
  };

  const handlePrintRicevute = () => {
    if (!ricevute?.length) {
      toast.error("Nessuna ricevuta da stampare");
      return;
    }
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head><title>Ricevute Privati</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #333; padding: 8px; text-align: left; }
        th { background: #16a34a; color: white; }
        h1 { color: #16a34a; }
      </style></head><body>
      <h1>Ricevute — ${selectedPrivato?.cognome || ""} ${selectedPrivato?.nome || ""}</h1>
      <table>
        <thead><tr><th>Numero</th><th>Data</th><th>Importo</th><th>Note</th></tr></thead>
        <tbody>
          ${ricevute.map(r => `<tr><td>${r.numero_ricevuta || "-"}</td><td>${new Date(r.created_at).toLocaleDateString("it-IT")}</td><td>€ ${Number(r.importo || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</td><td>${r.note || "-"}</td></tr>`).join("")}
        </tbody>
      </table>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  const handleSavePrivato = async () => {
    if (!privatoForm.nome || !privatoForm.cognome || !privatoForm.codice_fiscale) {
      toast.error("Nome, cognome e CF obbligatori");
      return;
    }
    const { error } = await supabase.from("anagrafica_privati").insert({
      ...privatoForm, tenant_id: MULTY_TENANT_ID, impianto_id: impiantoId,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("✅ Privato registrato");
    setShowNewPrivato(false);
    setPrivatoForm({ nome: "", cognome: "", codice_fiscale: "", comune_residenza: "", numero_tessera: "", tipo_utenza: "domestica", note: "" });
    queryClient.invalidateQueries({ queryKey: ["dev-privati"] });
  };

  const filteredPrivati = privati?.filter(p =>
    !searchPrivato ||
    `${p.nome} ${p.cognome} ${p.codice_fiscale}`.toLowerCase().includes(searchPrivato.toLowerCase())
  );

  const selectedPrivato = privati?.find(p => p.id === selectedPrivatoId);
  const activeConferimentoPrivato = privati?.find(p => p.id === (conferimentoPrivatoId ?? selectedPrivatoId));
  const activeRicevutaPrivato = privati?.find(p => p.id === (ricevutaPrivatoId ?? selectedPrivatoId));
  const selectedUsage = selectedPrivatoId ? getCerUsage(selectedPrivatoId) : {};

  return (
    <div className="space-y-4">
      {/* CER Limits Alert */}
      <Card className="bg-red-950/30 border-red-500/30">
        <CardHeader>
          <CardTitle className="text-red-400 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" /> Codici CER Critici — Limiti Normativi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(CER_CRITICI).map(([cer, info]) => (
              <div key={cer} className="flex items-center gap-2 text-sm p-2 rounded bg-card/30 border border-border/20">
                <span className="font-mono text-amber-300">{cer}</span>
                <span className="text-muted-foreground text-xs">{info.label}</span>
                <span className="ml-auto text-red-400 font-bold text-xs">{info.limite_annuo_kg}kg</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => setShowNewPrivato(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" /> Nuovo Privato
        </Button>
        <Button onClick={() => {
          if (!selectedPrivatoId) { toast.error("Seleziona un privato"); return; }
          setConferimentoPrivatoId(selectedPrivatoId);
          setShowNewConferimento(true);
        }}
          variant="outline" className="gap-2 border-emerald-500/30 text-emerald-400">
          <Scale className="h-4 w-4" /> Nuovo Conferimento
        </Button>
        <Button onClick={() => {
          if (!selectedPrivatoId) { toast.error("Seleziona un privato"); return; }
          setRicevutaPrivatoId(selectedPrivatoId);
          setShowNewRicevuta(true);
        }}
          variant="outline" className="gap-2 border-emerald-500/30 text-emerald-400">
          <Receipt className="h-4 w-4" /> Ricevuta Manuale
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cerca privato (nome, cognome, CF)..." value={searchPrivato}
          onChange={(e) => setSearchPrivato(e.target.value)} className="pl-10 max-w-md bg-card/60 border-border/50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lista Privati */}
        <Card className="bg-card/60 border-border/30">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="text-emerald-400 flex items-center gap-2">
                <Users className="h-5 w-5" /> Anagrafica Privati ({filteredPrivati?.length ?? 0})
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => {
                  if (!filteredPrivati?.length) return;
                  const cols = [
                    { header: "Cognome", key: "cognome", width: 16 },
                    { header: "Nome", key: "nome", width: 16 },
                    { header: "CF", key: "codice_fiscale", width: 18 },
                    { header: "Comune", key: "comune_residenza", width: 16 },
                    { header: "Tipo", key: "tipo_utenza", width: 12 },
                    { header: "Tessera", key: "numero_tessera", width: 12 },
                  ];
                  exportToExcel(filteredPrivati, cols, "privati-dev", "Privati");
                }} className="gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 h-7 text-xs">
                  <FileSpreadsheet className="h-3 w-3" /> Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  if (!filteredPrivati?.length) return;
                  const cols = [
                    { header: "Cognome", key: "cognome", width: 16 },
                    { header: "Nome", key: "nome", width: 16 },
                    { header: "CF", key: "codice_fiscale", width: 18 },
                    { header: "Comune", key: "comune_residenza", width: 16 },
                    { header: "Tipo", key: "tipo_utenza", width: 12 },
                    { header: "Tessera", key: "numero_tessera", width: 12 },
                  ];
                  exportToPdf(filteredPrivati, cols, "privati-dev", "Anagrafica Privati — Multyproget Dev");
                }} className="gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 h-7 text-xs">
                  <Printer className="h-3 w-3" /> PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            {filteredPrivati?.map((p) => {
              const usage = getCerUsage(p.id);
              const hasWarning = Object.entries(usage).some(([cer, kg]) =>
                CER_CRITICI[cer] && kg >= CER_CRITICI[cer].limite_annuo_kg * 0.8
              );
              return (
                <div key={p.id} onClick={() => setSelectedPrivatoId(p.id)}
                  className={`p-3 rounded cursor-pointer mb-1 border transition-all ${
                    selectedPrivatoId === p.id ? "bg-emerald-500/10 border-emerald-500/30" : "bg-card/30 border-border/10 hover:bg-white/5"
                  }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{p.cognome} {p.nome}</span>
                      <span className="ml-2 text-xs text-muted-foreground font-mono">{p.codice_fiscale}</span>
                    </div>
                    {hasWarning && <AlertTriangle className="h-4 w-4 text-amber-400" />}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {p.tipo_utenza} · {p.comune_residenza || "-"}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Detail Panel */}
        <div className="space-y-4">
          {selectedPrivato ? (
            <>
              {/* CER Usage */}
              <Card className="bg-card/60 border-border/30">
                <CardHeader>
                  <CardTitle className="text-sm">Consumi CER Anno — {selectedPrivato.cognome} {selectedPrivato.nome}</CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(selectedUsage).length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nessun conferimento quest'anno</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(selectedUsage).map(([cer, kg]) => {
                        const critico = CER_CRITICI[cer];
                        const pct = critico ? (kg / critico.limite_annuo_kg) * 100 : 0;
                        const isOver = critico && kg >= critico.limite_annuo_kg;
                        const isWarn = critico && pct >= 80;
                        return (
                          <div key={cer} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-mono">{cer} {critico ? `(${critico.label})` : ""}</span>
                              <span className={isOver ? "text-red-400 font-bold" : isWarn ? "text-amber-400" : ""}>
                                {kg.toLocaleString("it-IT")} kg {critico ? `/ ${critico.limite_annuo_kg} kg` : ""}
                              </span>
                            </div>
                            {critico && (
                              <div className="h-2 bg-card/60 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${isOver ? "bg-red-500" : isWarn ? "bg-amber-500" : "bg-emerald-500"}`}
                                  style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                            )}
                            {isOver && (
                              <div className="flex items-center gap-1 text-red-400 text-xs">
                                <AlertTriangle className="h-3 w-3" /> LIMITE SUPERATO — Operazione bloccata
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Documenti */}
              <Card className="bg-card/60 border-border/30">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Documenti Scansionati
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDoc.mutate(f); }} />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}
                    disabled={uploadDoc.isPending} className="gap-2 mb-3 border-emerald-500/30 text-emerald-400">
                    <Upload className="h-4 w-4" /> Carica Documento
                  </Button>
                  {documenti?.length ? (
                    <div className="space-y-1">
                      {documenti.map((d) => (
                        <div key={d.id} className="flex items-center gap-2 text-sm p-2 rounded bg-card/30">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>{d.nome_file}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{new Date(d.created_at).toLocaleDateString("it-IT")}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">Nessun documento caricato</p>
                  )}
                </CardContent>
              </Card>

              {/* Ricevute */}
              <Card className="bg-card/60 border-border/30">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Receipt className="h-4 w-4" /> Ricevute ({ricevute?.length ?? 0})
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={handlePrintRicevute} className="gap-1 border-emerald-500/30 text-emerald-400 h-7 text-xs">
                        <Printer className="h-3 w-3" /> Stampa
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        if (!ricevute?.length) return toast.error("Nessuna ricevuta");
                        const cols = [
                          { header: "Numero", key: "numero_ricevuta", width: 16 },
                          { header: "Data", key: "created_at", width: 14, format: (v: any) => v ? new Date(v).toLocaleDateString("it-IT") : "-" },
                          { header: "Importo", key: "importo", width: 12, format: (v: any) => Number(v || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 }) },
                          { header: "Note", key: "note", width: 30 },
                        ];
                        exportToExcel(ricevute, cols, `ricevute-${selectedPrivato?.cognome || "privato"}`, "Ricevute");
                      }} className="gap-1 border-emerald-500/30 text-emerald-400 h-7 text-xs">
                        <FileSpreadsheet className="h-3 w-3" /> Excel
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        if (!ricevute?.length) return toast.error("Nessuna ricevuta");
                        const cols = [
                          { header: "Numero", key: "numero_ricevuta", width: 16 },
                          { header: "Data", key: "created_at", width: 14, format: (v: any) => v ? new Date(v).toLocaleDateString("it-IT") : "-" },
                          { header: "Importo", key: "importo", width: 12, format: (v: any) => Number(v || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 }) },
                          { header: "Note", key: "note", width: 30 },
                        ];
                        exportToPdf(ricevute, cols, `ricevute-${selectedPrivato?.cognome || "privato"}`, `Ricevute — ${selectedPrivato?.cognome || ""} ${selectedPrivato?.nome || ""}`);
                      }} className="gap-1 border-emerald-500/30 text-emerald-400 h-7 text-xs">
                        <Printer className="h-3 w-3" /> PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {!ricevute?.length ? (
                    <p className="text-muted-foreground text-xs">Nessuna ricevuta registrata</p>
                  ) : (
                    <div className="space-y-1">
                      {ricevute.map((r) => (
                        <div key={r.id} className="flex items-center gap-2 text-sm p-2 rounded bg-card/30">
                          <div>
                            <p className="font-medium">{r.numero_ricevuta || "-"}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(r.created_at).toLocaleDateString("it-IT")} · € {Number(r.importo || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-auto h-7 border-destructive/30 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteRicevuta(r.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="bg-card/60 border-border/30">
              <CardContent className="p-8 text-center text-muted-foreground">
                Seleziona un privato dalla lista per operare
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ─── New Privato Dialog ─── */}
      <Dialog open={showNewPrivato} onOpenChange={setShowNewPrivato}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nuovo Privato</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome *</Label><Input value={privatoForm.nome} onChange={(e) => setPrivatoForm(p => ({ ...p, nome: e.target.value }))} /></div>
            <div><Label>Cognome *</Label><Input value={privatoForm.cognome} onChange={(e) => setPrivatoForm(p => ({ ...p, cognome: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Codice Fiscale *</Label><Input value={privatoForm.codice_fiscale} onChange={(e) => setPrivatoForm(p => ({ ...p, codice_fiscale: e.target.value.toUpperCase() }))} className="font-mono" /></div>
            <div><Label>Comune</Label><Input value={privatoForm.comune_residenza} onChange={(e) => setPrivatoForm(p => ({ ...p, comune_residenza: e.target.value }))} /></div>
            <div><Label>N° Tessera</Label><Input value={privatoForm.numero_tessera} onChange={(e) => setPrivatoForm(p => ({ ...p, numero_tessera: e.target.value }))} /></div>
            <div>
              <Label>Tipo Utenza</Label>
              <Select value={privatoForm.tipo_utenza} onValueChange={(v) => setPrivatoForm(p => ({ ...p, tipo_utenza: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="domestica">Domestica</SelectItem>
                  <SelectItem value="non_domestica">Non Domestica</SelectItem>
                  <SelectItem value="produttore_speciali">Produttore Speciali</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Note</Label><Input value={privatoForm.note} onChange={(e) => setPrivatoForm(p => ({ ...p, note: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPrivato(false)}>Annulla</Button>
            <Button onClick={handleSavePrivato} className="bg-emerald-600 hover:bg-emerald-700">Registra</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── New Conferimento Dialog ─── */}
      <Dialog
        open={showNewConferimento}
        onOpenChange={(o) => {
          setShowNewConferimento(o);
          setLimitWarning(null);
          if (!o) setConferimentoPrivatoId(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-emerald-400" />
              Nuovo Conferimento — {activeConferimentoPrivato?.cognome} {activeConferimentoPrivato?.nome}
            </DialogTitle>
          </DialogHeader>
          {limitWarning && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{limitWarning}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Codice CER *</Label><Input value={confForm.cer} onChange={(e) => setConfForm(p => ({ ...p, cer: e.target.value }))} placeholder="es. 200140" className="font-mono" /></div>
            <div><Label>Peso (kg) *</Label><Input type="number" value={confForm.kg_pesati} onChange={(e) => setConfForm(p => ({ ...p, kg_pesati: e.target.value }))} /></div>
            <div><Label>Importo €</Label><Input type="number" value={confForm.importo_pagato} onChange={(e) => setConfForm(p => ({ ...p, importo_pagato: e.target.value }))} /></div>
            <div>
              <Label>Metodo Pagamento</Label>
              <Select value={confForm.metodo_pag} onValueChange={(v) => setConfForm(p => ({ ...p, metodo_pag: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contanti">Contanti</SelectItem>
                  <SelectItem value="pos">POS</SelectItem>
                  <SelectItem value="bonifico">Bonifico</SelectItem>
                  <SelectItem value="gratuito">Gratuito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Targa Automezzo</Label><Input value={confForm.targa_automezzo} onChange={(e) => setConfForm(p => ({ ...p, targa_automezzo: e.target.value.toUpperCase() }))} className="font-mono" /></div>
            <div><Label>Modello</Label><Input value={confForm.modello_automezzo} onChange={(e) => setConfForm(p => ({ ...p, modello_automezzo: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Note</Label><Textarea value={confForm.note} onChange={(e) => setConfForm(p => ({ ...p, note: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewConferimento(false); setConferimentoPrivatoId(null); }}>Annulla</Button>
            <Button onClick={handleSaveConferimento} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Scale className="h-4 w-4" /> Registra Conferimento + Ricevuta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Manual Ricevuta Dialog ─── */}
      <Dialog
        open={showNewRicevuta}
        onOpenChange={(o) => {
          setShowNewRicevuta(o);
          if (!o) setRicevutaPrivatoId(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-400" />
              Ricevuta Manuale — {activeRicevutaPrivato?.cognome} {activeRicevutaPrivato?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Importo €</Label><Input type="number" value={ricevutaForm.importo} onChange={(e) => setRicevutaForm(p => ({ ...p, importo: e.target.value }))} /></div>
            <div><Label>Note</Label><Textarea value={ricevutaForm.note} onChange={(e) => setRicevutaForm(p => ({ ...p, note: e.target.value }))} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewRicevuta(false); setRicevutaPrivatoId(null); }}>Annulla</Button>
            <Button onClick={handleSaveRicevutaManuale} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Receipt className="h-4 w-4" /> Genera Ricevuta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
