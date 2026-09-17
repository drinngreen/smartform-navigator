export type RentriDepartureStatus = "not_found" | "draft" | "departed" | "closed";

type FirRecord = Record<string, unknown>;

const normalizeFir = (value: unknown) => String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

function collectRecords(value: unknown, records: FirRecord[] = []): FirRecord[] {
  if (Array.isArray(value)) {
    for (const item of value) collectRecords(item, records);
  } else if (value && typeof value === "object") {
    const record = value as FirRecord;
    records.push(record);
    for (const nested of Object.values(record)) collectRecords(nested, records);
  }
  return records;
}

export function findRentriFirRecord(value: unknown, numeroFir: string): FirRecord | null {
  const target = normalizeFir(numeroFir);
  if (!target) return null;
  return collectRecords(value).find((record) =>
    normalizeFir(record.numero_fir ?? record.numeroFir) === target,
  ) ?? null;
}

/**
 * RENTRI is the only authority for departure state. Mere presence, HTTP 202,
 * transaction ids, local logs and QR/PDF availability are never proof.
 */
export function classifyRentriDeparture(value: unknown, numeroFir: string): RentriDepartureStatus {
  const record = findRentriFirRecord(value, numeroFir);
  if (!record) return "not_found";

  const state = String(record.stato ?? record.stato_formulario ?? "").trim().toUpperCase();
  if (!state || state.includes("INSERIMENTO")) return "draft";

  const closed = /ACCETTAT|CHIUS|CONCLUS|RESPINT|RICEVUT/.test(state)
    || Boolean(record.accettazione);
  if (closed) return "closed";

  const emissionDate = String(record.data_emissione ?? record.dataEmissione ?? "").trim();
  return emissionDate ? "departed" : "draft";
}

export function isRentriDepartureConfirmed(value: unknown, numeroFir: string): boolean {
  const status = classifyRentriDeparture(value, numeroFir);
  return status === "departed" || status === "closed";
}