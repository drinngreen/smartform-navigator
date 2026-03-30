// Helper: invio automatico email all'impianto dopo completamento FIR
// Da chiamare dopo firma digitale e invio RENTRI
import { supabase } from "@/lib/supabaseClient";
/**
 * Invia email automatica all'impianto di destinazione con riepilogo FIR.
 *
 * DOVE AGGANCIARE: chiamare questa funzione dopo che il FIR viene
 * marcato come "completato" e i dati inviati al RENTRI con successo.
 * Es. in FIRFormComplete.tsx dopo handleSubmitFIR() con esito positivo.
 *
 * @param firFormId - ID del fir_forms record
 */
export async function sendEmailToImpiantoForFir(firFormId) {
    try {
        // Recupera dati FIR
        const { data: fir, error: firErr } = await supabase
            .from("fir_forms")
            .select("*")
            .eq("id", firFormId)
            .single();
        if (firErr || !fir) {
            console.error("[sendEmailToImpianto] FIR non trovato:", firErr);
            return false;
        }
        // Email destinatario impianto — ADATTARE: recupera da tabella impianti/organizations
        // Per ora prova a ricavare dal form_data o dai campi del FIR
        const formData = fir.form_data;
        const emailImpianto = formData?.destinatario_email || formData?.impianto_email;
        if (!emailImpianto) {
            console.warn("[sendEmailToImpianto] Nessuna email impianto trovata per FIR:", firFormId);
            return false;
        }
        // Costruisci HTML riepilogativo
        const subject = `FIR Completato - ${fir.numero_fir || "N/A"}`;
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">FIR Completato</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">N° FIR</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${fir.numero_fir || "—"}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">CER</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${fir.codice_eer || "—"}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Descrizione</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${fir.descrizione_rifiuto || "—"}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Quantità</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${fir.quantita ?? "—"} ${fir.unita_misura || "kg"}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Produttore</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${fir.produttore_denominazione || "—"}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Trasportatore</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${fir.trasportatore_denominazione || "—"}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Destinatario</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${fir.destinatario_denominazione || "—"}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Data partenza</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${fir.data_partenza || "—"}</td></tr>
        </table>
        <p style="margin-top: 24px; color: #666; font-size: 12px;">Email automatica inviata da Global Reco — globalreco@zoli.live</p>
      </div>
    `;
        // Chiama edge function per invio
        const { data, error } = await supabase.functions.invoke("send-global-email", {
            body: {
                to: emailImpianto,
                subject,
                html,
                firId: firFormId,
                category: "automatica",
            },
        });
        if (error) {
            console.error("[sendEmailToImpianto] Errore invio:", error);
            return false;
        }
        console.log("[sendEmailToImpianto] Email inviata:", data);
        return data?.ok ?? false;
    }
    catch (err) {
        console.error("[sendEmailToImpianto] Eccezione:", err);
        return false;
    }
}
