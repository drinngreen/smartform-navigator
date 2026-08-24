import { supabase } from "@/lib/supabaseClient";

export const CATEGORIE_SOGGETTO = [
  "PRODUTTORE",
  "DESTINATARIO",
  "TRASPORTATORE",
  "INTERMEDIARIO",
  "CLIENTE",
  "FORNITORE",
  "PRIVATO",
  "ALTRO",
] as const;

export type CategoriaSoggetto = (typeof CATEGORIE_SOGGETTO)[number];

export interface SoggettoInput {
  tenantId: string;
  ragioneSociale: string;
  codiceFiscale?: string;
  partitaIva?: string;
  indirizzo?: string;
  comune?: string;
  provincia?: string;
  cap?: string;
  telefono?: string;
  cellulare?: string;
  email?: string;
  pec?: string;
  categoria?: string;
  autorizzazioni?: string;
  note?: string;
  /** Aggiorna uno specifico contatto di rubrica (modifica) invece di cercarlo per CF/P.IVA */
  contattoId?: string;
}

export interface SoggettoResult {
  azienda_id: string;
  contatto_id: string;
  categoria: string;
  ragione_sociale: string;
}

/**
 * Crea o aggiorna un soggetto contemporaneamente in anagrafica aziende
 * (sorgente delle tendine dei formulari) e in rubrica contatti.
 * Usato dalla rubrica, dal formulario ("nuovo soggetto") e da Dark Lemon.
 */
export async function upsertSoggetto(input: SoggettoInput): Promise<SoggettoResult> {
  const { data, error } = await supabase.rpc("upsert_soggetto_anagrafica", {
    p_tenant_id: input.tenantId,
    p_ragione_sociale: input.ragioneSociale,
    p_codice_fiscale: input.codiceFiscale || null,
    p_partita_iva: input.partitaIva || null,
    p_indirizzo: input.indirizzo || null,
    p_comune: input.comune || null,
    p_provincia: input.provincia || null,
    p_cap: input.cap || null,
    p_telefono: input.telefono || null,
    p_cellulare: input.cellulare || null,
    p_email: input.email || null,
    p_pec: input.pec || null,
    p_categoria: input.categoria || "CLIENTE",
    p_autorizzazioni: input.autorizzazioni || null,
    p_note: input.note || null,
    p_contatto_id: input.contattoId || null,
  } as any);
  if (error) throw error;
  return data as unknown as SoggettoResult;
}

/** Indirizzo formattato come nelle tendine anagrafica */
export const formatIndirizzoSoggetto = (r: {
  indirizzo?: string | null;
  cap?: string | null;
  comune?: string | null;
  citta?: string | null;
  provincia?: string | null;
}) =>
  [r.indirizzo, [r.cap, r.citta ?? r.comune, r.provincia ? `(${r.provincia})` : ""].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(" - ");

/** Tenant dell'anagrafica condivisa Multyproget usata dalle tendine dei formulari */
export const ANAGRAFICA_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
