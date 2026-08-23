import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeLocalStorage } from '@/lib/safeStorage';

// Tipi per lo store FIR - basato su FIRFormComplete.tsx FIRData interface
export interface FIRDataStore {
  // Pool FIR Number
  selectedFirNumber: string;

  // Header
  dataEmissione: string;
  registroSi: boolean;
  numeroRegistro: string;

  // Campo 1 - Produttore
  produttoreDenominazione: string;
  produttoreUnitaLocale: string;
  produttoreCF: string;
  produttoreLuogoProduzioneDiverso: string;
  produttoreNumeroAut: string;
  produttoreTipoAut: string;
  produttoreDataAut: string;
  cantiereIndirizzo: string;
  cantiereComune: string;
  cantiereProvincia: string;
  cantiereCAP: string;

  // Campo 2 - Detentore
  isDetentore: boolean;
  detentoreDenominazione: string;
  detentoreUnitaLocale: string;
  detentoreCF: string;
  detentoreNumeroAut: string;
  detentoreTipoAut: string;

  // Campo 3 - Destinatario
  destinatarioDenominazione: string;
  destinatarioUnitaLocale: string;
  destinatarioCF: string;
  destinatarioEmail: string;
  destinatarioOperazione: string;
  destinatarioCodiceOperazione: string;
  destinatarioNumeroAut: string;
  destinatarioTipoAut: string;
  destinatarioDataAut: string;

  // Campo 4 - Trasportatore
  trasportatoreDenominazione: string;
  trasportatoreCF: string;
  trasportatoreNumeroAlbo: string;
  trasportatoreDataAlbo: string;
  trasportatoreSituatoIn: string;
  trasportatoreNomeAutista: string;

  // Campo 5 - Intermediario/Commerciante
  intermediarioDenominazione: string;
  intermediarioCF: string;
  intermediarioNumeroAlbo: string;

  // Campo 6 - Caratteristiche Rifiuto
  codiceEER: string;
  statoFisico: string;
  descrizione: string;
  provenienza: "urbano" | "speciale";
  caratteristicheHP: string[];
  quantita: string;
  quantitaLitri: string;
  unitaMisura: "kg" | "l";
  verificatoPartenza: boolean;
  analisiRapportiProva: boolean;
  analisiNumero: string;
  analisiValidaAl: string;
  classificazione: boolean;
  classificazioneNumero: string;
  classificazioneValidaAl: string;
  trasportoADR: boolean;
  adrClassePericolo: string;
  adrNumeroONU: string;
  adrNote: string;
  aspettoEsteriore: "colli" | "rinfusa";
  numeroColli: string;

  // Campo 8 - Conducente
  conducenteNomeCognome: string;
  oraDataInizioTrasporto: string;
  oraInizioTrasporto: string;
  dataFineTrasporto: string;
  oraFineTrasporto: string;

  // Campo 9 - Trasporto
  targaAutomezzo: string;
  targaRimorchio: string;
  percorsoDiverso: string;

  // Campo 10 - Allegati
  allegatoMicroraccolta: boolean;
  allegatoIntermodale: boolean;

  // Campo 12 - Destinatario (accettazione/riserva)
  accettazione: "intero" | "parziale" | "respinto" | "";
  quantitaAccettata: string;
  pesoRicevuto: string;
  firmaDestinatario: string;
  dataRicezione: string;
  oraRicezione: string;
  causaleRespingimento: string;
  motivazioneRespingimento: string;
  dataOraArrivo: string;
  inAttesaVerificaAnalitica: boolean;

  // Formato del formulario: digitale (RENTRI) oppure cartaceo
  formatoFir: "digitale" | "cartaceo";

  // Campo 17 - Annotazioni
  annotazioni: string;

