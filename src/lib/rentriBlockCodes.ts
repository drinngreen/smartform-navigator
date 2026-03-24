/** Codici blocco RENTRI per ogni azienda */
export interface BlockCode {
  code: string;
  sito: string | null;
  label: string;
}

export const BLOCK_CODES: Record<string, BlockCode[]> = {
  global: [
    { code: "FMGWB", sito: "TO0001", label: "Principale TO (71k FIR)" },
    { code: "SKKZR", sito: "TO0001", label: "Secondario TO" },
    { code: "XNQLK", sito: "MI0001", label: "Milano (58k FIR)" },
    { code: "GPFMK", sito: null, label: "Senza sito" },
  ],
  multy: [
    { code: "ZRZXR", sito: "TO0001", label: "Principale TO (534 FIR)" },
    { code: "FRVKM", sito: null, label: "Senza sito (787 FIR)" },
  ],
  niyol: [
    { code: "BPJMG", sito: "TO0001", label: "Principale TO (322 FIR)" },
    { code: "DGXYQ", sito: null, label: "Senza sito" },
  ],
};

export function getBlocksForTenant(tenant: string): BlockCode[] {
  const key = tenant.toLowerCase().replace("reco", "").replace("proget", "");
  return BLOCK_CODES[key] ?? BLOCK_CODES[tenant.toLowerCase()] ?? [];
}

export function getPrimaryBlock(tenant: string): BlockCode | null {
  const blocks = getBlocksForTenant(tenant);
  return blocks[0] ?? null;
}
