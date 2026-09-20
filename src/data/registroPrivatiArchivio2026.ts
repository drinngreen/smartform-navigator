/**
 * Righe del registro privati 2026 presenti nella stampa ufficiale del 29/08/2026
 * e nell'archivio invii RENTRI (esito "presente"), ma non più presenti nella
 * tabella `privati_conferimenti` (eliminate dall'interfaccia prima del blocco
 * del 16/09/2026).
 *
 * Sono righe di SOLA LETTURA ricostruite dai documenti ufficiali: non vengono
 * scritte a database e NON incidono in alcun modo sulle giacenze, che restano
 * esattamente quelle attuali. Servono a far collimare elenco, stampa ed export
 * con il registro consegnato al RENTRI.
 */
export const MULTY_TENANT_ID_PRIVATI = "77ec9a3d-602e-438f-97bf-1c69abd8f691";

export type ArchivioPrivatoRow = {
  id: string;
  data: string;
  nome_privato: string;
  cf_pi: string | null;
  cer: string;
  kg_pesati: number;
  numero_progressivo: number;
  anno_dbt: number;
  importo_pagato: number;
  metodo_pag: string | null;
  targa_automezzo: string | null;
  modello_automezzo: string | null;
  note: string;
  tipo_utenza: string | null;
  stato_rifiuto: string | null;
  numero_fir: string | null;
  codice_ce: string | null;
  prezzo_kg: number | null;
  impianto_id: string | null;
  privato_id: string | null;
  created_at: string;
  is_archivio: true;
};

const row = (
  numero_progressivo: number,
  data: string,
  nome_privato: string,
  cf_pi: string | null,
  kg_pesati: number,
): ArchivioPrivatoRow => ({
  id: `ARCHIVIO-${numero_progressivo}-${data}`,
  data,
  nome_privato,
  cf_pi,
  cer: "170405",
  kg_pesati,
  numero_progressivo,
  anno_dbt: 2026,
  importo_pagato: 0,
  metodo_pag: null,
  targa_automezzo: null,
  modello_automezzo: null,
  note: "Riga da registro ufficiale stampato il 29/08/2026 e inviata al RENTRI (archivio, sola lettura)",
  tipo_utenza: null,
  stato_rifiuto: null,
  numero_fir: null,
  codice_ce: null,
  prezzo_kg: null,
  impianto_id: null,
  privato_id: null,
  created_at: `${data}T00:00:00.000Z`,
  is_archivio: true,
});

export const REGISTRO_PRIVATI_ARCHIVIO_2026: ArchivioPrivatoRow[] = [
  row(128, "2026-03-27", "DELLAGAREN FRANCO", "DLLFNC71D20G674K", 345),
  row(351, "2026-08-19", "BONINO ALEX", "BNNLXA79H14L219E", 120),
  row(352, "2026-08-20", "ADAOD ABDELILAH", "DDABLL82P14Z330T", 15),
  row(353, "2026-08-20", "ADAOD ABDELILAH", "DDABLL82P14Z330T", 32),
  row(354, "2026-08-20", "AGANSOUS ISMAIL", "GNSSML94P07Z330M", 10),
  row(355, "2026-08-20", "AGANSOUS ISMAIL", "GNSSML94P07Z330M", 12),
  row(356, "2026-08-20", "AGANSOUS ISMAIL", "GNSSML94P07Z330M", 43),
  row(357, "2026-08-26", "GIORDAN MANRICO", "GRDMRC74L07G674K", 200),
  row(358, "2026-08-26", "GIORDAN MANRICO", "GRDMRC74L07G674K", 500),
  row(359, "2026-08-31", "CAVAZZA SCHANEL", "CVZSHN04D55G674I", 135),
];

/** Righe d'archivio applicabili al tenant/anno visualizzato. */
export function getArchivioPrivati(tenantId: string, anno: string): ArchivioPrivatoRow[] {
  if (tenantId !== MULTY_TENANT_ID_PRIVATI) return [];
  if (anno !== "all" && anno !== "2026") return [];
  return REGISTRO_PRIVATI_ARCHIVIO_2026;
}
