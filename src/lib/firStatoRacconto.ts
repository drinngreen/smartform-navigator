import { supabase } from "@/lib/supabaseClient";

/**
 * Racconto in italiano semplice dello stato di un singolo FIR.
 * Legge SOLO dati già registrati (nessuna chiamata al RENTRI, nessuna scrittura).
 */

export type StatoPasso = "fatto" | "in_corso" | "da_fare" | "errore";

export interface PassoFir {
  titolo: string;
  stato: StatoPasso;
  dettaglio: string;
}

export interface RaccontoFir {
  numeroFir: string;
  titolo: string;
  sintesi: string;
  cosaFareOra: string;
  passi: PassoFir[];
  rifiuti: number;
}

export interface OperazioneGrezza {
  tipo_operazione: string;
  http_status: number | null;
  success: boolean;
  created_at: string;
  identificativo_rentri?: string | null;
  payload_inviato?: unknown;
  risposta?: unknown;
}

export function normalizzaNumeroFir(value: unknown): string {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function contieneFir(op: OperazioneGrezza, numero: string): boolean {
  if (normalizzaNumeroFir(op.identificativo_rentri) === numero) return true;
  const testo = `${JSON.stringify(op.payload_inviato ?? {})}${JSON.stringify(op.risposta ?? {})}`;
  return normalizzaNumeroFir(testo).includes(numero);
}

function dataIt(iso: string): string {
  return new Date(iso).toLocaleString("it-IT");
}

export function costruisciRacconto(numeroFirInput: string, operazioni: OperazioneGrezza[]): RaccontoFir {
  const numero = normalizzaNumeroFir(numeroFirInput);
  const mie = operazioni
    .filter((op) => contieneFir(op, numero))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const emissioni = mie.filter((op) => op.tipo_operazione === "FIR_EMISSIONE");
  const rifiuti = emissioni.filter((op) => !op.success);
  const presaInCarico = emissioni.find((op) => op.success);
  const vidimazione = mie.find((op) => op.tipo_operazione === "LOTTO" && op.success);
  const arrivo = mie.find((op) => op.tipo_operazione === "FIRMA_RICEZIONE" && op.success);

  const passi: PassoFir[] = [];

  passi.push({
    titolo: "1. Formulario compilato",
    stato: "fatto",
    dettaglio: "I dati del formulario sono salvati nel programma.",
  });

  if (rifiuti.length > 0 && !presaInCarico) {
    passi.push({
      titolo: "2. Invio della partenza al RENTRI",
      stato: "errore",
      dettaglio: `Il RENTRI ha rifiutato ${rifiuti.length} tentativo/i. Correggi i campi in rosso e reinvia.`,
    });
  } else if (presaInCarico) {
    passi.push({
      titolo: "2. Invio della partenza al RENTRI",
      stato: "fatto",
      dettaglio: rifiuti.length > 0
        ? `Riuscito il ${dataIt(presaInCarico.created_at)} (prima c'erano stati ${rifiuti.length} rifiuti, ora superati).`
        : `Riuscito il ${dataIt(presaInCarico.created_at)}.`,
    });
  } else {
    passi.push({
      titolo: "2. Invio della partenza al RENTRI",
      stato: "da_fare",
      dettaglio: "Non risulta ancora nessun invio della partenza.",
    });
  }

  passi.push({
    titolo: "3. Numero ufficiale e QR del RENTRI",
    stato: vidimazione ? "fatto" : presaInCarico ? "in_corso" : "da_fare",
    dettaglio: vidimazione
      ? `Il RENTRI ha confermato il formulario ${numeroFirInput.trim()} e ha rilasciato QR e copia ufficiale il ${dataIt(vidimazione.created_at)}.`
      : presaInCarico
        ? "Richiesta accettata dal RENTRI, conferma del numero in arrivo."
        : "Sarà disponibile solo dopo l'invio della partenza.",
  });

  passi.push({
    titolo: "4. Arrivo all'impianto, pesata e firma del destinatario",
    stato: arrivo ? "fatto" : "da_fare",
    dettaglio: arrivo
      ? `Arrivo e firma del destinatario inviati al RENTRI il ${dataIt(arrivo.created_at)}.`
      : "Non ancora fatto. Il formulario è vidimato e in viaggio: l'impianto lo vede sul RENTRI e deve registrare peso reale, esito e firma.",
  });

  passi.push({
    titolo: "5. Registro cronologico e giacenze",
    stato: arrivo ? "fatto" : "da_fare",
    dettaglio: arrivo
      ? "Il carico è stato registrato dopo la chiusura del RENTRI."
      : "Non aggiornati, ed è corretto così: si muovono solo dopo la firma del destinatario.",
  });

  const chiuso = Boolean(arrivo);
  const inViaggio = Boolean(vidimazione || presaInCarico) && !chiuso;

  return {
    numeroFir: numeroFirInput.trim(),
    titolo: chiuso
      ? "Formulario chiuso"
      : inViaggio
        ? "Formulario valido e in viaggio — non ancora chiuso"
        : rifiuti.length > 0
          ? "Formulario ancora in bozza: il RENTRI lo ha rifiutato"
          : "Formulario in bozza",
    sintesi: chiuso
      ? "Il viaggio è concluso: il destinatario ha firmato e il carico è registrato."
      : inViaggio
        ? "La partenza è registrata sul RENTRI con numero e QR ufficiali. Manca solo l'ultimo passo: l'impianto di destinazione deve pesare, accettare e firmare."
        : "Il formulario non è ancora partito: nessun numero ufficiale, nessun QR, il viaggio non può iniziare.",
    cosaFareOra: chiuso
      ? "Nessuna azione: puoi scaricare la copia definitiva."
      : inViaggio
        ? "Deve agire l'impianto di destinazione: Impianto → FIR in arrivo → pesata, esito e firma. Tu non devi fare altro."
        : "Correggi i campi segnalati in rosso nel formulario e premi di nuovo «Emetti FIR e firma la partenza».",
    passi,
    rifiuti: rifiuti.length,
  };
}

export async function caricaRaccontoFir(numeroFir: string): Promise<RaccontoFir | null> {
  const numero = normalizzaNumeroFir(numeroFir);
  if (numero.length < 8) return null;
  const { data, error } = await supabase
    .from("rentri_operazioni")
    .select("tipo_operazione, http_status, success, created_at, identificativo_rentri, payload_inviato, risposta")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return null;
  return costruisciRacconto(numeroFir, (data ?? []) as OperazioneGrezza[]);
}
