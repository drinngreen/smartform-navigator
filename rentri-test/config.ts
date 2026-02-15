import path from 'path';
import fs from 'fs';

export const CONFIG = {
  companies: {
    // Global Reco S.R.L.
    global: {
      issuer: '08934760961',
      unitId: 'OP2501RMK022692-TO0001',
      p12Path: path.join(process.cwd(), 'bridge-service', 'certificato.p12'), // Assuming this is Global's cert
      p12Password: '2$i5)*-H',
      blocks: {
        legacy: 'FMGWB',
        current: 'SKKZR'
      }
    },

    // Multy Proget S.R.L.
    multy: {
      issuer: '12347770013',
      registryId: 'RQEL39R7NS0',
      unitId: 'OP2501XMQ021914-TO0001', // Updated from API discovery
      blockCode: 'ZRZXR',
      p12Path: path.join(process.cwd(), 'bridge-service', 'multyproget.p12'),
      p12Password: '1k+F_9nN'
    },

    // Niyol Eticons Logistica SRL SB
    niyol: {
      issuer: '09879800010',
      registryId: '01-250210-00079463',
      unitId: 'OP2501SXW021767-TO0001', // Updated from API discovery
      blockCode: 'BPJMG', // Using the one with UnitID
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
