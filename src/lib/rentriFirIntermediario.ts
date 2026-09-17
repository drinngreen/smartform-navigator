import {
  inviaOperazioneRentriCustom,
  RENTRI_CF_SOGGETTO,
  rentriConfigKey,
  type RentriCliente,
  type RentriVpsResponse,
} from "@/lib/rentriVpsApi";

/**
 * Lettura SOLA LETTURA dei formulari RENTRI in cui la nostra società compare
 * come INTERMEDIARIO. Nessun invio, nessuna scrittura: solo GET al RENTRI.
 */

export interface FirIntermediarioRow {
  numeroFir: string;
  data: string | null;
  produttore: string | null;
  destinatario: string | null;
  trasportatore: string | null;
  intermediario: string | null;
  intermediarioCf: string | null;
  eer: string | null;
  quantitaKg: number | null;
  stato: string | null;
  /** true solo se nel formulario risulta il nostro codice fiscale come intermediario. */
  siamoIntermediario: boolean;
  raw: unknown;
}

const soloCifreLettere = (v: unknown) =>
  String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();

/** Cerca ricorsivamente il primo valore di una chiave (match case-insensitive parziale). */
export function trovaValore(node: unknown, chiavi: string[]): unknown {
  if (!node || typeof node !== "object") return undefined;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = trovaValore(item, chiavi);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  const rec = node as Record<string, unknown>;
  for (const [k, v] of Object.entries(rec)) {
    const key = k.toLowerCase();
    if (chiavi.some((c) => key === c || key.includes(c))) {
      if (v !== null && v !== undefined && typeof v !== "object") return v;
      if (v && typeof v === "object") {
        const nome = trovaValore(v, ["denominazione", "ragione_sociale", "descrizione", "nome"]);
        if (nome !== undefined) return nome;
      }
    }
  }
  for (const v of Object.values(rec)) {
    const found = trovaValore(v, chiavi);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** Nodo (oggetto) corrispondente al primo campo che contiene una delle chiavi. */
export function trovaOggetto(node: unknown, chiavi: string[]): Record<string, unknown> | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = trovaOggetto(item, chiavi);
      if (found) return found;
    }
    return null;
  }
  const rec = node as Record<string, unknown>;
  for (const [k, v] of Object.entries(rec)) {
    const key = k.toLowerCase();
    if (chiavi.some((c) => key.includes(c)) && v && typeof v === "object" && !Array.isArray(v)) {
      return v as Record<string, unknown>;
    }
  }
  for (const v of Object.values(rec)) {
    const found = trovaOggetto(v, chiavi);
    if (found) return found;
  }
  return null;
}

/** Estrae gli elementi formulario da una risposta RENTRI, comunque impacchettati. */
export function estraiElencoFormulari(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data.filter((x) => x && typeof x === "object") as Record<string, unknown>[];
  if (!data || typeof data !== "object") return [];
  const rec = data as Record<string, unknown>;
  for (const key of ["formulari", "items", "elenco", "content", "risultati", "data", "value"]) {
    const v = rec[key];
    const found = estraiElencoFormulari(v);
    if (found.length) return found;
  }
  return [];
}

/** Interpreta un singolo formulario RENTRI nella riga mostrata in tabella. */
export function interpretaFormulario(row: Record<string, unknown>, cfNostro: string): FirIntermediarioRow {
  const inter = trovaOggetto(row, ["intermediar"]);
  const intermediarioCf =
    (inter ? (trovaValore(inter, ["codice_fiscale", "identificativo", "cf", "partita_iva"]) as string) : null) ??
    (trovaValore(row, ["intermediario_codice_fiscale", "intermediario_identificativo"]) as string) ??
    null;
  const intermediario =
    (inter ? (trovaValore(inter, ["denominazione", "ragione_sociale", "nome"]) as string) : null) ??
    (typeof trovaValore(row, ["intermediar"]) === "string"
      ? (trovaValore(row, ["intermediar"]) as string)
      : null);

  const cfTarget = soloCifreLettere(cfNostro);
  const siamoIntermediario =
    Boolean(cfTarget) &&
    (soloCifreLettere(intermediarioCf) === cfTarget ||
      (inter ? soloCifreLettere(JSON.stringify(inter)).includes(cfTarget) : false));

  const quantita = trovaValore(row, ["quantita", "peso"]);
  const numero =
    (trovaValore(row, ["numero_fir", "numerofir", "numero_formulario", "identificativo"]) as string) ?? "";

  return {
    numeroFir: String(numero || "").trim(),
    data: (trovaValore(row, ["data_emissione", "data_ora_emissione", "data_movimento", "data"]) as string) ?? null,
    produttore: (trovaValore(trovaOggetto(row, ["produttor"]) ?? row, ["denominazione", "ragione_sociale"]) as string) ?? null,
    destinatario: (trovaValore(trovaOggetto(row, ["destinatar"]) ?? {}, ["denominazione", "ragione_sociale"]) as string) ?? null,
    trasportatore: (trovaValore(trovaOggetto(row, ["trasportator"]) ?? {}, ["denominazione", "ragione_sociale"]) as string) ?? null,
    intermediario: intermediario ? String(intermediario) : null,
    intermediarioCf: intermediarioCf ? String(intermediarioCf) : null,
    eer: (trovaValore(row, ["codice_eer", "eer", "cer"]) as string) ?? null,
    quantitaKg: quantita === undefined || quantita === null || quantita === "" ? null : Number(quantita),
    stato: (trovaValore(row, ["stato"]) as string) ?? null,
    siamoIntermediario,
    raw: row,
  };
}

export interface ElencoFirIntermediarioResult {
  response: RentriVpsResponse;
  righe: FirIntermediarioRow[];
}

/**
 * Elenco dei formulari del soggetto sul RENTRI in un intervallo di date,
 * con evidenza di quelli dove risultiamo INTERMEDIARIO. Sola lettura.
 */
export async function elencoFirIntermediario(
  cliente: RentriCliente,
  opts: { dataDa?: string; dataA?: string; codiceFiscale?: string } = {},
): Promise<ElencoFirIntermediarioResult> {
  const key = rentriConfigKey(cliente);
  const cf = opts.codiceFiscale || RENTRI_CF_SOGGETTO[key] || "";
  const params = new URLSearchParams({ identificativo_soggetto: cf });
  if (opts.dataDa) params.set("data_da", opts.dataDa);
  if (opts.dataA) params.set("data_a", opts.dataA);

  const response = await inviaOperazioneRentriCustom(
    cliente,
    "GET",
    `/formulari/v1.0?${params.toString()}`,
    null,
  );
  const righe = estraiElencoFormulari(response.data).map((r) => interpretaFormulario(r, cf));
  return { response, righe };
}
