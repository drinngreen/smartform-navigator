import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFormBridgeFields } from "@/hooks/useFormBridge";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateFieldIT } from "@/components/ui/date-field-it";
import { AlertTriangle, Upload, FileText, Users, ShieldAlert, Plus, Receipt, Scale, Search, FileSpreadsheet, Printer, Trash2, Edit2, CalendarIcon, Truck } from "lucide-react";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale/it";
import { cn } from "@/lib/utils";
import { useConferimentoCerOptions } from "@/hooks/useConferimentoCerOptions";
import { PrivatiLimitiWidget } from "./PrivatiLimitiWidget";
import { PrivatiTargheWidget } from "./PrivatiTargheWidget";
import { PrivatiMovimentiWidget } from "./PrivatiMovimentiWidget";

import { logAgentActivity } from "@/stores/agentActivityStore";

const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const LIMITE_ANNUO_GLOBALE_KG = 1500;

const toLocalDateLabel = (value: string | null | undefined) => {
  if (!value) return "—";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : new Date(value).toLocaleDateString("it-IT");
};


export type VeicoloPrivato = { modello: string; targa: string };

const normalizeVeicoli = (p: any): VeicoloPrivato[] => {
  const raw = Array.isArray(p?.veicoli) ? p.veicoli : [];
  const list: VeicoloPrivato[] = raw
    .map((v: any) => ({ modello: String(v?.modello || "").trim(), targa: String(v?.targa || "").trim().toUpperCase() }))
    .filter((v: VeicoloPrivato) => v.targa || v.modello);
  if (list.length === 0 && (p?.targa_automezzo || p?.modello_automezzo || p?.automezzo)) {
    list.push({
      modello: String(p?.modello_automezzo || p?.automezzo || "").trim(),
      targa: String(p?.targa_automezzo || "").trim().toUpperCase(),
    });
  }
  return list;
};

