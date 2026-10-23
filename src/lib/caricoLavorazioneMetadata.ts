export interface CaricoLavorazioneMetadata {
  descrizione: string;
  statoFisico: string;
  classiPericolo: string[];
  destinazione: string;
  urbano: boolean;
  origine: string;
  litri: string;
  metriCubi: string;
  numero: string;
  notaInterna: string;
}

export const emptyCaricoMetadata = (): CaricoLavorazioneMetadata => ({
  descrizione: "", statoFisico: "", classiPericolo: [], destinazione: "Deposito Temp.",
  urbano: false, origine: "Rifiuto", litri: "", metriCubi: "", numero: "", notaInterna: "",
});

export function caricoMetadataPayload(m: CaricoLavorazioneMetadata) {
  const quantity = (value: string) => value.trim() ? Number(value.replace(",", ".")) : null;
  return {
    descrizione: m.descrizione.trim() || null,
    stato_fisico: m.statoFisico || null,
    classi_pericolo: m.classiPericolo.join(", ") || null,
    destinazione: m.destinazione || null,
    form_urbano: m.urbano,
    origine_rifiuto: m.origine,
    nota_int: m.notaInterna.trim() || null,
    raw: { carico_lavorazione: { litri: quantity(m.litri), metri_cubi: quantity(m.metriCubi), numero: quantity(m.numero) } },
  };
}