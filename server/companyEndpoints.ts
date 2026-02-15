// @ts-nocheck
export interface CompanyConfig {
  name: string;
  issuer: string; // Codice Fiscale
  registryId?: string; // ID Registro/Pratica
  unitId: string; // Unità Locale / Operatore
  blockCode: string; // Codice Blocco FIR
  p12File: string;
  password?: string; // Opzionale se gestita dal bridge
}

export const COMPANIES: Record<string, CompanyConfig> = {
  'global': {
    name: 'GLOBAL RECO S.R.L.',
    issuer: '08934760961',
    registryId: 'R6QSWHZ6HJV', // ID noto dai log precedenti
    unitId: 'OP2501RMK022692-T00001',
    blockCode: 'SKKZR',
    p12File: 'certificato.p12'
  },
  'multy': {
    name: 'MULTY PROGET S.R.L.',
    issuer: '12347770013',
    registryId: 'RQEL39R7NS0',
    unitId: 'OP2501XMQ021914-TO0001', // Corretto da screenshot: Aggiunto suffisso -TO0001
    blockCode: 'ZRZXR',
    p12File: 'multyproget.p12'
  },
  'niyol': {
    name: 'NIYOL ETICONS LOGISTICA SRL SB',
    issuer: '09879800010',
    registryId: '01-250210-00079463',
    unitId: 'OP2501SXW021767',
    blockCode: 'DGXYQ',
    p12File: 'niyol.p12'
  }
};

export const COMPANY_ENDPOINTS: Record<string, string> = {
  'certificato.p12': `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${COMPANIES.global.registryId}/movimenti`,
  '08934760961.p12': `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${COMPANIES.global.registryId}/movimenti`,
  'niyol.p12': `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${COMPANIES.niyol.registryId}/movimenti`,
  'multyproget.p12': `https://api.rentri.gov.it/dati-registri/v1.0/operatore/${COMPANIES.multy.registryId}/movimenti`
};

export function getEndpointForP12(filename: string): string {
  const url = COMPANY_ENDPOINTS[filename]
  if (!url) throw new Error(`Endpoint mancante per ${filename}`)
  return url
}