  // PAGINA 2 - TRASBORDO
  trasbordoParzDenominazione: string;
  trasbordoParzCF: string;
  trasbordoParzAlbo: string;
  trasbordoParzCausale: string;
  trasbordoParzQuantitaResidua: string;
  trasbordoParzNuovoFir: string;
  trasbordoTotDenominazione: string;
  trasbordoTotCF: string;
  trasbordoTotAlbo: string;
  trasbordoTotTarga: string;
  trasbordoTotRimorchio: string;
  trasbordoTotConducente: string;
  trasbordoTotDataPresaCarico: string;
  trasbordoTotFirmaConducente: string;
  sosta1Luogo: string;
  sosta1Inizio: string;
  sosta1Fine: string;
  sosta2Luogo: string;
  sosta2Inizio: string;
  sosta2Fine: string;
  sosta3Luogo: string;
  sosta3Inizio: string;
  sosta3Fine: string;
  dest2Denominazione: string;
  dest2UnitaLocale: string;
  dest2CF: string;
  dest2Autorizzazione: string;
  dest2TipoAut: string;
  dest2DataAut: string;
  dest2Operazione: string;
  dest2CodiceOperazione: string;
  annotazioniContinuazione: string;

  // PAGINA 3 - INTERMODALE
  interTerrDenominazione: string;
  interTerrCF: string;
  interTerrAlbo: string;
  interTerrConducente: string;
  interTerrTarga: string;
  interTerrRimorchio: string;
  interFerroDenominazione: string;
  interFerroIdTreno: string;
  interFerroCF: string;
  interFerroTratta: string;
  interFerroRid: boolean;
  interFerroStazionePartenza: string;
  interFerroStazioneArrivo: string;
  interFerroDataPartenza: string;
  interFerroDataArrivo: string;
  interMareDenominazione: string;
  interMareIdNave: string;
  interMareCF: string;
  interMareImdg: boolean;
  interMarePortoPartenza: string;
  interMarePortoArrivo: string;
  interMareDataPartenza: string;
  interMareDataArrivo: string;
}

