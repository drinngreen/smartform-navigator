import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Zap, ZoomIn, ZoomOut, RotateCcw, Printer, Save } from "lucide-react";
import { toast } from "sonner";
import pag1 from "@/assets/formulario_pag_1.png";
import pag2 from "@/assets/formulario_pag_2.png";
import pag3 from "@/assets/formulario_pag_3.png";
import { GLOBAL_RECO, MULTYPROGET, NIYOL, type Soggetto } from "@/data/anagrafiche";
import { FIRRentriActions } from "./FIRRentriActions";
import { resolveFirQrDataUrl, buildPageDecorationsHtml } from "@/lib/firPrintDecorations";

import { useFormBridgeFields } from "@/hooks/useFormBridge";
import type { RentriCliente } from "@/lib/rentriVpsApi";
import { syncFirFinalToRegistryAndInventory } from "@/lib/firFinalSync";

export interface TemplateField {
  id: string;
  name: string;
  type: "date" | "time" | "short_text" | "long_text" | "checkbox";
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

const PAGE_IMAGES = [pag1, pag2, pag3];

const TENANT_MAP: Record<string, { cliente: RentriCliente; preset: Soggetto }> = {
  global: { cliente: "global", preset: GLOBAL_RECO },
  multyproget: { cliente: "multy", preset: MULTYPROGET },
  "multyproget-intermediario": { cliente: "multy", preset: MULTYPROGET },
  "multyproget-impianto": { cliente: "multy", preset: MULTYPROGET },
  niyol: { cliente: "niyol", preset: NIYOL },
};

const TENANT_ID_MAP: Record<string, string> = {
  global: "167d07ad-9184-484e-85a6-da5ceafa42a3",
  multyproget: "77ec9a3d-602e-438f-97bf-1c69abd8f691",
  "multyproget-intermediario": "77ec9a3d-602e-438f-97bf-1c69abd8f691",
  "multyproget-impianto": "77ec9a3d-602e-438f-97bf-1c69abd8f691",
  niyol: "819c783e-78dd-4080-8265-802e75b0d813",
};

const ALL_PRODUTTORI: Soggetto[] = [GLOBAL_RECO, MULTYPROGET, NIYOL];
function normalizeFieldName(fieldName: string): string {
  return fieldName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function hasTokens(fieldName: string, tokens: string[]): boolean {
  const normalized = normalizeFieldName(fieldName);
  const parts = normalized.split("_").filter(Boolean);
  return tokens.every((token) => parts.includes(token));
}

function findFieldByTokens(fields: TemplateField[], tokens: string[]): TemplateField | undefined {
  return fields.find((field) => hasTokens(field.name, tokens));
}

export function isNumeroFirFieldName(fieldName: string): boolean {
  return hasTokens(fieldName, ["numero", "fir"]) || hasTokens(fieldName, ["numero", "formulario"]);
}

function isProduttoreDenominationField(fieldName: string): boolean {
  return hasTokens(fieldName, ["denominazione", "produttore"]);
}

function isDestinatarioDenominationField(fieldName: string): boolean {
  return hasTokens(fieldName, ["denominazione", "destinatario"])
    && !hasTokens(fieldName, ["secondo", "destinatario"]);
}

function isProduttoreCfField(fieldName: string): boolean {
  return hasTokens(fieldName, ["codice", "fiscale", "produttore"]);
}

function isDestinatarioCfField(fieldName: string): boolean {
  return hasTokens(fieldName, ["codice", "fiscale", "destinatario"])
    && !hasTokens(fieldName, ["secondo", "destinatario"]);
}

function isProduttoreAddressField(fieldName: string): boolean {
  return hasTokens(fieldName, ["unita", "locale", "produttore"]);
}

function isDestinatarioAddressField(fieldName: string): boolean {
  return hasTokens(fieldName, ["unita", "locale", "destinatario"])
    && !hasTokens(fieldName, ["secondo", "destinatario"]);
}

function isProduttoreAuthorizationField(fieldName: string): boolean {
  return hasTokens(fieldName, ["numero", "aut", "comunicazione", "produttore"]);
}

function isDestinatarioAuthorizationField(fieldName: string): boolean {
  return hasTokens(fieldName, ["numero", "aut", "comunicazione", "destinatario"])
    && !hasTokens(fieldName, ["secondo", "destinatario"]);
}

function isProduttoreAuthorizationTypeField(fieldName: string): boolean {
  return hasTokens(fieldName, ["tipologia", "autorizzazione", "ambientale", "produttore"]);
}

function isDestinatarioAuthorizationTypeField(fieldName: string): boolean {
  return hasTokens(fieldName, ["tipologia", "autorizzazione", "ambientale", "destinatario"])
    && !hasTokens(fieldName, ["secondo", "destinatario"]);
}

function matchesSoggettoSearch(soggetto: Soggetto, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [soggetto.nome, soggetto.cf, soggetto.indirizzo, soggetto.piva, soggetto.autorizzazione]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(normalizedQuery));
}

function buildSoggettoUpdates(fields: TemplateField[], soggetto: Soggetto, target: "produttore" | "destinatario") {
  const updates: Record<string, string> = {};

  fields.forEach((field) => {
    const normalizedName = normalizeFieldName(field.name);

    if (target === "produttore") {
      if (normalizedName.includes("nuovo_trasportatore") || normalizedName.includes("originale")) return;

      if (isProduttoreDenominationField(field.name)) updates[field.id] = soggetto.nome;
      else if (isProduttoreCfField(field.name)) updates[field.id] = soggetto.cf;
      else if (isProduttoreAddressField(field.name)) updates[field.id] = soggetto.indirizzo;
      else if (isProduttoreAuthorizationField(field.name)) updates[field.id] = soggetto.autorizzazione ?? "";
      else if (isProduttoreAuthorizationTypeField(field.name)) updates[field.id] = soggetto.tipoAut ?? "";
    }

    if (target === "destinatario") {
      if (normalizedName.includes("secondo_destinatario")) return;

      if (isDestinatarioDenominationField(field.name)) updates[field.id] = soggetto.nome;
      else if (isDestinatarioCfField(field.name)) updates[field.id] = soggetto.cf;
      else if (isDestinatarioAddressField(field.name)) updates[field.id] = soggetto.indirizzo;
      else if (isDestinatarioAuthorizationField(field.name)) updates[field.id] = soggetto.autorizzazione ?? "";
      else if (isDestinatarioAuthorizationTypeField(field.name)) updates[field.id] = soggetto.tipoAut ?? "";
    }
  });

  return updates;
}

const STATO_FISICO_CODE_MAP: Record<string, string> = {
  "1": "1",
  solido_pulverulento: "1",
  "2": "2",
  solido_non_pulverulento: "2",
  "3": "3",
  fangoso_palabile: "3",
  "4": "4",
  liquido: "4",
  "5": "5",
  aeriforme: "5",
  "6": "6",
  altro: "6",
};

const STATO_FISICO_LABEL_MAP: Record<string, string> = {
  "1": "solido pulverulento",
  "2": "solido non pulverulento",
  "3": "fangoso palabile",
  "4": "liquido",
  "5": "aeriforme",
  "6": "altro",
};
const ALLOWED_STATO_FISICO_LABELS = new Set(Object.values(STATO_FISICO_LABEL_MAP));
function toStatoFisicoLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  if (STATO_FISICO_LABEL_MAP[v]) return STATO_FISICO_LABEL_MAP[v];
  const lower = v.toLowerCase();
  if (ALLOWED_STATO_FISICO_LABELS.has(lower)) return lower;
  return null;
}

export interface FIRAlternativeDraftData {
  id?: string;
  numero_fir?: string | null;
  status?: string | null;
  user_id?: string | null;
  produttore_denominazione?: string | null;
  produttore_codice_fiscale?: string | null;
  produttore_indirizzo?: string | null;
  destinatario_denominazione?: string | null;
  destinatario_codice_fiscale?: string | null;
  destinatario_indirizzo?: string | null;
  destinatario_autorizzazione?: string | null;
  trasportatore_denominazione?: string | null;
  trasportatore_codice_fiscale?: string | null;
  trasportatore_iscrizione_albo?: string | null;
  trasportatore_targa_automezzo?: string | null;
  trasportatore_targa_rimorchio?: string | null;
  trasportatore_conducente?: string | null;
  codice_eer?: string | null;
  descrizione_rifiuto?: string | null;
  stato_fisico?: string | null;
  quantita?: number | null;
  unita_misura?: string | null;
  caratteristiche_hp?: string[] | null;
  data_partenza?: string | null;
  data_arrivo?: string | null;
  intermediario_denominazione?: string | null;
  intermediario_codice_fiscale?: string | null;
  intermediario_iscrizione_albo?: string | null;
  note?: string | null;
  form_data?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

function getFormDataValue(formData: Record<string, unknown> | null | undefined, ...keys: string[]) {
  if (!formData) return null;

  for (const key of keys) {
    if (!(key in formData)) continue;
    const value = formData[key];
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    return value;
  }

  return null;
}

function toCheckboxValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    return ["1", "true", "si", "sì", "yes", "y", "on", "x", "checked"].includes(normalized);
  }
  return Boolean(value);
}

function toTextValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return String(value);
}

function extractDateValue(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";

  const directMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (directMatch) return directMatch[1];

  const embeddedMatch = value.match(/(\d{4}-\d{2}-\d{2})[ T]/);
  if (embeddedMatch) return embeddedMatch[1];

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function extractTimeValue(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";

  const embeddedMatch = value.match(/[T ](\d{2}:\d{2})/);
  if (embeddedMatch) return embeddedMatch[1];

  const directMatch = value.match(/^(\d{2}:\d{2})/);
  if (directMatch) return directMatch[1];

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function toStatoFisicoCode(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  const normalized = normalizeFieldName(value);
  return STATO_FISICO_CODE_MAP[normalized] || value.trim();
}

function getDraftValueForField(
  field: TemplateField,
  draft: FIRAlternativeDraftData,
  formData: Record<string, unknown> | null
): unknown {
  const normalized = normalizeFieldName(field.name);
  const isSecondDestField = normalized.includes("secondo_destinatario");
  const isNuovoTrasportatoreField = normalized.includes("nuovo_trasportatore") || normalized.includes("produttore_detentore_originale");
  const isFrazionamentoField = normalized.includes("frazionamento");
  const isTrasbordoTotaleField = normalized.includes("trasbordo_totale");

  if (field.type === "checkbox") {
    if (normalized === "registro_no") return getFormDataValue(formData, "registro_no") === "NO";
    if (normalized === "detentore") return getFormDataValue(formData, "detentore_checkbox");
    if (normalized === "recupero") return getFormDataValue(formData, "destinatario_operazione_R", "destinatario_operazione_r");
    if (normalized === "smaltimento") return getFormDataValue(formData, "destinatario_operazione_D", "destinatario_operazione_d");
    if (normalized === "speciale") return getFormDataValue(formData, "provenienza_speciale");
    if (normalized === "urbano") return getFormDataValue(formData, "provenienza_urbano");
    if (normalized === "accettato_per_intero") return getFormDataValue(formData, "accettato_per_intero");
    if (normalized === "accettato_parzialmente") return getFormDataValue(formData, "accettato_parzialmente");
    if (normalized === "respinto") return getFormDataValue(formData, "respinto");
    if (normalized === "peso_verificato_in_partenza") return getFormDataValue(formData, "peso_verificato_partenza");
    if (normalized === "trasporto_adr_rid") return getFormDataValue(formData, "trasporto_adr_rid");
    if (normalized === "alla_rinfusa") return getFormDataValue(formData, "aspetto_rinfusa");
    if (normalized === "chilogrammi") return String(draft.unita_misura || "kg").toLowerCase() !== "l";
    if (normalized === "litri") return String(draft.unita_misura || "").toLowerCase() === "l";
    if (normalized === "in_attesa_di_verifica_analitica") return getFormDataValue(formData, "in_attesa_verifica_analitica");
    if (normalized === "microraccolta") return getFormDataValue(formData, "microraccolta");
    if (normalized === "intermodale") return getFormDataValue(formData, "intermodale");
    if (normalized === "analisi_rapporto_di_prova") return getFormDataValue(formData, "analisi_rapporto_di_prova");
    if (normalized === "classificazione_caratteristiche_chimico_fisiche") return getFormDataValue(formData, "classificazione_caratteristiche_chimico_fisiche");
    if (normalized === "ir") return getFormDataValue(formData, "ir");
    if (normalized === "nc") return getFormDataValue(formData, "nc");
    if (normalized === "a") return getFormDataValue(formData, "a");
    return null;
  }

  if (field.type === "date") {
    if (normalized === "data_emissione" || normalized === "data_di_emissione_foglio_2") {
      return getFormDataValue(formData, "data_emissione", "dataEmissione") || draft.data_partenza || draft.data_arrivo;
    }
    if (hasTokens(field.name, ["data", "inizio", "trasporto"])) return draft.data_partenza;
    if (hasTokens(field.name, ["data", "arrivo", "destinatario"]) && !isSecondDestField) return getFormDataValue(formData, "data_accettazione", "data_fine_trasporto", "data_ricezione") || draft.data_arrivo;
    if (normalized === "valida_al") return getFormDataValue(formData, "valida_al", "analisi_valida_al", "classificazione_valida_al");
    if (hasTokens(field.name, ["data", "arrivo", "secondo", "destinatario"])) return getFormDataValue(formData, "secondo_destinatario_data_arrivo", "dest2DataArrivo");
    if (normalized.includes("prima_sospensione")) return getFormDataValue(formData, "sosta_tecnica_1_data_sospensione");
    if (normalized.includes("seconda_sospensione")) return getFormDataValue(formData, "sosta_tecnica_2_data_sospensione");
    if (normalized.includes("terza_sospensione")) return getFormDataValue(formData, "sosta_tecnica_3_data_sospensione");
    if (normalized.includes("ripresa_primo_trasporto")) return getFormDataValue(formData, "sosta_tecnica_1_data_ripresa");
    if (normalized.includes("ripresa_secondo_trasporto")) return getFormDataValue(formData, "sosta_tecnica_2_data_ripresa");
    if (normalized.includes("ripresa_terzo_trasporto")) return getFormDataValue(formData, "sosta_tecnica_3_data_ripresa");
    if (normalized === "data_presa_rimorchio_precedente") return getFormDataValue(formData, "trasbordo_totale_data_presa_carico", "trasbordoTotDataPresaCarico");
    return null;
  }

  if (field.type === "time") {
    if (hasTokens(field.name, ["ora", "inizio", "trasporto"])) return draft.data_partenza;
    if (hasTokens(field.name, ["ora", "arrivo", "destinatario"]) && !isSecondDestField) return getFormDataValue(formData, "ora_accettazione", "ora_fine_trasporto", "ora_ricezione") || draft.data_arrivo;
    if (hasTokens(field.name, ["ora", "arrivo", "secondo", "destinatario"])) return getFormDataValue(formData, "secondo_destinatario_data_arrivo", "dest2DataArrivo");
    if (normalized.includes("ora_prima_sospensione")) return getFormDataValue(formData, "sosta_tecnica_1_data_sospensione");
    if (normalized.includes("ora_seconda_sospensione")) return getFormDataValue(formData, "sosta_tecnica_2_data_sospensione");
    if (normalized.includes("ora_terza_sospensione")) return getFormDataValue(formData, "sosta_tecnica_3_data_sospensione");
    if (normalized.includes("ora_ripresa_primo_trasporto")) return getFormDataValue(formData, "sosta_tecnica_1_data_ripresa");
    if (normalized.includes("ora_ripresa_secondo_trasporto")) return getFormDataValue(formData, "sosta_tecnica_2_data_ripresa");
    if (normalized.includes("ora_ripresa_terzo_trasporto")) return getFormDataValue(formData, "sosta_tecnica_3_data_ripresa");
    if (normalized === "ora_presa_rimorchio_precedente") return getFormDataValue(formData, "trasbordo_totale_data_presa_carico", "trasbordoTotDataPresaCarico");
    return null;
  }

  if (normalized === "numero_fir") return draft.numero_fir;
  if (normalized === "numero_di_registrazione") return getFormDataValue(formData, "numero_registro");
  if (normalized === "codice_eer") return draft.codice_eer;
  if (normalized === "descrizione_rifiuto") return draft.descrizione_rifiuto;
  if (normalized === "caratteristiche_di_pericolo") return draft.caratteristiche_hp;
  if (normalized === "stato_fisico") return toStatoFisicoCode(draft.stato_fisico);
  if (normalized === "quantita") return draft.quantita;
  if (normalized === "quantita_accettata") return getFormDataValue(formData, "quantita_accettata", "quantita_destino", "peso_ricevuto");
  if (normalized === "quantita_respinta" || normalized === "kg_respinti") return getFormDataValue(formData, "quantita_respinta", "kg_respinti");
  if (normalized === "annotazioni_pagina_1") return draft.note;
  if (normalized === "annotazioni_seconda_pagina") return getFormDataValue(formData, "annotazioni_pag2", "annotazioni_seconda_pagina");
  if (normalized === "nr_onu") return getFormDataValue(formData, "nr_onu");
  if (normalized === "note_caratteristiche_chimico_fisiche") return getFormDataValue(formData, "note_adr");
  if (normalized === "percorso_se_diverso_dal_piu_breve") return getFormDataValue(formData, "percorso");
  if (normalized === "motivazioni_respinta") return getFormDataValue(formData, "motivazioni_respinta", "motivazione_respingimento");
  if (normalized === "nr_documento") return getFormDataValue(formData, "nr_documento", "analisi_numero", "classificazione_numero");
  if (normalized === "luogo_di_produzione_se_diverso_produttore") return getFormDataValue(formData, "produttore_luogo_produzione");
  if (normalized === "denominazione_detentore") return getFormDataValue(formData, "detentore_denominazione");
  if (normalized === "unita_locale_indirizzo_detentore") return getFormDataValue(formData, "detentore_unita_locale", "detentore_indirizzo");
  if (normalized === "codice_fiscale_detentore") return getFormDataValue(formData, "detentore_codice_fiscale", "detentore_cf");

  if (isProduttoreDenominationField(field.name)) return draft.produttore_denominazione;
  if (isProduttoreCfField(field.name)) return draft.produttore_codice_fiscale;
  if (isProduttoreAddressField(field.name)) return draft.produttore_indirizzo;
  if (isProduttoreAuthorizationField(field.name)) return getFormDataValue(formData, "produttore_numero_aut", "produttore_iscrizione_albo");
  if (isProduttoreAuthorizationTypeField(field.name)) return getFormDataValue(formData, "produttore_tipo", "produttore_tipo_aut");
  if (hasTokens(field.name, ["numero", "iscrizione", "albo", "produttore"])) return getFormDataValue(formData, "produttore_iscrizione_albo");

  if (isDestinatarioDenominationField(field.name)) return draft.destinatario_denominazione;
  if (isDestinatarioCfField(field.name)) return draft.destinatario_codice_fiscale;
  if (isDestinatarioAddressField(field.name)) return draft.destinatario_indirizzo;
  if (isDestinatarioAuthorizationField(field.name)) return getFormDataValue(formData, "destinatario_n_aut_comunicazione", "destinatario_numero_aut") || draft.destinatario_autorizzazione;
  if (isDestinatarioAuthorizationTypeField(field.name)) return getFormDataValue(formData, "destinatario_tipo");
  if (hasTokens(field.name, ["numero", "iscrizione", "albo", "destinatario"]) && !isSecondDestField) return draft.destinatario_autorizzazione;

  if (hasTokens(field.name, ["denominazione", "trasportatore"]) && !isNuovoTrasportatoreField && !isFrazionamentoField && !isTrasbordoTotaleField) return draft.trasportatore_denominazione;
  if (hasTokens(field.name, ["codice", "fiscale", "trasportatore"]) && !isNuovoTrasportatoreField && !isFrazionamentoField && !isTrasbordoTotaleField) return draft.trasportatore_codice_fiscale;
  if (hasTokens(field.name, ["numero", "iscrizione", "albo", "trasportatore"]) && !isNuovoTrasportatoreField && !isFrazionamentoField && !isTrasbordoTotaleField) return draft.trasportatore_iscrizione_albo;
  if (hasTokens(field.name, ["cognome", "nome", "conducente"]) && !isTrasbordoTotaleField) return draft.trasportatore_conducente;
  if (hasTokens(field.name, ["targa", "automezzo"]) && !isFrazionamentoField && !isTrasbordoTotaleField) return draft.trasportatore_targa_automezzo;
  if (hasTokens(field.name, ["targa", "rimorchio"]) && !isFrazionamentoField && !isTrasbordoTotaleField) return draft.trasportatore_targa_rimorchio;

  if (hasTokens(field.name, ["denominazione", "intermediario"])) return draft.intermediario_denominazione;
  if (hasTokens(field.name, ["codice", "fiscale", "intermediario"])) return draft.intermediario_codice_fiscale;
  if (hasTokens(field.name, ["numero", "iscrizione", "albo", "intermediario"])) return draft.intermediario_iscrizione_albo;

  if (hasTokens(field.name, ["classe", "pericolo"])) return getFormDataValue(formData, "classe_pericolo");
  if (hasTokens(field.name, ["numero", "colli"])) return getFormDataValue(formData, "numero_colli");
  if (hasTokens(field.name, ["quantita", "residua"])) return getFormDataValue(formData, "trasbordo_parziale_quantita_residua");
  if (hasTokens(field.name, ["riferimento", "formulario"])) return getFormDataValue(formData, "trasbordo_parziale_rif_formulario");

  if (hasTokens(field.name, ["denominazione", "secondo", "destinatario"])) return getFormDataValue(formData, "secondo_destinatario_denominazione");
  if (hasTokens(field.name, ["unita", "locale", "secondo", "destinatario"])) return getFormDataValue(formData, "secondo_destinatario_unita_locale");
  if (hasTokens(field.name, ["codice", "fiscale", "secondo", "destinatario"])) return getFormDataValue(formData, "secondo_destinatario_codice_fiscale");
  if (hasTokens(field.name, ["aut", "comunicazione", "secondo", "destinatario"])) return getFormDataValue(formData, "secondo_destinatario_iscrizione_albo");
  if (hasTokens(field.name, ["numero", "iscrizione", "albo", "secondo", "destinatario"])) return getFormDataValue(formData, "secondo_destinatario_iscrizione_albo");
  if (hasTokens(field.name, ["tipologia", "autorizzazione", "ambientale", "destinatario"]) && isSecondDestField) return getFormDataValue(formData, "secondo_destinatario_tipo", "dest2TipoAut");

  if (isNuovoTrasportatoreField && hasTokens(field.name, ["denominazione"])) return getFormDataValue(formData, "trasbordo_parziale_denominazione");
  if (isNuovoTrasportatoreField && hasTokens(field.name, ["codice", "fiscale"])) return getFormDataValue(formData, "trasbordo_parziale_codice_fiscale");
  if (isNuovoTrasportatoreField && hasTokens(field.name, ["iscrizione", "albo"])) return getFormDataValue(formData, "trasbordo_parziale_iscrizione_albo");

  if (isFrazionamentoField && hasTokens(field.name, ["denominazione"])) return getFormDataValue(formData, "trasbordo_parziale_denominazione");
  if (isFrazionamentoField && hasTokens(field.name, ["codice", "fiscale"])) return getFormDataValue(formData, "trasbordo_parziale_codice_fiscale");
  if (isFrazionamentoField && hasTokens(field.name, ["numero", "iscrizione", "albo"])) return getFormDataValue(formData, "trasbordo_parziale_iscrizione_albo");
  if (isFrazionamentoField && hasTokens(field.name, ["targa", "automezzo"])) return getFormDataValue(formData, "trasbordo_parziale_targa_automezzo");
  if (isFrazionamentoField && hasTokens(field.name, ["targa", "rimorchio"])) return getFormDataValue(formData, "trasbordo_parziale_targa_rimorchio");

  if (isTrasbordoTotaleField && hasTokens(field.name, ["denominazione"])) return getFormDataValue(formData, "trasbordo_totale_denominazione", "trasbordoTotDenominazione");
  if (isTrasbordoTotaleField && hasTokens(field.name, ["codice", "fiscale"])) return getFormDataValue(formData, "trasbordo_totale_codice_fiscale", "trasbordoTotCF");
  if (isTrasbordoTotaleField && hasTokens(field.name, ["numero", "iscrizione", "albo"])) return getFormDataValue(formData, "trasbordo_totale_iscrizione_albo", "trasbordoTotAlbo");
  if (isTrasbordoTotaleField && hasTokens(field.name, ["targa", "automezzo"])) return getFormDataValue(formData, "trasbordo_totale_targa_automezzo", "trasbordoTotTarga");
  if (isTrasbordoTotaleField && hasTokens(field.name, ["targa", "rimorchio"])) return getFormDataValue(formData, "trasbordo_totale_targa_rimorchio", "trasbordoTotRimorchio");
  if (isTrasbordoTotaleField && hasTokens(field.name, ["conducente"])) return getFormDataValue(formData, "trasbordo_totale_conducente", "trasbordoTotConducente");

  if (hasTokens(field.name, ["luogo", "primo", "stazionamento"])) return getFormDataValue(formData, "sosta_tecnica_1_luogo");
  if (hasTokens(field.name, ["luogo", "secondo", "stazionamento"])) return getFormDataValue(formData, "sosta_tecnica_2_luogo");
  if (hasTokens(field.name, ["luogo", "terzo", "stazionamento"])) return getFormDataValue(formData, "sosta_tecnica_3_luogo");

  return null;
}

export function buildDraftFieldValues(fields: TemplateField[], draft: FIRAlternativeDraftData) {
  const formData = draft.form_data && typeof draft.form_data === "object" && !Array.isArray(draft.form_data)
    ? draft.form_data as Record<string, unknown>
    : null;

  const nextValues: Record<string, string | boolean> = {};

  fields.forEach((field) => {
    const rawValue = getDraftValueForField(field, draft, formData);
    if (rawValue === null || rawValue === undefined) return;

    if (field.type === "checkbox") {
      nextValues[field.id] = toCheckboxValue(rawValue);
      return;
    }

    const formattedValue = field.type === "date"
      ? extractDateValue(rawValue)
      : field.type === "time"
        ? extractTimeValue(rawValue)
        : toTextValue(rawValue);

    if (formattedValue !== "") {
      nextValues[field.id] = formattedValue;
    }
  });

  return nextValues;
}

interface FIRAlternativeFormProps {
  presetNumeroFir?: string;
  firFormId?: string;
  assignedUserId?: string;
  impiantoId?: string | null;
  draftData?: FIRAlternativeDraftData | null;
  ocrEntries?: { id: string; value: string }[];
  printOnly?: boolean;
  /** Stampa un formulario completamente vuoto: nessuna bozza, nessun preset, solo il numero FIR. */
  blankPrint?: boolean;
  disableRentriActions?: boolean;
  registryMovementType?: "Carico" | "Scarico";
  /** Tenant proprietario del formulario: forza società/QR/vidimazione (Multyproget vs Niyol). */
  tenantId?: string;
  onSaved?: () => void;
  onPrinted?: () => void;
}

export function FIRAlternativeForm({ presetNumeroFir, firFormId, assignedUserId, impiantoId, draftData, ocrEntries, printOnly, blankPrint, disableRentriActions, registryMovementType, tenantId: tenantIdProp, onSaved, onPrinted }: FIRAlternativeFormProps = {}) {

  const [fields, setFields] = useState<TemplateField[]>([]);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [activeDraftId, setActiveDraftId] = useState<string | null>(firFormId || null);
  const [activeDraftNumero, setActiveDraftNumero] = useState<string | null>(presetNumeroFir || null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [selectedProduttore, setSelectedProduttore] = useState<Soggetto | null>(null);
  const [destinatari, setDestinatari] = useState<Soggetto[]>([]);
  const [suppressProducerPreset, setSuppressProducerPreset] = useState(false);
  const localDraftHydratedRef = useRef(false);
  const location = useLocation();
  const params = useParams<{ context?: string }>();

  const tenantContext = useMemo((): string => {
    // 1) tenant esplicito (moduli dev/ufficio Niyol e Multyproget)
    if (tenantIdProp) {
      const explicit = Object.keys(TENANT_ID_MAP).find((k) => TENANT_ID_MAP[k] === tenantIdProp);
      if (explicit) return explicit === "global" ? "global" : explicit;
    }
    // 2) bozza già esistente con tenant salvato
    const draftTenant = (draftData as any)?.tenant_id as string | undefined;
    if (draftTenant) {
      const fromDraft = Object.keys(TENANT_ID_MAP).find((k) => TENANT_ID_MAP[k] === draftTenant);
      if (fromDraft) return fromDraft;
    }
    if (params.context) {
      if (params.context.includes("niyol")) return "niyol";
      if (params.context.includes("multy")) return "multyproget";
      if (params.context.includes("global")) return "global";
    }

    if (location.pathname.toLowerCase().includes("niyol")) return "niyol";
    if (location.pathname.includes("/mn/app/multyproget")) return "multyproget";
    if (location.pathname.includes("/app/")) return "global";
    if (location.pathname.includes("/mn/")) return "multyproget";
    return "global";
  }, [location.pathname, params.context, tenantIdProp, draftData]);

  const tenantInfo = TENANT_MAP[tenantContext] || TENANT_MAP.global;
  const rentriCliente = tenantInfo.cliente;
  const tenantPreset = tenantInfo.preset;
  const orderedProduttori = useMemo(
    () => [tenantPreset, ...ALL_PRODUTTORI.filter((p) => p.cf !== tenantPreset.cf)],
    [tenantPreset]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows: any[] = [];
      for (let page = 0; page < 20; page++) {
        const { data, error } = await supabase
          .from("anagrafica_aziende_mp")
          .select("id,ragione_sociale,indirizzo,citta,provincia,cap,codice_fiscale,partita_iva")
          .eq("destinatario", true)
          .order("ragione_sociale")
          .range(page * 1000, page * 1000 + 999);
        if (error) break;
        rows.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      if (cancelled) return;
      const ids = rows.map((row) => row.id).filter(Boolean);
      const authRows: any[] = [];
      for (let offset = 0; offset < ids.length; offset += 150) {
        const { data } = await supabase
          .from("cliente_autorizzazioni")
          .select("cliente_id,numero_autorizzazione,tipo,ente_rilascio,data_inizio,data_scadenza")
          .in("cliente_id", ids.slice(offset, offset + 150))
          .eq("tipo", "DESTINATARIO")
          .order("data_scadenza", { ascending: false });
        authRows.push(...(data || []));
      }
      const authByCompany = new Map<string, any>();
      for (const auth of authRows) {
        if (!authByCompany.has(auth.cliente_id)) authByCompany.set(auth.cliente_id, auth);
      }
      setDestinatari(rows.map((row) => ({
        nome: row.ragione_sociale || "",
        indirizzo: [row.indirizzo, [row.cap, row.citta, row.provincia ? `(${row.provincia})` : ""].filter(Boolean).join(" ")]
          .filter(Boolean)
          .join(" - "),
        cf: row.codice_fiscale || row.partita_iva || "",
        piva: row.partita_iva || row.codice_fiscale || "",
        tipo: "IMPIANTO" as const,
        autorizzazione: authByCompany.get(row.id)?.numero_autorizzazione || "",
        tipoAut: authByCompany.get(row.id)?.ente_rilascio || authByCompany.get(row.id)?.tipo || "",
        dataAut: authByCompany.get(row.id)?.data_inizio || authByCompany.get(row.id)?.data_scadenza || "",
      })));
    })();
    return () => { cancelled = true; };
  }, []);

  const produttoreDenomField = useMemo(
    () => fields.find((field) => isProduttoreDenominationField(field.name)),
    [fields]
  );
  const produttoreCfField = useMemo(
    () => findFieldByTokens(fields, ["codice", "fiscale", "produttore"]),
    [fields]
  );
  const currentProduttoreNome = produttoreDenomField ? String(values[produttoreDenomField.id] ?? "").trim() : "";
  const currentProduttoreCf = produttoreCfField ? String(values[produttoreCfField.id] ?? "").trim() : "";
  const canonicalNumeroFir = draftData?.numero_fir || presetNumeroFir || activeDraftNumero || "";

  const isOwnProduction = useMemo(() => {
    if (!currentProduttoreNome && !currentProduttoreCf && !selectedProduttore) return true;

    const referenceCf = selectedProduttore?.cf?.trim() || currentProduttoreCf;
    const referenceName = selectedProduttore?.nome?.trim() || currentProduttoreNome;

    if (referenceCf) return referenceCf === tenantPreset.cf;
    return referenceName.toLowerCase() === tenantPreset.nome.toLowerCase();
  }, [currentProduttoreCf, currentProduttoreNome, selectedProduttore, tenantPreset]);

  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTouchDist, setLastTouchDist] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeAutocompleteFieldId, setActiveAutocompleteFieldId] = useState<string | null>(null);
  const [confirmedFieldIds, setConfirmedFieldIds] = useState<Set<string>>(new Set());

  useFormBridgeFields(
    () => fields.map((field) => {
      const normalizedName = normalizeFieldName(field.name || field.id);
      const label = field.name?.trim() || field.id;
      const bridgeType = field.type === "date"
        ? "date"
        : field.type === "checkbox"
          ? "checkbox"
        : field.type === "long_text"
          ? "textarea"
          : "text";

      return {
        id: `xfir_${normalizedName || field.id}`,
        label,
        type: bridgeType,
        aliases: [field.id, normalizedName, label],
        getValue: () => {
          if (isNumeroFirFieldName(field.name)) return canonicalNumeroFir;
          const current = values[field.id];
          if (field.type === "checkbox") {
            return current ? "true" : "false";
          }
          return typeof current === "string" ? current : current ? String(current) : "";
        },
        setValue: (nextValue: string) => {
          // The AI/OCR bridge must not be able to mutate the canonical FIR number.
          if (isNumeroFirFieldName(field.name)) return;
          const next = field.type === "checkbox" ? toCheckboxValue(nextValue) : nextValue;
          setValues((prev) => ({ ...prev, [field.id]: next }));
          if (isProduttoreDenominationField(field.name) || isProduttoreCfField(field.name)) {
            setSelectedProduttore(null);
            setConfirmedFieldIds((prev) => {
              const updated = new Set(prev);
              updated.add(field.id);
              return updated;
            });
          }
        },
      };
    }),
    [fields, values, canonicalNumeroFir],
  );

  useEffect(() => {
    if (!ocrEntries?.length || !fields.length) return;
    setSuppressProducerPreset(true);
    const normalize = (value: string) => normalizeFieldName(value);
    const nextValues: Record<string, string> = {};
    ocrEntries.forEach((entry) => {
      const wanted = normalize(entry.id);
      const field = fields.find((candidate) => {
        const normalizedName = normalize(candidate.name || candidate.id);
        return normalizedName === wanted || normalizedName.includes(wanted) || wanted.includes(normalizedName);
      });
      if (!field || !entry.value) return;
      // numero_fir is immutable — never accept it from OCR
      if (isNumeroFirFieldName(field.name)) return;
      nextValues[field.id] = entry.value;
    });
    if (Object.keys(nextValues).length === 0) return;
    setValues((prev) => {
      const merged = { ...prev };
      const presetProducerValues = buildSoggettoUpdates(fields, tenantPreset, "produttore");
      for (const [fieldId, presetValue] of Object.entries(presetProducerValues)) {
        if (!(fieldId in nextValues) && String(merged[fieldId] ?? "").trim() === presetValue.trim()) {
          merged[fieldId] = "";
        }
      }
      return { ...merged, ...nextValues };
    });
    setConfirmedFieldIds((prevConfirmed) => {
      const updated = new Set(prevConfirmed);
      Object.keys(nextValues).forEach((fieldId) => updated.add(fieldId));
      return updated;
    });
    setSelectedProduttore(null);
  }, [ocrEntries, fields, tenantPreset]);

  const dynamicFontSize = (text: string, baseMax = 11) => {
    const len = text.length;
    if (len <= 20) return `clamp(7px, 1.8vw, ${baseMax}px)`;
    if (len <= 40) return `clamp(6px, 1.4vw, 9px)`;
    if (len <= 60) return `clamp(5px, 1.2vw, 8px)`;
    return `clamp(4px, 1vw, 7px)`;
  };

  // Auto-load user's active FIR draft only when no firFormId (workspace ALWAYS passes one)
  useEffect(() => {
    // PRIORITY: if firFormId provided by parent (workspace), never resolve another draft
    if (blankPrint) return;
    if (firFormId) return;

    // If we have a numero_fir but no draft id, try to resolve the draft by numero
    if (presetNumeroFir) {
      supabase
        .from("fir_forms")
        .select("id")
        .eq("numero_fir", presetNumeroFir)
        .eq("deleted_by_user", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data: draft }) => {
          if (draft) setActiveDraftId(draft.id);
        });
      return;
    }

    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) return;
      supabase
        .from("fir_forms")
        .select("id, numero_fir")
        .eq("user_id", authUser.id)
        .eq("status", "bozza")
        .eq("deleted_by_user", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data: draft }) => {
          if (draft) {
            setActiveDraftId(draft.id);
            setActiveDraftNumero(draft.numero_fir);
          }
        });
    });
  }, [presetNumeroFir, firFormId, blankPrint]);

  useEffect(() => {
    const effectiveNumero = presetNumeroFir || activeDraftNumero;
    supabase
      .from("fir_form_templates")
      .select("fields")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (data?.fields) {
          const loadedFields = data.fields as unknown as TemplateField[];
          setFields(loadedFields);
          if (effectiveNumero) {
            const numeroField = loadedFields.find(f => hasTokens(f.name, ["numero", "formulario"]));
            if (numeroField) {
              setValues(prev => ({ ...prev, [numeroField.id]: effectiveNumero }));
            }
          }
        }
        if (error) console.warn("[FIRAlternativeForm]", error.message);
        setLoading(false);
      });
  }, [presetNumeroFir, activeDraftNumero]);

  const hydratedDraftKeyRef = useRef<string | null>(null);

  const localDraftKey = useMemo(() => {
    const identity = draftData?.id || activeDraftId || firFormId || presetNumeroFir || activeDraftNumero;
    return identity ? `fir-alternative-working-draft:${identity}` : null;
  }, [draftData?.id, activeDraftId, firFormId, presetNumeroFir, activeDraftNumero]);

  useEffect(() => {
    if (fields.length === 0) return;
    if (blankPrint) return;

    // Idrata i valori dal DB UNA SOLA VOLTA per bozza: evita che refetch/realtime
    // sovrascrivano quello che l'utente sta compilando.
    const hydrationKey = draftData?.id || activeDraftId || presetNumeroFir || activeDraftNumero || null;
    if (hydrationKey && hydratedDraftKeyRef.current === hydrationKey) return;
    if (hydrationKey) hydratedDraftKeyRef.current = hydrationKey;

    let cancelled = false;

    const loadDraftValues = async () => {
      let draft = draftData ?? null;

      if (!draft && activeDraftId) {
        const { data } = await supabase
          .from("fir_forms")
          .select("*")
          .eq("id", activeDraftId)
          .maybeSingle();

        draft = (data as FIRAlternativeDraftData | null) ?? null;
      }

      if (!draft || cancelled) return;

      const hydratedValues = buildDraftFieldValues(fields, draft);
      const effectiveNumero = draft.numero_fir || presetNumeroFir || activeDraftNumero;

      // La sessione locale è la fonte più recente finché l'utente non chiude
      // la pagina del browser: recupera anche dati non ancora arrivati al DB.
      let localValues: Record<string, string | boolean> = {};
      if (localDraftKey) {
        try {
          const saved = sessionStorage.getItem(localDraftKey);
          if (saved) localValues = JSON.parse(saved) as Record<string, string | boolean>;
        } catch {
          localValues = {};
        }
      }

      if (effectiveNumero) {
        fields.forEach((field) => {
          if (hasTokens(field.name, ["numero", "fir"]) || hasTokens(field.name, ["numero", "formulario"])) {
            hydratedValues[field.id] = effectiveNumero;
          }
        });
      }

      if (!cancelled) {
        setValues((prev) => ({ ...prev, ...hydratedValues, ...localValues }));
        localDraftHydratedRef.current = true;
      }
    };

    void loadDraftValues();

    return () => {
      cancelled = true;
    };
  }, [fields, draftData, activeDraftId, presetNumeroFir, activeDraftNumero, localDraftKey, blankPrint]);

  useEffect(() => {
    if (blankPrint) return;
    if (!localDraftKey || !localDraftHydratedRef.current) return;
    try {
      sessionStorage.setItem(localDraftKey, JSON.stringify(values));
    } catch {
      // Lo storage può essere disabilitato: il formulario continua a funzionare.
    }
  }, [localDraftKey, values]);

  // Auto-prefill trasportatore fields from the assigned user's profile
  useEffect(() => {
    if (fields.length === 0) return;
    if (blankPrint) return;

    // Determine user ID: from prop, or try fetching from fir_forms
    const resolveUserId = async (): Promise<string | null> => {
      if (assignedUserId) return assignedUserId;
      if (!firFormId) return null;
      const { data } = await supabase
        .from("fir_forms")
        .select("user_id")
        .eq("id", firFormId)
        .maybeSingle();
      return data?.user_id || null;
    };

    resolveUserId().then(async (userId) => {
      if (!userId) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("nome, cognome, codice_fiscale, targa_automezzo")
        .eq("user_id", userId)
        .maybeSingle();

      if (!profile) return;

      const updates: Record<string, string> = {};

      // Denominazione trasportatore = tenant preset (es. Multyproget S.r.l.)
      const denomField = findFieldByTokens(fields, ["denominazione", "trasportatore"]);
      if (denomField && !normalizeFieldName(denomField.name).includes("nuovo")) {
        updates[denomField.id] = tenantPreset.nome;
      }

      // Codice fiscale trasportatore = tenant preset CF (P.IVA azienda)
      const cfField = findFieldByTokens(fields, ["codice", "fiscale", "trasportatore"]);
      if (cfField && !normalizeFieldName(cfField.name).includes("nuovo")) {
        updates[cfField.id] = tenantPreset.cf;
      }

      // Cognome e nome conducente = dal profilo utente
      const conducenteField = findFieldByTokens(fields, ["cognome", "nome", "conducente"]);
      if (conducenteField) {
        updates[conducenteField.id] = `${profile.cognome ?? ""} ${profile.nome ?? ""}`.trim();
      }

      // Targa automezzo = dal profilo utente
      const targaField = fields.find(f =>
        hasTokens(f.name, ["targa", "automezzo"]) &&
        !normalizeFieldName(f.name).includes("trasbordo")
      );
      if (targaField && profile.targa_automezzo) {
        updates[targaField.id] = profile.targa_automezzo;
      }

      // Numero iscrizione albo trasportatore
      const alboField = findFieldByTokens(fields, ["iscrizione", "albo", "trasportatore"]);
      if (alboField && !normalizeFieldName(alboField.name).includes("nuovo")) {
        if (tenantPreset.autorizzazione) {
          updates[alboField.id] = tenantPreset.autorizzazione;
        }
      }

      // Only apply updates where values are not already filled
      setValues(prev => {
        const merged = { ...prev };
        for (const [key, val] of Object.entries(updates)) {
          if (!merged[key] || String(merged[key]).trim() === "") {
            merged[key] = val;
          }
        }
        return merged;
      });
    });
  }, [firFormId, assignedUserId, fields, tenantPreset]);

  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [activePage]);

  // Auto-apply tenant preset as PRODUCER when producer fields are empty (e.g. Multyproget dev workspace)
  useEffect(() => {
    if (fields.length === 0) return;
    if (blankPrint) return;
    if (ocrEntries?.length) return;
    if (suppressProducerPreset) return;
    if (tenantContext !== "multyproget" && tenantContext !== "niyol" && tenantContext !== "global") return;
    // Only auto-fill when the producer denomination is currently empty
    if (!produttoreDenomField) return;
    const currentVal = String(values[produttoreDenomField.id] ?? "").trim();
    if (currentVal) return;
    const updates = buildSoggettoUpdates(fields, tenantPreset, "produttore");
    if (Object.keys(updates).length === 0) return;
    setValues((prev) => ({ ...prev, ...updates }));
    setSelectedProduttore(tenantPreset);
  }, [fields, tenantContext, tenantPreset, produttoreDenomField, values, suppressProducerPreset, ocrEntries]);


  const isNumeroFirField = useCallback((field: TemplateField | undefined) => {
    if (!field) return false;
    return isNumeroFirFieldName(field.name);
  }, []);

  const handleChange = (id: string, val: string | boolean) => {
    // numero_fir is immutable from the UI: silently ignore edits.
    const field = fields.find((f) => f.id === id);
    if (isNumeroFirField(field)) return;

    const isProducerField = produttoreDenomField?.id === id || produttoreCfField?.id === id;

    setValues((prev) => ({ ...prev, [id]: val }));

    if (isProducerField && typeof val === "string") {
      setSelectedProduttore(null);
    }
  };

  const fillProduttore = useCallback((soggetto: Soggetto) => {
    const updates = buildSoggettoUpdates(fields, soggetto, "produttore");
    setValues((prev) => ({ ...prev, ...updates }));
    setSelectedProduttore(soggetto);
    setActiveAutocompleteFieldId(null);
    setConfirmedFieldIds((prev) => {
      const next = new Set(prev);
      Object.keys(updates).forEach((k) => next.add(k));
      return next;
    });
  }, [fields]);

  const fillDestinatario = useCallback((soggetto: Soggetto) => {
    const updates = buildSoggettoUpdates(fields, soggetto, "destinatario");
    setValues((prev) => ({ ...prev, ...updates }));
    setActiveAutocompleteFieldId(null);
    setConfirmedFieldIds((prev) => {
      const next = new Set(prev);
      Object.keys(updates).forEach((k) => next.add(k));
      return next;
    });
  }, [fields]);

  const zoomIn = () => setScale((s) => Math.min(s + 0.3, 4));
  const zoomOut = () => setScale((s) => Math.max(s - 0.3, 0.5));
  const resetZoom = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTranslate({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setLastTouchDist(dist);
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - translate.x, y: e.touches[0].clientY - translate.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDist !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (dist - lastTouchDist) * 0.008;
      setScale((s) => Math.max(0.5, Math.min(4, s + delta)));
      setLastTouchDist(dist);
    } else if (e.touches.length === 1 && isDragging) {
      setTranslate({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
    }
  };

  const handleTouchEnd = () => {
    setLastTouchDist(null);
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale((s) => Math.max(0.5, Math.min(4, s + delta)));
  };

  const handleSaveDraft = async (mode: "draft" | "final" = "draft") => {
    const targetId = firFormId || activeDraftId;
    if (!targetId) { toast.error("Nessuna bozza attiva"); return; }
    const formatErr = (err: unknown): string => {
      if (!err) return "errore sconosciuto";
      if (err instanceof Error) return err.message;
      if (typeof err === "string") return err;
      const obj = err as { message?: string; error_description?: string; details?: string; hint?: string };
      return obj.message || obj.error_description || obj.details || obj.hint || JSON.stringify(err);
    };

    try {
      const { data: existing, error: loadErr } = await supabase
        .from("fir_forms")
        .select("*")
        .eq("id", targetId)
        .maybeSingle();
      if (loadErr) throw loadErr;
      if (!existing) throw new Error("Formulario non trovato");

      const mergedFormData = {
        ...((existing.form_data as Record<string, unknown>) || {}),
        ...values,
        ...(impiantoId ? { impianto_id: impiantoId } : {}),
      };

      const valByTokens = (...tokens: string[]) => {
        const f = findFieldByTokens(fields, tokens);
        return f ? String(values[f.id] ?? "").trim() : "";
      };
      const numToken = (...tokens: string[]) => {
        const s = valByTokens(...tokens).replace(/\./g, "").replace(",", ".");
        const n = parseFloat(s);
        return Number.isFinite(n) ? n : null;
      };

      const desc = valByTokens("descrizione", "rifiuto");
      const eer = valByTokens("codice", "eer") || valByTokens("cer");
      const qta = numToken("quantita") ?? numToken("peso");
      const qtaDestino = numToken("quantita", "accettata")
        ?? numToken("quantita", "destino")
        ?? numToken("peso", "ricevuto")
        ?? numToken("peso", "destino");
      const um = valByTokens("unita", "misura") || "kg";
      const statoFisico = valByTokens("stato", "fisico");
      const prodDen = valByTokens("denominazione", "produttore");
      const destDen = valByTokens("denominazione", "destinatario");
      const trasDen = valByTokens("denominazione", "trasportatore");
      const prodCf = valByTokens("codice", "fiscale", "produttore") || valByTokens("cf", "produttore");
      const destCf = valByTokens("codice", "fiscale", "destinatario") || valByTokens("cf", "destinatario");
      const trasCf = valByTokens("codice", "fiscale", "trasportatore") || valByTokens("cf", "trasportatore");
      const dataEmissione = valByTokens("data", "emissione");

      // CRITICAL: numero_fir is IMMUTABLE. Never include it in the UPDATE payload.
      // The DB has a trigger that rejects any change. We always use the value already in DB.
      const existingNumero = (existing.numero_fir as string | null) || null;
      const numeroFir = existingNumero || presetNumeroFir || activeDraftNumero || null;
      const tenantId = (existing.tenant_id as string | undefined) || TENANT_ID_MAP[tenantContext] || TENANT_ID_MAP.global;

      // Force the form-data snapshot to mirror the canonical numero_fir,
      // so any OCR/manual edit of the visible field cannot leak back in.
      if (existingNumero) {
        (mergedFormData as Record<string, unknown>).numero_fir = existingNumero;
        (mergedFormData as Record<string, unknown>).numero_formulario = existingNumero;
      }

      const updates: Record<string, unknown> = { form_data: mergedFormData };
      if (desc) updates.descrizione_rifiuto = desc;
      if (eer) updates.codice_eer = eer;
      if (qta !== null) updates.quantita = qta;
      if (um) updates.unita_misura = um;
      const statoFisicoLabel = toStatoFisicoLabel(statoFisico);
      if (statoFisicoLabel) updates.stato_fisico = statoFisicoLabel;
      if (prodDen) updates.produttore_denominazione = prodDen;
      if (destDen) updates.destinatario_denominazione = destDen;
      if (trasDen) updates.trasportatore_denominazione = trasDen;
      if (prodCf) updates.produttore_codice_fiscale = prodCf;
      if (destCf) updates.destinatario_codice_fiscale = destCf;
      if (trasCf) updates.trasportatore_codice_fiscale = trasCf;
      if (dataEmissione) (mergedFormData as Record<string, unknown>).data_emissione = dataEmissione;
      if (qta !== null) {
        (mergedFormData as Record<string, unknown>).quantita_origine = qta;
        (mergedFormData as Record<string, unknown>).quantita_partenza = qta;
      }
      if (qtaDestino !== null) {
        (mergedFormData as Record<string, unknown>).quantita_destino = qtaDestino;
        (mergedFormData as Record<string, unknown>).peso_ricevuto = qtaDestino;
      }
      // numero_fir is set ONCE at draft creation by the RPC. Never overwrite it from the form.
      if (mode === "final") updates.status = "completato";

      const { error: updateErr } = await supabase.from("fir_forms").update(updates).eq("id", targetId);
      if (updateErr) throw updateErr;

      // Sincronizzazione unica per entrambe le viste: instrada il FIR nei registri
      // coinvolti e aggiorna le giacenze Multy in base al suo ruolo effettivo.
      // Anche il salvataggio in BOZZA deve aggiornare registro e giacenze.
      if (tenantId && numeroFir) {
        try {
          const result = await syncFirFinalToRegistryAndInventory({
            firId: targetId,
            impiantoId: impiantoId || null,
            registryMovementType,
          });
          if (result.warning) throw new Error(result.warning);
          if (!result.inventory) throw new Error("Il FIR non ha prodotto alcun movimento di giacenza: controlla ruolo Multyproget, CER e quantità");
        } catch (syncError) {
          throw new Error("Dati FIR salvati, ma giacenze non aggiornate: " + formatErr(syncError));
        }
      }

      toast.success(mode === "final" ? "✅ Formulario salvato DEFINITIVO (registro + giacenze)" : "💾 Bozza salvata (registro + giacenze aggiornati)");
      onSaved?.();
    } catch (err) {
      toast.error("Errore salvataggio: " + formatErr(err));
    }
  };

  useEffect(() => {
    const draftListener = () => { void handleSaveDraft("draft"); };
    const finalListener = () => { void handleSaveDraft("final"); };
    const legacyListener = () => { void handleSaveDraft("draft"); };
    window.addEventListener("dev-fir-save-draft", draftListener);
    window.addEventListener("dev-fir-save-final", finalListener);
    window.addEventListener("dev-fir-save-active", legacyListener);
    return () => {
      window.removeEventListener("dev-fir-save-draft", draftListener);
      window.removeEventListener("dev-fir-save-final", finalListener);
      window.removeEventListener("dev-fir-save-active", legacyListener);
    };
  });


  const pageFields = fields.filter((f) => f.page === activePage);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-primary animate-pulse text-sm font-mono">Caricamento template...</div>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground text-sm font-mono">Nessun template salvato</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
        <Zap className="h-4 w-4 text-amber-400" />
        <div className="flex flex-col">
          <span className="text-xs font-mono font-semibold text-amber-300 tracking-wider">
            MODULO ALTERNATIVO — Sperimentale
          </span>
          <span className="text-[10px] font-mono text-amber-400/70">
            In uso da mercoledì 18 marzo 2026
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        {[1, 2, 3].map((p) => (
          <button
            key={p}
            onClick={() => setActivePage(p)}
            className={`flex-1 py-2 text-xs font-mono font-semibold rounded-lg border transition-all ${
              activePage === p
                ? "bg-primary/20 border-primary/50 text-primary"
                : "bg-card/40 border-border/30 text-muted-foreground hover:bg-card/60"
            }`}
          >
            PAG {p}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2">
        <button onClick={zoomOut} className="p-1.5 rounded-md border border-border/40 bg-card/60 hover:bg-card/80 transition-all">
          <ZoomOut className="h-4 w-4 text-muted-foreground" />
        </button>
        <span className="text-[10px] font-mono text-muted-foreground min-w-[40px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button onClick={zoomIn} className="p-1.5 rounded-md border border-border/40 bg-card/60 hover:bg-card/80 transition-all">
          <ZoomIn className="h-4 w-4 text-muted-foreground" />
        </button>
        <button onClick={resetZoom} className="p-1.5 rounded-md border border-border/40 bg-card/60 hover:bg-card/80 transition-all">
          <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        {(firFormId || activeDraftId) && (
          <>
            <button
              onClick={() => void handleSaveDraft("draft")}
              className="ml-2 px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-display text-xs tracking-wider hover:bg-amber-500/30 transition-colors flex items-center gap-2"
            >
              <Save className="h-4 w-4" /> BOZZA
            </button>
            <button
              onClick={() => void handleSaveDraft("final")}
              className="px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-display text-xs tracking-wider hover:bg-emerald-500/30 transition-colors flex items-center gap-2"
            >
              <Save className="h-4 w-4" /> DEFINITIVO
            </button>
          </>
        )}

      </div>

      <div
        ref={containerRef}
        className="relative w-full rounded-lg overflow-hidden border border-border/20"
        style={{ touchAction: "none" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        <div
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: "top left",
            transition: isDragging ? "none" : "transform 0.15s ease-out",
            cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
          }}
        >
          <div className="relative">
            <img
              src={PAGE_IMAGES[activePage - 1]}
              alt={`Formulario pagina ${activePage}`}
              className="w-full h-auto block"
              draggable={false}
            />

            {pageFields.map((field) => {
              const style: React.CSSProperties = {
                position: "absolute",
                left: `${field.x}%`,
                top: `${field.y}%`,
                width: `${field.width}%`,
                height: `${field.height}%`,
              };

              if (field.type === "checkbox") {
                return (
                  <label
                    key={field.id}
                    style={style}
                    className="flex items-center justify-center cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!values[field.id]}
                      onChange={(e) => handleChange(field.id, e.target.checked)}
                      className="w-3/4 h-3/4 accent-primary cursor-pointer"
                      style={{ background: "transparent" }}
                    />
                  </label>
                );
              }

              if (field.type === "long_text") {
                return (
                  <textarea
                    key={field.id}
                    value={(values[field.id] as string) || ""}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    style={{
                      ...style,
                      background: printOnly ? "transparent" : "rgba(56, 189, 248, 0.14)",
                      border: printOnly ? "1px solid rgba(120, 120, 140, 0.35)" : "1px solid rgba(56, 189, 248, 0.55)",
                      borderRadius: "2px",
                      color: "#0b2540",
                      fontSize: "clamp(7px, 1.8vw, 11px)",
                      fontFamily: "monospace",
                      padding: "2px 3px",
                      resize: "none",
                      outline: "none",
                      lineHeight: "1.2",
                    }}
                  />
                );
              }


              const isProduttoreAutocomplete = isProduttoreDenominationField(field.name);
              const isDestinatarioAutocomplete = isDestinatarioDenominationField(field.name);
              const rawValue = String(values[field.id] || "");
              const suggestions = isProduttoreAutocomplete
                ? orderedProduttori.filter((item) => matchesSoggettoSearch(item, rawValue))
                : isDestinatarioAutocomplete
                  ? destinatari.filter((item) => matchesSoggettoSearch(item, rawValue)).slice(0, 12)
                  : [];
              const isConfirmed = confirmedFieldIds.has(field.id);
              const shouldShowAutocomplete = activeAutocompleteFieldId === field.id && !isConfirmed && suggestions.length > 0;

              if (isProduttoreAutocomplete || isDestinatarioAutocomplete) {
                return (
                  <div key={field.id} style={style} className="relative overflow-visible">
                    <input
                      type="text"
                      value={rawValue}
                      onChange={(e) => {
                        handleChange(field.id, e.target.value);
                        setActiveAutocompleteFieldId(field.id);
                        setConfirmedFieldIds((prev) => { const next = new Set(prev); next.delete(field.id); return next; });
                      }}
                      onFocus={() => setActiveAutocompleteFieldId(field.id)}
                      onBlur={() => {
                        window.setTimeout(() => {
                          setActiveAutocompleteFieldId((current) => (current === field.id ? null : current));
                        }, 150);
                      }}
                      style={{
                        width: "100%",
                        height: "100%",
                        background: printOnly ? "transparent" : "rgba(56, 189, 248, 0.14)",
                        border: printOnly ? "1px solid rgba(120, 120, 140, 0.35)" : "1px solid rgba(56, 189, 248, 0.55)",
                        borderRadius: "2px",
                        color: "#0b2540",
                        fontSize: dynamicFontSize(rawValue),
                        fontFamily: "monospace",
                        padding: "1px 3px",
                        outline: "none",
                      }}
                    />


                    {shouldShowAutocomplete && (
                      <div className="absolute left-0 right-0 top-full z-[80] mt-0.5 max-h-32 overflow-y-auto rounded-md border border-border/40 bg-popover shadow-lg">
                        {suggestions.map((suggestion) => (
                          <button
                            key={`${field.id}-${suggestion.cf}-${suggestion.nome}`}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              if (isProduttoreAutocomplete) {
                                fillProduttore(suggestion);
                              } else {
                                fillDestinatario(suggestion);
                              }
                            }}
                            className="block w-full border-b border-border/20 px-2 py-1 text-left font-mono text-[10px] text-foreground transition-colors hover:bg-accent/50 last:border-b-0"
                          >
                            <div className="truncate font-semibold">{suggestion.nome}</div>
                            <div className="truncate text-[9px] text-muted-foreground">
                              {suggestion.indirizzo || "Indirizzo non disponibile"}
                              {suggestion.cf ? ` · CF ${suggestion.cf}` : ""}
                              {suggestion.piva ? ` · P.IVA ${suggestion.piva}` : ""}
                            </div>
                          </button>
                        ))}
                        {isProduttoreAutocomplete && (
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSelectedProduttore(null);
                              setActiveAutocompleteFieldId(null);
                            }}
                            className="block w-full px-2 py-1 text-left font-mono text-[10px] text-accent-foreground transition-colors hover:bg-accent/50"
                          >
                            ✏️ Altro produttore (inserimento libero)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              const isCanonicalNumeroField = isNumeroFirField(field);
              const displayValue = isCanonicalNumeroField ? canonicalNumeroFir : String(values[field.id] || "");

              return (
                <input
                  key={field.id}
                  type={field.type === "date" ? "date" : field.type === "time" ? "time" : "text"}
                  value={displayValue}
                  readOnly={isCanonicalNumeroField}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  style={{
                    ...style,
                    background: printOnly ? "transparent" : (isCanonicalNumeroField ? "rgba(255, 255, 255, 0.9)" : "rgba(56, 189, 248, 0.14)"),
                    border: printOnly ? "1px solid rgba(120, 120, 140, 0.35)" : "1px solid rgba(56, 189, 248, 0.55)",
                    borderRadius: "2px",
                    color: isCanonicalNumeroField ? "#000000" : "#0b2540",
                    fontWeight: isCanonicalNumeroField ? 700 : undefined,
                    fontSize: dynamicFontSize(displayValue),
                    fontFamily: "monospace",
                    padding: "1px 3px",
                    outline: "none",
                  }}
                />

              );
            })}
          </div>
        </div>
      </div>

      {(firFormId || activeDraftId) && (
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={() => void handleSaveDraft("draft")}
            className="px-5 py-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-display text-sm tracking-wider hover:bg-amber-500/30 transition-colors flex items-center gap-2"
          >
            <Save className="h-4 w-4" /> SALVA BOZZA
          </button>
          <button
            onClick={() => void handleSaveDraft("final")}
            className="px-5 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-display text-sm tracking-wider hover:bg-emerald-500/30 transition-colors flex items-center gap-2"
          >
            <Save className="h-4 w-4" /> SALVA DEFINITIVO (giacenze)
          </button>
        </div>
      )}


      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={async () => {
            const container = containerRef.current;
            if (!container) return;
            const numeroToPrint = canonicalNumeroFir || presetNumeroFir || "";
            const qrDataUrl = numeroToPrint ? await resolveFirQrDataUrl(numeroToPrint, rentriCliente) : null;
            const printWindow = window.open("", "_blank");
            if (!printWindow) return;
            const producedAt = new Date();
            // Build all 3 pages for print
            const allPagesHtml = [1, 2, 3].map(pageNum => {
              const decorations = buildPageDecorationsHtml({
                numeroFir: numeroToPrint,
                cliente: rentriCliente,
                qrDataUrl,
                producedAt,
                page: pageNum,
              });
              const pageContainer = document.createElement("div");
              pageContainer.style.cssText = "position:relative;page-break-after:always;";
              const img = document.createElement("img");
              img.src = PAGE_IMAGES[pageNum - 1];
              img.style.cssText = "width:100%;height:auto;display:block;";
              pageContainer.appendChild(img);
              // Render fields for this page
              fields.filter(f => f.page === pageNum).forEach(field => {
                const isNumero = isNumeroFirFieldName(field.name);
                const val = isNumero ? (numeroToPrint || String(values[field.id] || "")) : String(values[field.id] || "");
                if (!val) return;
                if (isNumero) return; // il numero viene stampato dalle decorazioni (alto e basso a destra)
                const span = document.createElement("span");
                span.textContent = val;
                span.style.cssText = `position:absolute;left:${field.x}%;top:${field.y}%;width:${field.width}%;height:${field.height}%;display:flex;align-items:center;font-family:'Courier New',monospace;font-size:2.9mm;font-weight:600;color:#12275c;overflow:hidden;white-space:nowrap;padding:0 1mm;`;
                pageContainer.appendChild(span);
              });
              return pageContainer.outerHTML.replace(/<\/div>$/, `${decorations}</div>`);
            }).join("");


            const signatureBlock = `
                <div style="position:relative;page-break-before:always;padding:24mm 15mm;font-family:Arial,Helvetica,sans-serif;color:#111;">
                  <h2 style="margin:0 0 6mm 0;font-size:16pt;letter-spacing:1px;">FIR N. ${numeroToPrint} — Timbri e Firme</h2>
                  <p style="margin:0 0 10mm 0;font-size:10pt;color:#333;">Spazi riservati alla firma autografa e all'apposizione dei timbri dei soggetti coinvolti nel trasporto.</p>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12mm 10mm;">
                    ${["Produttore / Detentore","Trasportatore","Destinatario","Intermediario / Commerciante"].map(role => `
                      <div style="border:1px dashed #555;border-radius:4px;padding:6mm 5mm;min-height:45mm;display:flex;flex-direction:column;justify-content:space-between;">
                        <div style="font-size:9pt;text-transform:uppercase;letter-spacing:1px;color:#444;">${role}</div>
                        <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:6mm;">
                          <div style="flex:1;">
                            <div style="border-bottom:1px solid #222;height:14mm;"></div>
                            <div style="font-size:8pt;color:#555;margin-top:1mm;">Firma</div>
                          </div>
                          <div style="width:38mm;height:38mm;border:1px dashed #777;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:8pt;color:#777;text-align:center;">
                            Timbro
                          </div>
                        </div>
                        <div style="font-size:8pt;color:#555;margin-top:2mm;">Data ________________</div>
                      </div>
                    `).join("")}
                  </div>
                </div>`;
            printWindow.document.write(`<html><head><title>FIR ${numeroToPrint}</title><style>@media print{@page{margin:5mm;size:A4;}body{margin:0;}}body{margin:0;padding:0;}</style></head><body>${allPagesHtml}${signatureBlock}</body></html>`);
            printWindow.document.close();

            setTimeout(() => {
              printWindow.print();
              onPrinted?.();
            }, 800);
          }}
          className="px-6 py-3 rounded-xl bg-primary/20 border border-primary/30 text-primary font-display text-sm tracking-wider hover:bg-primary/30 transition-colors flex items-center gap-2"
        >
          <Printer className="h-4 w-4" /> STAMPA FORMULARIO
        </button>
      </div>

      {!printOnly && !disableRentriActions ? (
        <FIRRentriActions
          cliente={rentriCliente}
          formData={values as Record<string, string | boolean>}
          firmaComeProduttore={isOwnProduction}
          templateFields={fields.map(f => ({ id: f.id, name: f.name }))}
          onEmissioneSuccess={(res) => {
            console.log("[FIR] Emissione success:", res);
          }}
        />
      ) : null}

    </div>
  );
}
