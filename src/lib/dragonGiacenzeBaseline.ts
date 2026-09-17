// Fotografia contabile certificata delle giacenze Multyproget al 12/09/2026.
// Fonte: stampa ufficiale del 12/09/2026. Il libro mastro Dragon contiene
// rettifiche tecniche nascoste che non devono alterare questa fotografia.
// Unica fonte condivisa: la usano sia la pagina Giacenze sia le Cernite,
// così il disponibile per lavorazione parte sempre dallo stesso dato.

export const DRAGON_GIACENZE_BASELINE_DATE = "2026-09-12";

export interface GiacenzaBaseline {
  carico: number;
  scarico: number;
  saldo: number;
}

export const DRAGON_GIACENZE_BASELINE_OVERRIDES: Record<string, GiacenzaBaseline> = {
  "150103": { carico: 9503, scarico: 0, saldo: 9503 },
  "150106": { carico: 22237, scarico: 17340, saldo: 4897 },
  "191202": { carico: 1800, scarico: 1800, saldo: 0 },
  "191204": { carico: 173, scarico: 173, saldo: 0 },
  "200140-FE": { carico: 157179, scarico: 102498.5, saldo: 54680.5 },
  "200140-MIX": { carico: 37298, scarico: 23784, saldo: 13514 },
  "200140-OT": { carico: 8544, scarico: 4848, saldo: 3696 },
  "200140-PI": { carico: 2912, scarico: 2203, saldo: 709 },
  "200140-RA": { carico: 21055.34, scarico: 11621.17, saldo: 9434.17 },
};

export const normalizeCerCodice = (value: string): string => {
  const compact = value.toUpperCase().trim().replace(/\s+/g, "");
  const match = compact.match(/^(\d{6})(?:[-_/]?([A-Z0-9]{1,4}))?/);
  if (!match) return compact;
  return match[2] ? `${match[1]}-${match[2]}` : match[1];
};

/**
 * Saldo corretto per un CER con fotografia certificata:
 * saldo fotografia al 12/09/2026 + movimenti operativi successivi.
 * `postBaselineDelta` = somma dei movimenti (PLUS meno MINUS) con data
 * successiva alla fotografia. Se il CER non ha fotografia, torna null
 * e il chiamante usa la somma grezza dei movimenti.
 */
export const saldoConBaseline = (
  codiceCer: string | null | undefined,
  postBaselineDelta: number,
): number | null => {
  if (!codiceCer) return null;
  const baseline = DRAGON_GIACENZE_BASELINE_OVERRIDES[normalizeCerCodice(codiceCer)];
  if (!baseline) return null;
  return baseline.saldo + postBaselineDelta;
};
