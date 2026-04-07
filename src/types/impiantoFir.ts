export type FirStatusInterno =
  | "bozza"
  | "importato"
  | "attesa_firma_ricezione"
  | "firmato_ricezione"
  | "firmato_destinatario"
  | "errore";

export interface FirSummary {
  id: string;
  numero_fir: string;
  produttore: string;
  trasportatore: string;
  destinatario: string;
  cer: string;
  quantita: number;
  unita_misura: string;
  stato_interno: FirStatusInterno;
  stato_rentri: string | null;
  data_ricezione: string;
  firma_ricezione_at: string | null;
  firma_destinatario_at: string | null;
}

export interface FirDetail extends FirSummary {
  produttore_cf: string | null;
  produttore_indirizzo: string | null;
  trasportatore_cf: string | null;
  trasportatore_albo: string | null;
  trasportatore_targa: string | null;
  trasportatore_conducente: string | null;
  destinatario_cf: string | null;
  destinatario_autorizzazione: string | null;
  descrizione_rifiuto: string | null;
  stato_fisico: string | null;
  caratteristiche_hp: string[] | null;
  data_partenza: string | null;
  kg_pesata: number | null;
  esito: string | null;
  motivazione: string | null;
  note_ricezione: string | null;
  rentri_raw: Record<string, unknown> | null;
  events: FirEvent[];
}

export interface FirDestinatarioPayload {
  numero_fir: string;
  kg_pesata: number;
  data_arrivo: string;
  ora_arrivo: string;
  esito: "accettato" | "parziale" | "respinto";
  motivazione?: string;
}

export interface FirEvent {
  id: string;
  tipo: string;
  descrizione: string;
  timestamp: string;
  actor?: string;
  payload?: Record<string, unknown>;
}
