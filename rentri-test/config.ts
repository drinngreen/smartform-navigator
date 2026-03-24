import path from 'path';
import fs from 'fs';

/** RENTRI API endpoint templates (produzione) */
export const RENTRI_ENDPOINTS = {
  LISTA_BLOCCHI:        'GET  /vidimazione-formulari/v1.0?identificativo={CF}',
  VIDIMAZIONE:          'POST /vidimazione-formulari/v1.0/{CODICE_BLOCCO}',
  LOTTO:                'GET  /vidimazione-formulari/v1.0/{CODICE_BLOCCO}/{PROGRESSIVO}',
  LOTTO_PDF:            'GET  /vidimazione-formulari/v1.0/{CODICE_BLOCCO}/{PROGRESSIVO}/pdf',
  FIR_EMISSIONE:        'POST /formulari/v1.0',
  DETTAGLIO_FIR:        'GET  /formulari/v1.0/{UUID_FIR}',
  RICERCA_FIR:          'GET  /formulari/v1.0?numeroFir={NUM}&identificativo_soggetto={CF}',
  REGISTRO:             'POST /dati-registri/v1.0/operatore/{ID_REGISTRO}/movimenti',
  RICERCA_MOVIMENTI:    'GET  /dati-registri/v1.0/operatore/{ID_REGISTRO}/movimenti?...',
  TRANSAZIONE_REGISTRO: 'GET  /dati-registri/v1.0/operatore/{ID_REGISTRO}/transazioni/{TXN_ID}',
  TRANSAZIONE_FIR:      'GET  /formulari/v1.0/transazioni/{TXN_ID}',
} as const;

export const CONFIG = {
  companies: {
    // Global Reco S.R.L.
    global: {
      issuer: '08934760961',
      unitId: 'OP2501RMK022692-TO0001',
      registryId: null as string | null, // TODO: da determinare
      p12Path: path.join(process.cwd(), 'bridge-service', 'certificato.p12'),
      p12Password: '2$i5)*-H',
      blocks: [
        { code: 'FMGWB', sito: 'TO0001', label: 'Principale TO (71k FIR)' },
        { code: 'SKKZR', sito: 'TO0001', label: 'Secondario TO' },
        { code: 'XNQLK', sito: 'MI0001', label: 'Milano (58k FIR)' },
        { code: 'GPFMK', sito: null,     label: 'Senza sito' },
      ],
      primaryBlock: 'FMGWB'
    },

    // Multy Proget S.R.L.
    multy: {
      issuer: '12347770013',
      registryId: 'RQEL39R7NS0',
      unitId: 'OP2501XMQ021914-TO0001',
      blocks: [
        { code: 'ZRZXR', sito: 'TO0001', label: 'Principale TO (534 FIR)' },
        { code: 'FRVKM', sito: null,     label: 'Senza sito (787 FIR)' },
      ],
      primaryBlock: 'ZRZXR',
      p12Path: path.join(process.cwd(), 'bridge-service', 'multyproget.p12'),
      p12Password: '1k+F_9nN'
    },

    // Niyol Eticons Logistica SRL SB
    niyol: {
      issuer: '09879800010',
      registryId: '01-250210-00079463',
      unitId: 'OP2501SXW021767-TO0001',
      blocks: [
        { code: 'BPJMG', sito: 'TO0001', label: 'Principale TO (322 FIR)' },
        { code: 'DGXYQ', sito: null,     label: 'Senza sito' },
      ],
      primaryBlock: 'BPJMG',
      p12Path: path.join(process.cwd(), 'bridge-service', 'niyol.p12'),
      p12Password: '86v@1|mG'
    }
  },

  baseUrl: 'https://api.rentri.gov.it',
  audience: 'rentrigov.api'
};

export function getP12(companyKey: 'global' | 'multy' | 'niyol'): Buffer {
  const conf = CONFIG.companies[companyKey];
  if (!fs.existsSync(conf.p12Path)) {
    throw new Error(`P12 file not found at ${conf.p12Path}`);
  }
  return fs.readFileSync(conf.p12Path);
}
