/** Codici blocco RENTRI per ogni azienda */
export interface BlockCode {
  code: string;
  sito: string | null;
  label: string;
}

export interface TenantRentriConfig {
  issuer: string;          // Codice Fiscale — JWT iss
  unitId: string;          // num_iscr_sito (es. OP2501RMK022692-TO0001)
  registryId: string | null; // ID Registro per movimenti (es. R6QSWHZ6HJV)
  primaryBlock: string;
  blocks: BlockCode[];
}

export const TENANT_RENTRI: Record<string, TenantRentriConfig> = {
  global: {
    issuer: "08934760961",
    unitId: "OP2501RMK022692-TO0001",
    registryId: "R6QSWHZ6HJV",
    primaryBlock: "FMGWB",
    blocks: [
      { code: "FMGWB", sito: "TO0001", label: "Principale TO (71k FIR)" },
      { code: "SKKZR", sito: "TO0001", label: "Secondario TO" },
      { code: "XNQLK", sito: "MI0001", label: "Milano (58k FIR)" },
      { code: "GPFMK", sito: null, label: "Senza sito" },
    ],
  },
  multy: {
    issuer: "12347770013",
    unitId: "OP2501XMQ021914-TO0001",
    registryId: "RQEL39R7NS0",
    primaryBlock: "ZRZXR",
    blocks: [
      { code: "ZRZXR", sito: "TO0001", label: "Principale TO (534 FIR)" },
    ],
  },
  niyol: {
    issuer: "09879800010",
    unitId: "OP2501SXW021767-TO0001",
    registryId: "01-250210-00079463",
    primaryBlock: "BPJMG",
    blocks: [
      { code: "BPJMG", sito: "TO0001", label: "Ufficio Niyol" },
      { code: "FRVKM", sito: null, label: "Dipendenti Niyol" },
    ],
  },
};

/** Backward-compatible alias */
export const BLOCK_CODES: Record<string, BlockCode[]> = Object.fromEntries(
  Object.entries(TENANT_RENTRI).map(([k, v]) => [k, v.blocks])
);

/** RENTRI API endpoint templates (produzione) */
export const RENTRI_ENDPOINTS = {
  // Vidimazione
  LISTA_BLOCCHI:       "GET  /vidimazione-formulari/v1.0?identificativo={CF}",
  VIDIMAZIONE:         "POST /vidimazione-formulari/v1.0/{CODICE_BLOCCO}",
  LOTTO:               "GET  /vidimazione-formulari/v1.0/{CODICE_BLOCCO}/{PROGRESSIVO}",
  LOTTO_PDF:           "GET  /vidimazione-formulari/v1.0/{CODICE_BLOCCO}/{PROGRESSIVO}/pdf",
  // FIR
  FIR_EMISSIONE:       "POST /formulari/v1.0",
  DETTAGLIO_FIR:       "GET  /formulari/v1.0/{UUID_FIR}",
  RICERCA_FIR:         "GET  /formulari/v1.0?numeroFir={NUM}&identificativo_soggetto={CF}",
  // Registri
  REGISTRO:            "POST /dati-registri/v1.0/operatore/{ID_REGISTRO}/movimenti",
  RICERCA_MOVIMENTI:   "GET  /dati-registri/v1.0/operatore/{ID_REGISTRO}/movimenti?...",
  // Transazioni
  TRANSAZIONE_REGISTRO:"GET  /dati-registri/v1.0/operatore/{ID_REGISTRO}/transazioni/{TXN_ID}",
  TRANSAZIONE_FIR:     "GET  /formulari/v1.0/transazioni/{TXN_ID}",
} as const;

function normalizeTenantKey(tenant: string): string {
  return tenant.toLowerCase().replace("reco", "").replace("proget", "");
}

export function getTenantConfig(tenant: string): TenantRentriConfig | null {
  const key = normalizeTenantKey(tenant);
  return TENANT_RENTRI[key] ?? TENANT_RENTRI[tenant.toLowerCase()] ?? null;
}

export function getBlocksForTenant(tenant: string): BlockCode[] {
  return getTenantConfig(tenant)?.blocks ?? [];
}

export function getPrimaryBlock(tenant: string): BlockCode | null {
  const cfg = getTenantConfig(tenant);
  if (!cfg) return null;
  return cfg.blocks.find(b => b.code === cfg.primaryBlock) ?? cfg.blocks[0] ?? null;
}
