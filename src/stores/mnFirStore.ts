import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { FIRDataStore, FIR_FIELD_LABELS, DatabaseFIRData } from './firStore';
import { safeLocalStorage } from '@/lib/safeStorage';

// ALL fields start empty — NO Global Reco / Multyproget presets
export const mnInitialFIRData: FIRDataStore = {
  selectedFirNumber: "",
  dataEmissione: new Date().toISOString().split("T")[0],
  registroSi: true,
  numeroRegistro: "",
  produttoreDenominazione: "",
  produttoreUnitaLocale: "",
  produttoreCF: "",
  produttoreLuogoProduzioneDiverso: "",
  produttoreNumeroAut: "",
  produttoreTipoAut: "",
  produttoreDataAut: "",
  cantiereIndirizzo: "",
  cantiereComune: "",
  cantiereProvincia: "",
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
  trasportatoreDenominazione: "",
  trasportatoreCF: "",
  trasportatoreNumeroAlbo: "",
  trasportatoreDataAlbo: "",
  trasportatoreSituatoIn: "",
  trasportatoreNomeAutista: "",
  intermediarioDenominazione: "",
  intermediarioCF: "",
  intermediarioNumeroAlbo: "",
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
  annotazioni: "",
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

const STATO_FISICO_REVERSE_MAP: Record<string, string> = {
  "solido pulverulento": "1",
  "solido non pulverulento": "2",
  "fangoso palabile": "3",
  "liquido": "4",
  "aeriforme": "5",
  "altro": "6",
};

const isTestFirNumberMN = (value: unknown): boolean =>
  typeof value === "string" && /^(test[\s-]?|skkzr)/i.test(value.trim());

interface MNFIRStore {
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

export const useMNFIRStore = create<MNFIRStore>()(
  persist(
    (set, get) => ({
      data: { ...mnInitialFIRData },
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

      confirmAgentUpdates: () => set({ pendingFromAgent: false }),
      rejectAgentUpdates: () => set({ pendingFromAgent: false }),

      resetForm: () => {
        if (get().pendingFromAgent) return;
        set({
          data: { ...mnInitialFIRData, dataEmissione: new Date().toISOString().split("T")[0] },
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

        set({
          data: {
            ...mnInitialFIRData,
            dataEmissione: new Date().toISOString().split("T")[0],
            numeroRegistro: dbData.numero_fir || "",
            selectedFirNumber: dbData.numero_fir || "",
            produttoreDenominazione: dbData.produttore_denominazione || "",
            produttoreUnitaLocale: dbData.produttore_indirizzo || "",
            produttoreCF: dbData.produttore_codice_fiscale || "",
            destinatarioDenominazione: dbData.destinatario_denominazione || "",
            destinatarioUnitaLocale: dbData.destinatario_indirizzo || "",
            destinatarioCF: dbData.destinatario_codice_fiscale || "",
            destinatarioNumeroAut: dbData.destinatario_autorizzazione || "",
            trasportatoreDenominazione: dbData.trasportatore_denominazione || "",
            trasportatoreCF: dbData.trasportatore_codice_fiscale || "",
            trasportatoreNumeroAlbo: dbData.trasportatore_iscrizione_albo || "",
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
            dataOraArrivo: dbData.data_arrivo || "",
            intermediarioDenominazione: dbData.intermediario_denominazione || "",
            intermediarioCF: dbData.intermediario_codice_fiscale || "",
            intermediarioNumeroAlbo: dbData.intermediario_iscrizione_albo || "",
            annotazioni: dbData.note || "",
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
          if (hasValue) filled.push({ field: key, label: FIR_FIELD_LABELS[key], value });
        });
        return filled;
      },

      getFormSummary: () => {
        const filled = get().getFilledFields();
        if (filled.length === 0) return "Il FIR è vuoto. Nessun campo compilato.";
        let summary = "**Riepilogo FIR compilato:**\n\n";
        filled.forEach(({ label, value }) => {
          const displayValue = Array.isArray(value) ? value.join(', ') : typeof value === 'boolean' ? (value ? 'Sì' : 'No') : value;
          summary += `- **${label}**: ${displayValue}\n`;
        });
        return summary;
      },
    }),
    {
      storage: createJSONStorage(() => safeLocalStorage),
      name: 'mn-fir-store',
      version: 2,
      migrate: (persistedState: unknown): any => {
        const state = (persistedState ?? {}) as Partial<MNFIRStore> & { data?: Partial<FIRDataStore> };

        if (isTestFirNumberMN(state?.data?.selectedFirNumber) || isTestFirNumberMN(state?.data?.numeroRegistro)) {
          return {
            ...state,
            data: {
              ...mnInitialFIRData,
              ...(state.data ?? {}),
              dataEmissione: new Date().toISOString().split("T")[0],
              selectedFirNumber: "",
              numeroRegistro: "",
            },
            editingFirId: null,
            workflowStatus: null,
          };
        }

        return persistedState as MNFIRStore;
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