export const initialFIRData: FIRDataStore = {
  selectedFirNumber: "",
  dataEmissione: new Date().toISOString().split("T")[0],
  registroSi: true,
  numeroRegistro: "",
  produttoreDenominazione: "Global Reco",
  produttoreUnitaLocale: "Via Alba 11 - 10024 Moncalieri (TO)",
  produttoreCF: "08934760961",
  produttoreLuogoProduzioneDiverso: "",
  produttoreNumeroAut: "",
  produttoreTipoAut: "",
  produttoreDataAut: "",
  cantiereIndirizzo: "",
  cantiereComune: "",
  cantiereProvincia: "TO",
  cantiereCAP: "",
  isDetentore: false,
  detentoreDenominazione: "",
  detentoreUnitaLocale: "",
  detentoreCF: "",
  detentoreNumeroAut: "",
  detentoreTipoAut: "",
  destinatarioDenominazione: "",
  destinatarioUnitaLocale: "",
  destinatarioCF: "",
  destinatarioEmail: "",
  destinatarioOperazione: "R",
  destinatarioCodiceOperazione: "",
  destinatarioNumeroAut: "",
  destinatarioTipoAut: "",
  destinatarioDataAut: "",
  trasportatoreDenominazione: "Global Reco S.r.l.",
  trasportatoreCF: "08934760961",
  trasportatoreNumeroAlbo: "MI58420",
  trasportatoreDataAlbo: "2024-10-18",
  trasportatoreSituatoIn: "Via Alba 11 - 10024 Moncalieri (TO)",
  trasportatoreNomeAutista: "",
  intermediarioDenominazione: "Multyproget",
  intermediarioCF: "12347770013",
  intermediarioNumeroAlbo: "205.213",
  codiceEER: "",
  statoFisico: "",
  descrizione: "",
  provenienza: "speciale",
  caratteristicheHP: [],
  quantita: "",
  quantitaLitri: "",
  unitaMisura: "kg",
  verificatoPartenza: false,
  analisiRapportiProva: false,
  analisiNumero: "",
  analisiValidaAl: "",
  classificazione: false,
  classificazioneNumero: "",
  classificazioneValidaAl: "",
  trasportoADR: false,
  adrClassePericolo: "",
  adrNumeroONU: "",
  adrNote: "",
  aspettoEsteriore: "colli",
  numeroColli: "",
  conducenteNomeCognome: "",
  oraDataInizioTrasporto: "",
  oraInizioTrasporto: "",
  dataFineTrasporto: "",
  oraFineTrasporto: "",
  targaAutomezzo: "",
  targaRimorchio: "",
  percorsoDiverso: "",
  allegatoMicroraccolta: false,
  allegatoIntermodale: false,
  accettazione: "",
  quantitaAccettata: "",
  pesoRicevuto: "",
  firmaDestinatario: "",
  dataRicezione: "",
  oraRicezione: "",
  causaleRespingimento: "",
  motivazioneRespingimento: "",
  dataOraArrivo: "",
  inAttesaVerificaAnalitica: false,
  formatoFir: "digitale",
  annotazioni: "Intermediario 1: MULTYPROGET S.R.L. - VIA RIVAROSSA, PISCINA (TO) - CF/P.IVA: 08486880019",
  trasbordoParzDenominazione: "",
  trasbordoParzCF: "",
  trasbordoParzAlbo: "",
  trasbordoParzCausale: "",
  trasbordoParzQuantitaResidua: "",
  trasbordoParzNuovoFir: "",
  trasbordoTotDenominazione: "",
  trasbordoTotCF: "",
  trasbordoTotAlbo: "",
  trasbordoTotTarga: "",
  trasbordoTotRimorchio: "",
  trasbordoTotConducente: "",
  trasbordoTotDataPresaCarico: "",
  trasbordoTotFirmaConducente: "",
  sosta1Luogo: "",
  sosta1Inizio: "",
  sosta1Fine: "",
  sosta2Luogo: "",
  sosta2Inizio: "",
  sosta2Fine: "",
  sosta3Luogo: "",
  sosta3Inizio: "",
  sosta3Fine: "",
  dest2Denominazione: "",
  dest2UnitaLocale: "",
  dest2CF: "",
  dest2Autorizzazione: "",
  dest2TipoAut: "",
  dest2DataAut: "",
  dest2Operazione: "R",
  dest2CodiceOperazione: "",
  annotazioniContinuazione: "",
  interTerrDenominazione: "",
  interTerrCF: "",
  interTerrAlbo: "",
  interTerrConducente: "",
  interTerrTarga: "",
  interTerrRimorchio: "",
  interFerroDenominazione: "",
  interFerroIdTreno: "",
  interFerroCF: "",
  interFerroTratta: "",
  interFerroRid: false,
  interFerroStazionePartenza: "",
  interFerroStazioneArrivo: "",
  interFerroDataPartenza: "",
  interFerroDataArrivo: "",
  interMareDenominazione: "",
  interMareIdNave: "",
  interMareCF: "",
  interMareImdg: false,
  interMarePortoPartenza: "",
  interMarePortoArrivo: "",
  interMareDataPartenza: "",
  interMareDataArrivo: "",
};

