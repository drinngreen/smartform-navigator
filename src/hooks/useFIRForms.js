import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useFIRNumberPool } from "@/hooks/useFIRNumberPool";
const STATO_FISICO_MAP = {
    "1": "solido pulverulento",
    "2": "solido non pulverulento",
    "3": "fangoso palabile",
    "4": "liquido",
    "5": "aeriforme",
    "6": "altro",
};
export function useFIRForms() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { releaseNumber, consumeNumber } = useFIRNumberPool();
    const { data: myForms, isLoading: isLoadingMyForms } = useQuery({
        queryKey: ["fir-forms", "my", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("fir_forms")
                .select("*")
                .eq("user_id", user.id)
                .eq("deleted_by_user", false)
                .order("created_at", { ascending: false });
            if (error)
                throw error;
            return data;
        },
        enabled: !!user,
    });
    const createFIR = useMutation({
        mutationFn: async (formData) => {
            const { data, error } = await supabase
                .from("fir_forms")
                .insert({ user_id: user.id, ...formData })
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fir-forms"] });
            toast.success("FIR creato con successo");
        },
        onError: (error) => {
            toast.error("Errore nella creazione del FIR: " + error.message);
        },
    });
    const updateFIR = useMutation({
        mutationFn: async ({ id, ...formData }) => {
            const { data, error } = await supabase
                .from("fir_forms")
                .update(formData)
                .eq("id", id)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fir-forms"] });
            toast.success("FIR aggiornato");
        },
        onError: (error) => {
            toast.error("Errore nell'aggiornamento: " + error.message);
        },
    });
    const submitFIR = useMutation({
        mutationFn: async (id) => {
            const { data, error } = await supabase
                .from("fir_forms")
                .update({ status: "inviato", submitted_at: new Date().toISOString() })
                .eq("id", id)
                .select()
                .single();
            if (error)
                throw error;
            await consumeNumber.mutateAsync(id);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fir-forms"] });
            toast.success("FIR inviato con successo!");
        },
        onError: (error) => {
            toast.error("Errore nell'invio: " + error.message);
        },
    });
    const deleteFIR = useMutation({
        mutationFn: async (id) => {
            const { data: firData } = await supabase.from("fir_forms").select("status").eq("id", id).single();
            if (firData?.status === "bozza") {
                await releaseNumber.mutateAsync(id);
            }
            const { error } = await supabase.from("fir_forms").update({ deleted_by_user: true }).eq("id", id);
            if (error)
                throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fir-forms"] });
            toast.success("FIR rimosso dalla cronologia");
        },
        onError: (error) => {
            toast.error("Errore nella rimozione: " + error.message);
        },
    });
    const closeFIR = useMutation({
        mutationFn: async (id) => {
            const { data, error } = await supabase
                .from("fir_forms")
                .update({ status: "completato", completed_at: new Date().toISOString() })
                .eq("id", id)
                .select()
                .maybeSingle();
            if (error)
                throw error;
            if (!data)
                throw new Error("Aggiornamento FIR fallito: nessun record trovato o permessi insufficienti");
            try {
                await consumeNumber.mutateAsync(id);
            }
            catch { /* already consumed */ }
            // [DISABLED] Auto-assegnazione di un nuovo numero FIR dopo la chiusura rimossa.
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fir-forms"] });
            queryClient.invalidateQueries({ queryKey: ["fir-number-pool"] });
            toast.success("FIR chiuso definitivamente");
        },
        onError: (error) => {
            toast.error("Errore nella chiusura: " + error.message);
        },
    });
    const silentSaveFIR = useMutation({
        mutationFn: async ({ id, ...formData }) => {
            const { data, error } = await supabase
                .from("fir_forms")
                .update(formData)
                .eq("id", id)
                .select()
                .maybeSingle();
            if (error)
                throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fir-forms"] });
        },
    });
    return { myForms, isLoadingMyForms, createFIR, updateFIR, submitFIR, deleteFIR, closeFIR, silentSaveFIR };
}
export function mapStoreToDatabaseFields(storeData) {
    const statoFisicoValue = storeData.statoFisico ? STATO_FISICO_MAP[storeData.statoFisico] || null : null;
    return {
        produttore_denominazione: storeData.produttoreDenominazione || null,
        produttore_codice_fiscale: storeData.produttoreCF || null,
        produttore_indirizzo: storeData.produttoreUnitaLocale || null,
        produttore_comune: null,
        produttore_provincia: null,
        produttore_cap: null,
        destinatario_denominazione: storeData.destinatarioDenominazione || null,
        destinatario_codice_fiscale: storeData.destinatarioCF || null,
        destinatario_indirizzo: storeData.destinatarioUnitaLocale || null,
        destinatario_autorizzazione: storeData.destinatarioNumeroAut || null,
        trasportatore_denominazione: storeData.trasportatoreDenominazione || null,
        trasportatore_codice_fiscale: storeData.trasportatoreCF || null,
        trasportatore_iscrizione_albo: storeData.trasportatoreNumeroAlbo || null,
        trasportatore_targa_automezzo: storeData.targaAutomezzo || null,
        trasportatore_targa_rimorchio: storeData.targaRimorchio || null,
        trasportatore_conducente: storeData.conducenteNomeCognome || null,
        codice_eer: storeData.codiceEER || null,
        descrizione_rifiuto: storeData.descrizione || null,
        stato_fisico: statoFisicoValue,
        quantita: storeData.quantita ? parseFloat(storeData.quantita) : null,
        unita_misura: storeData.unitaMisura || "kg",
        caratteristiche_hp: storeData.caratteristicheHP.length > 0 ? storeData.caratteristicheHP : null,
        data_partenza: storeData.oraDataInizioTrasporto || null,
        data_arrivo: storeData.dataOraArrivo || null,
        intermediario_denominazione: storeData.intermediarioDenominazione || null,
        intermediario_codice_fiscale: storeData.intermediarioCF || null,
        intermediario_iscrizione_albo: storeData.intermediarioNumeroAlbo || null,
        note: storeData.annotazioni || null,
        form_data: {
            registro_no: storeData.registroSi ? "SI" : "NO",
            numero_registro: storeData.numeroRegistro || null,
            produttore_luogo_produzione: storeData.produttoreLuogoProduzioneDiverso || null,
            produttore_iscrizione_albo: storeData.produttoreNumeroAut || null,
            detentore_checkbox: storeData.isDetentore || false,
            destinatario_operazione_R: storeData.destinatarioOperazione === "R" ? storeData.destinatarioCodiceOperazione || "R" : null,
            destinatario_operazione_D: storeData.destinatarioOperazione === "D" ? storeData.destinatarioCodiceOperazione || "D" : null,
            destinatario_n_aut_comunicazione: storeData.destinatarioNumeroAut || null,
            destinatario_tipo: storeData.destinatarioTipoAut || null,
            provenienza_urbano: storeData.provenienza === "urbano" || null,
            provenienza_speciale: storeData.provenienza === "speciale" || null,
            peso_verificato_partenza: storeData.verificatoPartenza ? "SI" : null,
            aspetto_colli: storeData.aspettoEsteriore === "colli" || null,
            aspetto_rinfusa: storeData.aspettoEsteriore === "rinfusa" || null,
            trasporto_adr_rid: storeData.trasportoADR || false,
            classe_pericolo: storeData.adrClassePericolo || null,
            nr_onu: storeData.adrNumeroONU || null,
            note_adr: storeData.adrNote || null,
            percorso: storeData.percorsoDiverso || null,
            accettato_per_intero: storeData.accettazione === "intero" || null,
            accettato_parzialmente: storeData.accettazione === "parziale" || null,
            respinto: storeData.accettazione === "respinto" || null,
            quantita_accettata: storeData.quantitaAccettata || null,
            peso_ricevuto: storeData.pesoRicevuto || null,
            numero_colli: storeData.numeroColli || null,
            trasbordo_parziale_denominazione: storeData.trasbordoParzDenominazione || null,
            trasbordo_parziale_codice_fiscale: storeData.trasbordoParzCF || null,
            trasbordo_parziale_iscrizione_albo: storeData.trasbordoParzAlbo || null,
            trasbordo_parziale_rif_formulario: storeData.trasbordoParzNuovoFir || null,
            trasbordo_parziale_quantita_residua: storeData.trasbordoParzQuantitaResidua || null,
            trasbordo_parziale_motivazione: storeData.trasbordoParzCausale || null,
            sosta_tecnica_1_luogo: storeData.sosta1Luogo || null,
            sosta_tecnica_1_data_sospensione: storeData.sosta1Inizio || null,
            sosta_tecnica_1_data_ripresa: storeData.sosta1Fine || null,
            sosta_tecnica_2_luogo: storeData.sosta2Luogo || null,
            sosta_tecnica_2_data_sospensione: storeData.sosta2Inizio || null,
            sosta_tecnica_2_data_ripresa: storeData.sosta2Fine || null,
            sosta_tecnica_3_luogo: storeData.sosta3Luogo || null,
            sosta_tecnica_3_data_sospensione: storeData.sosta3Inizio || null,
            sosta_tecnica_3_data_ripresa: storeData.sosta3Fine || null,
            secondo_destinatario_denominazione: storeData.dest2Denominazione || null,
            secondo_destinatario_unita_locale: storeData.dest2UnitaLocale || null,
            secondo_destinatario_codice_fiscale: storeData.dest2CF || null,
            secondo_destinatario_iscrizione_albo: storeData.dest2Autorizzazione || null,
            annotazioni_pag2: storeData.annotazioniContinuazione || null,
            interTerrDenominazione: storeData.interTerrDenominazione || null,
            interTerrCF: storeData.interTerrCF || null,
            interTerrAlbo: storeData.interTerrAlbo || null,
            interTerrConducente: storeData.interTerrConducente || null,
            interTerrTarga: storeData.interTerrTarga || null,
            interTerrRimorchio: storeData.interTerrRimorchio || null,
            interFerroDenominazione: storeData.interFerroDenominazione || null,
            interFerroIdTreno: storeData.interFerroIdTreno || null,
            interFerroCF: storeData.interFerroCF || null,
            interFerroTratta: storeData.interFerroTratta || null,
            interFerroRid: storeData.interFerroRid || false,
            interFerroStazionePartenza: storeData.interFerroStazionePartenza || null,
            interFerroStazioneArrivo: storeData.interFerroStazioneArrivo || null,
            interFerroDataPartenza: storeData.interFerroDataPartenza || null,
            interFerroDataArrivo: storeData.interFerroDataArrivo || null,
            interMareDenominazione: storeData.interMareDenominazione || null,
            interMareIdNave: storeData.interMareIdNave || null,
            interMareCF: storeData.interMareCF || null,
            interMareImdg: storeData.interMareImdg || false,
            interMarePortoPartenza: storeData.interMarePortoPartenza || null,
            interMarePortoArrivo: storeData.interMarePortoArrivo || null,
            interMareDataPartenza: storeData.interMareDataPartenza || null,
            interMareDataArrivo: storeData.interMareDataArrivo || null,
        },
    };
}
export function useAdminFIRForms() {
    const { user, isAdmin } = useAuth();
    const { data: allForms, isLoading, refetch } = useQuery({
        queryKey: ["fir-forms", "admin"],
        queryFn: async () => {
            const { data: firData, error: firError } = await supabase
                .from("fir_forms")
                .select("*")
                .order("created_at", { ascending: false });
            if (firError)
                throw firError;
            const userIds = [...new Set(firData.map((f) => f.user_id))];
            const { data: profilesData } = await supabase
                .from("profiles")
                .select("user_id, nome, cognome, codice_fiscale")
                .in("user_id", userIds);
            const profilesMap = new Map(profilesData?.map((p) => [p.user_id, p]) ?? []);
            return firData.map((fir) => ({ ...fir, profiles: profilesMap.get(fir.user_id) || null }));
        },
        enabled: !!user && isAdmin,
    });
    const stats = {
        totale: allForms?.length ?? 0,
        bozze: allForms?.filter((f) => f.status === "bozza").length ?? 0,
        inviati: allForms?.filter((f) => f.status === "inviato").length ?? 0,
        completati: allForms?.filter((f) => f.status === "completato").length ?? 0,
    };
    return { allForms, isLoading, refetch, stats };
}
