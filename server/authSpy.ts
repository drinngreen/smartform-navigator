// @ts-nocheck
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const BRIDGE = 'http://localhost:8765';
const AUTH = 'https://identity.ecocerved.it/connect/token';
const P12 = 'certificato.p12';

const IDS = [
  { label: 'UUID', val: '0fb6fc18-f6bf-4a7c-b814-2c73bd2e00f1' },
  { label: 'P.IVA', val: '08934760961' },
  { label: 'CERT-ID', val: '08934760961' },
];

const AUDIENCES = [
  'https://identity.ecocerved.it/connect/token',
  'https://identity.ecocerved.it',
];

const BODY_MODES = [true, false];

async function runTest() {
  console.log('🚀 AVVIO TEST COMBINATORIO LOGIN...');
  for (const id of IDS) {
    for (const aud of AUDIENCES) {
      for (const sendIdInBody of BODY_MODES) {
        console.log(`\n🧪 TEST: [ID=${id.label}] [AUD=${aud}] [BODY=${sendIdInBody ? 'SI' : 'NO'}]`);
        try {
          const now = Math.floor(Date.now() / 1000);
          const header = { alg: 'ES256', typ: 'JWT' };
          const payload = {
            iss: id.val,
            sub: id.val,
            aud,
            jti: uuidv4(),
            iat: now,
            exp: now + 120,
          };
          const b64 = (o: any) => Buffer.from(JSON.stringify(o)).toString('base64url');
          const unsigned = `${b64(header)}.${b64(payload)}`;

          const signRes = await axios.post(`${BRIDGE}/sign-raw`, {
            payloadBase64: Buffer.from(unsigned).toString('base64'),
            filename: P12,
          });
          const signature = Buffer.from(signRes.data.signature, 'base64').toString('base64url');
          const assertion = `${unsigned}.${signature}`;

          const params = new URLSearchParams();
          params.append('grant_type', 'client_credentials');
          params.append('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
          params.append('client_assertion', assertion);
          params.append('scope', 'rentri');
          if (sendIdInBody) params.append('client_id', id.val);

          const res = await axios.post(AUTH, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });
          console.log('✅✅✅ SUCCESSO! TOKEN TROVATO! ✅✅✅');
          console.log('CONFIGURAZIONE VINCENTE:');
          console.log(`- Client ID: ${id.val}`);
          console.log(`- Audience: ${aud}`);
          console.log(`- Send in Body: ${sendIdInBody}`);
          return;
        } catch (e: any) {
          const raw = e.response?.data || e.message;
          console.log(`❌ Fallito: ${JSON.stringify(raw)}`);
        }
      }
    }
  }
  console.log('\n--- TUTTI I TEST FALLITI ---');
}

runTest();