export const FIR_FIELD_LABELS: Record<keyof FIRDataStore, string> = {
  selectedFirNumber: "Numero Formulario FIR (dal pool assegnato)",
  dataEmissione: "Data emissione FIR",
  registroSi: "Registro cronologico (SÌ/NO)",
  numeroRegistro: "Numero annotazione registro",
  produttoreDenominazione: "Produttore - Ragione sociale",
  produttoreUnitaLocale: "Produttore - Unità locale/Indirizzo",
  produttoreCF: "Produttore - Codice fiscale",
  produttoreLuogoProduzioneDiverso: "Produttore - Luogo produzione (se diverso)",
  produttoreNumeroAut: "Produttore - Numero autorizzazione",
  produttoreTipoAut: "Produttore - Tipo autorizzazione",
  produttoreDataAut: "Produttore - Data autorizzazione",
  cantiereIndirizzo: "Cantiere - Indirizzo",
  cantiereComune: "Cantiere - Comune",
  cantiereProvincia: "Cantiere - Provincia",
  cantiereCAP: "Cantiere - CAP",
  isDetentore: "Presenza detentore (diverso dal produttore)",
  detentoreDenominazione: "Detentore - Ragione sociale",
  detentoreUnitaLocale: "Detentore - Unità locale",
  detentoreCF: "Detentore - Codice fiscale",
  detentoreNumeroAut: "Detentore - Numero autorizzazione",
  detentoreTipoAut: "Detentore - Tipo autorizzazione",
  destinatarioDenominazione: "Destinatario - Ragione sociale",
  destinatarioUnitaLocale: "Destinatario - Unità locale/Indirizzo",
  destinatarioCF: "Destinatario - Codice fiscale",
  destinatarioEmail: "Destinatario - Email impianto",
  destinatarioOperazione: "Destinatario - Tipo operazione (R/D)",
  destinatarioCodiceOperazione: "Destinatario - Codice operazione (R1-R13 o D1-D15)",
  destinatarioNumeroAut: "Destinatario - Numero autorizzazione",
  destinatarioTipoAut: "Destinatario - Tipo autorizzazione",
  destinatarioDataAut: "Destinatario - Data autorizzazione",
  trasportatoreDenominazione: "Trasportatore - Ragione sociale",
  trasportatoreCF: "Trasportatore - Codice fiscale",
  trasportatoreNumeroAlbo: "Trasportatore - Numero iscrizione Albo",
  trasportatoreDataAlbo: "Trasportatore - Data iscrizione Albo",
  trasportatoreSituatoIn: "Trasportatore - Situato in",
  trasportatoreNomeAutista: "Trasportatore - Nome autista",
  intermediarioDenominazione: "Intermediario - Ragione sociale",
  intermediarioCF: "Intermediario - Codice fiscale",
  intermediarioNumeroAlbo: "Intermediario - Numero iscrizione Albo",
  codiceEER: "Codice EER (formato XX XX XX)",
  statoFisico: "Stato fisico (1-6)",
  descrizione: "Descrizione rifiuto",
  provenienza: "Provenienza (urbano/speciale)",
  caratteristicheHP: "Caratteristiche di pericolo HP",
  quantita: "Quantità (Kg)",
  quantitaLitri: "Quantità (Litri)",
  unitaMisura: "Unità di misura (kg/l)",
  verificatoPartenza: "Verificato in partenza",
  analisiRapportiProva: "Analisi/Rapporti di prova presenti",
  analisiNumero: "Numero analisi",
  analisiValidaAl: "Analisi valida al",
  classificazione: "Classificazione presente",
  classificazioneNumero: "Numero classificazione",
  classificazioneValidaAl: "Classificazione valida al",
  trasportoADR: "Trasporto ADR",
  adrClassePericolo: "ADR - Classe pericolo",
  adrNumeroONU: "ADR - Numero ONU",
  adrNote: "ADR - Note",
  aspettoEsteriore: "Aspetto esteriore (colli/rinfusa)",
  numeroColli: "Numero colli",
  conducenteNomeCognome: "Conducente - Nome e cognome",
  oraDataInizioTrasporto: "Data inizio trasporto",
  oraInizioTrasporto: "Ora inizio trasporto",
  dataFineTrasporto: "Data fine trasporto",
  oraFineTrasporto: "Ora fine trasporto",
  targaAutomezzo: "Targa automezzo",
  targaRimorchio: "Targa rimorchio",
  percorsoDiverso: "Percorso diverso dal più breve",
  allegatoMicroraccolta: "Allegato microraccolta",
  allegatoIntermodale: "Allegato intermodale",
  accettazione: "Stato accettazione (intero/parziale/respinto)",
  quantitaAccettata: "Quantità accettata",
  pesoRicevuto: "Peso ricevuto (Kg)",
  firmaDestinatario: "Firma destinatario",
  dataRicezione: "Data ricezione",
  oraRicezione: "Ora ricezione",
  causaleRespingimento: "Causale respingimento",
  motivazioneRespingimento: "Motivazione respingimento",
  dataOraArrivo: "Data/ora arrivo impianto",
  inAttesaVerificaAnalitica: "In attesa verifica analitica",
  formatoFir: "Formato formulario (digitale/cartaceo)",
  annotazioni: "Annotazioni generali",
  trasbordoParzDenominazione: "Trasbordo parziale - Nuovo trasportatore",
  trasbordoParzCF: "Trasbordo parziale - CF nuovo trasportatore",
  trasbordoParzAlbo: "Trasbordo parziale - N. Iscrizione Albo",
  trasbordoParzCausale: "Trasbordo parziale - Causale",
  trasbordoParzQuantitaResidua: "Trasbordo parziale - Quantità residua (Kg)",
  trasbordoParzNuovoFir: "Trasbordo parziale - N. nuovo FIR",
  trasbordoTotDenominazione: "Trasbordo totale - Nuovo trasportatore",
  trasbordoTotCF: "Trasbordo totale - CF nuovo trasportatore",
  trasbordoTotAlbo: "Trasbordo totale - N. Iscrizione Albo",
  trasbordoTotTarga: "Trasbordo totale - Targa nuovo mezzo",
  trasbordoTotRimorchio: "Trasbordo totale - Targa nuovo rimorchio",
  trasbordoTotConducente: "Trasbordo totale - Conducente",
  trasbordoTotDataPresaCarico: "Trasbordo totale - Data/ora presa in carico",
  trasbordoTotFirmaConducente: "Trasbordo totale - Firma conducente",
  sosta1Luogo: "Sosta tecnica 1 - Luogo",
  sosta1Inizio: "Sosta tecnica 1 - Inizio sospensione",
  sosta1Fine: "Sosta tecnica 1 - Fine sospensione",
  sosta2Luogo: "Sosta tecnica 2 - Luogo",
  sosta2Inizio: "Sosta tecnica 2 - Inizio sospensione",
  sosta2Fine: "Sosta tecnica 2 - Fine sospensione",
  sosta3Luogo: "Sosta tecnica 3 - Luogo",
  sosta3Inizio: "Sosta tecnica 3 - Inizio sospensione",
  sosta3Fine: "Sosta tecnica 3 - Fine sospensione",
  dest2Denominazione: "2° Destinatario - Ragione sociale",
  dest2UnitaLocale: "2° Destinatario - Unità locale",
  dest2CF: "2° Destinatario - Codice fiscale",
  dest2Autorizzazione: "2° Destinatario - N. Autorizzazione",
  dest2TipoAut: "2° Destinatario - Tipo autorizzazione",
  dest2DataAut: "2° Destinatario - Data autorizzazione",
  dest2Operazione: "2° Destinatario - Tipo operazione (R/D)",
  dest2CodiceOperazione: "2° Destinatario - Codice operazione",
  annotazioniContinuazione: "Annotazioni (continuazione)",
  interTerrDenominazione: "Intermodale terrestre - Denominazione",
  interTerrCF: "Intermodale terrestre - Codice fiscale",
  interTerrAlbo: "Intermodale terrestre - N. Iscrizione Albo",
  interTerrConducente: "Intermodale terrestre - Conducente",
  interTerrTarga: "Intermodale terrestre - Targa mezzo",
  interTerrRimorchio: "Intermodale terrestre - Targa rimorchio",
  interFerroDenominazione: "Intermodale ferroviario - Denominazione",
  interFerroIdTreno: "Intermodale ferroviario - ID treno",
  interFerroCF: "Intermodale ferroviario - Codice fiscale",
  interFerroTratta: "Intermodale ferroviario - Tratta",
  interFerroRid: "Intermodale ferroviario - RID (merci pericolose)",
  interFerroStazionePartenza: "Intermodale ferroviario - Stazione partenza",
  interFerroStazioneArrivo: "Intermodale ferroviario - Stazione arrivo",
  interFerroDataPartenza: "Intermodale ferroviario - Data partenza",
  interFerroDataArrivo: "Intermodale ferroviario - Data arrivo",
  interMareDenominazione: "Intermodale marittimo - Denominazione",
  interMareIdNave: "Intermodale marittimo - ID nave",
  interMareCF: "Intermodale marittimo - Codice fiscale",
  interMareImdg: "Intermodale marittimo - IMDG (merci pericolose)",
  interMarePortoPartenza: "Intermodale marittimo - Porto partenza",
  interMarePortoArrivo: "Intermodale marittimo - Porto arrivo",
  interMareDataPartenza: "Intermodale marittimo - Data partenza",
  interMareDataArrivo: "Intermodale marittimo - Data arrivo",
};

