export const TENANT_RENTRI = {
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
            { code: "FRVKM", sito: null, label: "Senza sito (787 FIR)" },
        ],
    },
    niyol: {
        issuer: "09879800010",
        unitId: "OP2501SXW021767-TO0001",
        registryId: "01-250210-00079463",
        primaryBlock: "BPJMG",
        blocks: [
            { code: "BPJMG", sito: "TO0001", label: "Principale TO (322 FIR)" },
            { code: "DGXYQ", sito: null, label: "Senza sito" },
        ],
    },
};
/** Backward-compatible alias */
export const BLOCK_CODES = Object.fromEntries(Object.entries(TENANT_RENTRI).map(([k, v]) => [k, v.blocks]));
/** RENTRI API endpoint templates (produzione) */
export const RENTRI_ENDPOINTS = {
    // Vidimazione
    LISTA_BLOCCHI: "GET  /vidimazione-formulari/v1.0?identificativo={CF}",
    VIDIMAZIONE: "POST /vidimazione-formulari/v1.0/{CODICE_BLOCCO}",
    LOTTO: "GET  /vidimazione-formulari/v1.0/{CODICE_BLOCCO}/{PROGRESSIVO}",
    LOTTO_PDF: "GET  /vidimazione-formulari/v1.0/{CODICE_BLOCCO}/{PROGRESSIVO}/pdf",
    // FIR
    FIR_EMISSIONE: "POST /formulari/v1.0",
    DETTAGLIO_FIR: "GET  /formulari/v1.0/{UUID_FIR}",
    RICERCA_FIR: "GET  /formulari/v1.0?numeroFir={NUM}&identificativo_soggetto={CF}",
    // Registri
    REGISTRO: "POST /dati-registri/v1.0/operatore/{ID_REGISTRO}/movimenti",
    RICERCA_MOVIMENTI: "GET  /dati-registri/v1.0/operatore/{ID_REGISTRO}/movimenti?...",
    // Transazioni
    TRANSAZIONE_REGISTRO: "GET  /dati-registri/v1.0/operatore/{ID_REGISTRO}/transazioni/{TXN_ID}",
    TRANSAZIONE_FIR: "GET  /formulari/v1.0/transazioni/{TXN_ID}",
};
function normalizeTenantKey(tenant) {
    return tenant.toLowerCase().replace("reco", "").replace("proget", "");
}
export function getTenantConfig(tenant) {
    const key = normalizeTenantKey(tenant);
    return TENANT_RENTRI[key] ?? TENANT_RENTRI[tenant.toLowerCase()] ?? null;
}
export function getBlocksForTenant(tenant) {
    return getTenantConfig(tenant)?.blocks ?? [];
}
export function getPrimaryBlock(tenant) {
    const cfg = getTenantConfig(tenant);
    if (!cfg)
        return null;
    return cfg.blocks.find(b => b.code === cfg.primaryBlock) ?? cfg.blocks[0] ?? null;
}
