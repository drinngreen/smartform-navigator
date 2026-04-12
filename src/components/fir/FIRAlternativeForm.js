import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Zap, ZoomIn, ZoomOut, RotateCcw, Printer } from "lucide-react";
import pag1 from "@/assets/formulario_pag_1.png";
import pag2 from "@/assets/formulario_pag_2.png";
import pag3 from "@/assets/formulario_pag_3.png";
import { GLOBAL_RECO, MULTYPROGET, NIYOL, DESTINATARI } from "@/data/anagrafiche";
import { FIRRentriActions } from "./FIRRentriActions";
import { useFormBridgeFields } from "@/hooks/useFormBridge";
const PAGE_IMAGES = [pag1, pag2, pag3];
const TENANT_MAP = {
    global: { cliente: "global", preset: GLOBAL_RECO },
    multyproget: { cliente: "multy", preset: MULTYPROGET },
    "multyproget-intermediario": { cliente: "multy", preset: MULTYPROGET },
    "multyproget-impianto": { cliente: "multy", preset: MULTYPROGET },
    niyol: { cliente: "niyol", preset: NIYOL },
};
const ALL_PRODUTTORI = [GLOBAL_RECO, MULTYPROGET, NIYOL];
function normalizeFieldName(fieldName) {
    return fieldName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}
function hasTokens(fieldName, tokens) {
    const normalized = normalizeFieldName(fieldName);
    const parts = normalized.split("_").filter(Boolean);
    return tokens.every((token) => parts.includes(token));
}
function findFieldByTokens(fields, tokens) {
    return fields.find((field) => hasTokens(field.name, tokens));
}
function isProduttoreDenominationField(fieldName) {
    return hasTokens(fieldName, ["denominazione", "produttore"]);
}
function isDestinatarioDenominationField(fieldName) {
    return hasTokens(fieldName, ["denominazione", "destinatario"])
        && !hasTokens(fieldName, ["secondo", "destinatario"]);
}
function isProduttoreCfField(fieldName) {
    return hasTokens(fieldName, ["codice", "fiscale", "produttore"]);
}
function isDestinatarioCfField(fieldName) {
    return hasTokens(fieldName, ["codice", "fiscale", "destinatario"])
        && !hasTokens(fieldName, ["secondo", "destinatario"]);
}
function isProduttoreAddressField(fieldName) {
    return hasTokens(fieldName, ["unita", "locale", "produttore"]);
}
function isDestinatarioAddressField(fieldName) {
    return hasTokens(fieldName, ["unita", "locale", "destinatario"])
        && !hasTokens(fieldName, ["secondo", "destinatario"]);
}
function isProduttoreAuthorizationField(fieldName) {
    return hasTokens(fieldName, ["numero", "aut", "comunicazione", "produttore"]);
}
function isDestinatarioAuthorizationField(fieldName) {
    return hasTokens(fieldName, ["numero", "aut", "comunicazione", "destinatario"])
        && !hasTokens(fieldName, ["secondo", "destinatario"]);
}
function isProduttoreAuthorizationTypeField(fieldName) {
    return hasTokens(fieldName, ["tipologia", "autorizzazione", "ambientale", "produttore"]);
}
function isDestinatarioAuthorizationTypeField(fieldName) {
    return hasTokens(fieldName, ["tipologia", "autorizzazione", "ambientale", "destinatario"])
        && !hasTokens(fieldName, ["secondo", "destinatario"]);
}
function matchesSoggettoSearch(soggetto, query) {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery)
        return true;
    return [soggetto.nome, soggetto.cf, soggetto.indirizzo, soggetto.piva, soggetto.autorizzazione]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery));
}
function buildSoggettoUpdates(fields, soggetto, target) {
    const updates = {};
    fields.forEach((field) => {
        const normalizedName = normalizeFieldName(field.name);
        if (target === "produttore") {
            if (normalizedName.includes("nuovo_trasportatore") || normalizedName.includes("originale"))
                return;
            if (isProduttoreDenominationField(field.name))
                updates[field.id] = soggetto.nome;
            else if (isProduttoreCfField(field.name))
                updates[field.id] = soggetto.cf;
            else if (isProduttoreAddressField(field.name))
                updates[field.id] = soggetto.indirizzo;
            else if (isProduttoreAuthorizationField(field.name))
                updates[field.id] = soggetto.autorizzazione ?? "";
            else if (isProduttoreAuthorizationTypeField(field.name))
                updates[field.id] = soggetto.tipoAut ?? "";
        }
        if (target === "destinatario") {
            if (normalizedName.includes("secondo_destinatario"))
                return;
            if (isDestinatarioDenominationField(field.name))
                updates[field.id] = soggetto.nome;
            else if (isDestinatarioCfField(field.name))
                updates[field.id] = soggetto.cf;
            else if (isDestinatarioAddressField(field.name))
                updates[field.id] = soggetto.indirizzo;
            else if (isDestinatarioAuthorizationField(field.name))
                updates[field.id] = soggetto.autorizzazione ?? "";
            else if (isDestinatarioAuthorizationTypeField(field.name))
                updates[field.id] = soggetto.tipoAut ?? "";
        }
    });
    return updates;
}
const STATO_FISICO_CODE_MAP = {
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
function getFormDataValue(formData, ...keys) {
    if (!formData)
        return null;
    for (const key of keys) {
        if (!(key in formData))
            continue;
        const value = formData[key];
        if (value === null || value === undefined)
            continue;
        if (typeof value === "string" && value.trim() === "")
            continue;
        return value;
    }
    return null;
}
function toCheckboxValue(value) {
    if (typeof value === "boolean")
        return value;
    if (typeof value === "number")
        return value !== 0;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (!normalized)
            return false;
        return ["1", "true", "si", "sì", "yes", "y", "on", "x", "checked"].includes(normalized);
    }
    return Boolean(value);
}
function toTextValue(value) {
    if (value === null || value === undefined)
        return "";
    if (Array.isArray(value))
        return value.filter(Boolean).join(", ");
    return String(value);
}
function extractDateValue(value) {
    if (typeof value !== "string" || !value.trim())
        return "";
    const directMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (directMatch)
        return directMatch[1];
    const embeddedMatch = value.match(/(\d{4}-\d{2}-\d{2})[ T]/);
    if (embeddedMatch)
        return embeddedMatch[1];
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()))
        return "";
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
function extractTimeValue(value) {
    if (typeof value !== "string" || !value.trim())
        return "";
    const embeddedMatch = value.match(/[T ](\d{2}:\d{2})/);
    if (embeddedMatch)
        return embeddedMatch[1];
    const directMatch = value.match(/^(\d{2}:\d{2})/);
    if (directMatch)
        return directMatch[1];
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()))
        return "";
    const hours = String(parsed.getHours()).padStart(2, "0");
    const minutes = String(parsed.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}
