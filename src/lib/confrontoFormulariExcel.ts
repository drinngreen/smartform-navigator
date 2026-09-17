import * as XLSX from "xlsx";

/**
 * Confronto fra gli elenchi formulari esportati dal gestionale (Excel) e i
 * movimenti già presenti nel registro cronologico dell'applicazione.
 *
 * Regola ferrea: questo confronto e l'eventuale inserimento riguardano SOLO la
 * registrazione documentale. Non toccano mai giacenze, cernite o Dragon.
 */

export interface FormularioElenco {
  numeroFir: string | null;
  /** Numero normalizzato (solo lettere e cifre) usato per il confronto. */
  chiave: string | null;
  dataEmissione: string | null;
  cer: string | null;
  descrizione: string | null;
  produttore: string | null;
  destinatario: string | null;
  quantitaKg: number | null;
  statoFormulario: string | null;
  tipo: string | null;
  numeroInterno: number | null;
}

export const normalizzaChiaveFir = (v: unknown): string =>
  String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();

const pulisci = (v: unknown): string | null => {
  const s = String(v ?? "")
    .replace(/_x000d_/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s ? s : null;
};

/** Converte le date Excel (seriali o testo) in formato AAAA-MM-GG. */
export function dataExcelToIso(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === "number" && Number.isFinite(v)) {
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const testo = String(v).trim();
  const it = testo.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
  if (it) return `${it[3]}-${it[2]}-${it[1]}`;
  const iso = testo.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  return null;
}

const numero = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/** Legge un elenco formulari esportato dal gestionale. */
export function leggiElencoFormulari(buffer: ArrayBuffer): FormularioElenco[] {
  const wb = XLSX.read(buffer, { cellDates: true });
  const foglio = wb.Sheets[wb.SheetNames[0]];
  const righe = XLSX.utils.sheet_to_json<Record<string, unknown>>(foglio, { defval: null });

  return righe
    .map((r) => {
      const numeroFir = pulisci(r["N. Formulario"]);
      const quantita =
        numero(r["Kg all'Origine"]) ?? numero(r["Qtà all'Origine"]) ?? numero(r["Kg a Destino"]);
      return {
        numeroFir,
        chiave: numeroFir ? normalizzaChiaveFir(numeroFir) : null,
        dataEmissione: dataExcelToIso(r["Data Emi."]),
        cer: pulisci(r["C.E.R."])?.replace(/\D/g, "") ?? null,
        descrizione: pulisci(r["Descrizione"]),
        produttore: pulisci(r["Produttore"]),
        destinatario: pulisci(r["Destinatario"]),
        quantitaKg: quantita,
        statoFormulario: pulisci(r["Stato Formulario"]),
        tipo: pulisci(r["Tipo"]),
        numeroInterno: numero(r["N. Interno"]),
      };
    })
    // L'ultima riga dei file esportati è il totale: niente numero né data.
    .filter((r) => r.chiave && r.dataEmissione);
}

export interface EsitoConfronto {
  presenti: FormularioElenco[];
  mancanti: FormularioElenco[];
  bozze: FormularioElenco[];
}

/**
 * Divide l'elenco in presenti, mancanti e bozze.
 * Le bozze non vengono mai registrate: non sono documenti validi.
 */
export function confrontaConRegistro(
  elenco: FormularioElenco[],
  chiaviPresenti: Set<string>,
): EsitoConfronto {
  const presenti: FormularioElenco[] = [];
  const mancanti: FormularioElenco[] = [];
  const bozze: FormularioElenco[] = [];
  for (const r of elenco) {
    if (chiaviPresenti.has(r.chiave!)) {
      presenti.push(r);
      continue;
    }
    if ((r.statoFormulario ?? "").toLowerCase().includes("bozza")) bozze.push(r);
    else mancanti.push(r);
  }
  return { presenti, mancanti, bozze };
}

/** Verso del movimento rispetto a Multyproget/Niyol, dedotto dal tipo esportato. */
export function versoMovimento(tipo: string | null, destinatario: string | null): "CARICO" | "SCARICO" {
  const t = (tipo ?? "").toLowerCase();
  if (t.includes("ingresso")) return "CARICO";
  if (t.includes("uscita")) return "SCARICO";
  const d = (destinatario ?? "").toUpperCase();
  return d.includes("MULTY") || d.includes("NIYOL") ? "CARICO" : "SCARICO";
}
