// @ts-nocheck
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const BRIDGE = 'http://localhost:8765';
const AUTH = ' `https://identity.ecocerved.it/connect/token` ';
const P12_FILE = 'certificato.p12';

const UUID_GLOBAL = '0fb6fc18-f6bf-4a7c-b814-2c73bd2e00f1';
const PIVA_GLOBAL = '08934760961';

async function tryLogin(idNelJwt: string, inviareIdNelBody: boolean) {
  console.log(`\n---------------------------------------------------`);
  console.log(`TEST: JWT ID=${idNelJwt} | BODY ID=${inviareIdNelBody ? 'SI' : 'NO'}`);

  try {
    const now = Math.floor(Date.now() / 1000);
    const jwtHeader = { alg: 'ES256', typ: 'JWT' };
    const jwtPayload = {
      iss: idNelJwt,
      sub: idNelJwt,
      aud: AUTH,
      jti: uuidv4(),
      iat: now,
      exp: now + 120,
    };

    const b64 = (o: any) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const unsigned = `${b64(jwtHeader)}.${b64(jwtPayload)}`;

    const signRes = await axios.post(`${BRIDGE}/sign-raw`, {
      payloadBase64: Buffer.from(unsigned).toString('base64'),
      filename: P12_FILE,
    });

    const signature = Buffer.from(signRes.data.signature, 'base64').toString('base64url');
    const assertion = `${unsigned}.${signature}`;

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
    params.append('client_assertion', assertion);
    params.append('scope', 'rentri');
    if (inviareIdNelBody) params.append('client_id', idNelJwt);

    const res = await axios.post(AUTH, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    console.log(`✅ SUCCESSO!!! TOKEN PRESO!`);
    console.log(`>>> CONFIGURAZIONE VINCENTE: ID=${idNelJwt}, BODY=${inviareIdNelBody ? 'SI' : 'NO'} <<<`);
    return true;
  } catch (e: any) {
    console.log(`❌ FALLITO:`, JSON.stringify(e.response?.data || e.message));
    return false;
  }
}

async function run() {
  console.log('AVVIO DOTTORE V2...');
  await tryLogin(UUID_GLOBAL, true);
  await tryLogin(UUID_GLOBAL, false);
  await tryLogin(PIVA_GLOBAL, false);
  console.log('\n---------------------------------------------------');
}

run();