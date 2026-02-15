// @ts-nocheck
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

export const RENTRI_CONFIG = {
  companies: {
    global: {
      issuer: '08934760961',
      unitId: 'OP2501RMK022692-TO0001',
      p12Path: process.env.CERT_GLOBAL_PATH || path.join(process.cwd(), 'bridge-service', 'certificato.p12'),
      p12Password: process.env.CERT_GLOBAL_PASS || '2$i5)*-H',
      blockCode: 'SKKZR'
    },
    multy: {
      issuer: '12347770013',
      registryId: 'RQEL39R7NS0',
      unitId: 'OP2501XMQ021914-TO0001',
      p12Path: process.env.CERT_MULTY_PATH || path.join(process.cwd(), 'bridge-service', 'multyproget.p12'),
      p12Password: process.env.CERT_MULTY_PASS || '1k+F_9nN',
      blockCode: 'ZRZXR'
    },
    niyol: {
      issuer: '09879800010',
      registryId: '01-250210-00079463',
      unitId: 'OP2501SXW021767-TO0001',
      p12Path: process.env.CERT_NIYOL_PATH || path.join(process.cwd(), 'bridge-service', 'niyol.p12'),
      p12Password: process.env.CERT_NIYOL_PASS || '86v@1|mG',
      blockCode: 'BPJMG'
    }
  },
  baseUrl: 'https://api.rentri.gov.it',
  audience: 'rentrigov.api'
};

export type CompanyKey = keyof typeof RENTRI_CONFIG.companies;

export function getP12(companyKey: CompanyKey): Buffer {
  const conf = RENTRI_CONFIG.companies[companyKey];
  
  // 1. Try path
  if (fs.existsSync(conf.p12Path)) {
    return fs.readFileSync(conf.p12Path);
  }
  
  // 2. Try Env Var Base64 (Optional fallback for cloud without file mount)
  const envName = `CERT_${companyKey.toUpperCase()}_BASE64`;
  if (process.env[envName]) {
      return Buffer.from(process.env[envName]!, 'base64');
  }

  throw new Error(`P12 file not found for ${companyKey} at ${conf.p12Path} and no base64 env var provided.`);
}