const EMPTY_PRIVATO_FORM = {
  nome: "", cognome: "", codice_fiscale: "", indirizzo: "", cap: "", comune_residenza: "", provincia: "",
  numero_documento: "", scadenza_documento: "", modello_automezzo: "", targa_automezzo: "",
  cellulare: "", telefono: "", email: "",
  veicoli: [] as VeicoloPrivato[],
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
  const [editPrivatoId, setEditPrivatoId] = useState<string | null>(null);
  // Targa/modello del privato al momento dell'apertura della scheda:
  // serve per propagare ai movimenti SOLO se la targa è stata realmente modificata.
  const origVeicoloRef = useRef<{ targa: string; modello: string }>({ targa: "", modello: "" });
  const [cerSearch, setCerSearch] = useState("");
  const [showCerDropdown, setShowCerDropdown] = useState(false);
  // Righe materiali del conferimento (multi-materiale: es. ferro + rame nella stessa ricevuta)
  // Ogni riga ha peso, prezzo al kg e totale: due valori qualsiasi calcolano il terzo.
  const [righeMateriali, setRigheMateriali] = useState<{ cer: string; kg: string; prezzo: string; importo: string }[]>([{ cer: "", kg: "", prezzo: "", importo: "" }]);
  // true solo se l'operatore scrive a mano l'importo totale: altrimenti è sempre la somma delle righe
  const [importoTotaleManuale, setImportoTotaleManuale] = useState(false);
  const totaleRighe = righeMateriali.reduce(
    (s, r) => s + (parseFloat(String(r.importo).replace(",", ".")) || 0),
    0,
  );
  const totaleKgRighe = righeMateriali.reduce(
    (s, r) => s + (parseFloat(String(r.kg).replace(",", ".")) || 0),
    0,
  );


  /**
   * Ricalcola la riga in base al campo modificato:
   * kg + €/kg -> totale · kg + totale -> €/kg · €/kg + totale -> kg
   * L'ultimo campo digitato viene sempre rispettato.
   */
  const ricalcolaRiga = (
    riga: { cer: string; kg: string; prezzo: string; importo: string },
    campo: "kg" | "prezzo" | "importo",
    valore: string,
  ) => {
    const next = { ...riga, [campo]: valore };
    const n = (v: string) => {
      const x = parseFloat(String(v).replace(",", "."));
      return Number.isFinite(x) ? x : null;
    };
    const kg = n(next.kg);
    const prezzo = n(next.prezzo);
    const importo = n(next.importo);

    if (campo === "kg" && kg && kg > 0) {
      if (prezzo != null) next.importo = (kg * prezzo).toFixed(2);
      else if (importo != null) next.prezzo = (importo / kg).toFixed(4);
    } else if (campo === "prezzo" && prezzo != null) {
      if (kg && kg > 0) next.importo = (kg * prezzo).toFixed(2);
      else if (importo != null && prezzo > 0) next.kg = (importo / prezzo).toFixed(2);
    } else if (campo === "importo" && importo != null) {
      if (kg && kg > 0) next.prezzo = (importo / kg).toFixed(4);
      else if (prezzo != null && prezzo > 0) next.kg = (importo / prezzo).toFixed(2);
    }
    return next;
  };
  const [openCerRow, setOpenCerRow] = useState<number | null>(null);
  const [mostraTuttiCer, setMostraTuttiCer] = useState(false);
  const cerRowRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Chiudi la tendina CER solo quando si clicca fuori dal suo contenitore;
  // rimane aperta durante lo scroll con la barra laterale.
  useEffect(() => {
    if (openCerRow === null) return;
    const handlePointerDown = (e: PointerEvent | MouseEvent) => {
      const target = e.target as Node;
      const container = cerRowRefs.current.get(openCerRow);
      if (container && !container.contains(target)) {
        setOpenCerRow(null);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [openCerRow]);

  // Forms
  const [confForm, setConfForm] = useState({ cer: "", kg_pesati: "", importo_pagato: "", metodo_pag: "contanti", note: "", targa_automezzo: "", modello_automezzo: "", data: new Date().toISOString().slice(0, 10) });
  const [ricevutaForm, setRicevutaForm] = useState({ importo: "", note: "" });
  const [privatoForm, setPrivatoForm] = useState({ ...EMPTY_PRIVATO_FORM });
  const [scadenzaDate, setScadenzaDate] = useState<Date | undefined>();

  // Form Bridge: register privato form fields for AI auto-fill
  const setPrivatoField = useCallback((key: string) => (v: string) => setPrivatoForm(prev => ({ ...prev, [key]: v })), []);
  const setConfField = useCallback((key: string) => (v: string) => setConfForm(prev => ({ ...prev, [key]: v })), []);

  useFormBridgeFields(() => [
    { id: "privato_nome", label: "Nome", type: "text", getValue: () => privatoForm.nome, setValue: setPrivatoField("nome") },
    { id: "privato_cognome", label: "Cognome", type: "text", getValue: () => privatoForm.cognome, setValue: setPrivatoField("cognome") },
    { id: "privato_codice_fiscale", label: "Codice Fiscale", type: "text", getValue: () => privatoForm.codice_fiscale, setValue: setPrivatoField("codice_fiscale") },
    { id: "privato_comune_residenza", label: "Comune Residenza", type: "text", getValue: () => privatoForm.comune_residenza, setValue: setPrivatoField("comune_residenza") },
    { id: "privato_numero_documento", label: "Numero Documento", type: "text", getValue: () => privatoForm.numero_documento, setValue: setPrivatoField("numero_documento") },
    { id: "privato_targa_automezzo", label: "Targa Automezzo", type: "text", getValue: () => privatoForm.targa_automezzo, setValue: setPrivatoField("targa_automezzo") },
    { id: "privato_modello_automezzo", label: "Modello Automezzo", type: "text", getValue: () => privatoForm.modello_automezzo, setValue: setPrivatoField("modello_automezzo") },
    { id: "conf_cer", label: "CER Conferimento", type: "text", getValue: () => confForm.cer, setValue: setConfField("cer") },
    { id: "conf_kg_pesati", label: "Kg Pesati", type: "number", getValue: () => confForm.kg_pesati, setValue: setConfField("kg_pesati") },
    { id: "conf_importo_pagato", label: "Importo Pagato", type: "number", getValue: () => confForm.importo_pagato, setValue: setConfField("importo_pagato") },
    { id: "conf_note", label: "Note Conferimento", type: "textarea", getValue: () => confForm.note, setValue: setConfField("note") },
  ], [privatoForm, confForm]);

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
        .select("id, numero_ricevuta, anno, importo, note, data_emissione, created_at")
        .eq("tenant_id", MULTY_TENANT_ID)
        .eq("privato_id", selectedPrivatoId)
        .order("data_emissione", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!selectedPrivatoId,
  });

  const { data: conferimentiPrivato } = useQuery({
    queryKey: ["dev-conferimenti-privato", selectedPrivatoId],
    queryFn: async () => {
      if (!selectedPrivatoId) return [];
      const { data, error } = await supabase
        .from("privati_conferimenti")
        .select("id, data, cer, kg_pesati, importo_pagato, metodo_pag, targa_automezzo, modello_automezzo, note, numero_progressivo, anno_dbt")
        .eq("tenant_id", MULTY_TENANT_ID)
        .eq("privato_id", selectedPrivatoId)
        .order("data", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!selectedPrivatoId,
  });

  const [editDateConfId, setEditDateConfId] = useState<string | null>(null);
  const [editDateValue, setEditDateValue] = useState<Date | undefined>();
  const [editVeicoloConfId, setEditVeicoloConfId] = useState<string | null>(null);
  const [editVeicoloForm, setEditVeicoloForm] = useState({ targa_automezzo: "", modello_automezzo: "" });

  const handleUpdateConfVeicolo = async (confId: string) => {
    const { error } = await supabase
      .from("privati_conferimenti")
      .update({
        targa_automezzo: editVeicoloForm.targa_automezzo.trim().toUpperCase() || null,
        modello_automezzo: editVeicoloForm.modello_automezzo.trim() || null,
      } as any)
      .eq("id", confId);
    if (error) { toast.error(error.message); return; }
    toast.success("Targa/veicolo aggiornati");
    setEditVeicoloConfId(null);
    queryClient.invalidateQueries({ queryKey: ["dev-conferimenti-privato"] });
    queryClient.invalidateQueries({ queryKey: ["privati-targhe-widget"] });
    queryClient.invalidateQueries({ queryKey: ["privati-limiti-widget"] });
  };


  const handleUpdateConfDate = async (confId: string, newDate: Date) => {
    const iso = format(newDate, "yyyy-MM-dd");
    const { error } = await supabase.from("privati_conferimenti").update({ data: iso } as any).eq("id", confId);
    if (error) { toast.error(error.message); return; }
    const { error: ricevutaError } = await supabase
      .from("ricevute_privati" as any)
      .update({ data_emissione: iso } as any)
      .eq("conferimento_id", confId);
    if (ricevutaError) { toast.error(ricevutaError.message); return; }
    toast.success("Data conferimento aggiornata");
    setEditDateConfId(null);
    queryClient.invalidateQueries({ queryKey: ["dev-conferimenti-privato"] });
    queryClient.invalidateQueries({ queryKey: ["privati-targhe-widget"] });
    queryClient.invalidateQueries({ queryKey: ["privati-limiti-widget"] });
    queryClient.invalidateQueries({ queryKey: ["dev-conferimenti-anno"] });
    invalidateInventoryQueries();
  };

  const handleDeleteConferimento = async (confId: string) => {
    if (!window.confirm("Eliminare questo conferimento? Le giacenze verranno stornate automaticamente.")) return;
    const { error } = await supabase.from("privati_conferimenti").delete().eq("id", confId);
    if (error) { toast.error(error.message); return; }
    toast.success("✅ Conferimento eliminato e giacenza aggiornata");
    queryClient.invalidateQueries({ queryKey: ["dev-conferimenti-privato"] });
    queryClient.invalidateQueries({ queryKey: ["privati-targhe-widget"] });
    queryClient.invalidateQueries({ queryKey: ["privati-limiti-widget"] });
    queryClient.invalidateQueries({ queryKey: ["dev-conferimenti-anno"] });
    invalidateInventoryQueries();
  };

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

  const getTotalKgAnnui = (privatoId: string): number => {
    if (!conferimenti) return 0;
    return conferimenti.filter(c => c.privato_id === privatoId).reduce((sum, c) => sum + Number(c.kg_pesati), 0);
  };

  const checkLimits = async (privatoId: string, cer: string, kgNew: number): Promise<string | null> => {
    if (!privatoId || !impiantoId) return null;
    const privato = privati?.find(p => p.id === privatoId);
    if (!privato) return null;

    // Global 1500kg annual limit per privato
    const totalGlobale = getTotalKgAnnui(privatoId) + kgNew;
    if (totalGlobale > LIMITE_ANNUO_GLOBALE_KG) {
      return `🚫 LIMITE ANNUO SUPERATO: ${totalGlobale.toLocaleString("it-IT")} kg / ${LIMITE_ANNUO_GLOBALE_KG} kg`;
    }
    if (totalGlobale >= LIMITE_ANNUO_GLOBALE_KG * 0.8) {
      return `⚠️ Attenzione: ${totalGlobale.toLocaleString("it-IT")} kg / ${LIMITE_ANNUO_GLOBALE_KG} kg (${Math.round(totalGlobale / LIMITE_ANNUO_GLOBALE_KG * 100)}%)`;
    }
    return null;
  };

  // Solo CER ammessi ai privati (capitolo 20 + varianti già usate nei conferimenti privati)
  const { preferiti: PREFERITI_CER, tutti: ALL_CER } = useConferimentoCerOptions({ soloPrivati: true });


  const baseCerList = mostraTuttiCer ? ALL_CER : PREFERITI_CER;

  const searchCerList = (q: string) => {
    if (!q) return baseCerList;
    const s = q.toLowerCase().replace(/\s/g, "");
    return baseCerList.filter(c => c.codice.includes(s) || c.descrizione.toLowerCase().includes(q.toLowerCase()));
  };

  // CER filtered list for combobox
  const filteredCER = useMemo(() => searchCerList(cerSearch), [cerSearch, baseCerList]);

  const cerOptions = (q: string) => searchCerList(q);



  const invalidateInventoryQueries = () => {
    [
      "dev-conferimenti-anno",
      "dev-ricevute",
      "dev-ricevute-registro",
      "dev-registro-movimenti",
      "dev-movimenti-multy",
      "dev-mag-movimenti",
      "dev-mag-giacenze",
      "dev-giacenze",
    ].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  };

  const handleSaveConferimento = async () => {
    const targetPrivatoId = conferimentoPrivatoId ?? selectedPrivatoId;
    if (!targetPrivatoId) { toast.error("Seleziona un privato"); return; }
    if (!impiantoId) { toast.error("Nessun impianto configurato"); return; }
    if (!confForm.metodo_pag) { toast.error("Seleziona il metodo di pagamento"); return; }

    // Normalizza le righe materiali (multi-materiale)
    const righe: { cer: string; kg: number; prezzo_kg?: number; importo?: number }[] = [];
    for (const r of righeMateriali) {
      const rawCer = (r.cer || "").trim();
      const kg = parseFloat(r.kg);
      if (!rawCer && !r.kg) continue;
      if (!rawCer) { toast.error("Ogni riga deve avere un codice CER"); return; }
      if (!Number.isFinite(kg) || kg <= 0) { toast.error(`Peso non valido per il CER ${rawCer}`); return; }
      const cerInfo = ALL_CER.find((c) => c.codice.toLowerCase() === rawCer.toLowerCase());
      const prezzo = parseFloat(String(r.prezzo).replace(",", "."));
      const importo = parseFloat(String(r.importo).replace(",", "."));
      righe.push({
        cer: cerInfo?.codice || rawCer.toUpperCase(),
        kg,
        ...(Number.isFinite(prezzo) ? { prezzo_kg: prezzo } : {}),
        ...(Number.isFinite(importo) ? { importo } : {}),
      });
    }
    if (!righe.length) { toast.error("Inserisci almeno un materiale (CER + kg)"); return; }

    // Controllo limiti su tutti i materiali
    let lastWarning: string | null = null;
    for (const r of righe) {
      const warning = await checkLimits(targetPrivatoId, r.cer, r.kg);
      if (warning && (warning.includes("LIMITE SUPERATO") || warning.includes("LIMITE ANNUO GLOBALE"))) {
        setLimitWarning(warning);
        toast.error(`Conferimento BLOCCATO: limite superato (CER ${r.cer})`);
        return;
      }
      if (warning) lastWarning = warning;
    }
    if (lastWarning) setLimitWarning(lastWarning);

    const privato = privati?.find((p) => p.id === targetPrivatoId);
    const nomeFinale = privato ? `${privato.cognome} ${privato.nome}` : "Anonimo";
    const dataRegistrazione = confForm.data || format(new Date(), "yyyy-MM-dd");
    const importoTotale = confForm.importo_pagato
      ? parseFloat(confForm.importo_pagato)
      : righe.reduce((s, r) => s + (Number(r.importo) || 0), 0);
    const { error } = await supabase.rpc("crea_conferimento_privato_atomico", {
      p_tenant_id: MULTY_TENANT_ID,
      p_impianto_id: impiantoId,
      p_privato_id: targetPrivatoId,
      p_nome_privato: nomeFinale,
      p_cf_pi: privato?.codice_fiscale || "",
      p_tipo_utenza: privato?.tipo_utenza || "domestica",
      p_materiali: righe,
      p_data: dataRegistrazione,
      p_importo: importoTotale,
      p_metodo_pag: confForm.metodo_pag,
      p_note: confForm.note || "",
      p_targa: confForm.targa_automezzo || "",
      p_modello: confForm.modello_automezzo || "",
    } as any);

    if (error) {
      logAgentActivity("Creazione conferimento privato", "error", `${righe.length} materiali`, error.message);
      toast.error(`Conferimento non salvato: ${error.message}`);
      return;
    }
    logAgentActivity(
      "Creazione conferimento privato",
      "ok",
      `${righe.length} materiali (${righe.map((r: any) => r.cer).join(", ")}) — data ${dataRegistrazione}`,
    );

    toast.success(`✅ Conferimento (${righe.length} material${righe.length > 1 ? "i" : "e"}) e ricevuta registrati!`);
    setShowNewConferimento(false);
    setConferimentoPrivatoId(null);
    setConfForm({ cer: "", kg_pesati: "", importo_pagato: "", metodo_pag: "contanti", note: "", targa_automezzo: "", modello_automezzo: "", data: new Date().toISOString().slice(0, 10) });
    setRigheMateriali([{ cer: "", kg: "", prezzo: "", importo: "" }]);
    setImportoTotaleManuale(false);
    setImportoTotaleManuale(false);
    setCerSearch("");
    setLimitWarning(null);
    invalidateInventoryQueries();
  };


  const handleSaveRicevutaManuale = async () => {
    const targetPrivatoId = ricevutaPrivatoId ?? selectedPrivatoId;
    if (!targetPrivatoId) { toast.error("Seleziona un privato"); return; }
    if (!impiantoId) { toast.error("Nessun impianto configurato"); return; }

    const privato = privati?.find((p) => p.id === targetPrivatoId);
    const nomeNote = privato ? `${privato.cognome} ${privato.nome}` : "";
    const anno = new Date().getFullYear();
    const { data: numData } = await supabase.rpc("next_ricevuta_number", { p_impianto_id: impiantoId, p_anno: anno } as any);
    const { error } = await supabase.from("ricevute_privati" as any).insert({
      tenant_id: MULTY_TENANT_ID, impianto_id: impiantoId, privato_id: targetPrivatoId,
      numero_ricevuta: (numData as any) || `${Date.now()}`, anno,
      importo: ricevutaForm.importo ? parseFloat(ricevutaForm.importo) : 0,
      note: [nomeNote, ricevutaForm.note].filter(Boolean).join(" — ") || null,
    } as any);

    if (error) { toast.error(error.message); return; }
    toast.success("✅ Ricevuta manuale generata!");
    setShowNewRicevuta(false);
    setRicevutaPrivatoId(null);
    setRicevutaForm({ importo: "", note: "" });
    queryClient.invalidateQueries({ queryKey: ["dev-ricevute"] });
    queryClient.invalidateQueries({ queryKey: ["dev-ricevute-registro"] });
  };

  const handleDeleteRicevuta = async (ricevutaId: string) => {
    const ok = window.confirm("Eliminare questa ricevuta?");
    if (!ok) return;
    const { error } = await supabase.from("ricevute_privati" as any).delete().eq("id", ricevutaId);
    if (error) { toast.error(error.message); return; }
    toast.success("Ricevuta eliminata");
    queryClient.invalidateQueries({ queryKey: ["dev-ricevute"] });
    queryClient.invalidateQueries({ queryKey: ["dev-ricevute-registro"] });
  };

  const handlePrintRicevute = () => {
    if (!ricevute?.length) { toast.error("Nessuna ricevuta da stampare"); return; }
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
          ${ricevute.map(r => `<tr><td>${r.numero_ricevuta || "-"}</td><td>${new Date(r.data_emissione || r.created_at).toLocaleDateString("it-IT")}</td><td>€ ${Number(r.importo || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</td><td>${r.note || "-"}</td></tr>`).join("")}
        </tbody>
      </table>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  const openEditPrivato = (p: any) => {
    setEditPrivatoId(p.id);
    origVeicoloRef.current = {
      targa: String(p.targa_automezzo || "").trim().toUpperCase(),
      modello: String(p.modello_automezzo || p.automezzo || "").trim(),
    };
    setPrivatoForm({
      nome: p.nome || "",
      cognome: p.cognome || "",
      codice_fiscale: p.codice_fiscale || "",
      indirizzo: p.indirizzo || "",
      cap: p.cap || "",
      comune_residenza: p.comune_residenza || "",
      provincia: p.provincia || "",
      numero_documento: p.numero_documento || "",
      scadenza_documento: p.scadenza_documento || "",
      cellulare: p.cellulare || "",
      telefono: p.telefono || "",
      email: p.email || "",
      modello_automezzo: p.modello_automezzo || p.automezzo || "",
      targa_automezzo: p.targa_automezzo || "",
      veicoli: normalizeVeicoli(p),
    });

    if (p.scadenza_documento) {
      const [y, m, d] = p.scadenza_documento.split("-").map(Number);
      setScadenzaDate(new Date(y, m - 1, d));
    } else {
      setScadenzaDate(undefined);
    }
    setShowNewPrivato(true);
  };

  const handleSavePrivato = async () => {
    if (!privatoForm.nome || !privatoForm.cognome || !privatoForm.codice_fiscale) {
      toast.error("Nome, cognome e CF obbligatori");
      return;
    }
    const scadenzaStr = scadenzaDate
      ? `${scadenzaDate.getFullYear()}-${String(scadenzaDate.getMonth() + 1).padStart(2, "0")}-${String(scadenzaDate.getDate()).padStart(2, "0")}`
      : null;
    const veicoliPuliti: VeicoloPrivato[] = (privatoForm.veicoli || [])
      .map(v => ({ modello: (v.modello || "").trim(), targa: (v.targa || "").trim().toUpperCase() }))
      .filter(v => v.targa || v.modello);
    const primario = veicoliPuliti[0] || {
      modello: (privatoForm.modello_automezzo || "").trim(),
      targa: (privatoForm.targa_automezzo || "").trim().toUpperCase(),
    };
    const payload = {
      nome: privatoForm.nome,
      cognome: privatoForm.cognome,
      codice_fiscale: privatoForm.codice_fiscale,
      indirizzo: privatoForm.indirizzo || null,
      cap: privatoForm.cap || null,
      comune_residenza: privatoForm.comune_residenza || null,
      provincia: privatoForm.provincia ? privatoForm.provincia.toUpperCase() : null,
      numero_documento: privatoForm.numero_documento || null,
      scadenza_documento: scadenzaStr,
      cellulare: privatoForm.cellulare?.trim() || null,
      telefono: privatoForm.telefono?.trim() || null,
      email: privatoForm.email?.trim() || null,
      modello_automezzo: primario.modello || null,
      automezzo: primario.modello || null,
      targa_automezzo: primario.targa || null,
      veicoli: veicoliPuliti,
      tipo_utenza: "domestica",
      attivo: true,
    };

    if (editPrivatoId) {
      const { error } = await supabase.from("anagrafica_privati").update(payload as any).eq("id", editPrivatoId);
      if (error) { toast.error(error.message); return; }
      // Propaga la targa ai conferimenti SOLO se:
      // - il soggetto ha un unico mezzo (con più mezzi ogni movimento tiene la sua targa)
      // - la targa è stata realmente modificata in questo salvataggio
      // - e solo sui movimenti privi di targa o con la vecchia targa (mai su targhe diverse)
      const nuovaTarga = payload.targa_automezzo ? String(payload.targa_automezzo).trim().toUpperCase() : null;
      const vecchiaTarga = origVeicoloRef.current.targa;
      const targaCambiata = (nuovaTarga ?? "") !== vecchiaTarga;
      if (veicoliPuliti.length <= 1 && targaCambiata) {
        let q = supabase
          .from("privati_conferimenti")
          .update({ targa_automezzo: nuovaTarga, modello_automezzo: payload.modello_automezzo } as any)
          .eq("privato_id", editPrivatoId);
        q = vecchiaTarga
          ? q.or(`targa_automezzo.is.null,targa_automezzo.eq.${vecchiaTarga}`)
          : q.is("targa_automezzo", null);
        const { error: confErr } = await q;
        if (confErr) toast.error(`Targa non propagata ai movimenti: ${confErr.message}`);
        else toast.success(nuovaTarga ? "✅ Privato aggiornato (targa propagata ai movimenti)" : "✅ Privato aggiornato (targa rimossa dai movimenti)");
        origVeicoloRef.current = { targa: nuovaTarga ?? "", modello: String(payload.modello_automezzo || "") };
      } else {
        toast.success("✅ Privato aggiornato");
      }
    } else {

      const { data: created, error } = await supabase
        .from("anagrafica_privati")
        .insert({ ...payload, tenant_id: MULTY_TENANT_ID, impianto_id: impiantoId } as any)
        .select("id")
        .single();
      if (error) { toast.error(error.message); return; }
      setSelectedPrivatoId(created?.id ?? null);
      setSearchPrivato(payload.cognome);
      toast.success("✅ Privato registrato");
    }

    setShowNewPrivato(false);
    setEditPrivatoId(null);
    setPrivatoForm({ ...EMPTY_PRIVATO_FORM });
    setScadenzaDate(undefined);
    queryClient.invalidateQueries({ queryKey: ["dev-privati"] });
    queryClient.invalidateQueries({ queryKey: ["privati-targhe-widget"] });
    queryClient.invalidateQueries({ queryKey: ["privati-limiti-widget"] });
  };

  const filteredPrivati = privati?.filter(p =>
    !searchPrivato ||
    `${p.nome} ${p.cognome} ${p.codice_fiscale}`.toLowerCase().includes(searchPrivato.toLowerCase())
  );

  const selectedPrivato = privati?.find(p => p.id === selectedPrivatoId);
  const activeConferimentoPrivato = privati?.find(p => p.id === (conferimentoPrivatoId ?? selectedPrivatoId));
  const activeRicevutaPrivato = privati?.find(p => p.id === (ricevutaPrivatoId ?? selectedPrivatoId));
  const selectedUsage = selectedPrivatoId ? getCerUsage(selectedPrivatoId) : {};

  // Auto-fill targa/modello when opening conferimento
  const handleOpenConferimento = () => {
    if (!selectedPrivatoId) { toast.error("Seleziona un privato"); return; }
    const p = privati?.find(x => x.id === selectedPrivatoId);
    setConferimentoPrivatoId(selectedPrivatoId);
    setConfForm({
      cer: "", kg_pesati: "", importo_pagato: "", metodo_pag: "contanti", note: "",
      targa_automezzo: (p as any)?.targa_automezzo || "",
      modello_automezzo: (p as any)?.modello_automezzo || (p as any)?.automezzo || "",
      data: new Date().toISOString().slice(0, 10),
    });
    setCerSearch("");
    setShowNewConferimento(true);
  };

  return (
    <div className="space-y-4">
      <PrivatiMovimentiWidget tenantId={MULTY_TENANT_ID} />
      <PrivatiLimitiWidget tenantId={MULTY_TENANT_ID} />
      <PrivatiTargheWidget tenantId={MULTY_TENANT_ID} />

      {/* Global Limit Alert */}
      <Card className="bg-red-950/30 border-red-500/30">
        <CardHeader>
          <CardTitle className="text-red-400 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" /> Limite Annuo per Privato: {LIMITE_ANNUO_GLOBALE_KG} kg
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Ogni privato può conferire al massimo <strong className="text-red-400">{LIMITE_ANNUO_GLOBALE_KG} kg</strong> totali all'anno (tutti i CER sommati). Il sistema blocca automaticamente i conferimenti oltre soglia.</p>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => { setEditPrivatoId(null); setPrivatoForm({ ...EMPTY_PRIVATO_FORM }); setScadenzaDate(undefined); setShowNewPrivato(true); }} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" /> Nuovo Privato
        </Button>
        <Button onClick={handleOpenConferimento} variant="outline" className="gap-2 border-emerald-500/30 text-emerald-400">
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
                    { header: "Documento", key: "numero_documento", width: 14 },
                    { header: "Targa", key: "targa_automezzo", width: 12 },
                    { header: "Cellulare", key: "cellulare", width: 14 },
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
                    { header: "Documento", key: "numero_documento", width: 14 },
                    { header: "Targa", key: "targa_automezzo", width: 12 },
                    { header: "Cellulare", key: "cellulare", width: 14 },
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
              const totalKg = getTotalKgAnnui(p.id);
              const hasWarning = totalKg >= LIMITE_ANNUO_GLOBALE_KG * 0.8;
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
                    <div className="flex items-center gap-2 shrink-0">
                      {hasWarning && <AlertTriangle className="h-4 w-4 text-amber-400" />}
                      <button
                        className="h-7 px-2 inline-flex items-center gap-1 rounded-md border border-emerald-500/40 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium"
                        onClick={(e) => { e.stopPropagation(); openEditPrivato(p); }}
                        title="Modifica privato"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Modifica
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {p.comune_residenza || "-"}{(p as any).targa_automezzo ? ` · ${(p as any).targa_automezzo}` : ""}{(p as any).cellulare ? ` · 📱 ${(p as any).cellulare}` : ""}
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
                  {(() => {
                    const totalKg = getTotalKgAnnui(selectedPrivatoId!);
                    const pct = (totalKg / LIMITE_ANNUO_GLOBALE_KG) * 100;
                    const isOver = totalKg >= LIMITE_ANNUO_GLOBALE_KG;
                    const isWarn = pct >= 80;
                    return (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">Totale Annuo</span>
                            <span className={isOver ? "text-red-400 font-bold" : isWarn ? "text-amber-400" : ""}>
                              {totalKg.toLocaleString("it-IT")} kg / {LIMITE_ANNUO_GLOBALE_KG} kg
                            </span>
                          </div>
                          <div className="h-2 bg-card/60 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${isOver ? "bg-red-500" : isWarn ? "bg-amber-500" : "bg-emerald-500"}`}
                              style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                        {Object.keys(selectedUsage).length === 0 ? (
                          <p className="text-muted-foreground text-sm">Nessun conferimento quest'anno</p>
                        ) : (
                          <div className="space-y-1">
                            {Object.entries(selectedUsage).map(([cer, kg]) => (
                              <div key={cer} className="flex justify-between text-sm">
                                <span className="font-mono">{cer}</span>
                                <span>{kg.toLocaleString("it-IT")} kg</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {isOver && (
                          <div className="flex items-center gap-1 text-red-400 text-xs">
                            <AlertTriangle className="h-3 w-3" /> LIMITE SUPERATO — Operazione bloccata
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Conferimenti del privato */}
              <Card className="bg-card/60 border-border/30">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Scale className="h-4 w-4" /> Conferimenti ({conferimentiPrivato?.length ?? 0})
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-80 overflow-y-auto">
                  {!conferimentiPrivato?.length ? (
                    <p className="text-muted-foreground text-xs">Nessun conferimento registrato</p>
                  ) : (
                    <div className="space-y-1">
                      {conferimentiPrivato.map((c: any) => (
                        <div key={c.id} className="flex items-center gap-2 text-sm p-2 rounded bg-card/30 border border-border/20">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {c.numero_progressivo != null && (
                                <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                  DBT #{c.numero_progressivo}/{c.anno_dbt ?? new Date(c.data).getFullYear()}
                                </span>
                              )}
                              <span className="font-mono text-xs">{c.cer}</span>
                              <span className="font-medium">{Number(c.kg_pesati).toLocaleString("it-IT")} kg</span>
                              {c.importo_pagato != null && (
                                <span className="text-xs text-emerald-400">€ {Number(c.importo_pagato).toFixed(2)}</span>
                              )}
                              {c.metodo_pag && (
                                <span className={cn(
                                  "text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border",
                                  c.metodo_pag === "contanti"
                                    ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                    : "bg-sky-500/10 text-sky-300 border-sky-500/30"
                                )}>
                                  {c.metodo_pag === "contanti" ? "Contanti" : "Tracciabile"}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                               Data registrazione: {toLocalDateLabel(c.data)}
                              {c.targa_automezzo ? ` · ${c.targa_automezzo}` : ""}
                              {c.modello_automezzo ? ` · ${c.modello_automezzo}` : ""}
                            </div>
                          </div>
                          <Popover open={editVeicoloConfId === c.id} onOpenChange={(o) => { if (!o) setEditVeicoloConfId(null); }}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="h-7 border-sky-500/30 text-sky-400 hover:bg-sky-500/10"
                                onClick={() => {
                                  setEditVeicoloConfId(c.id);
                                  setEditVeicoloForm({ targa_automezzo: c.targa_automezzo || "", modello_automezzo: c.modello_automezzo || "" });
                                }}
                                title="Modifica targa / veicolo">
                                <Truck className="h-3 w-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3 space-y-2" align="end">
                              <div>
                                <Label className="text-xs">Targa Automezzo</Label>
                                <Input className="font-mono" value={editVeicoloForm.targa_automezzo}
                                  onChange={(e) => setEditVeicoloForm(f => ({ ...f, targa_automezzo: e.target.value.toUpperCase() }))} />
                              </div>
                              <div>
                                <Label className="text-xs">Modello Veicolo</Label>
                                <Input value={editVeicoloForm.modello_automezzo}
                                  onChange={(e) => setEditVeicoloForm(f => ({ ...f, modello_automezzo: e.target.value }))} />
                              </div>
                              <Button size="sm" className="w-full" onClick={() => handleUpdateConfVeicolo(c.id)}>Salva</Button>
                            </PopoverContent>
                          </Popover>
                          <Popover open={editDateConfId === c.id} onOpenChange={(o) => { if (!o) setEditDateConfId(null); }}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="h-7 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                                onClick={() => { setEditDateConfId(c.id); setEditDateValue(c.data ? new Date(c.data) : undefined); }}
                                title="Modifica data">
                                <CalendarIcon className="h-3 w-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                              <Calendar mode="single" selected={editDateValue} onSelect={(d) => { if (d) handleUpdateConfDate(c.id, d); }} initialFocus className={cn("p-3 pointer-events-auto")} />
                            </PopoverContent>
                          </Popover>

                          <Button variant="outline" size="sm" className="h-7 border-destructive/30 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteConferimento(c.id)}
                            title="Elimina conferimento">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
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
                          { header: "Data", key: "data_emissione", width: 14, format: (v: any) => v ? new Date(v).toLocaleDateString("it-IT") : "-" },
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
                          { header: "Data", key: "data_emissione", width: 14, format: (v: any) => v ? new Date(v).toLocaleDateString("it-IT") : "-" },
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
                              {new Date(r.data_emissione || r.created_at).toLocaleDateString("it-IT")} · € {Number(r.importo || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" className="ml-auto h-7 border-destructive/30 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteRicevuta(r.id)}>
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

      {/* ─── New/Edit Privato Dialog ─── */}
      <Dialog open={showNewPrivato} onOpenChange={(o) => { setShowNewPrivato(o); if (!o) { setEditPrivatoId(null); setPrivatoForm({ ...EMPTY_PRIVATO_FORM }); setScadenzaDate(undefined); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editPrivatoId ? "Modifica Privato" : "Nuovo Privato"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome *</Label><Input value={privatoForm.nome} onChange={(e) => setPrivatoForm(p => ({ ...p, nome: e.target.value }))} /></div>
            <div><Label>Cognome *</Label><Input value={privatoForm.cognome} onChange={(e) => setPrivatoForm(p => ({ ...p, cognome: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Codice Fiscale *</Label><Input value={privatoForm.codice_fiscale} onChange={(e) => setPrivatoForm(p => ({ ...p, codice_fiscale: e.target.value.toUpperCase() }))} className="font-mono" /></div>
            <div className="col-span-2"><Label>Indirizzo (via e numero civico)</Label><Input value={privatoForm.indirizzo} onChange={(e) => setPrivatoForm(p => ({ ...p, indirizzo: e.target.value }))} placeholder="Es. Via Roma 12" /></div>
            <div><Label>CAP</Label><Input value={privatoForm.cap} onChange={(e) => setPrivatoForm(p => ({ ...p, cap: e.target.value }))} placeholder="10060" /></div>
            <div><Label>Comune</Label><Input value={privatoForm.comune_residenza} onChange={(e) => setPrivatoForm(p => ({ ...p, comune_residenza: e.target.value }))} /></div>
            <div><Label>Provincia</Label><Input value={privatoForm.provincia} onChange={(e) => setPrivatoForm(p => ({ ...p, provincia: e.target.value.toUpperCase() }))} maxLength={2} placeholder="TO" className="font-mono" /></div>
            <div><Label>N° Documento</Label><Input value={privatoForm.numero_documento} onChange={(e) => setPrivatoForm(p => ({ ...p, numero_documento: e.target.value }))} /></div>
            <div>
              <Label>Scadenza Documento</Label>
              <DateFieldIT value={scadenzaDate} onChange={setScadenzaDate} />
              <p className="text-[10px] text-muted-foreground mt-1">Scrivi 12/03/2027 (o 12032027) oppure usa il calendario</p>
            </div>
            <div className="col-span-2 space-y-2 rounded-lg border border-border/40 p-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2"><Truck className="h-4 w-4 text-emerald-400" /> Mezzi (modello + targa)</Label>
                <Button type="button" size="sm" variant="outline" className="gap-1"
                  onClick={() => setPrivatoForm(p => ({ ...p, veicoli: [...(p.veicoli || []), { modello: "", targa: "" }] }))}>
                  <Plus className="h-3 w-3" /> Aggiungi mezzo
                </Button>
              </div>
              {(privatoForm.veicoli || []).length === 0 && (
                <p className="text-xs text-muted-foreground">Nessun mezzo associato. Clicca "Aggiungi mezzo" per inserire modello e targa.</p>
              )}
              {(privatoForm.veicoli || []).map((v, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                  <Input
                    placeholder="Modello (es. Fiat Doblò)"
                    value={v.modello}
                    onChange={(e) => setPrivatoForm(p => ({ ...p, veicoli: p.veicoli.map((x, i) => i === idx ? { ...x, modello: e.target.value } : x) }))}
                  />
                  <Input
                    placeholder="Targa"
                    className="font-mono"
                    value={v.targa}
                    onChange={(e) => setPrivatoForm(p => ({ ...p, veicoli: p.veicoli.map((x, i) => i === idx ? { ...x, targa: e.target.value.toUpperCase() } : x) }))}
                  />
                  <Button type="button" size="icon" variant="ghost"
                    title="Rimuovi mezzo"
                    onClick={() => setPrivatoForm(p => ({ ...p, veicoli: p.veicoli.filter((_, i) => i !== idx) }))}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground">Il primo mezzo dell'elenco è quello principale e viene proposto in automatico nei conferimenti.</p>
            </div>

            <div><Label>Cellulare</Label><Input value={privatoForm.cellulare} onChange={(e) => setPrivatoForm(p => ({ ...p, cellulare: e.target.value }))} placeholder="333 1234567" className="font-mono" /></div>
            <div><Label>Telefono fisso</Label><Input value={privatoForm.telefono} onChange={(e) => setPrivatoForm(p => ({ ...p, telefono: e.target.value }))} placeholder="011 1234567" className="font-mono" /></div>
            <div className="col-span-2"><Label>Email</Label><Input value={privatoForm.email} onChange={(e) => setPrivatoForm(p => ({ ...p, email: e.target.value }))} placeholder="nome@email.it" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPrivato(false)}>Annulla</Button>
            <Button onClick={handleSavePrivato} className="bg-emerald-600 hover:bg-emerald-700">{editPrivatoId ? "Salva" : "Registra"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── New Conferimento Dialog ─── */}
      <Dialog open={showNewConferimento} onOpenChange={(o) => { setShowNewConferimento(o); setLimitWarning(null); if (!o) { setConferimentoPrivatoId(null); setCerSearch(""); setShowCerDropdown(false); setOpenCerRow(null); setRigheMateriali([{ cer: "", kg: "", prezzo: "", importo: "" }]); setImportoTotaleManuale(false); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
            {/* Materiali conferiti (multi-riga) */}
            <div className="col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <Label>Materiali conferiti *</Label>
                <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs"
                  onClick={() => setRigheMateriali(p => [...p, { cer: "", kg: "", prezzo: "", importo: "" }])}>
                  + Aggiungi materiale
                </Button>
              </div>
              <div className="grid grid-cols-[1fr_90px_90px_90px_36px] gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                <span>CER</span><span>Kg</span><span>€/kg</span><span>Totale €</span><span />
              </div>
              {righeMateriali.map((riga, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_90px_90px_90px_36px] gap-2 items-start">
                  <div
                    className="relative"
                    ref={(el) => {
                      if (el) cerRowRefs.current.set(idx, el);
                      else cerRowRefs.current.delete(idx);
                    }}
                  >
                    <Input
                      value={riga.cer}
                      onChange={(e) => {
                        const v = e.target.value;
                        setRigheMateriali(p => p.map((r, i) => (i === idx ? { ...r, cer: v } : r)));
                        setOpenCerRow(idx);
                      }}
                      onFocus={() => setOpenCerRow(idx)}
                      placeholder="Cerca o digita CER (es. 200140)"
                      className="font-mono"
                    />
                    {openCerRow === idx && cerOptions(riga.cer).length > 0 && (
                      <div
                        className="absolute z-50 top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-popover shadow-lg"
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <label className="sticky top-0 z-10 flex items-center gap-2 px-3 py-2 text-xs bg-popover border-b border-border cursor-pointer">
                          <input
                            type="checkbox"
                            checked={mostraTuttiCer}
                            onChange={(e) => setMostraTuttiCer(e.target.checked)}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="accent-emerald-500"
                          />
                          <span className="text-muted-foreground">Mostra tutti i CER ammessi ai privati (capitolo 20)</span>
                        </label>
                        {cerOptions(riga.cer).map(c => (
                          <button key={c.codice} type="button"
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent/50 flex items-center gap-2"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setRigheMateriali(p => p.map((r, i) => (i === idx ? { ...r, cer: c.codice } : r)));
                              setOpenCerRow(null);
                            }}>
                            <span className="font-mono text-emerald-400 shrink-0">{c.codice}</span>
                            <span className="text-muted-foreground truncate text-xs">{c.descrizione}</span>
                            {c.pericoloso && <span className="text-red-400 text-xs shrink-0">⚠️</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Input type="number" placeholder="kg" value={riga.kg}
                    onChange={(e) => setRigheMateriali(p => p.map((r, i) => (i === idx ? ricalcolaRiga(r, "kg", e.target.value) : r)))} />
                  <Input type="number" step="0.0001" placeholder="€/kg" value={riga.prezzo}
                    onChange={(e) => setRigheMateriali(p => p.map((r, i) => (i === idx ? ricalcolaRiga(r, "prezzo", e.target.value) : r)))} />
                  <Input type="number" step="0.01" placeholder="Totale €" value={riga.importo}
                    onChange={(e) => setRigheMateriali(p => p.map((r, i) => (i === idx ? ricalcolaRiga(r, "importo", e.target.value) : r)))} />
                  <Button type="button" variant="ghost" size="icon" className="text-red-400 hover:text-red-300"
                    disabled={righeMateriali.length === 1}
                    onClick={() => setRigheMateriali(p => p.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Totale: {totaleKgRighe.toLocaleString("it-IT")} kg — € {totaleRighe.toFixed(2)} — una sola ricevuta con tutti i materiali.
              </p>
            </div>

            <div>
              <Label className="flex items-center justify-between">
                <span>Importo totale €</span>
                {importoTotaleManuale && (
                  <button type="button" className="text-[11px] text-emerald-400 underline"
                    onClick={() => { setImportoTotaleManuale(false); setConfForm(p => ({ ...p, importo_pagato: "" })); }}>
                    ricalcola dalle righe
                  </button>
                )}
              </Label>
              <Input
                type="number"
                step="0.01"
                value={importoTotaleManuale ? confForm.importo_pagato : totaleRighe.toFixed(2)}
                onChange={(e) => { setImportoTotaleManuale(true); setConfForm(p => ({ ...p, importo_pagato: e.target.value })); }}
              />
            </div>

            <div>
              <Label>Metodo Pagamento *</Label>
              <Select value={confForm.metodo_pag} onValueChange={(v) => setConfForm(p => ({ ...p, metodo_pag: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleziona metodo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contanti">Contanti</SelectItem>
                  <SelectItem value="tracciabile_politico">Metodi Tracciabili / Politici</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {normalizeVeicoli(activeConferimentoPrivato).length > 1 && (
              <div className="col-span-2">
                <Label className="flex items-center gap-2"><Truck className="h-4 w-4 text-emerald-400" /> Mezzo utilizzato</Label>
                <Select
                  value={confForm.targa_automezzo || undefined}
                  onValueChange={(v) => {
                    const veh = normalizeVeicoli(activeConferimentoPrivato).find(x => x.targa === v);
                    setConfForm(p => ({ ...p, targa_automezzo: veh?.targa || v, modello_automezzo: veh?.modello || p.modello_automezzo }));
                  }}>
                  <SelectTrigger><SelectValue placeholder="Seleziona mezzo" /></SelectTrigger>
                  <SelectContent>
                    {normalizeVeicoli(activeConferimentoPrivato).filter(v => v.targa).map((v) => (
                      <SelectItem key={v.targa} value={v.targa}>{v.targa}{v.modello ? ` — ${v.modello}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Targa Automezzo</Label><Input value={confForm.targa_automezzo} onChange={(e) => setConfForm(p => ({ ...p, targa_automezzo: e.target.value.toUpperCase() }))} className="font-mono" /></div>

            <div><Label>Modello</Label><Input value={confForm.modello_automezzo} onChange={(e) => setConfForm(p => ({ ...p, modello_automezzo: e.target.value }))} /></div>
            <div><Label>Data Conferimento *</Label><Input type="date" value={confForm.data} onChange={(e) => setConfForm(p => ({ ...p, data: e.target.value }))} /></div>
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
      <Dialog open={showNewRicevuta} onOpenChange={(o) => { setShowNewRicevuta(o); if (!o) setRicevutaPrivatoId(null); }}>
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
