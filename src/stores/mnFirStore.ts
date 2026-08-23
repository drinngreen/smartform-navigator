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
  formatoFir: "digitale",
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

const toLocalDateTimeInput = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) return "";
  const normalized = value.trim().replace(" ", "T");
  return normalized.length >= 16 ? normalized.slice(0, 16) : normalized;
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
        const str = (v: unknown): string =>
          v === null || v === undefined || v === false ? "" : String(v);
        const bool = (v: unknown): boolean =>
          v === true || v === "true" || v === "SI" || v === "si" || v === 1 || v === "1";
        const statoFisicoCode = dbData.stato_fisico
          ? STATO_FISICO_REVERSE_MAP[dbData.stato_fisico] || ""
          : "";

        const dbStatus = dbData.status as string | undefined;
        let mappedWorkflow: 'bozza' | 'inviato' | 'chiuso' | null = 'bozza';
        if (dbStatus === 'inviato') mappedWorkflow = 'inviato';
        else if (dbStatus === 'chiuso' || dbStatus === 'completato') mappedWorkflow = 'chiuso';

        const formData = dbData.form_data && typeof dbData.form_data === "object"
          ? dbData.form_data
          : {};
        const departureDate = String(
          formData.data_inizio_trasporto || dbData.data_partenza || ""
        ).slice(0, 10);
        const departureTime = String(
          formData.ora_inizio_trasporto || ""
        ).slice(0, 5);
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
            ...mnInitialFIRData,
            dataEmissione: String(formData.data_emissione || "").slice(0, 10),
            numeroRegistro: dbData.numero_fir || "",
            selectedFirNumber: dbData.numero_fir || "",
            produttoreDenominazione: dbData.produttore_denominazione || "",
            produttoreUnitaLocale: dbData.produttore_indirizzo || "",
            produttoreCF: dbData.produttore_codice_fiscale || "",
            destinatarioDenominazione: dbData.destinatario_denominazione || "",
            destinatarioUnitaLocale: dbData.destinatario_indirizzo || "",
            destinatarioCF: dbData.destinatario_codice_fiscale || "",
            
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
            oraDataInizioTrasporto: departureDate,
            oraInizioTrasporto: departureTime,
            dataFineTrasporto: destinationDate,
            oraFineTrasporto: destinationTime,
            dataOraArrivo: destinationDateTime,
            intermediarioDenominazione: dbData.intermediario_denominazione || "",
            intermediarioCF: dbData.intermediario_codice_fiscale || "",
            intermediarioNumeroAlbo: dbData.intermediario_iscrizione_albo || "",
            formatoFir: String((formData as any).formato_fir ?? "").toLowerCase() === "cartaceo" ? "cartaceo" : "digitale",
            annotazioni: dbData.note || "",
            pesoRicevuto: String(formData.peso_ricevuto ?? formData.quantita_destino ?? ""),
            quantitaAccettata: String(formData.quantita_accettata ?? formData.quantita_destino ?? ""),
            dataRicezione: String(formData.data_ricezione ?? formData.data_fine_trasporto ?? destinationDate),
            oraRicezione: String(formData.ora_ricezione ?? formData.ora_fine_trasporto ?? destinationTime),
            // ── Sezioni recuperate dal form_data: senza queste, riaprendo una bozza
            //    i dati inseriti sparivano dal modulo e dalla stampa ufficiale ──
            produttoreLuogoProduzioneDiverso: str(formData.produttore_luogo_produzione),
            produttoreNumeroAut: str(formData.produttore_numero_aut ?? formData.produttore_iscrizione_albo),
            produttoreTipoAut: str(formData.produttore_tipo_aut ?? formData.produttore_tipo),
            produttoreDataAut: str(formData.produttore_data_aut),
            isDetentore: bool(formData.detentore_checkbox),
            detentoreDenominazione: str(formData.detentore_denominazione),
            detentoreUnitaLocale: str(formData.detentore_unita_locale),
            detentoreCF: str(formData.detentore_codice_fiscale),
            detentoreNumeroAut: str(formData.detentore_numero_aut),
            detentoreTipoAut: str(formData.detentore_tipo_aut),
            destinatarioNumeroAut: str(formData.destinatario_n_aut_comunicazione) || dbData.destinatario_autorizzazione || "",
            destinatarioTipoAut: str(formData.destinatario_tipo),
            destinatarioOperazione: formData.destinatario_operazione_D ? "D" : "R",
            destinatarioCodiceOperazione: str(formData.destinatario_operazione_D ?? formData.destinatario_operazione_R),
            provenienza: formData.provenienza_urbano ? "urbano" : "speciale",
            verificatoPartenza: bool(formData.peso_verificato_partenza),
            aspettoEsteriore: formData.aspetto_rinfusa ? "rinfusa" : "colli",
            numeroColli: str(formData.numero_colli),
            trasportoADR: bool(formData.trasporto_adr_rid),
            adrClassePericolo: str(formData.classe_pericolo),
            adrNumeroONU: str(formData.nr_onu),
            adrNote: str(formData.note_adr),
            percorsoDiverso: str(formData.percorso),
            analisiRapportiProva: bool(formData.analisi_rapporto_di_prova),
            analisiNumero: str(formData.analisi_numero),
            analisiValidaAl: str(formData.analisi_valida_al),
            classificazione: bool(formData.classificazione_caratteristiche_chimico_fisiche),
            classificazioneNumero: str(formData.classificazione_numero),
            classificazioneValidaAl: str(formData.classificazione_valida_al),
            allegatoMicroraccolta: bool(formData.microraccolta),
            allegatoIntermodale: bool(formData.intermodale),
            accettazione: formData.respinto ? "respinto" : formData.accettato_parzialmente ? "parziale" : formData.accettato_per_intero ? "intero" : "",
            motivazioneRespingimento: str(formData.motivazioni_respinta),
            inAttesaVerificaAnalitica: bool(formData.in_attesa_verifica_analitica),
            trasbordoParzDenominazione: str(formData.trasbordo_parziale_denominazione),
            trasbordoParzCF: str(formData.trasbordo_parziale_codice_fiscale),
            trasbordoParzAlbo: str(formData.trasbordo_parziale_iscrizione_albo),
            trasbordoParzNuovoFir: str(formData.trasbordo_parziale_rif_formulario),
            trasbordoParzQuantitaResidua: str(formData.trasbordo_parziale_quantita_residua),
            trasbordoParzCausale: str(formData.trasbordo_parziale_motivazione),
            trasbordoTotDenominazione: str(formData.trasbordo_totale_denominazione),
            trasbordoTotCF: str(formData.trasbordo_totale_codice_fiscale),
            trasbordoTotAlbo: str(formData.trasbordo_totale_iscrizione_albo),
            trasbordoTotTarga: str(formData.trasbordo_totale_targa_automezzo),
            trasbordoTotRimorchio: str(formData.trasbordo_totale_targa_rimorchio),
            trasbordoTotConducente: str(formData.trasbordo_totale_conducente),
            trasbordoTotDataPresaCarico: str(formData.trasbordo_totale_data_presa_carico),
            sosta1Luogo: str(formData.sosta_tecnica_1_luogo),
            sosta1Inizio: str(formData.sosta_tecnica_1_data_sospensione),
            sosta1Fine: str(formData.sosta_tecnica_1_data_ripresa),
            sosta2Luogo: str(formData.sosta_tecnica_2_luogo),
            sosta2Inizio: str(formData.sosta_tecnica_2_data_sospensione),
            sosta2Fine: str(formData.sosta_tecnica_2_data_ripresa),
            sosta3Luogo: str(formData.sosta_tecnica_3_luogo),
            sosta3Inizio: str(formData.sosta_tecnica_3_data_sospensione),
            sosta3Fine: str(formData.sosta_tecnica_3_data_ripresa),
            dest2Denominazione: str(formData.secondo_destinatario_denominazione),
            dest2UnitaLocale: str(formData.secondo_destinatario_unita_locale),
            dest2CF: str(formData.secondo_destinatario_codice_fiscale),
            dest2Autorizzazione: str(formData.secondo_destinatario_iscrizione_albo),
            dest2TipoAut: str(formData.secondo_destinatario_tipo),
            dest2DataAut: str(formData.secondo_destinatario_data_aut),
            dest2Operazione: formData.secondo_destinatario_operazione_D ? "D" : "R",
            dest2CodiceOperazione: str(formData.secondo_destinatario_operazione_D ?? formData.secondo_destinatario_operazione_R),
            annotazioniContinuazione: str(formData.annotazioni_pag2),
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
