/**
 * Pesi di un formulario per la Vista veloce (sola lettura).
 * Partenza = quantità dichiarata/stimata dal produttore.
 * Destino = kg accettati dall'impianto di destinazione (mai la partenza).
 */
export const normFirPesi = (v: unknown) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const num = (v: unknown): number | null => {
  if (v && typeof v === "object" && "valore" in (v as any)) return num((v as any).valore);
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const positivo = (...v: unknown[]) => { for (const x of v) { const n = num(x); if (n != null && n > 0) return n; } return null; };

export function pesoPartenzaLocale(form: any): number | null {
  const fd = form?.form_data || {};
  return positivo(form?.quantita, fd.quantita, fd.quantita_origine, fd.peso_verificato_partenza);
}

export function pesoDestinoLocale(form: any, pesoRegistro?: number | null): number | null {
  const fd = form?.form_data || {};
  return positivo(fd.quantita_accettata, fd.peso_ricevuto, fd.quantita_destino, fd.peso_destino, pesoRegistro);
}

/** Pesi letti da un elemento dell'elenco o del dettaglio RENTRI, convertiti in kg. */
export function pesiDaRentri(raw: any): {
  numero: string;
  partenza: number | null;
  destino: number | null;
  stato: string | null;
} {
  const det = raw?.dati_partenza ?? {};
  const rif = raw?.rifiuto ?? det?.rifiuto ?? {};
  const qP = raw?.quantita ?? rif?.quantita ?? null;
  const umP = String(qP?.unita_misura ?? raw?.unita_misura ?? rif?.unita_misura ?? "kg").toLowerCase();
  const acc = raw?.accettazione ?? raw?.dati_accettazione ?? null;
  const qD = acc?.quantita_accettata ?? null;
  const umD = String(qD?.unita_misura ?? raw?.unita_misura ?? "kg").toLowerCase();
  const kg = (n: number | null, um: string) => (n == null ? null : um.startsWith("t") ? n * 1000 : n);
  const p = num(qP); const d = num(qD);
  return {
    numero: normFirPesi(raw?.numero_fir ?? det?.numero_fir),
    partenza: p != null && p > 0 ? kg(p, umP) : null,
    destino: d != null && d > 0 ? kg(d, umD) : null,
    stato: String(raw?.stato ?? raw?.stato_formulario ?? "").trim() || null,
  };
}

/**
 * Perché i kg a destino mancano. Distingue il caso reale: una bozza mai inviata
 * non può essere "non accettata", e un FIR cartaceo non passa dal RENTRI.
 */
export type StatoPesoDestino =
  | "accettato"
  | "non_inviato"
  | "cartaceo_non_registrato"
  | "in_arrivo"
  | "peso_non_comunicato"
  | "non_verificato";

export interface InfoPesoDestino {
  stato: StatoPesoDestino;
  /** Etichetta breve mostrata in tabella. */
  testo: string;
  /** Spiegazione completa mostrata al passaggio del mouse. */
  nota: string;
}

const VIAGGIO_CONCLUSO = /CHIUS|CONCLUS|RESPINT|COMPLETAT|ANNULL/i;

export function infoPesoDestino(o: {
  pesoDestino: number | null;
  inRentri: boolean;
  statoRentri?: string | null;
  cartaceo: boolean;
  /** false finché il RENTRI non ha risposto: senza questa lettura non si può affermare nulla. */
  rentriLetto: boolean;
}): InfoPesoDestino {
  if (o.pesoDestino != null) {
    return { stato: "accettato", testo: "", nota: "Kg accettati dal destinatario." };
  }
  if (!o.rentriLetto) {
    return {
      stato: "non_verificato",
      testo: "non verificato",
      nota: "Il RENTRI non è ancora stato letto (o non ha risposto): non posso dire se il formulario è partito.",
    };
  }
  if (!o.inRentri) {
    return o.cartaceo
      ? {
          stato: "cartaceo_non_registrato",
          testo: "non registrato",
          nota: "FIR cartaceo: il peso a destino va scritto a mano nel registro, non arriva dal RENTRI.",
        }
      : {
          stato: "non_inviato",
          testo: "non inviato",
          nota: "Bozza mai inviata al RENTRI: il viaggio non è ancora partito, quindi il destinatario non può aver accettato nulla.",
        };
  }
  if (VIAGGIO_CONCLUSO.test(String(o.statoRentri ?? "").toUpperCase())) {
    return {
      stato: "peso_non_comunicato",
      testo: "senza kg accettati",
      nota: `Viaggio concluso sul RENTRI (${o.statoRentri}), ma i kg accettati non risultano comunicati.`,
    };
  }
  return {
    stato: "in_arrivo",
    testo: "in arrivo",
    nota: "Formulario partito: il destinatario non ha ancora registrato l'accettazione.",
  };
}