export interface DatabaseFIRData {
  id: string;
  numero_fir?: string | null;
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
  form_data?: Record<string, any> | null;
  status?: string | null;
}

const STATO_FISICO_REVERSE_MAP: Record<string, string> = {
  "solido pulverulento": "1",
  "solido non pulverulento": "2",
  "fangoso palabile": "3",
  "liquido": "4",
  "aeriforme": "5",
  "altro": "6",
};

const toLocalDateTimeInput = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) return "";
  const normalized = value.trim().replace(" ", "T");
  return normalized.length >= 16 ? normalized.slice(0, 16) : normalized;
};

const isTestFirNumber = (value: unknown): boolean =>
  typeof value === "string" && /^(test[\s-]?|skkzr)/i.test(value.trim());

interface FIRStore {
  data: FIRDataStore;
  editingFirId: string | null;
  workflowStatus: 'bozza' | 'inviato' | 'chiuso' | null;
  lastUpdatedBy: 'user' | 'agent' | null;
  lastUpdatedAt: string | null;
  pendingFromAgent: boolean;

  updateField: <K extends keyof FIRDataStore>(field: K, value: FIRDataStore[K]) => void;
  updateMultipleFields: (updates: Partial<FIRDataStore>) => void;
  setFromAgent: (updates: Partial<FIRDataStore>) => void;
  confirmAgentUpdates: () => void;
  rejectAgentUpdates: () => void;
  resetForm: () => void;
  loadFromDatabase: (dbData: DatabaseFIRData) => void;
  getFilledFields: () => Array<{ field: keyof FIRDataStore; label: string; value: string | boolean | string[] }>;
  getFormSummary: () => string;
}