function toStatoFisicoCode(value) {
    if (typeof value !== "string" || !value.trim())
        return "";
    const normalized = normalizeFieldName(value);
    return STATO_FISICO_CODE_MAP[normalized] || value.trim();
}
function getDraftValueForField(field, draft, formData) {
    const normalized = normalizeFieldName(field.name);
    const isSecondDestField = normalized.includes("secondo_destinatario");
    const isNuovoTrasportatoreField = normalized.includes("nuovo_trasportatore") || normalized.includes("produttore_detentore_originale");
    const isFrazionamentoField = normalized.includes("frazionamento");
    const isTrasbordoTotaleField = normalized.includes("trasbordo_totale");
    if (field.type === "checkbox") {
        if (normalized === "registro_no")
            return getFormDataValue(formData, "registro_no") === "NO";
        if (normalized === "detentore")
            return getFormDataValue(formData, "detentore_checkbox");
        if (normalized === "recupero")
            return getFormDataValue(formData, "destinatario_operazione_R", "destinatario_operazione_r");
        if (normalized === "smaltimento")
            return getFormDataValue(formData, "destinatario_operazione_D", "destinatario_operazione_d");
        if (normalized === "speciale")
            return getFormDataValue(formData, "provenienza_speciale");
        if (normalized === "urbano")
            return getFormDataValue(formData, "provenienza_urbano");
        if (normalized === "accettato_per_intero")
            return getFormDataValue(formData, "accettato_per_intero");
        if (normalized === "accettato_parzialmente")
            return getFormDataValue(formData, "accettato_parzialmente");
        if (normalized === "respinto")
            return getFormDataValue(formData, "respinto");
        if (normalized === "peso_verificato_in_partenza")
            return getFormDataValue(formData, "peso_verificato_partenza");
        if (normalized === "trasporto_adr_rid")
            return getFormDataValue(formData, "trasporto_adr_rid");
        if (normalized === "alla_rinfusa")
            return getFormDataValue(formData, "aspetto_rinfusa");
        if (normalized === "chilogrammi")
            return String(draft.unita_misura || "kg").toLowerCase() !== "l";
        if (normalized === "litri")
            return String(draft.unita_misura || "").toLowerCase() === "l";
        if (normalized === "in_attesa_di_verifica_analitica")
            return getFormDataValue(formData, "in_attesa_verifica_analitica");
        if (normalized === "microraccolta")
            return getFormDataValue(formData, "microraccolta");
        if (normalized === "intermodale")
            return getFormDataValue(formData, "intermodale");
        if (normalized === "analisi_rapporto_di_prova")
            return getFormDataValue(formData, "analisi_rapporto_di_prova");
        if (normalized === "classificazione_caratteristiche_chimico_fisiche")
            return getFormDataValue(formData, "classificazione_caratteristiche_chimico_fisiche");
        if (normalized === "ir")
            return getFormDataValue(formData, "ir");
        if (normalized === "nc")
            return getFormDataValue(formData, "nc");
        if (normalized === "a")
            return getFormDataValue(formData, "a");
        return null;
    }
    if (field.type === "date") {
        if (normalized === "data_emissione" || normalized === "data_di_emissione_foglio_2")
            return draft.created_at || draft.updated_at;
        if (hasTokens(field.name, ["data", "inizio", "trasporto"]))
            return draft.data_partenza;
        if (hasTokens(field.name, ["data", "arrivo", "destinatario"]) && !isSecondDestField)
            return draft.data_arrivo;
        if (normalized === "valida_al")
            return getFormDataValue(formData, "valida_al", "analisi_valida_al", "classificazione_valida_al");
        if (hasTokens(field.name, ["data", "arrivo", "secondo", "destinatario"]))
            return getFormDataValue(formData, "secondo_destinatario_data_arrivo", "dest2DataArrivo");
        if (normalized.includes("prima_sospensione"))
            return getFormDataValue(formData, "sosta_tecnica_1_data_sospensione");
        if (normalized.includes("seconda_sospensione"))
            return getFormDataValue(formData, "sosta_tecnica_2_data_sospensione");
        if (normalized.includes("terza_sospensione"))
            return getFormDataValue(formData, "sosta_tecnica_3_data_sospensione");
        if (normalized.includes("ripresa_primo_trasporto"))
            return getFormDataValue(formData, "sosta_tecnica_1_data_ripresa");
        if (normalized.includes("ripresa_secondo_trasporto"))
            return getFormDataValue(formData, "sosta_tecnica_2_data_ripresa");
        if (normalized.includes("ripresa_terzo_trasporto"))
            return getFormDataValue(formData, "sosta_tecnica_3_data_ripresa");
        if (normalized === "data_presa_rimorchio_precedente")
            return getFormDataValue(formData, "trasbordo_totale_data_presa_carico", "trasbordoTotDataPresaCarico");
        return null;
    }
    if (field.type === "time") {
        if (hasTokens(field.name, ["ora", "inizio", "trasporto"]))
            return draft.data_partenza;
        if (hasTokens(field.name, ["ora", "arrivo", "destinatario"]) && !isSecondDestField)
            return draft.data_arrivo;
        if (hasTokens(field.name, ["ora", "arrivo", "secondo", "destinatario"]))
            return getFormDataValue(formData, "secondo_destinatario_data_arrivo", "dest2DataArrivo");
        if (normalized.includes("ora_prima_sospensione"))
            return getFormDataValue(formData, "sosta_tecnica_1_data_sospensione");
        if (normalized.includes("ora_seconda_sospensione"))
            return getFormDataValue(formData, "sosta_tecnica_2_data_sospensione");
        if (normalized.includes("ora_terza_sospensione"))
            return getFormDataValue(formData, "sosta_tecnica_3_data_sospensione");
        if (normalized.includes("ora_ripresa_primo_trasporto"))
            return getFormDataValue(formData, "sosta_tecnica_1_data_ripresa");
        if (normalized.includes("ora_ripresa_secondo_trasporto"))
            return getFormDataValue(formData, "sosta_tecnica_2_data_ripresa");
        if (normalized.includes("ora_ripresa_terzo_trasporto"))
            return getFormDataValue(formData, "sosta_tecnica_3_data_ripresa");
        if (normalized === "ora_presa_rimorchio_precedente")
            return getFormDataValue(formData, "trasbordo_totale_data_presa_carico", "trasbordoTotDataPresaCarico");
        return null;
    }
    if (normalized === "numero_fir")
        return draft.numero_fir;
    if (normalized === "numero_di_registrazione")
        return getFormDataValue(formData, "numero_registro");
    if (normalized === "codice_eer")
        return draft.codice_eer;
    if (normalized === "descrizione_rifiuto")
        return draft.descrizione_rifiuto;
    if (normalized === "caratteristiche_di_pericolo")
        return draft.caratteristiche_hp;
    if (normalized === "stato_fisico")
        return toStatoFisicoCode(draft.stato_fisico);
    if (normalized === "quantita")
        return draft.quantita;
    if (normalized === "quantita_accettata")
        return getFormDataValue(formData, "quantita_accettata");
    if (normalized === "quantita_respinta" || normalized === "kg_respinti")
        return getFormDataValue(formData, "quantita_respinta", "kg_respinti");
    if (normalized === "annotazioni_pagina_1")
        return draft.note;
    if (normalized === "annotazioni_seconda_pagina")
        return getFormDataValue(formData, "annotazioni_pag2", "annotazioni_seconda_pagina");
    if (normalized === "nr_onu")
        return getFormDataValue(formData, "nr_onu");
    if (normalized === "note_caratteristiche_chimico_fisiche")
        return getFormDataValue(formData, "note_adr");
    if (normalized === "percorso_se_diverso_dal_piu_breve")
        return getFormDataValue(formData, "percorso");
    if (normalized === "motivazioni_respinta")
        return getFormDataValue(formData, "motivazioni_respinta", "motivazione_respingimento");
    if (normalized === "nr_documento")
        return getFormDataValue(formData, "nr_documento", "analisi_numero", "classificazione_numero");
    if (normalized === "luogo_di_produzione_se_diverso_produttore")
        return getFormDataValue(formData, "produttore_luogo_produzione");
    if (normalized === "denominazione_detentore")
        return getFormDataValue(formData, "detentore_denominazione");
    if (normalized === "unita_locale_indirizzo_detentore")
        return getFormDataValue(formData, "detentore_unita_locale", "detentore_indirizzo");
    if (normalized === "codice_fiscale_detentore")
        return getFormDataValue(formData, "detentore_codice_fiscale", "detentore_cf");
    if (isProduttoreDenominationField(field.name))
        return draft.produttore_denominazione;
    if (isProduttoreCfField(field.name))
        return draft.produttore_codice_fiscale;
    if (isProduttoreAddressField(field.name))
        return draft.produttore_indirizzo;
    if (isProduttoreAuthorizationField(field.name))
        return getFormDataValue(formData, "produttore_numero_aut", "produttore_iscrizione_albo");
    if (isProduttoreAuthorizationTypeField(field.name))
        return getFormDataValue(formData, "produttore_tipo", "produttore_tipo_aut");
    if (hasTokens(field.name, ["numero", "iscrizione", "albo", "produttore"]))
        return getFormDataValue(formData, "produttore_iscrizione_albo");
    if (isDestinatarioDenominationField(field.name))
        return draft.destinatario_denominazione;
    if (isDestinatarioCfField(field.name))
        return draft.destinatario_codice_fiscale;
    if (isDestinatarioAddressField(field.name))
        return draft.destinatario_indirizzo;
    if (isDestinatarioAuthorizationField(field.name))
        return getFormDataValue(formData, "destinatario_n_aut_comunicazione", "destinatario_numero_aut") || draft.destinatario_autorizzazione;
    if (isDestinatarioAuthorizationTypeField(field.name))
        return getFormDataValue(formData, "destinatario_tipo");
    if (hasTokens(field.name, ["numero", "iscrizione", "albo", "destinatario"]) && !isSecondDestField)
        return draft.destinatario_autorizzazione;
    if (hasTokens(field.name, ["denominazione", "trasportatore"]) && !isNuovoTrasportatoreField && !isFrazionamentoField && !isTrasbordoTotaleField)
        return draft.trasportatore_denominazione;
    if (hasTokens(field.name, ["codice", "fiscale", "trasportatore"]) && !isNuovoTrasportatoreField && !isFrazionamentoField && !isTrasbordoTotaleField)
        return draft.trasportatore_codice_fiscale;
    if (hasTokens(field.name, ["numero", "iscrizione", "albo", "trasportatore"]) && !isNuovoTrasportatoreField && !isFrazionamentoField && !isTrasbordoTotaleField)
        return draft.trasportatore_iscrizione_albo;
    if (hasTokens(field.name, ["cognome", "nome", "conducente"]) && !isTrasbordoTotaleField)
        return draft.trasportatore_conducente;
    if (hasTokens(field.name, ["targa", "automezzo"]) && !isFrazionamentoField && !isTrasbordoTotaleField)
        return draft.trasportatore_targa_automezzo;
    if (hasTokens(field.name, ["targa", "rimorchio"]) && !isFrazionamentoField && !isTrasbordoTotaleField)
        return draft.trasportatore_targa_rimorchio;
    if (hasTokens(field.name, ["denominazione", "intermediario"]))
        return draft.intermediario_denominazione;
    if (hasTokens(field.name, ["codice", "fiscale", "intermediario"]))
        return draft.intermediario_codice_fiscale;
    if (hasTokens(field.name, ["numero", "iscrizione", "albo", "intermediario"]))
        return draft.intermediario_iscrizione_albo;
    if (hasTokens(field.name, ["classe", "pericolo"]))
        return getFormDataValue(formData, "classe_pericolo");
    if (hasTokens(field.name, ["numero", "colli"]))
        return getFormDataValue(formData, "numero_colli");
    if (hasTokens(field.name, ["quantita", "residua"]))
        return getFormDataValue(formData, "trasbordo_parziale_quantita_residua");
    if (hasTokens(field.name, ["riferimento", "formulario"]))
        return getFormDataValue(formData, "trasbordo_parziale_rif_formulario");
    if (hasTokens(field.name, ["denominazione", "secondo", "destinatario"]))
        return getFormDataValue(formData, "secondo_destinatario_denominazione");
    if (hasTokens(field.name, ["unita", "locale", "secondo", "destinatario"]))
        return getFormDataValue(formData, "secondo_destinatario_unita_locale");
    if (hasTokens(field.name, ["codice", "fiscale", "secondo", "destinatario"]))
        return getFormDataValue(formData, "secondo_destinatario_codice_fiscale");
    if (hasTokens(field.name, ["aut", "comunicazione", "secondo", "destinatario"]))
        return getFormDataValue(formData, "secondo_destinatario_iscrizione_albo");
    if (hasTokens(field.name, ["numero", "iscrizione", "albo", "secondo", "destinatario"]))
        return getFormDataValue(formData, "secondo_destinatario_iscrizione_albo");
    if (hasTokens(field.name, ["tipologia", "autorizzazione", "ambientale", "destinatario"]) && isSecondDestField)
        return getFormDataValue(formData, "secondo_destinatario_tipo", "dest2TipoAut");
    if (isNuovoTrasportatoreField && hasTokens(field.name, ["denominazione"]))
        return getFormDataValue(formData, "trasbordo_parziale_denominazione");
    if (isNuovoTrasportatoreField && hasTokens(field.name, ["codice", "fiscale"]))
        return getFormDataValue(formData, "trasbordo_parziale_codice_fiscale");
    if (isNuovoTrasportatoreField && hasTokens(field.name, ["iscrizione", "albo"]))
        return getFormDataValue(formData, "trasbordo_parziale_iscrizione_albo");
    if (isFrazionamentoField && hasTokens(field.name, ["denominazione"]))
        return getFormDataValue(formData, "trasbordo_parziale_denominazione");
    if (isFrazionamentoField && hasTokens(field.name, ["codice", "fiscale"]))
        return getFormDataValue(formData, "trasbordo_parziale_codice_fiscale");
    if (isFrazionamentoField && hasTokens(field.name, ["numero", "iscrizione", "albo"]))
        return getFormDataValue(formData, "trasbordo_parziale_iscrizione_albo");
    if (isFrazionamentoField && hasTokens(field.name, ["targa", "automezzo"]))
        return getFormDataValue(formData, "trasbordo_parziale_targa_automezzo");
    if (isFrazionamentoField && hasTokens(field.name, ["targa", "rimorchio"]))
        return getFormDataValue(formData, "trasbordo_parziale_targa_rimorchio");
    if (isTrasbordoTotaleField && hasTokens(field.name, ["denominazione"]))
        return getFormDataValue(formData, "trasbordo_totale_denominazione", "trasbordoTotDenominazione");
    if (isTrasbordoTotaleField && hasTokens(field.name, ["codice", "fiscale"]))
        return getFormDataValue(formData, "trasbordo_totale_codice_fiscale", "trasbordoTotCF");
    if (isTrasbordoTotaleField && hasTokens(field.name, ["numero", "iscrizione", "albo"]))
        return getFormDataValue(formData, "trasbordo_totale_iscrizione_albo", "trasbordoTotAlbo");
    if (isTrasbordoTotaleField && hasTokens(field.name, ["targa", "automezzo"]))
        return getFormDataValue(formData, "trasbordo_totale_targa_automezzo", "trasbordoTotTarga");
    if (isTrasbordoTotaleField && hasTokens(field.name, ["targa", "rimorchio"]))
        return getFormDataValue(formData, "trasbordo_totale_targa_rimorchio", "trasbordoTotRimorchio");
    if (isTrasbordoTotaleField && hasTokens(field.name, ["conducente"]))
        return getFormDataValue(formData, "trasbordo_totale_conducente", "trasbordoTotConducente");
    if (hasTokens(field.name, ["luogo", "primo", "stazionamento"]))
        return getFormDataValue(formData, "sosta_tecnica_1_luogo");
    if (hasTokens(field.name, ["luogo", "secondo", "stazionamento"]))
        return getFormDataValue(formData, "sosta_tecnica_2_luogo");
    if (hasTokens(field.name, ["luogo", "terzo", "stazionamento"]))
        return getFormDataValue(formData, "sosta_tecnica_3_luogo");
    return null;
}
function buildDraftFieldValues(fields, draft) {
    const formData = draft.form_data && typeof draft.form_data === "object" && !Array.isArray(draft.form_data)
        ? draft.form_data
        : null;
    const nextValues = {};
    fields.forEach((field) => {
        const rawValue = getDraftValueForField(field, draft, formData);
        if (rawValue === null || rawValue === undefined)
            return;
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
export function FIRAlternativeForm({ presetNumeroFir, firFormId, assignedUserId, draftData, printOnly, onPrinted } = {}) {
    const [fields, setFields] = useState([]);
    const [values, setValues] = useState({});
    const [activeDraftId, setActiveDraftId] = useState(firFormId || null);
    const [activeDraftNumero, setActiveDraftNumero] = useState(presetNumeroFir || null);
    const [loading, setLoading] = useState(true);
    const [activePage, setActivePage] = useState(1);
    const [selectedProduttore, setSelectedProduttore] = useState(null);
    const location = useLocation();
    const params = useParams();
    const tenantContext = useMemo(() => {
        if (params.context) {
            if (params.context.includes("niyol"))
                return "niyol";
            if (params.context.includes("multy"))
                return "multyproget";
            if (params.context.includes("global"))
                return "global";
        }
        if (location.pathname.includes("/mn/app/niyol"))
            return "niyol";
        if (location.pathname.includes("/mn/app/multyproget"))
            return "multyproget";
        if (location.pathname.includes("/app/"))
            return "global";
        if (location.pathname.includes("/mn/"))
            return "multyproget";
        return "global";
    }, [location.pathname, params.context]);
    const tenantInfo = TENANT_MAP[tenantContext] || TENANT_MAP.global;
    const rentriCliente = tenantInfo.cliente;
    const tenantPreset = tenantInfo.preset;
    const orderedProduttori = useMemo(() => [tenantPreset, ...ALL_PRODUTTORI.filter((p) => p.cf !== tenantPreset.cf)], [tenantPreset]);
    const produttoreDenomField = useMemo(() => fields.find((field) => isProduttoreDenominationField(field.name)), [fields]);
    const produttoreCfField = useMemo(() => findFieldByTokens(fields, ["codice", "fiscale", "produttore"]), [fields]);
    const currentProduttoreNome = produttoreDenomField ? String(values[produttoreDenomField.id] ?? "").trim() : "";
    const currentProduttoreCf = produttoreCfField ? String(values[produttoreCfField.id] ?? "").trim() : "";
    const isOwnProduction = useMemo(() => {
        if (!currentProduttoreNome && !currentProduttoreCf && !selectedProduttore)
            return true;
        const referenceCf = selectedProduttore?.cf?.trim() || currentProduttoreCf;
        const referenceName = selectedProduttore?.nome?.trim() || currentProduttoreNome;
        if (referenceCf)
            return referenceCf === tenantPreset.cf;
        return referenceName.toLowerCase() === tenantPreset.nome.toLowerCase();
    }, [currentProduttoreCf, currentProduttoreNome, selectedProduttore, tenantPreset]);
    const [scale, setScale] = useState(1);
    const [translate, setTranslate] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [lastTouchDist, setLastTouchDist] = useState(null);
    const containerRef = useRef(null);
    const [activeAutocompleteFieldId, setActiveAutocompleteFieldId] = useState(null);
    const [confirmedFieldIds, setConfirmedFieldIds] = useState(new Set());
    useFormBridgeFields(() => fields.map((field) => {
        const normalizedName = normalizeFieldName(field.name || field.id);
        const label = field.name?.trim() || field.id;
        const bridgeType = field.type === "date"
            ? "date"
            : field.type === "long_text"
                ? "textarea"
                : "text";
        return {
            id: `xfir_${normalizedName || field.id}`,
            label,
            type: bridgeType,
            getValue: () => {
                const current = values[field.id];
                if (field.type === "checkbox") {
                    return current ? "true" : "false";
                }
                return typeof current === "string" ? current : current ? String(current) : "";
            },
            setValue: (nextValue) => {
                const next = field.type === "checkbox" ? toCheckboxValue(nextValue) : nextValue;
                setValues((prev) => ({ ...prev, [field.id]: next }));
            },
        };
    }), [fields, values]);
    const dynamicFontSize = (text, baseMax = 11) => {
        const len = text.length;
        if (len <= 20)
            return `clamp(7px, 1.8vw, ${baseMax}px)`;
        if (len <= 40)
            return `clamp(6px, 1.4vw, 9px)`;
        if (len <= 60)
            return `clamp(5px, 1.2vw, 8px)`;
        return `clamp(4px, 1vw, 7px)`;
    };
    // Auto-load user's active FIR draft if no preset provided
    useEffect(() => {
        if (presetNumeroFir || firFormId)
            return;
        supabase.auth.getUser().then(({ data: { user: authUser } }) => {
            if (!authUser)
                return;
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
    }, [presetNumeroFir, firFormId]);
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
                const loadedFields = data.fields;
                setFields(loadedFields);
                if (effectiveNumero) {
                    const numeroField = loadedFields.find(f => hasTokens(f.name, ["numero", "formulario"]));
                    if (numeroField) {
                        setValues(prev => ({ ...prev, [numeroField.id]: effectiveNumero }));
                    }
                }
            }
            if (error)
                console.warn("[FIRAlternativeForm]", error.message);
            setLoading(false);
        });
    }, [presetNumeroFir, activeDraftNumero]);
    useEffect(() => {
        if (fields.length === 0)
            return;
        let cancelled = false;
        const loadDraftValues = async () => {
            let draft = draftData ?? null;
            if (!draft && activeDraftId) {
                const { data } = await supabase
                    .from("fir_forms")
                    .select("*")
                    .eq("id", activeDraftId)
                    .maybeSingle();
                draft = data ?? null;
            }
            if (!draft || cancelled)
                return;
            const hydratedValues = buildDraftFieldValues(fields, draft);
            const effectiveNumero = draft.numero_fir || presetNumeroFir || activeDraftNumero;
            if (effectiveNumero) {
                fields.forEach((field) => {
                    if (hasTokens(field.name, ["numero", "fir"]) || hasTokens(field.name, ["numero", "formulario"])) {
                        hydratedValues[field.id] = effectiveNumero;
                    }
                });
            }
            if (!cancelled) {
                setValues((prev) => ({ ...prev, ...hydratedValues }));
            }
        };
        void loadDraftValues();
        return () => {
            cancelled = true;
        };
    }, [fields, draftData, activeDraftId, presetNumeroFir, activeDraftNumero]);
    // Auto-prefill trasportatore fields from the assigned user's profile
    useEffect(() => {
        if (fields.length === 0)
            return;
        // Determine user ID: from prop, or try fetching from fir_forms
        const resolveUserId = async () => {
            if (assignedUserId)
                return assignedUserId;
            if (!firFormId)
                return null;
            const { data } = await supabase
                .from("fir_forms")
                .select("user_id")
                .eq("id", firFormId)
                .maybeSingle();
            return data?.user_id || null;
        };
        resolveUserId().then(async (userId) => {
            if (!userId)
                return;
            const { data: profile } = await supabase
                .from("profiles")
                .select("nome, cognome, codice_fiscale, targa_automezzo")
                .eq("user_id", userId)
                .maybeSingle();
            if (!profile)
                return;
            const updates = {};
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
            const targaField = fields.find(f => hasTokens(f.name, ["targa", "automezzo"]) &&
                !normalizeFieldName(f.name).includes("trasbordo"));
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
    const handleChange = (id, val) => {
        const isProducerField = produttoreDenomField?.id === id || produttoreCfField?.id === id;
        setValues((prev) => ({ ...prev, [id]: val }));
        if (isProducerField && typeof val === "string") {
            setSelectedProduttore(null);
        }
    };
    const fillProduttore = useCallback((soggetto) => {
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
    const fillDestinatario = useCallback((soggetto) => {
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
    const handleMouseDown = (e) => {
        if (scale <= 1)
            return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
    };
    const handleMouseMove = (e) => {
        if (!isDragging)
            return;
        setTranslate({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };
    const handleMouseUp = () => setIsDragging(false);
    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            setLastTouchDist(dist);
        }
        else if (e.touches.length === 1 && scale > 1) {
            setIsDragging(true);
            setDragStart({ x: e.touches[0].clientX - translate.x, y: e.touches[0].clientY - translate.y });
        }
    };
    const handleTouchMove = (e) => {
        if (e.touches.length === 2 && lastTouchDist !== null) {
            const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            const delta = (dist - lastTouchDist) * 0.008;
            setScale((s) => Math.max(0.5, Math.min(4, s + delta)));
            setLastTouchDist(dist);
        }
        else if (e.touches.length === 1 && isDragging) {
            setTranslate({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
        }
    };
    const handleTouchEnd = () => {
        setLastTouchDist(null);
        setIsDragging(false);
    };
    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.15 : 0.15;
        setScale((s) => Math.max(0.5, Math.min(4, s + delta)));
    };
    const pageFields = fields.filter((f) => f.page === activePage);
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center py-20", children: _jsx("div", { className: "text-primary animate-pulse text-sm font-mono", children: "Caricamento template..." }) }));
    }
    if (fields.length === 0) {
        return (_jsx("div", { className: "flex items-center justify-center py-20", children: _jsx("div", { className: "text-muted-foreground text-sm font-mono", children: "Nessun template salvato" }) }));
    }
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30", children: [_jsx(Zap, { className: "h-4 w-4 text-amber-400" }), _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-xs font-mono font-semibold text-amber-300 tracking-wider", children: "MODULO ALTERNATIVO \u2014 Sperimentale" }), _jsx("span", { className: "text-[10px] font-mono text-amber-400/70", children: "In uso da mercoled\u00EC 18 marzo 2026" })] })] }), _jsx("div", { className: "flex gap-2", children: [1, 2, 3].map((p) => (_jsxs("button", { onClick: () => setActivePage(p), className: `flex-1 py-2 text-xs font-mono font-semibold rounded-lg border transition-all ${activePage === p
                        ? "bg-primary/20 border-primary/50 text-primary"
                        : "bg-card/40 border-border/30 text-muted-foreground hover:bg-card/60"}`, children: ["PAG ", p] }, p))) }), _jsxs("div", { className: "flex items-center justify-center gap-2", children: [_jsx("button", { onClick: zoomOut, className: "p-1.5 rounded-md border border-border/40 bg-card/60 hover:bg-card/80 transition-all", children: _jsx(ZoomOut, { className: "h-4 w-4 text-muted-foreground" }) }), _jsxs("span", { className: "text-[10px] font-mono text-muted-foreground min-w-[40px] text-center", children: [Math.round(scale * 100), "%"] }), _jsx("button", { onClick: zoomIn, className: "p-1.5 rounded-md border border-border/40 bg-card/60 hover:bg-card/80 transition-all", children: _jsx(ZoomIn, { className: "h-4 w-4 text-muted-foreground" }) }), _jsx("button", { onClick: resetZoom, className: "p-1.5 rounded-md border border-border/40 bg-card/60 hover:bg-card/80 transition-all", children: _jsx(RotateCcw, { className: "h-3.5 w-3.5 text-muted-foreground" }) })] }), _jsx("div", { ref: containerRef, className: "relative w-full rounded-lg overflow-hidden border border-border/20", style: { touchAction: "none" }, onMouseDown: handleMouseDown, onMouseMove: handleMouseMove, onMouseUp: handleMouseUp, onMouseLeave: handleMouseUp, onTouchStart: handleTouchStart, onTouchMove: handleTouchMove, onTouchEnd: handleTouchEnd, onWheel: handleWheel, children: _jsx("div", { style: {
                        transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                        transformOrigin: "top left",
                        transition: isDragging ? "none" : "transform 0.15s ease-out",
                        cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
                    }, children: _jsxs("div", { className: "relative", children: [_jsx("img", { src: PAGE_IMAGES[activePage - 1], alt: `Formulario pagina ${activePage}`, className: "w-full h-auto block", draggable: false }), pageFields.map((field) => {
                                const style = {
                                    position: "absolute",
                                    left: `${field.x}%`,
                                    top: `${field.y}%`,
                                    width: `${field.width}%`,
                                    height: `${field.height}%`,
                                };
                                if (field.type === "checkbox") {
                                    return (_jsx("label", { style: style, className: "flex items-center justify-center cursor-pointer", children: _jsx("input", { type: "checkbox", checked: !!values[field.id], onChange: (e) => handleChange(field.id, e.target.checked), className: "w-3/4 h-3/4 accent-primary cursor-pointer", style: { background: "transparent" } }) }, field.id));
                                }
                                if (field.type === "long_text") {
                                    return (_jsx("textarea", { value: values[field.id] || "", onChange: (e) => handleChange(field.id, e.target.value), style: {
                                            ...style,
                                            background: "transparent",
                                            border: "1px solid rgba(120, 120, 140, 0.35)",
                                            borderRadius: "2px",
                                            color: "#1a1a2e",
                                            fontSize: "clamp(7px, 1.8vw, 11px)",
                                            fontFamily: "monospace",
                                            padding: "2px 3px",
                                            resize: "none",
                                            outline: "none",
                                            lineHeight: "1.2",
                                        } }, field.id));
                                }
                                const isProduttoreAutocomplete = isProduttoreDenominationField(field.name);
                                const isDestinatarioAutocomplete = isDestinatarioDenominationField(field.name);
                                const rawValue = String(values[field.id] || "");
                                const suggestions = isProduttoreAutocomplete
                                    ? orderedProduttori.filter((item) => matchesSoggettoSearch(item, rawValue))
                                    : isDestinatarioAutocomplete
                                        ? DESTINATARI.filter((item) => matchesSoggettoSearch(item, rawValue)).slice(0, 12)
                                        : [];
                                const isConfirmed = confirmedFieldIds.has(field.id);
                                const shouldShowAutocomplete = activeAutocompleteFieldId === field.id && !isConfirmed && suggestions.length > 0;
                                if (isProduttoreAutocomplete || isDestinatarioAutocomplete) {
                                    return (_jsxs("div", { style: style, className: "relative overflow-visible", children: [_jsx("input", { type: "text", value: rawValue, onChange: (e) => {
                                                    handleChange(field.id, e.target.value);
                                                    setActiveAutocompleteFieldId(field.id);
                                                    setConfirmedFieldIds((prev) => { const next = new Set(prev); next.delete(field.id); return next; });
                                                }, onFocus: () => setActiveAutocompleteFieldId(field.id), onBlur: () => {
                                                    window.setTimeout(() => {
                                                        setActiveAutocompleteFieldId((current) => (current === field.id ? null : current));
                                                    }, 150);
                                                }, style: {
                                                    width: "100%",
                                                    height: "100%",
                                                    background: "transparent",
                                                    border: "1px solid rgba(120, 120, 140, 0.35)",
                                                    borderRadius: "2px",
                                                    color: "#1a1a2e",
                                                    fontSize: dynamicFontSize(rawValue),
                                                    fontFamily: "monospace",
                                                    padding: "1px 3px",
                                                    outline: "none",
                                                } }), shouldShowAutocomplete && (_jsxs("div", { className: "absolute left-0 right-0 top-full z-[80] mt-0.5 max-h-32 overflow-y-auto rounded-md border border-border/40 bg-popover shadow-lg", children: [suggestions.map((suggestion) => (_jsxs("button", { type: "button", onMouseDown: (e) => e.preventDefault(), onClick: () => {
                                                            if (isProduttoreAutocomplete) {
                                                                fillProduttore(suggestion);
                                                            }
                                                            else {
                                                                fillDestinatario(suggestion);
                                                            }
                                                        }, className: "block w-full border-b border-border/20 px-2 py-1 text-left font-mono text-[10px] text-foreground transition-colors hover:bg-accent/50 last:border-b-0", children: [_jsx("div", { className: "truncate font-semibold", children: suggestion.nome }), _jsxs("div", { className: "truncate text-[9px] text-muted-foreground", children: [suggestion.indirizzo || "Indirizzo non disponibile", suggestion.cf ? ` · CF ${suggestion.cf}` : "", suggestion.piva ? ` · P.IVA ${suggestion.piva}` : ""] })] }, `${field.id}-${suggestion.cf}-${suggestion.nome}`))), isProduttoreAutocomplete && (_jsx("button", { type: "button", onMouseDown: (e) => e.preventDefault(), onClick: () => {
                                                            setSelectedProduttore(null);
                                                            setActiveAutocompleteFieldId(null);
                                                        }, className: "block w-full px-2 py-1 text-left font-mono text-[10px] text-accent-foreground transition-colors hover:bg-accent/50", children: "\u270F\uFE0F Altro produttore (inserimento libero)" }))] }))] }, field.id));
                                }
                                return (_jsx("input", { type: field.type === "date" ? "date" : field.type === "time" ? "time" : "text", value: values[field.id] || "", onChange: (e) => handleChange(field.id, e.target.value), style: {
                                        ...style,
                                        background: "transparent",
                                        border: "1px solid rgba(120, 120, 140, 0.35)",
                                        borderRadius: "2px",
                                        color: "#1a1a2e",
                                        fontSize: dynamicFontSize(String(values[field.id] || "")),
                                        fontFamily: "monospace",
                                        padding: "1px 3px",
                                        outline: "none",
                                    } }, field.id));
                            })] }) }) }), printOnly ? (_jsx("div", { className: "flex justify-end gap-3 pt-2", children: _jsxs("button", { onClick: () => {
                        const printWindow = window.open("", "_blank");
                        if (!printWindow)
                            return;
                        const container = containerRef.current;
                        if (!container)
                            return;
                        const cloned = container.cloneNode(true);
                        // Remove borders from inputs and make them look printed
                        cloned.querySelectorAll("input, textarea").forEach((el) => {
                            const htmlEl = el;
                            htmlEl.style.border = "none";
                            htmlEl.style.outline = "none";
                            htmlEl.style.background = "transparent";
                            // Replace inputs with spans for print
                            const span = document.createElement("span");
                            span.textContent = htmlEl.value;
                            span.style.cssText = htmlEl.style.cssText;
                            span.style.position = "absolute";
                            span.style.left = htmlEl.style.left;
                            span.style.top = htmlEl.style.top;
                            span.style.width = htmlEl.style.width;
                            span.style.height = htmlEl.style.height;
                            htmlEl.parentNode?.replaceChild(span, htmlEl);
                        });
                        // Build all 3 pages for print
                        const allPagesHtml = [1, 2, 3].map(pageNum => {
                            const pageContainer = document.createElement("div");
                            pageContainer.style.cssText = "position:relative;page-break-after:always;";
                            const img = document.createElement("img");
                            img.src = PAGE_IMAGES[pageNum - 1];
                            img.style.cssText = "width:100%;height:auto;display:block;";
                            pageContainer.appendChild(img);
                            // Render fields for this page
                            fields.filter(f => f.page === pageNum).forEach(field => {
                                const val = String(values[field.id] || "");
                                if (!val)
                                    return;
                                const span = document.createElement("span");
                                span.textContent = val;
                                span.style.cssText = `position:absolute;left:${field.x}%;top:${field.y}%;width:${field.width}%;height:${field.height}%;font-family:monospace;font-size:clamp(7px,1.8vw,11px);color:#1a1a2e;overflow:hidden;white-space:nowrap;padding:1px 3px;`;
                                pageContainer.appendChild(span);
                            });
                            return pageContainer.outerHTML;
                        }).join("");
                        printWindow.document.write(`<html><head><title>FIR ${presetNumeroFir || ""}</title><style>@media print{@page{margin:5mm;size:A4;}body{margin:0;}}body{margin:0;padding:0;}</style></head><body>${allPagesHtml}</body></html>`);
                        printWindow.document.close();
                        setTimeout(() => {
                            printWindow.print();
                            onPrinted?.();
                        }, 600);
                    }, className: "px-6 py-3 rounded-xl bg-primary/20 border border-primary/30 text-primary font-display text-sm tracking-wider hover:bg-primary/30 transition-colors flex items-center gap-2", children: [_jsx(Printer, { className: "h-4 w-4" }), " STAMPA TUTTE LE PAGINE"] }) })) : (_jsx(FIRRentriActions, { cliente: rentriCliente, formData: values, firmaComeProduttore: isOwnProduction, templateFields: fields.map(f => ({ id: f.id, name: f.name })), onEmissioneSuccess: (res) => {
                    console.log("[FIR] Emissione success:", res);
                } }))] }));
}