export const useFIRStore = create<FIRStore>()(
  persist(
    (set, get) => ({
      data: { ...initialFIRData },
      editingFirId: null,
      workflowStatus: null as 'bozza' | 'inviato' | 'chiuso' | null,
      lastUpdatedBy: null,
      lastUpdatedAt: null,
      pendingFromAgent: false,

      updateField: (field, value) => {
        set((state) => ({
          data: { ...state.data, [field]: value },
          lastUpdatedBy: 'user',
          lastUpdatedAt: new Date().toISOString(),
          pendingFromAgent: false,
        }));
      },

      updateMultipleFields: (updates) => {
        set((state) => ({
          data: { ...state.data, ...updates },
          lastUpdatedBy: 'user',
          lastUpdatedAt: new Date().toISOString(),
          pendingFromAgent: false,
        }));
      },

      setFromAgent: (updates) => {
        set((state) => ({
          data: { ...state.data, ...updates },
          lastUpdatedBy: 'agent',
          lastUpdatedAt: new Date().toISOString(),
          pendingFromAgent: true,
        }));
      },

      confirmAgentUpdates: () => {
        set({ pendingFromAgent: false });
      },

      rejectAgentUpdates: () => {
        set({ pendingFromAgent: false });
      },

      resetForm: () => {
        if (get().pendingFromAgent) {
          console.log("[FIR Store] Reset blocked: pendingFromAgent is true");
          return;
        }
        set({
          data: { ...initialFIRData, dataEmissione: new Date().toISOString().split("T")[0] },
          editingFirId: null,
          workflowStatus: null,
          lastUpdatedBy: null,
          lastUpdatedAt: null,
          pendingFromAgent: false,
        });
      },

      loadFromDatabase: (dbData: DatabaseFIRData) => {
        const statoFisicoCode = dbData.stato_fisico
          ? STATO_FISICO_REVERSE_MAP[dbData.stato_fisico] || ""
          : "";

        const dbStatus = dbData.status as string | undefined;
        let mappedWorkflow: 'bozza' | 'inviato' | 'chiuso' | null = 'bozza';
        if (dbStatus === 'inviato') mappedWorkflow = 'inviato';
        else if (dbStatus === 'chiuso' || dbStatus === 'completato') mappedWorkflow = 'chiuso';

        // Helper: use DB value if present, otherwise fall back to initialFIRData default
        const f = <K extends keyof FIRDataStore>(dbVal: string | null | undefined, key: K): FIRDataStore[K] =>
          (dbVal != null && dbVal !== "" ? dbVal : initialFIRData[key]) as FIRDataStore[K];

        const formData = dbData.form_data && typeof dbData.form_data === "object"
          ? dbData.form_data
          : {};
        const destinationDate = String(
          formData.data_fine_trasporto || formData.data_ricezione || dbData.data_arrivo || ""
        ).slice(0, 10);
        const destinationTime = String(
          formData.ora_fine_trasporto || formData.ora_ricezione || ""
        ).slice(0, 5);
        const destinationDateTime = destinationDate
          ? `${destinationDate}T${destinationTime || "00:00"}`
          : toLocalDateTimeInput(dbData.data_arrivo);

        set({
          data: {
            ...initialFIRData,
            selectedFirNumber: dbData.numero_fir || "",
            dataEmissione: String(
              dbData.form_data?.data_emissione ||
              dbData.form_data?.dataEmissione ||
              dbData.data_partenza ||
              dbData.data_arrivo ||
              ""
            ).slice(0, 10),
            numeroRegistro: dbData.numero_fir || "",
            produttoreDenominazione: f(dbData.produttore_denominazione, "produttoreDenominazione"),
            produttoreUnitaLocale: f(dbData.produttore_indirizzo, "produttoreUnitaLocale"),
            produttoreCF: f(dbData.produttore_codice_fiscale, "produttoreCF"),
            destinatarioDenominazione: dbData.destinatario_denominazione || "",
            destinatarioUnitaLocale: dbData.destinatario_indirizzo || "",
            destinatarioCF: dbData.destinatario_codice_fiscale || "",
            destinatarioNumeroAut: dbData.destinatario_autorizzazione || "",
            trasportatoreDenominazione: f(dbData.trasportatore_denominazione, "trasportatoreDenominazione"),
            trasportatoreCF: f(dbData.trasportatore_codice_fiscale, "trasportatoreCF"),
            trasportatoreNumeroAlbo: f(dbData.trasportatore_iscrizione_albo, "trasportatoreNumeroAlbo"),
            targaAutomezzo: dbData.trasportatore_targa_automezzo || "",
            targaRimorchio: dbData.trasportatore_targa_rimorchio || "",
            conducenteNomeCognome: dbData.trasportatore_conducente || "",
            codiceEER: dbData.codice_eer || "",
            descrizione: dbData.descrizione_rifiuto || "",
            statoFisico: statoFisicoCode,
            quantita: dbData.quantita?.toString() || "",
            unitaMisura: (dbData.unita_misura as "kg" | "l") || "kg",
            caratteristicheHP: dbData.caratteristiche_hp || [],
            oraDataInizioTrasporto: dbData.data_partenza || "",
            dataFineTrasporto: destinationDate,
            oraFineTrasporto: destinationTime,
            dataOraArrivo: destinationDateTime,
            intermediarioDenominazione: f(dbData.intermediario_denominazione, "intermediarioDenominazione"),
            intermediarioCF: f(dbData.intermediario_codice_fiscale, "intermediarioCF"),
            intermediarioNumeroAlbo: f(dbData.intermediario_iscrizione_albo, "intermediarioNumeroAlbo"),
            annotazioni: dbData.note || "",
            // Restore form_data fields
            ...(dbData.form_data ? {
              registroSi: dbData.form_data.registro_no !== "NO",
              produttoreLuogoProduzioneDiverso: dbData.form_data.produttore_luogo_produzione || "",
              produttoreNumeroAut: dbData.form_data.produttore_iscrizione_albo || "",
              isDetentore: dbData.form_data.detentore_checkbox || false,
              destinatarioTipoAut: dbData.form_data.destinatario_tipo || "",
              pesoRicevuto: String(dbData.form_data.peso_ricevuto ?? dbData.form_data.quantita_destino ?? ""),
              quantitaAccettata: String(dbData.form_data.quantita_accettata ?? dbData.form_data.quantita_destino ?? ""),
              dataRicezione: String(dbData.form_data.data_ricezione ?? dbData.form_data.data_fine_trasporto ?? destinationDate),
              oraRicezione: String(dbData.form_data.ora_ricezione ?? dbData.form_data.ora_fine_trasporto ?? destinationTime),
              percorsoDiverso: dbData.form_data.percorso || "",
              accettazione: dbData.form_data.accettato_per_intero ? "intero" : dbData.form_data.accettato_parzialmente ? "parziale" : dbData.form_data.respinto ? "respinto" : "",
              numeroColli: dbData.form_data.numero_colli || "",
              trasportoADR: dbData.form_data.trasporto_adr_rid || false,
              adrClassePericolo: dbData.form_data.classe_pericolo || "",
              adrNumeroONU: dbData.form_data.nr_onu || "",
              adrNote: dbData.form_data.note_adr || "",
            } : {}),
          },
          editingFirId: dbData.id,
          workflowStatus: mappedWorkflow,
          lastUpdatedBy: 'user',
          lastUpdatedAt: new Date().toISOString(),
          pendingFromAgent: false,
        });
      },

      getFilledFields: () => {
        const { data } = get();
        const filled: Array<{ field: keyof FIRDataStore; label: string; value: string | boolean | string[] }> = [];

        (Object.keys(data) as Array<keyof FIRDataStore>).forEach((key) => {
          const value = data[key];
          const hasValue =
            (typeof value === 'string' && value.trim() !== '') ||
            (typeof value === 'boolean' && value === true) ||
            (Array.isArray(value) && value.length > 0);

          if (hasValue) {
            filled.push({
              field: key,
              label: FIR_FIELD_LABELS[key],
              value,
            });
          }
        });

        return filled;
      },

      getFormSummary: () => {
        const filled = get().getFilledFields();
        if (filled.length === 0) {
          return "Il FIR è vuoto. Nessun campo compilato.";
        }

        let summary = "**Riepilogo FIR compilato:**\n\n";
        filled.forEach(({ label, value }) => {
          const displayValue = Array.isArray(value)
            ? value.join(', ')
            : typeof value === 'boolean'
            ? (value ? 'Sì' : 'No')
            : value;
          summary += `- **${label}**: ${displayValue}\n`;
        });

        return summary;
      },
    }),
    {
      storage: createJSONStorage(() => safeLocalStorage),
      name: 'fir-store',
      version: 3,
      migrate: (persistedState: unknown, version: number): any => {
        if (version < 2) {
          return {
            data: { ...initialFIRData, dataEmissione: new Date().toISOString().split("T")[0] },
            editingFirId: null,
            lastUpdatedBy: null,
            lastUpdatedAt: null,
            pendingFromAgent: false,
          };
        }

        const state = (persistedState ?? {}) as Partial<FIRStore> & { data?: Partial<FIRDataStore> };
        if (isTestFirNumber(state?.data?.selectedFirNumber) || isTestFirNumber(state?.data?.numeroRegistro)) {
          return {
            ...state,
            data: {
              ...initialFIRData,
              ...(state.data ?? {}),
              dataEmissione: new Date().toISOString().split("T")[0],
              selectedFirNumber: "",
              numeroRegistro: "",
            },
            editingFirId: null,
            workflowStatus: null,
          };
        }

        return persistedState as FIRStore;
      },
      partialize: (state) => ({
        data: state.data,
        editingFirId: state.editingFirId,
        workflowStatus: state.workflowStatus,
        lastUpdatedBy: state.lastUpdatedBy,
        lastUpdatedAt: state.lastUpdatedAt,
        pendingFromAgent: state.pendingFromAgent,
      }),
    }
  )
);
